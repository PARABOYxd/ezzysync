const settingsService = require('./settingsService');
const settingsRepository = require('../repositories/settingsRepository');
const whatsappService = require('./whatsappService');
const whatsappWebRepository = require('../repositories/whatsappWebRepository');
const whatsappRepo = require('../repositories/whatsappRepository');
const leadRepository = require('../repositories/leadRepository');
const bookingRepository = require('../repositories/bookingRepository');
const aiPolicy = require('./whatsappAiPolicy');
const whatsappWindow = require('./whatsappWindowService');
const aiService = require('./aiService');
const { broadcastToTenant } = require('./websocketService');
const logger = require('../utils/logger');

function normalizePhone(phone = '') {
  let clean = phone.replace(/\D/g, '');
  // Remove leading zeros
  clean = clean.replace(/^0+/, '');
  // Prepend country code 91 if it is a 10 digit number
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
}

/**
 * Everything that happens once Meta's webhook payload has been accepted with
 * a 200. Moved out of the controller verbatim (same logic, same comments,
 * same order of operations) - only the raw `query()` calls were replaced
 * with the repository functions that already existed for the other WhatsApp
 * paths but this one bypassed. Behaviour is unchanged; this is relocation,
 * not a rewrite.
 */
async function processIncomingWebhook(body) {
  // Meta batches: one POST can carry several entries, each with several
  // changes, each with several messages and statuses. Reading only
  // entry[0].changes[0].value[0] silently dropped everything else, and
  // batching is exactly what happens under load or after an outage.
  const changes = (body.entry || []).flatMap((entry) => entry?.changes || []);
  for (const change of changes) {
    const value = change?.value;
    if (!value) continue;
    const phoneId = value.metadata?.phone_number_id;

    // Resolve Tenant ID
    const tenantId = await settingsRepository.getTenantIdByWhatsappPhoneNumberId(phoneId);
    // An unrecognised phone_number_id is dropped, not guessed at.
    //
    // This used to fall back to `SELECT id FROM tenants LIMIT 1` - an
    // arbitrary business. Someone else's customer conversation was then
    // written into that tenant's CRM: their inbox, their leads, and their
    // AI auto-replying to a stranger. A webhook we cannot attribute is not
    // ours to process.
    if (!tenantId) {
      logger.warn({ phoneId }, '[WhatsApp Webhook] No tenant owns this phone_number_id - ignoring event');
      continue;
    }
    logger.info({ phoneId, tenantId }, '[WhatsApp Webhook] Resolved tenant ID from phone_number_id');

    // Fetched once per tenant per webhook call, not once per message: this
    // used to be re-fetched (and re-decrypted) for every image/document
    // message and again for every AI-reply check, so a 5-message batch for
    // one tenant paid for the same unchanging settings row up to 10 times.
    const settings = await settingsService.getSettingsWithSecrets(tenantId);

    for (const message of value.messages || []) {
      const from = message.from; // Sender's phone number
      const contactName = value.contacts?.[0]?.profile?.name || '';
      const messageId = message.id; // wamid from Meta
      const msgTimestamp = message.timestamp; // Epoch seconds string from Meta

      let messageType = 'text';
      let mediaUrl = null;
      let text = '';

      // Duplicate guard — skip if we already processed this message ID
      const isDuplicate = await whatsappRepo.messageExistsByMessageId(tenantId, messageId);
      if (isDuplicate) {
        logger.info({ messageId, tenantId }, '[WhatsApp Webhook] Duplicate message ID — skipping to avoid double reply');
        continue; // this message only; the rest of the batch still runs
      }

      if (message.type === 'text') {
        text = message.text ? message.text.body : '';
      } else if (message.type === 'image') {
        messageType = 'image';
        text = message.image?.caption || '[Image]';
        mediaUrl = await whatsappService.downloadMetaMedia(message.image.id, settings);
      } else if (message.type === 'document') {
        messageType = 'document';
        text = message.document?.caption || message.document?.filename || '[Document]';
        mediaUrl = await whatsappService.downloadMetaMedia(message.document.id, settings);
      } else {
        text = `[Unsupported Media: ${message.type}]`;
      }

      logger.info({ tenantId, from, text, contactName, messageId, msgTimestamp, messageType, mediaUrl }, '[WhatsApp Webhook] Saving inbound message');

      // Save the inbound message to DB (increment unread count by 1).
      // New chats start human-handled, matching WhatsApp Web and Instagram:
      // AI is something an agent switches on for a chat, never a default.
      // (The old whatsapp_default_chat_mode setting column no longer
      // exists, so the previous lookup always fell through to 'ai'.)
      const saved = await whatsappRepo.saveMessage(
        tenantId,
        from,
        'inbound',
        text,
        contactName,
        1,
        messageId,
        'read',
        msgTimestamp,
        messageType,
        mediaUrl,
        false
      );

      logger.info({ dbMessageId: saved.message.id, chatId: saved.chat.id }, '[WhatsApp Webhook] Inbound message saved successfully');

      // "STOP" has to end it here too. A customer who cannot make the
      // messages stop blocks and reports the number instead.
      if (aiPolicy.isOptOutRequest(text)) {
        await whatsappWebRepository.setChatOptedOut(tenantId, saved.chat.id, true);
        logger.info({ tenantId, chatId: saved.chat.id }, '[WhatsApp Webhook] Customer opted out');
        continue;
      }

      // Auto-capture Lead if it doesn't exist in CRM leads or bookings
      try {
        const cleanPhone = normalizePhone(from);

        const [leadExists, bookingExists] = await Promise.all([
          leadRepository.existsByPhone(tenantId, cleanPhone),
          bookingRepository.existsByPhone(tenantId, cleanPhone),
        ]);

        if (!leadExists && !bookingExists) {
          const leadService = require('./leadService');
          await leadService.createLead(
            tenantId,
            {
              customerName: contactName || 'WhatsApp Contact',
              phone: cleanPhone,
              interest: 'Inquiry via WhatsApp',
              source: 'WhatsApp',
              stage: 'New',
              notes: `Auto-captured from first WhatsApp message: "${text}"`,
              bypassDuplicateCheck: true,
            },
            'WhatsApp Bot'
          );
          logger.info({ tenantId, phone: cleanPhone }, '[WhatsApp Webhook] Auto-created new Lead for inbound message (not in leads or bookings)');

          // Links this chat back to the lead it just spawned - the Baileys/QR
          // transport already does this at chat-creation time; the Cloud API
          // path creates the lead a step later, so it needs its own link-up.
          try {
            const newLeadRow = await leadRepository.findByPhone(tenantId, cleanPhone);
            if (newLeadRow) {
              await whatsappRepo.setChatLeadId(tenantId, saved.chat.id, newLeadRow.id);
            }
          } catch (linkErr) {
            logger.warn({ err: linkErr }, '[WhatsApp Webhook] Could not link chat to its new lead');
          }
        }
      } catch (leadErr) {
        logger.error({ err: leadErr }, '[WhatsApp Webhook] Failed to auto-create Lead from inbound message');
      }

      // Broadcast to tenant's WebSocket clients for the incoming message
      broadcastToTenant(tenantId, {
        type: 'WHATSAPP_MESSAGE_RECEIVED',
        chat: saved.chat,
        message: saved.message
      });

      // Trigger Automated AI Reply if enabled
      try {
        // The same gates the QR path applies. This used to check only
        // ai_enabled and needs_human, so on Cloud API a customer's "STOP"
        // was ignored, a tenant whose plan no longer includes AI still got
        // automated replies, and a redelivered webhook could answer twice.
        const verdict = await aiPolicy.canAiReply(tenantId, saved.chat, {
          messageAgeSeconds: msgTimestamp
            ? Math.max(0, Math.floor(Date.now() / 1000) - Number(msgTimestamp))
            : 0,
          isBacklog: false,
        });

        // An automated reply is free-form, so Meta will only deliver it
        // inside the 24-hour window. In practice the window is always
        // open here - the AI answers a message the customer just sent -
        // but only because AI_REPLY_MAX_AGE_SECONDS happens to be fifteen
        // minutes, and that is an environment variable anyone can raise
        // above 24 hours. Checked rather than assumed: without this, the
        // send fails at Meta with 131047 and the webhook's catch swallows
        // it, so the customer gets nothing and the log says nothing.
        const chatRow = await whatsappWebRepository.findChatById(tenantId, saved.chat.id);
        const windowState = whatsappWindow.getWindowState(chatRow || saved.chat);
        if (windowState.applies && !windowState.isOpen) {
          logger.warn(
            { tenantId, chatId: saved.chat.id },
            '[WhatsApp Webhook] Window closed - not sending an automated reply'
          );
          continue;
        }

        if (settings.whatsappAiAutoReply !== false && verdict.allowed && aiPolicy.claim(saved.chat.id)) {
          // Human-like delay, and time for the rest of a burst to arrive.
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // A newer message arriving during the wait is part of the same burst.
          // It used to make this handler skip, on the theory that the newer
          // message's own handler would answer - but that handler could not
          // claim the chat (this one holds it) and had already given up, so a
          // burst got no reply at all. The claim holder answers the whole
          // burst: the recent messages are combined just below.
          const newerMsg = await whatsappRepo.findNewerInboundMessage(tenantId, saved.chat.id, saved.message.id);
          if (newerMsg) {
            logger.info({ tenantId, from, newerMsgId: newerMsg.id }, '[WhatsApp Webhook] More messages arrived during the wait - answering the burst together');
          }

          // Fetch the customer's most recent messages, so the reply answers
          // the whole burst rather than only the first line of it.
          const recentInbound = await whatsappRepo.listRecentInboundMessages(tenantId, saved.chat.id, 3);
          const latestText = recentInbound.length > 0 ? recentInbound.join(' ') : text;

          // Spent here, after the burst has been waited out, so a customer
          // sending three quick messages costs one action, not three.
          const allowance = await require('./aiUsageService').tryConsume(tenantId, 'autopilot_reply');
          if (!allowance.ok) {
            logger.info({ tenantId, from }, '[WhatsApp Webhook] Monthly AI allowance used up - leaving the chat for a person');
            aiPolicy.release(saved.chat.id);
            continue;
          }

          logger.info({ tenantId, from }, '[WhatsApp Webhook] Initiating AI auto-reply generation');

          // Broadcast AI typing state to WebSocket clients
          broadcastToTenant(tenantId, {
            type: 'WHATSAPP_AI_TYPING',
            chatId: saved.chat.id,
            typing: true
          });

          try {
            const aiReplyResult = await aiService.generateWhatsappReply(
              tenantId,
              { phone: from, message: latestText },
              { onHistoryError: (err) => logger.warn({ err }, 'Error fetching follow-up history for live webhook context') }
            );

            if (aiReplyResult && aiReplyResult.reply) {
              const replyText = aiReplyResult.reply.trim();

              if (replyText === '[FALLBACK_HUMAN_NEEDED]') {
                logger.info({ tenantId, from }, '[WhatsApp Webhook] AI fallback triggered. Sending handoff message then switching to human.');

                // Send a polite handoff message to the customer before switching
                try {
                  const handoffMsg = `🙏 Thank you for reaching out! Our travel expert will connect with you shortly to assist you better. Please hold on!`;
                  const mockBooking = { phone: from, bookingId: 'CHAT' };
                  await whatsappService.sendWhatsAppMessage(mockBooking, settings, null, handoffMsg);
                  // Save handoff message to DB
                  await whatsappRepo.saveMessage(
                    tenantId, from, 'outbound', handoffMsg,
                    saved.chat.customer_name || from, 0, null
                  );
                } catch (handoffErr) {
                  logger.warn({ err: handoffErr }, '[WhatsApp Webhook] Failed to send handoff message');
                }

                // Hand this chat to a human
                await whatsappRepo.setChatAiEnabled(tenantId, saved.chat.id, false);

                // Broadcast handoff notification to websocket clients
                broadcastToTenant(tenantId, {
                  type: 'WHATSAPP_HUMAN_HANDOFF_TRIGGERED',
                  chatId: saved.chat.id,
                  customerName: saved.chat.customer_name || from,
                  phone: from
                });
                // Reload chats to reflect the handover
                broadcastToTenant(tenantId, {
                  type: 'WHATSAPP_MESSAGE_RECEIVED',
                  chat: { ...saved.chat, ai_enabled: false, needs_human: true },
                  message: null
                });

              } else {
                logger.info({ tenantId, from, replyText }, '[WhatsApp Webhook] Sending automated AI response');

                // Send response via WhatsApp Service
                const mockBooking = { phone: from, bookingId: 'CHAT' };
                const sendResult = await whatsappService.sendWhatsAppMessage(
                  mockBooking,
                  settings,
                  null, // no media for auto-reply
                  replyText
                );

                const outboundMessageId = sendResult?.messages?.[0]?.id || null;

                // Save outbound message to DB
                const outboundSaved = await whatsappRepo.saveMessage(
                  tenantId,
                  from,
                  'outbound',
                  replyText,
                  saved.chat.customer_name || from,
                  0,
                  outboundMessageId
                );

                // Broadcast outbound message to websocket clients
                broadcastToTenant(tenantId, {
                  type: 'WHATSAPP_MESSAGE_RECEIVED',
                  chat: outboundSaved.chat,
                  message: outboundSaved.message
                });

                // Best-effort: fill in whichever of the lead's own missing
                // fields (trip/travelers/departure) the conversation now
                // confidently contains. Reads its own fresh copy of the
                // history rather than reusing the AI reply's context, and
                // never overwrites a field the lead already has - see
                // leadService.autoFillFromConversation for the safety rules.
                // Never allowed to affect the reply that was already sent.
                try {
                  const aiContextRepository = require('../repositories/aiContextRepository');
                  const leadService = require('./leadService');
                  const historyRows = await aiContextRepository.getChatHistoryByPhone(tenantId, from, 20);
                  const conversationText = historyRows
                    .map((r) => `${r.direction === 'inbound' ? 'Customer' : 'Agent'}: ${r.message_text || ''}`)
                    .join('\n');
                  await leadService.autoFillFromConversation(tenantId, from, conversationText);
                } catch (fillErr) {
                  logger.warn({ err: fillErr }, '[WhatsApp Webhook] Lead auto-fill from conversation failed');
                }
              }
            } else {
              logger.warn({ tenantId, from }, '[WhatsApp Webhook] AI returned no response or GEMINI_API_KEY is unconfigured. Triggering fallback handoff.');
              try {
                const fallbackMsg = `🙏 Thank you for contacting us! Our team has received your message and will assist you shortly.`;
                const mockBooking = { phone: from, bookingId: 'CHAT' };
                await whatsappService.sendWhatsAppMessage(mockBooking, settings, null, fallbackMsg);
                const outboundSaved = await whatsappRepo.saveMessage(
                  tenantId,
                  from,
                  'outbound',
                  fallbackMsg,
                  saved.chat.customer_name || from,
                  0,
                  null
                );
                broadcastToTenant(tenantId, {
                  type: 'WHATSAPP_MESSAGE_RECEIVED',
                  chat: outboundSaved.chat,
                  message: outboundSaved.message
                });
              } catch (fbErr) {
                logger.warn({ err: fbErr }, '[WhatsApp Webhook] Failed to send fallback handoff message');
              }
            }
          } catch (aiErr) {
            logger.error({ err: aiErr }, '[WhatsApp Webhook] Error during AI auto-reply processing');
          } finally {
            aiPolicy.release(saved.chat.id);
            // Broadcast AI typing completed
            broadcastToTenant(tenantId, {
              type: 'WHATSAPP_AI_TYPING',
              chatId: saved.chat.id,
              typing: false
            });
          }
        }
      } catch (aiErr) {
        logger.error({ err: aiErr }, '[WhatsApp Webhook] Error during AI auto-reply processing');
      }
    }

    // Handle Status Updates (sent, delivered, read)
    for (const statusObj of value.statuses || []) {
      const messageId = statusObj.id;
      const status = statusObj.status; // 'sent', 'delivered', 'read' or 'failed'

      logger.info({ tenantId, messageId, status }, '[WhatsApp Webhook] Processing status update');

      // Update message status in the DB
      const updatedMessage = await whatsappRepo.updateMessageStatus(tenantId, messageId, status);
      if (updatedMessage) {
        logger.info({ messageId, status, chatId: updatedMessage.chat_id }, '[WhatsApp Webhook] Message status updated in database');
        // Broadcast the status update to WebSocket clients
        broadcastToTenant(tenantId, {
          type: 'WHATSAPP_STATUS_UPDATED',
          messageId,
          status,
          chatId: updatedMessage.chat_id
        });
      } else {
        logger.warn({ messageId, status }, '[WhatsApp Webhook] Message ID not found in database, status update skipped');
      }
    }
  }
}

module.exports = { processIncomingWebhook, normalizePhone };
