const path = require('path');
const fs = require('fs');
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
  isJidGroup,
  isJidBroadcast,
  isJidNewsletter,
  isLidUser,
  jidNormalizedUser,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const whatsappWebRepository = require('../repositories/whatsappWebRepository');
const logger = require('../utils/logger');
const aiService = require('./aiService');
const r2Service = require('./r2Service');
const planService = require('./planService');
const whatsappAuthState = require('./whatsappAuthState');
const whatsappRateLimiter = require('./whatsappRateLimiter');

// aiService emits this exact token instead of a reply when the model decides a
// human should take over. It must never reach the customer.
const HUMAN_HANDOFF_MARKER = '[FALLBACK_HUMAN_NEEDED]';

// How stale a queued message may be and still get an automatic reply. Older
// than this and it is left for a person: answering a two-hour-old question as
// though it just arrived is worse than not answering it.
const AI_REPLY_MAX_AGE_SECONDS = Number(process.env.AI_REPLY_MAX_AGE_SECONDS) || 15 * 60;

/**
 * Chat ids with an AI reply already being generated.
 *
 * Generation takes several seconds, and every "should I reply?" check happens
 * *before* that wait while the resulting insert happens *after* it. So any
 * second trigger arriving mid-generation - another inbound message, or the
 * agent flipping the autopilot toggle again - re-read a conversation that
 * still looked unanswered and fired its own duplicate reply. This is the lock
 * that closes that window; it is per-process, which is all a single-node
 * deployment needs.
 */
const aiInFlight = new Set();

// Gap between reconnections when resuming sessions at boot.
const RESUME_STAGGER_MS = Number(process.env.WHATSAPP_RESUME_STAGGER_MS) || 3000;

// Map to hold active Baileys socket connections per tenantId
const activeSockets = new Map();

// Each live session's "write any queued keys now" function, kept so shutdown
// can persist them instead of losing the last 200ms of key updates.
const authFlushers = new Map();
const sessionDirBase = path.join(__dirname, '..', 'sessions');

if (!fs.existsSync(sessionDirBase)) {
  fs.mkdirSync(sessionDirBase, { recursive: true });
}

function getSessionPath(tenantId) {
  const p = path.join(sessionDirBase, `tenant_${tenantId}`);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
  return p;
}

function cleanPhone(phone) {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}

function getJidFromPhone(phone) {
  const digits = cleanPhone(phone);
  return `${digits}@s.whatsapp.net`;
}

/**
 * Resolves the customer-facing phone number for an inbound chat.
 *
 * A @lid JID's user part is a WhatsApp-internal linked-device id, not a phone
 * number - writing it into leads.phone produces junk like "152076403384350"
 * that can never be dialled or matched against an existing lead. Baileys keeps
 * a LID -> phone number mapping we can ask instead; if it has not learned the
 * pair yet we fall back to the raw digits so the chat is still recorded.
 */
async function resolvePhoneFromJid(sock, jid) {
  // jidNormalizedUser strips the device suffix. Without it a mapped number
  // comes back as "918928252400:0@s.whatsapp.net" and cleanPhone silently
  // folds that ":0" into the digits, yielding a 13-digit number that matches
  // no lead and cannot be dialled.
  const rawDigits = cleanPhone(jidNormalizedUser(jid).split('@')[0]);

  if (!isLidUser(jid)) return rawDigits;

  try {
    const pn = await sock.signalRepository?.lidMapping?.getPNForLID(jid);
    if (pn) return cleanPhone(jidNormalizedUser(pn).split('@')[0]);
  } catch (err) {
    logger.warn({ err, jid }, 'Could not map LID to phone number');
  }

  return rawDigits;
}

/** Chat-list preview text for a message that carries no caption. */
function mediaPreview(messageType) {
  if (messageType === 'image') return '📷 Photo';
  if (messageType === 'document') return '📄 Attachment';
  return '';
}

/**
 * Unwraps nested Baileys message containers (ephemeral, viewOnce, etc.)
 * to access the underlying message content.
 */
function getRawMessage(msg) {
  if (!msg?.message) return {};
  let m = msg.message;
  while (
    m.ephemeralMessage?.message ||
    m.viewOnceMessage?.message ||
    m.viewOnceMessageV2?.message ||
    m.documentWithCaptionMessage?.message
  ) {
    m = (
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.documentWithCaptionMessage?.message
    );
  }
  return m;
}

function extractMessageText(msg) {
  const m = getRawMessage(msg);
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    ''
  );
}


/**
 * Describes any media on an inbound message.
 *
 * Returns null for a plain text message. Video and audio are recognised so
 * they are recorded as attachments rather than silently dropped, even though
 * the inbox renders them as a generic file.
 */
