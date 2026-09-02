const path = require('path');
const fs = require('fs');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
  isJidGroup,
  isJidBroadcast,
  isJidNewsletter,
  isLidUser,
  jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const whatsappWebRepository = require('../repositories/whatsappWebRepository');
const logger = require('../utils/logger');
const aiService = require('./aiService');
const planService = require('./planService');

// aiService emits this exact token instead of a reply when the model decides a
// human should take over. It must never reach the customer.
const HUMAN_HANDOFF_MARKER = '[FALLBACK_HUMAN_NEEDED]';

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

// Map to hold active Baileys socket connections per tenantId
const activeSockets = new Map();
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

function extractMessageText(msg) {
  if (!msg.message) return '';
  const m = msg.message;
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

  const sessionPath = getSessionPath(tenantId);

  // If starting fresh scan and not already connected, clean up stale unlinked session files
  if (forceNew) {
    const existing = activeSockets.get(tenantId);
    if (existing?.sock) {
      try {
        existing.sock.ev.removeAllListeners();
        existing.sock.end();
      } catch (e) {}
    }
    activeSockets.delete(tenantId);

    // Only wipe the directory when there is no usable pairing to keep.
    // NOTE: do not test creds.registered here - Baileys only ever sets that
    // flag on the pairing-code path (Socket/messages-recv.js), so for the QR
    // flow it stays false forever and this check would delete a perfectly
    // good session on every reconnect. creds.me.id is what QR pairing fills in.
    const credsPath = path.join(sessionPath, 'creds.json');
    let isRegistered = false;
    if (fs.existsSync(credsPath)) {
      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        isRegistered = !!(creds.me?.id || creds.registered);
      } catch (e) {}
    }

    if (!isRegistered) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        fs.mkdirSync(sessionPath, { recursive: true });
      } catch (e) {}
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
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
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      logger.warn(
        { tenantId, statusCode, shouldReconnect },
        'WhatsApp Web socket connection closed'
      );

      if (statusCode === DisconnectReason.loggedOut) {
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
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
      const phoneNumber = cleanPhone(sock.user?.id || '');
      logger.info({ tenantId, phoneNumber }, 'WhatsApp Web connected successfully!');

      activeSockets.set(tenantId, { sock, qr: null, status: 'connected' });
      await whatsappWebRepository.markConnected(tenantId, phoneNumber);
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

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
      const messageId = msg.key.id;

      if (!messageText) continue;

      // A message the linked account sent itself. That is either the agent
      // replying from their own phone - which the CRM was dropping entirely,
      // so the thread looked one-sided - or an echo of something this server
      // just sent, which the message_id conflict swallows.
      if (msg.key.fromMe) {
        try {
          await recordOwnOutgoingMessage(tenantId, { senderPhone, messageText, messageId });
        } catch (err) {
          logger.error({ err, tenantId, senderPhone }, 'Error recording message sent from the phone');
        }
        continue;
      }

      try {
        await processInboundMessage(tenantId, {
          senderJid,
          senderPhone,
          pushName,
          messageText,
          messageId,
          sock,
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
async function recordOwnOutgoingMessage(tenantId, { senderPhone, messageText, messageId }) {
  const chat = await whatsappWebRepository.findChatByPhone(tenantId, senderPhone);
  if (!chat) return;

  const inserted = await whatsappWebRepository.insertMessage(tenantId, {
    chatId: chat.id,
    messageId,
    direction: 'outbound',
    sender: 'agent',
    messageText,
    status: 'sent',
  });

  // Nothing inserted means this was the echo of a message the server sent, so
  // the chat row is already up to date and AI state must not be touched.
  if (!inserted.inserted) return;

  // A human answering from their phone is a human takeover, same as replying
  // in the app - so autopilot stands down and any escalation is cleared.
  await whatsappWebRepository.recordHumanReplyOnChat(chat.id, messageText);

  logger.info({ tenantId, chatId: chat.id }, 'Recorded a reply sent from the linked phone');
}

/**
 * Handles inbound message processing, chat upsert, lead auto-creation, and Gemini AI auto-reply.
 */
async function processInboundMessage(tenantId, { senderJid, senderPhone, pushName, messageText, messageId, sock }) {
  let chat = await whatsappWebRepository.findChatByPhone(tenantId, senderPhone);

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
      lastMessage: messageText,
      aiEnabled: aiDefault,
    });
  } else {
    // jid is refreshed on every inbound message so a chat created before this
    // column existed (or one whose addressing WhatsApp has since migrated to
    // @lid) picks up a routable address the first time the customer writes in.
    await whatsappWebRepository.recordInboundOnChat(chat.id, {
      lastMessage: messageText,
      pushName,
      jid: senderJid,
    });
  }

  await whatsappWebRepository.insertMessage(tenantId, {
    chatId: chat.id,
    messageId,
    direction: 'inbound',
    sender: 'customer',
    messageText,
    status: 'delivered',
  });

  // This chat's own switch is the only thing that decides. The tenant-level
  // setting is a default applied when a chat is first created, not a veto
  // held over every chat afterwards - otherwise turning AI on for one
  // conversation silently does nothing until a global switch is also found.
  //
  // needs_human is re-checked here as well as in the toggle: an escalation
  // must survive regardless of how the flags were set, since sending anything
  // on a chat the AI already backed away from is the worst outcome.
  const chatAiEnabled = chat.ai_enabled === true && chat.needs_human !== true;

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
        // Beyond the AI's remit. Send nothing at all - a half-guess here is
        // worse than silence - and switch autopilot off for this chat so the
        // next message does not run the same losing decision again. The flag
        // is what puts it in front of an agent.
        await sock.sendPresenceUpdate('paused', senderJid);
        await whatsappWebRepository.flagChatForHuman(chat.id, 'AI escalated: needs a human');
        logger.warn({ tenantId, senderPhone, chatId: chat.id }, 'AI escalated this chat to a human - no reply sent');
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
    return { reply: null, needsHuman: true };
  }

  return { reply: text, needsHuman: false };
}