function extractMediaInfo(msg) {
  const m = getRawMessage(msg);

  if (m.imageMessage) {
    return { type: 'image', mimetype: m.imageMessage.mimetype || 'image/jpeg', fileName: 'photo.jpg' };
  }
  if (m.documentMessage) {
    return {
      type: 'document',
      mimetype: m.documentMessage.mimetype || 'application/octet-stream',
      fileName: m.documentMessage.fileName || 'document',
    };
  }
  if (m.videoMessage) {
    return { type: 'document', mimetype: m.videoMessage.mimetype || 'video/mp4', fileName: 'video.mp4' };
  }
  if (m.audioMessage) {
    return { type: 'document', mimetype: m.audioMessage.mimetype || 'audio/ogg', fileName: 'audio.ogg' };
  }
  return null;
}

/**
 * Pulls an inbound attachment off WhatsApp and into our own storage.
 *
 * WhatsApp's own media links are short-lived and encrypted, so a URL from the
 * message itself would be useless to the inbox an hour later. Failure is not
 * fatal - the message is still recorded, just without a preview.
 */
async function storeInboundMedia(sock, msg, media) {
  try {
    const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
      logger: sock.logger,
      reuploadRequest: sock.updateMediaMessage,
    });
    if (!buffer?.length) return null;
    const folder = `whatsapp/inbound/${media.type === 'image' ? 'images' : 'documents'}`;
    return await r2Service.uploadFile(buffer, media.fileName, media.mimetype, folder);
  } catch (err) {
    logger.warn({ err }, 'Could not download inbound WhatsApp media');
    return null;
  }
}

/**
 * Initializes or gets the active WhatsApp Web Baileys socket for a tenant.
 */
async function initWhatsAppSession(tenantId, forceNew = false) {
  if (!tenantId) throw new Error('tenantId is required');

  if (activeSockets.has(tenantId) && !forceNew) {
    const existing = activeSockets.get(tenantId);
    if (existing.sock?.user) {
      return existing.sock;
    }
  }

  // A session that predates database storage still has its keys on disk.
  // Importing them here is what stops this change from logging every already
  // linked agency out and making them scan a fresh QR code.
  if (!(await whatsappAuthState.hasStoredCreds(tenantId))) {
    try {
      await whatsappAuthState.importFromDisk(tenantId, getSessionPath(tenantId));
    } catch (err) {
      logger.warn({ tenantId, err }, 'Could not import the on-disk WhatsApp session; a QR scan may be needed');
    }
  }

  if (forceNew) {
    const existing = activeSockets.get(tenantId);
    if (existing?.sock) {
      try {
        existing.sock.ev.removeAllListeners();
        existing.sock.end();
      } catch (e) {}
    }
    activeSockets.delete(tenantId);

    // Only discard the stored keys when there is no usable pairing to keep.
    //
    // NOTE: do not test creds.registered here - Baileys only ever sets that
    // flag on the pairing-code path (Socket/messages-recv.js), so for the QR
    // flow it stays false forever and this check would delete a perfectly
    // good session on every reconnect. creds.me.id is what QR pairing fills in.
    if (!(await whatsappAuthState.isPaired(tenantId))) {
      await whatsappAuthState.clearAuthState(tenantId);
    }
  }

  const { state, saveCreds, flush: flushAuth } = await whatsappAuthState.usePostgresAuthState(tenantId);
  authFlushers.set(tenantId, flushAuth);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info({ tenantId, version, isLatest }, 'Using Baileys version');

  const sockLogger = logger.child({ module: `baileys_${tenantId}` });
  sockLogger.level = 'warn';

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, sockLogger),
    },
    printQRInTerminal: false,
    logger: sockLogger,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    qrTimeout: 60000,
    markOnlineOnConnect: true,
    getMessage: async (key) => {
      return { conversation: 'Welcome to LeadCRM' };
    },
  });

  activeSockets.set(tenantId, { sock, qr: null, status: 'connecting' });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrBase64 = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
        activeSockets.set(tenantId, { sock, qr: qrBase64, status: 'qrcode' });
        await whatsappWebRepository.saveQrCode(tenantId, qrBase64);
      } catch (err) {
        logger.error({ err }, 'Error generating QR Code data URL');
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      // 440 (connectionReplaced) means something else has taken over this
      // session - a second server instance, or WhatsApp Web in a browser.
      // Reconnecting here just takes it back, the other side takes it again,
      // and the two spin against each other forever (observed at one cycle
      // every six seconds). Whoever connected last should keep it, so this
      // one stands down and waits for a person to reconnect deliberately.
      const wasReplaced = statusCode === DisconnectReason.connectionReplaced;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !wasReplaced;

      logger.warn(
        { tenantId, statusCode, shouldReconnect, wasReplaced },
        'WhatsApp Web socket connection closed'
      );

      if (wasReplaced) {
        try {
          sock.ev.removeAllListeners();
          sock.end();
        } catch (e) {}
        activeSockets.delete(tenantId);
        await whatsappWebRepository.setSessionStatus(tenantId, 'disconnected');
        logger.error(
          { tenantId },
          'WhatsApp session was taken over by another client. Not reconnecting - check for a second server instance or WhatsApp Web open elsewhere.'
        );
        return;
      }

      if (statusCode === DisconnectReason.loggedOut) {
        // WhatsApp has revoked this device from the phone's side. The keys are
        // dead, so they go - keeping them would only make the next boot try to
        // resume a login that no longer exists.
        try {
          await whatsappAuthState.clearAuthState(tenantId);
        } catch (err) {
          logger.warn({ tenantId, err }, 'Could not clear stored WhatsApp auth after logout');
        }
        try {
          fs.rmSync(getSessionPath(tenantId), { recursive: true, force: true });
        } catch (e) {}
        activeSockets.delete(tenantId);
        await whatsappWebRepository.markLoggedOut(tenantId);
      } else {
        // 515 (restartRequired) is the normal step right after a QR scan:
        // WhatsApp pairs the device, drops the socket, and expects us to dial
        // back with the freshly saved creds. Reporting it as 'disconnected'
        // would both flash the QR back up in the UI and hide the session from
        // autoInitConnectedSessions(), which only resumes 'connected' rows.
        const isRestart = statusCode === DisconnectReason.restartRequired;
        const nextStatus = isRestart ? 'connecting' : 'disconnected';

        activeSockets.set(tenantId, { sock: null, qr: null, status: nextStatus });
        await whatsappWebRepository.setSessionStatus(tenantId, nextStatus);
        if (shouldReconnect) {
          setTimeout(() => {
            initWhatsAppSession(tenantId).catch((err) => {
              logger.error({ err, tenantId }, 'WhatsApp Web reconnect attempt failed');
            });
          }, isRestart ? 1000 : 5000);
        }
      }
    } else if (connection === 'open') {
      // sock.user.id is "919136520538:66@s.whatsapp.net" — jidNormalizedUser strips
      // the device suffix (:66) so cleanPhone only keeps the actual phone digits.
      const phoneNumber = cleanPhone(jidNormalizedUser(sock.user?.id || '').split('@')[0]);
      logger.info({ tenantId, phoneNumber }, 'WhatsApp Web connected successfully!');

      activeSockets.set(tenantId, { sock, qr: null, status: 'connected' });
      await whatsappWebRepository.markConnected(tenantId, phoneNumber);
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Baileys labels a message 'notify' when it arrives live and 'append' when
    // WhatsApp is delivering one that queued while this device was offline
    // (Socket/messages-recv.js: `node.attrs.offline ? 'append' : 'notify'`).
    //
    // Only accepting 'notify' meant every message sent while the session was
    // down - a restart, a dropped socket, a night with the server off - was
    // thrown away on reconnect. It never reached the inbox, never created a
    // lead, and the agent had no idea it existed.
    if (type !== 'notify' && type !== 'append') return;
    const isOfflineBacklog = type === 'append';

    for (const msg of messages) {
      if (!msg.message) continue;

      const senderJid = msg.key.remoteJid;
      if (!senderJid) continue;

      // Only 1:1 customer conversations become CRM chats/leads. Groups,
      // status updates, broadcast lists and newsletters all carry a JID whose
      // user part is not a person's number, so ingesting them created leads
      // keyed on a group id (the "120363..." rows) that no one can call.
      if (
        isJidGroup(senderJid) ||
        isJidBroadcast(senderJid) ||
        isJidNewsletter(senderJid)
      ) {
        continue;
      }

      const senderPhone = await resolvePhoneFromJid(sock, senderJid);
      const messageText = extractMessageText(msg);
      const pushName = msg.pushName || 'WhatsApp Contact';
      const messageId = (msg.key?.id && String(msg.key.id).trim())
        ? String(msg.key.id).trim()
        : `in_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const media = extractMediaInfo(msg);

      // A photo with no caption is a real message. Only skip when there is
      // neither text nor an attachment - reactions, receipts and the like.
      if (!messageText && !media) continue;

      // A message the linked account sent itself. That is either the agent
      // replying from their own phone - which the CRM was dropping entirely,
      // so the thread looked one-sided - or an echo of something this server
      // just sent, which the message_id conflict swallows.
      if (msg.key.fromMe) {
        try {
          const mediaUrl = media ? await storeInboundMedia(sock, msg, media) : null;
          await recordOwnOutgoingMessage(tenantId, {
            senderPhone,
            messageText,
            messageId,
            messageType: media ? media.type : 'text',
            mediaUrl,
          });
        } catch (err) {
          logger.error({ err, tenantId, senderPhone }, 'Error recording message sent from the phone');
        }
        continue;
      }

      try {
        const mediaUrl = media ? await storeInboundMedia(sock, msg, media) : null;

        // Backlog messages are always recorded, but the AI only answers ones
        // that are still fresh. Coming back after an hour and firing a reply
        // at every queued message at once reads as a malfunction to the
        // customer, and the older ones deserve a person anyway.
        const ageSeconds = msg.messageTimestamp
          ? Math.max(0, Math.floor(Date.now() / 1000) - Number(msg.messageTimestamp))
          : 0;
        const allowAiReply = !isOfflineBacklog || ageSeconds < AI_REPLY_MAX_AGE_SECONDS;

        if (isOfflineBacklog) {
          logger.info(
            { tenantId, senderPhone, ageSeconds, allowAiReply },
            'Recording a message that arrived while the session was offline'
          );
        }

        await processInboundMessage(tenantId, {
          senderJid,
          senderPhone,
          pushName,
          messageText,
          messageId,
          sock,
          messageType: media ? media.type : 'text',
          mediaUrl,
          allowAiReply,
          sentAt: msg.messageTimestamp ? Number(msg.messageTimestamp) : null,
        });
      } catch (err) {
        logger.error({ err, tenantId, senderPhone }, 'Error processing inbound WhatsApp message');
      }
    }
  });

  // Handle message status updates (Delivery & Blue Ticks)
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      if (update.update?.status) {
        let statusStr = 'sent';
        if (update.update.status === 3) statusStr = 'delivered';
        if (update.update.status === 4) statusStr = 'read'; // Blue Ticks!

        try {
          await whatsappWebRepository.updateMessageStatus(update.key.id, statusStr);
        } catch (err) {
          logger.warn({ err, messageId: update.key.id }, 'Error updating message status');
        }
      }
    }
  });

  return sock;
}

/**
 * Records a message the linked WhatsApp account sent itself.
 *
 * Two things arrive on this path: replies the agent typed on their own phone,
 * and echoes of messages this server sent through the socket. The message_id
 * conflict makes the echo a no-op, so only genuine phone replies land.
 *
 * Deliberately limited to chats the CRM already knows. The linked number is
 * someone's real WhatsApp, full of personal conversations - creating a chat
 * for every number they message from their phone would fill the CRM with
 * people who are not customers.
 */
async function recordOwnOutgoingMessage(tenantId, { senderPhone, messageText, messageId, messageType = 'text', mediaUrl = null }) {
  const chat = await whatsappWebRepository.findChatByPhone(tenantId, senderPhone);
  if (!chat) return;

  const inserted = await whatsappWebRepository.insertMessage(tenantId, {
    chatId: chat.id,
    messageId,
    direction: 'outbound',
    sender: 'agent',
    messageText,
    status: 'sent',
    messageType,
    mediaUrl,
  });

  // Nothing inserted means this was the echo of a message the server sent, so
  // the chat row is already up to date and AI state must not be touched.
  if (!inserted.inserted) return;

  // A human answering from their phone is a human takeover, same as replying
  // in the app - so autopilot stands down and any escalation is cleared.
  await whatsappWebRepository.recordHumanReplyOnChat(chat.id, messageText || mediaPreview(messageType));

  logger.info({ tenantId, chatId: chat.id }, 'Recorded a reply sent from the linked phone');
}

/**
 * Handles inbound message processing, chat upsert, lead auto-creation, and Gemini AI auto-reply.
 */
/**
 * Whether the customer is asking us to stop.
 *
 * Deliberately narrow: matched against the whole message, trimmed, so "stop"
 * ends it but "stop sending me the Goa one, send Kerala" does not. A false
 * positive silently kills a live conversation, which is worse than missing an
 * unusual phrasing - an agent can always switch the chat off by hand.
 */
const OPT_OUT_WORDS = new Set([
  'stop', 'unsubscribe', 'opt out', 'optout', 'remove me',
  'band karo', 'band karo message', 'mat bhejo', 'message mat bhejo',
]);

function isOptOutRequest(text) {
  if (!text) return false;
  const normalised = String(text).trim().toLowerCase().replace(/[.!]+$/, '');
  return OPT_OUT_WORDS.has(normalised);
}

async function processInboundMessage(tenantId, { senderJid, senderPhone, pushName, messageText, messageId, sock, messageType = 'text', mediaUrl = null, allowAiReply = true, sentAt = null }) {
  // What the chat list shows. A caption when there is one, otherwise a short
  // stand-in so an attachment-only message is not a blank row.
  const preview = messageText || mediaPreview(messageType);
  let chat = await whatsappWebRepository.findChatByPhone(tenantId, senderPhone, senderJid);

  if (!chat) {
    let leadId = await whatsappWebRepository.findLeadIdByPhone(tenantId, senderPhone);

    if (!leadId) {
      try {
        const created = await whatsappWebRepository.createLeadFromWhatsapp(tenantId, {
          customerName: pushName,
          phone: senderPhone,
        });
        leadId = created.id;
        logger.info({ tenantId, leadId: created.leadCode, phone: senderPhone }, 'Auto-created new lead from WhatsApp');
      } catch (e) {
        logger.warn({ err: e }, 'Failed to auto-create lead from WhatsApp');
      }
    }

    // A brand-new chat inherits the tenant's "autopilot for new chats" default
    // rather than being switched on unconditionally. From here on, this chat's
    // own flag is what decides - the tenant setting never reaches back in.
    const aiDefault = await whatsappWebRepository.getAutopilotDefault(tenantId);

    chat = await whatsappWebRepository.createChat(tenantId, {
      phone: senderPhone,
      jid: senderJid,
      customerName: pushName,
      leadId,
      lastMessage: preview,
      aiEnabled: aiDefault,
    });
  } else {
    // jid is refreshed on every inbound message so a chat created before this
    // column existed (or one whose addressing WhatsApp has since migrated to
    // @lid) picks up a routable address the first time the customer writes in.
    await whatsappWebRepository.recordInboundOnChat(chat.id, {
      lastMessage: preview,
      pushName,
      jid: senderJid,
    });
  }

  const stored = await whatsappWebRepository.insertMessage(tenantId, {
    chatId: chat.id,
    messageId,
    direction: 'inbound',
    sender: 'customer',
    messageText,
    status: 'delivered',
    messageType,
    mediaUrl,
    sentAt,
  });

  // WhatsApp redelivers: the same message id arrives again after a reconnect,
  // and the offline backlog can replay one we already have. The insert is
  // idempotent, but everything below it is not - without this check a
  // redelivered message generated a second AI reply and the customer received
  // the same answer twice.
  if (!stored.inserted) {
    logger.debug({ tenantId, messageId }, 'Already-stored message redelivered; nothing further to do');
    return;
  }

  // "STOP" has to end it. A customer who cannot make the messages stop blocks
  // and reports the number instead, and block rate is what actually gets a
  // WhatsApp number banned.
  if (isOptOutRequest(messageText)) {
    await whatsappWebRepository.setChatOptedOut(tenantId, chat.id, true);
    logger.info({ tenantId, chatId: chat.id }, 'Customer opted out; automated replies disabled for this chat');
    return;
  }

  // An earlier opt-out still stands, whatever the flags say.
  if (chat.opted_out === true) {
    logger.debug({ tenantId, chatId: chat.id }, 'Chat is opted out; not replying automatically');
    return;
  }

  // This chat's own switch is the only thing that decides. The tenant-level
  // setting is a default applied when a chat is first created, not a veto
  // held over every chat afterwards - otherwise turning AI on for one
  // conversation silently does nothing until a global switch is also found.
  //
  // needs_human is re-checked here as well as in the toggle: an escalation
  // must survive regardless of how the flags were set, since sending anything
  // on a chat the AI already backed away from is the worst outcome.
  const chatAiEnabled =
    allowAiReply && chat.ai_enabled === true && chat.needs_human !== true;

  // Autopilot fires from the socket, not an HTTP route, so the plan check has
  // to happen here too - route middleware alone would leave a downgraded
  // tenant still being served by AI on chats enabled before the downgrade.
  const planAllowsAi = chatAiEnabled && (await planService.checkFeatureAccess(tenantId, 'canUseAi'));

  if (planAllowsAi) {
    if (aiInFlight.has(chat.id)) {
      logger.info({ tenantId, chatId: chat.id }, 'AI reply already in flight for this chat - skipping duplicate');
      return;
    }
    aiInFlight.add(chat.id);

    try {
      await sock.sendPresenceUpdate('composing', senderJid);
      const replyData = await generateAiReplyForChat(tenantId, senderPhone, messageText);

      if (replyData?.needsHuman) {
        // If AI included a polite handoff message for the customer, send it first
        if (replyData.reply) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const sentResult = await sock.sendMessage(senderJid, { text: replyData.reply });
          const sentMessageId = sentResult?.key?.id || `out_${Date.now()}`;
          await whatsappWebRepository.insertMessage(tenantId, {
            chatId: chat.id,
            messageId: sentMessageId,
            direction: 'outbound',
            sender: 'ai_bot',
            messageText: replyData.reply,
            status: 'sent',
          });
          await whatsappWebRepository.recordAiReplyOnChat(chat.id, replyData.reply);
        }
        await sock.sendPresenceUpdate('paused', senderJid);
        await whatsappWebRepository.flagChatForHuman(chat.id, 'AI escalated: needs a human');
        logger.warn({ tenantId, senderPhone, chatId: chat.id }, 'AI escalated this chat to a human');
      } else if (replyData && replyData.reply) {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const sentResult = await sock.sendMessage(senderJid, { text: replyData.reply });
        const sentMessageId = sentResult?.key?.id || `out_${Date.now()}`;

        await whatsappWebRepository.insertMessage(tenantId, {
          chatId: chat.id,
          messageId: sentMessageId,
          direction: 'outbound',
          sender: 'ai_bot',
          messageText: replyData.reply,
          status: 'sent',
        });

        await whatsappWebRepository.recordAiReplyOnChat(chat.id, replyData.reply);

        await sock.sendPresenceUpdate('paused', senderJid);
      }
    } catch (aiErr) {
      logger.error({ err: aiErr, tenantId, senderPhone }, 'Error generating AI WhatsApp auto-reply');
    } finally {
      aiInFlight.delete(chat.id);
    }
  }
}

/**
 * Produces an AI draft for one inbound message.
 *
 * Delegates to aiService.generateWhatsappReply, which already grounds the
 * model in the matching booking/lead, the agency's live packages with their
 * shareable itinerary links, and the last 8 messages of this conversation -
 * and which knows to emit [FALLBACK_HUMAN_NEEDED] when a question genuinely
 * needs a person. Callers must honour that marker rather than send it on.
 */
async function generateAiReplyForChat(tenantId, phone, message) {
  try {
    const limits = await planService.getTenantPlanLimits(tenantId);
    if (limits?.isExpired) {
      logger.info({ tenantId }, 'Tenant subscription expired - skipping AI auto-reply');
      return { reply: null, needsHuman: false };
    }
  } catch (e) {}

  if (!aiService.isConfigured()) {
    logger.warn({ tenantId }, 'Gemini is not configured - skipping AI reply');
    return { reply: null, needsHuman: false };
  }

  const { reply } = await aiService.generateWhatsappReply(
    tenantId,
    { phone, message },
    { onHistoryError: (err) => logger.warn({ err, tenantId, phone }, 'Could not load chat history for AI context') }
  );

  const text = (reply || '').trim();
  if (!text) return { reply: null, needsHuman: false };

  if (text.includes(HUMAN_HANDOFF_MARKER)) {
    const politeMessage = text.replace(HUMAN_HANDOFF_MARKER, '').trim();
    return { reply: politeMessage || null, needsHuman: true };
  }

  return { reply: text, needsHuman: false };
}

/**
 * Sends an agent's message - text, an attachment, or both.
 *
 * An attachment with no caption is a normal thing to send, so messageText is
 * optional whenever there is media. The uploaded copy is kept in our own
 * storage as well, because the socket only hands back a WhatsApp media
 * reference and the CRM has to be able to render the thread later.
 */
async function sendManualMessage(tenantId, { chatId, phone, jid: storedJid, messageText, mediaBuffer, fileName, mimeType, userId = null }) {
  // Paced so a linked number never sends faster than a person could type.
  // This is not an official API, so there is no published limit to respect -
  // which is precisely why the behaviour has to look human. See
  // whatsappRateLimiter for the reasoning.
  await whatsappRateLimiter.acquire(tenantId);

  let socketData = activeSockets.get(tenantId);

  // A stored session whose socket is not live yet - after a server restart, or
  // once WhatsApp has dropped the connection - is worth one resume attempt
  // before giving up. Failing straight to "scan the QR code" made the agent
  // re-pair a session that only needed reconnecting.
  if (!socketData?.sock?.user) {
    const stored = await whatsappWebRepository.getSession(tenantId);
    if (stored?.status === 'connected' || stored?.status === 'connecting') {
      logger.info({ tenantId }, 'Send requested with no live socket - attempting resume');
      try {
        await initWhatsAppSession(tenantId);
      } catch (err) {
        logger.warn({ err, tenantId }, 'Resume before send failed');
      }
      socketData = activeSockets.get(tenantId);
    }
  }

  const sock = socketData?.sock;
  if (!sock?.user) {
    throw new Error('WhatsApp is not connected right now. Open the chat page and scan the QR code to reconnect.');
  }

  const caption = (messageText || '').trim();
  const hasMedia = Boolean(mediaBuffer && mimeType);

  if (!hasMedia && !caption) {
    throw new Error('Nothing to send. Type a message or attach a file.');
  }

  // Prefer the address the customer actually wrote in from. Deriving it from
  // the phone number only works for plain @s.whatsapp.net chats.
  const jid = storedJid || getJidFromPhone(phone);

  let sentResult;
  let messageType = 'text';
  let mediaUrl = null;

  if (hasMedia) {
    const isImage = mimeType.startsWith('image/');
    messageType = isImage ? 'image' : 'document';

    // Stored before sending: if WhatsApp rejects the media we still want the
    // upload to have failed loudly here rather than leaving a message row
    // pointing at nothing.
    try {
      const folder = `whatsapp/outbound/${isImage ? 'images' : 'documents'}`;
      mediaUrl = await r2Service.uploadFile(mediaBuffer, fileName || 'attachment', mimeType, folder);
    } catch (err) {
      logger.error({ err, tenantId, chatId }, 'Could not store outgoing attachment');
    }

    if (isImage) {
      sentResult = await sock.sendMessage(jid, { image: mediaBuffer, caption });
    } else {
      // Everything that is not an image goes as a document, which is what
      // WhatsApp does for arbitrary files. The previous version only handled
      // pdf/document and silently sent nothing for anything else.
      sentResult = await sock.sendMessage(jid, {
        document: mediaBuffer,
        mimetype: mimeType,
        fileName: fileName || 'Attachment',
        caption,
      });
    }
  } else {
    sentResult = await sock.sendMessage(jid, { text: caption });
  }

  const messageId = sentResult?.key?.id || `out_${Date.now()}`;

  await whatsappWebRepository.insertMessage(tenantId, {
    chatId,
    messageId,
    direction: 'outbound',
    sender: 'agent',
    messageText: caption,
    status: 'sent',
    messageType,
    mediaUrl,
    // Which team member sent it. A shared inbox that cannot answer that
    // question is not much use to whoever runs the agency.
    userId,
  });

  // An agent replying is the escalation being handled, so the flag clears here
  // rather than needing a separate "mark as done" step.
  // The chat list needs something readable when only a file was sent.
  const preview = caption || (messageType === 'image' ? '📷 Photo' : `📄 ${fileName || 'Document'}`);
  await whatsappWebRepository.recordHumanReplyOnChat(chatId, preview);

  return { messageId, status: 'sent', mediaUrl, messageType };
}

async function disconnectSession(tenantId) {
  const socketData = activeSockets.get(tenantId);
  if (socketData?.sock) {
    try {
      await socketData.sock.logout();
    } catch (e) {}
  }
  activeSockets.delete(tenantId);
  whatsappRateLimiter.forget(tenantId);
  authFlushers.delete(tenantId);

  // The keys live in Postgres now; the directory is only cleared for tenants
  // linked before that change, so nothing stale is left behind on disk.
  await whatsappAuthState.clearAuthState(tenantId);
  try {
    fs.rmSync(getSessionPath(tenantId), { recursive: true, force: true });
  } catch (e) {}

  await whatsappWebRepository.markLoggedOut(tenantId);

  return { status: 'disconnected' };
}

/**
 * Fires once when an agent hands a live chat over to AI autopilot.
 *
 * Without this the AI stays silent until the customer happens to write again -
 * which, on a chat the agent just abandoned mid-thread, may be never. The
 * whole conversation is already in the prompt, so the reply picks up where the
 * agent left off rather than restarting the pitch.
 *
 * Deliberately does nothing when the last message was ours: the customer is
 * not waiting on us, and messaging them unprompted would read as spam.
 */
async function sendAiCatchUpMessage(tenantId, chatId) {
  const socketData = activeSockets.get(tenantId);
  const sock = socketData?.sock;
  // Same liveness test as sendManualMessage - a stored 'connected' row is not
  // a socket that can actually deliver.
  if (!sock?.user) return { sent: false, reason: 'not_connected' };

  const chat = await whatsappWebRepository.findChatById(tenantId, chatId);
  if (!chat) return { sent: false, reason: 'chat_not_found' };

  const last = await whatsappWebRepository.getLastMessage(tenantId, chatId);
  if (!last) return { sent: false, reason: 'no_messages' };
  if (last.direction !== 'inbound') return { sent: false, reason: 'customer_not_waiting' };

  // Toggling autopilot off and on again while the previous reply is still
  // being written would otherwise send the customer the same message twice.
  if (aiInFlight.has(chatId)) return { sent: false, reason: 'already_replying' };
  aiInFlight.add(chatId);

  try {
    const replyData = await generateAiReplyForChat(tenantId, chat.phone, last.message_text);
    if (replyData.needsHuman) {
      // The agent handed this to AI, but AI judged it a human's job. Hand it
      // straight back rather than leaving autopilot on to fail again.
      await whatsappWebRepository.flagChatForHuman(chatId, 'AI escalated: needs a human');
      logger.warn({ tenantId, chatId }, 'AI declined takeover and escalated back to a human');
      return { sent: false, reason: 'needs_human' };
    }
    if (!replyData.reply) return { sent: false, reason: 'no_reply' };

    const jid = chat.jid || getJidFromPhone(chat.phone);
    const sentResult = await sock.sendMessage(jid, { text: replyData.reply });
    const messageId = sentResult?.key?.id || `out_${Date.now()}`;

    await whatsappWebRepository.insertMessage(tenantId, {
      chatId,
      messageId,
      direction: 'outbound',
      sender: 'ai_bot',
      messageText: replyData.reply,
      status: 'sent',
    });
    await whatsappWebRepository.recordAiReplyOnChat(chatId, replyData.reply);

    logger.info({ tenantId, chatId }, 'AI autopilot sent a catch-up reply on takeover');
    return { sent: true, reply: replyData.reply };
  } finally {
    aiInFlight.delete(chatId);
  }
}

/**
 * The session's real state, as opposed to what the database remembers.
 *
 * Only a live socket can actually send, so 'connected' is reported only when
 * one exists. The stored row is a resume hint, not proof of a connection -
 * reporting it directly meant the inbox showed "Connected" while every send
 * failed with "WhatsApp is not connected", which is the worst of both. A
 * stored session with no live socket is 'connecting': we intend to resume it.
 */
async function getSessionStatus(tenantId) {
  const dbSession = await whatsappWebRepository.getSession(tenantId);
  const inMemory = activeSockets.get(tenantId);
  const hasLiveSocket = Boolean(inMemory?.sock?.user);

  let status;
  if (hasLiveSocket) {
    status = 'connected';
  } else if (inMemory?.status && inMemory.status !== 'connected') {
    // Mid-handshake states the socket itself reported: qrcode, connecting.
    status = inMemory.status;
  } else if (dbSession?.status === 'connected' || dbSession?.status === 'connecting') {
    status = 'connecting';
  } else {
    status = dbSession?.status || 'disconnected';
  }

  return {
    status,
    canSend: hasLiveSocket,
    qrCode: inMemory?.qr || dbSession?.qr_code_data || null,
    phoneNumber: dbSession?.phone_number || cleanPhone(jidNormalizedUser(inMemory?.sock?.user?.id || '').split('@')[0]) || '',
    connectedAt: dbSession?.connected_at || null,
    aiAutopilotEnabled: dbSession?.ai_autopilot_enabled === true,
  };
}

async function autoInitConnectedSessions() {
  try {
    const tenantIds = await whatsappWebRepository.listResumableTenantIds();

    // Spread the reconnections out. Every session used to be dialled at once,
    // so a restart with fifty linked agencies opened fifty WhatsApp
    // connections from one IP in the same second - which looks like an attack
    // rather than a deploy, and spikes memory while every auth state loads
    // together. A few seconds apart costs nothing and looks like what it is.
    logger.info({ sessions: tenantIds.length, gapMs: RESUME_STAGGER_MS }, 'Resuming WhatsApp sessions');

    for (let i = 0; i < tenantIds.length; i += 1) {
      const tenantId = tenantIds[i];
      setTimeout(() => {
        initWhatsAppSession(tenantId).catch((err) => {
          logger.warn({ tenantId, err }, 'Failed to auto-resume WhatsApp session');
        });
      }, i * RESUME_STAGGER_MS).unref?.();
    }
  } catch (err) {
    logger.error({ err }, 'Error checking sessions for auto-init');
  }
}

/**
 * Closes every WhatsApp socket cleanly, for shutdown.
 *
 * This matters most during a deploy. The platform starts the new container
 * before stopping the old one, so for a few seconds two processes hold a
 * socket for the same WhatsApp account - and WhatsApp allows exactly one,
 * kicking the loser with 440 (connectionReplaced). Letting the outgoing
 * process hang on until it is killed is what turned an ordinary deploy into a
 * disconnected inbox.
 *
 * `sock.end()`, never `sock.logout()`: end drops the connection, logout
 * unlinks the device from the phone and would force a fresh QR scan on every
 * single deploy - the exact opposite of the point.
 */
async function shutdownAllSessions() {
  const tenantIds = [...activeSockets.keys()];
  if (!tenantIds.length) return;

  logger.info({ sessions: tenantIds.length }, 'Closing WhatsApp sessions for shutdown');

  await Promise.all(
    tenantIds.map(async (tenantId) => {
      // Keys first: once the socket is gone there is nothing to persist for.
      const flushAuth = authFlushers.get(tenantId);
      if (flushAuth) {
        try {
          await flushAuth();
        } catch (err) {
          logger.warn({ tenantId, err }, 'Could not flush WhatsApp auth state on shutdown');
        }
      }

      const socketData = activeSockets.get(tenantId);
      try {
        socketData?.sock?.ev?.removeAllListeners();
        socketData?.sock?.end();
      } catch (err) {
        // Already closing or half-dead; nothing useful to do about it here.
      }
    })
  );

  activeSockets.clear();
  authFlushers.clear();
}

module.exports = {
  shutdownAllSessions,
  initWhatsAppSession,
  getSessionStatus,
  disconnectSession,
  sendManualMessage,
  sendAiCatchUpMessage,
  autoInitConnectedSessions,
};