async function sendManualMessage(tenantId, { chatId, phone, jid: storedJid, messageText, mediaBuffer, fileName, mimeType }) {
  const socketData = activeSockets.get(tenantId);
  const sock = socketData?.sock;

  if (!sock || socketData?.status !== 'connected') {
    throw new Error('WhatsApp is not connected. Please scan the QR code first.');
  }

  // Prefer the address the customer actually wrote in from. Deriving it from
  // the phone number only works for plain @s.whatsapp.net chats.
  const jid = storedJid || getJidFromPhone(phone);
  let sentResult;

  if (mediaBuffer && mimeType) {
    if (mimeType.includes('pdf') || mimeType.includes('document')) {
      sentResult = await sock.sendMessage(jid, {
        document: mediaBuffer,
        mimetype: mimeType,
        fileName: fileName || 'Document.pdf',
        caption: messageText || '',
      });
    } else if (mimeType.includes('image')) {
      sentResult = await sock.sendMessage(jid, {
        image: mediaBuffer,
        caption: messageText || '',
      });
    }
  } else {
    sentResult = await sock.sendMessage(jid, { text: messageText });
  }

  const messageId = sentResult?.key?.id || `out_${Date.now()}`;

  await whatsappWebRepository.insertMessage(tenantId, {
    chatId,
    messageId,
    direction: 'outbound',
    sender: 'agent',
    messageText,
    status: 'sent',
  });

  // An agent replying is the escalation being handled, so the flag clears here
  // rather than needing a separate "mark as done" step.
  await whatsappWebRepository.recordHumanReplyOnChat(chatId, messageText);

  return { messageId, status: 'sent' };
}

async function disconnectSession(tenantId) {
  const socketData = activeSockets.get(tenantId);
  if (socketData?.sock) {
    try {
      await socketData.sock.logout();
    } catch (e) {}
  }
  activeSockets.delete(tenantId);

  const sessionPath = getSessionPath(tenantId);
  try {
    fs.rmSync(sessionPath, { recursive: true, force: true });
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
  if (!sock || socketData.status !== 'connected') return { sent: false, reason: 'not_connected' };

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

async function getSessionStatus(tenantId) {
  const dbSession = await whatsappWebRepository.getSession(tenantId);
  const inMemory = activeSockets.get(tenantId);

  return {
    status: inMemory?.status || dbSession?.status || 'disconnected',
    qrCode: inMemory?.qr || dbSession?.qr_code_data || null,
    phoneNumber: dbSession?.phone_number || inMemory?.sock?.user?.id || '',
    connectedAt: dbSession?.connected_at || null,
    aiAutopilotEnabled: dbSession?.ai_autopilot_enabled !== false,
  };
}

async function autoInitConnectedSessions() {
  try {
    const tenantIds = await whatsappWebRepository.listResumableTenantIds();
    for (const tenantId of tenantIds) {
      initWhatsAppSession(tenantId).catch((err) => {
        logger.warn({ tenantId, err }, 'Failed to auto-resume WhatsApp session');
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error checking sessions for auto-init');
  }
}

module.exports = {
  initWhatsAppSession,
  getSessionStatus,
  disconnectSession,
  sendManualMessage,
  sendAiCatchUpMessage,
  autoInitConnectedSessions,
};
