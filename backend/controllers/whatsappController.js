const env = require('../config/env');
const bookingService = require('../services/bookingService');
const settingsService = require('../services/settingsService');
const whatsappService = require('../services/whatsappService');
const whatsappRepo = require('../repositories/whatsappRepository');
const aiService = require('../services/aiService');
const { query } = require('../config/db');
const { broadcastToTenant } = require('../services/websocketService');
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

async function sendMessage(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.user.tenantId, req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    const settings = await settingsService.getSettings(req.user.tenantId);
    // Optional public link to a hosted invoice PDF, e.g. from your own
    // /api/invoices/:bookingId/download endpoint if it's publicly reachable,
    // or a cloud storage signed URL. Falls back to a text-only message.
    const mediaLink = req.body.mediaLink || null;
    const messageText = req.body.messageText || null;

    const result = await whatsappService.sendWhatsAppMessage(booking, settings, mediaLink, messageText);
    
    // Save to the database as outbound chat message
    try {
      const text = messageText || whatsappService.buildMessageText(booking, settings);
      const cleanPhone = normalizePhone(booking.phone);
      const messageId = result?.messages?.[0]?.id || null;
      const saved = await whatsappRepo.saveMessage(req.user.tenantId, cleanPhone, 'outbound', text, booking.customerName, 0, messageId);

      // Broadcast to WebSocket clients so it refreshes live in the chat interface
      broadcastToTenant(req.user.tenantId, {
        type: 'WHATSAPP_MESSAGE_RECEIVED',
        chat: saved.chat,
        message: saved.message
      });
    } catch (dbErr) {
      // eslint-disable-next-line no-console
      console.error('[WhatsApp Chat History] Failed to save sent message to history:', dbErr);
    }

    res.json({ message: 'WhatsApp message sent.', result });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all active chats.
 */
async function getChats(req, res, next) {
  try {
    const chats = await whatsappRepo.getChats(req.user.tenantId);
    res.json({ chats });
  } catch (err) {
    next(err);
  }
}

/**
 * Start a new chat with a phone number.
 */
async function startNewChat(req, res, next) {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });

    const cleanPhone = normalizePhone(phone);
    const tenantId = req.user.tenantId;

    // Check if the chat already exists
    const { rows } = await query(
      `SELECT * FROM whatsapp_chats WHERE tenant_id = $1 AND phone = $2`,
      [tenantId, cleanPhone]
    );

    let chat;
    if (rows.length > 0) {
      chat = rows[0];
    } else {
      // Check default chat mode from settings
      const settings = await settingsService.getSettings(tenantId);
      const defaultChatMode = settings?.whatsappDefaultChatMode || 'ai';

      // Create new chat header
      const insertRes = await query(
        `INSERT INTO whatsapp_chats (tenant_id, phone, customer_name, last_message, last_message_timestamp, unread_count, managed_by)
         VALUES ($1, $2, $3, $4, now(), 0, $5)
         RETURNING *`,
        [tenantId, cleanPhone, cleanPhone, 'Chat initiated', defaultChatMode]
      );
      chat = insertRes.rows[0];
    }

    res.json({ chat });
  } catch (err) {
    next(err);
  }
}

/**
 * Get message thread for a chat.
 */
async function getChatMessages(req, res, next) {
  try {
    const messages = await whatsappRepo.getChatMessages(req.user.tenantId, req.params.chatId);
    // eslint-disable-next-line no-console
    console.log('API returning messages for chat:', req.params.chatId, messages);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

/**
 * Send a chat message (outbound).
 */
async function sendChatMessage(req, res, next) {
  try {
    const { chatId } = req.params;
    const { text, mediaLink, mediaType, filename, templateName, languageCode } = req.body;
    
    // Find the chat details to get the phone number
    const { rows } = await query(
      `SELECT * FROM whatsapp_chats WHERE tenant_id = $1 AND id = $2`,
      [req.user.tenantId, chatId]
    );
    const chat = rows[0];
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });

    // Update chat to human-managed since the admin is manually typing a reply
    await query(
      `UPDATE whatsapp_chats SET managed_by = 'human', updated_at = now() WHERE tenant_id = $1 AND id = $2`,
      [req.user.tenantId, chatId]
    );

    const settings = await settingsService.getSettings(req.user.tenantId);

    let templateComponents = null;
    let messageTextToSave = text;

    if (templateName) {
      const cleanTplName = templateName.trim();
      const strippedTplName = cleanTplName.replace(/^\//, '');
      const tplQuery = await query(
        `SELECT body, variables_map FROM whatsapp_templates 
         WHERE tenant_id = $1 AND (name = $2 OR name = $3 OR name = $4) 
         LIMIT 1`,
        [req.user.tenantId, cleanTplName, strippedTplName, `/${strippedTplName}`]
      );

      if (tplQuery.rows.length > 0) {
        const tpl = tplQuery.rows[0];
        messageTextToSave = messageTextToSave || tpl.body;
        const varMap = typeof tpl.variables_map === 'string' ? JSON.parse(tpl.variables_map) : (tpl.variables_map || {});
        
        const paramKeys = Object.keys(varMap).sort((a, b) => parseInt(a) - parseInt(b));
        if (paramKeys.length > 0) {
          const params = [];
          for (const k of paramKeys) {
            const field = varMap[k];
            let val = '';
            if (field === 'customer_name') val = chat.customer_name || 'Customer';
            else if (field === 'customer_phone') val = chat.phone || '';
            else if (field === 'company_name') val = settings.companyName || 'EzzySync';
            else if (field === 'trip_name') val = chat.package_name || 'Trip';
            else if (field === 'departure_date') val = 'Upcoming Date';
            else if (field === 'total_price') val = '₹0';
            else if (field === 'invoice_link') val = '';
            else val = settings.companyName || 'EzzySync';

            params.push({ type: 'text', text: val || 'N/A' });

            if (messageTextToSave) {
              const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
              messageTextToSave = messageTextToSave.replace(regex, val || 'N/A');
            }
          }

          templateComponents = [
            {
              type: 'body',
              parameters: params
            }
          ];
        }
      }
    }

    if (messageTextToSave) {
      const companyName = settings?.companyName || 'EzzySync';
      const customerName = chat.customer_name || 'Customer';
      messageTextToSave = messageTextToSave
        .replace(/\{\{1\}\}/g, companyName)
        .replace(/\{\{2\}\}/g, customerName);
    }

    // Send using current WhatsApp service
    const mockBooking = { phone: chat.phone, bookingId: 'CHAT' };
    const result = await whatsappService.sendWhatsAppMessage(
      mockBooking,
      settings,
      mediaLink,
      text,
      mediaType,
      filename,
      templateName,
      languageCode,
      templateComponents
    );
    const messageId = result?.messages?.[0]?.id || null;

    // Save as outbound message (storing media parameters in the database)
    const saved = await whatsappRepo.saveMessage(
      req.user.tenantId,
      chat.phone,
      'outbound',
      messageTextToSave || (filename || (mediaType === 'image' ? 'Image' : 'Document.pdf')),
      null,
      0,
      messageId,
      'sent',
      null,
      templateName ? 'template' : (mediaType || 'text'),
      mediaLink || null
    );

    res.json({ message: 'Message sent successfully.', chat: saved.chat, messageData: saved.message });
  } catch (err) {
    next(err);
  }
}

/**
 * Reset unread count for a chat.
 */
async function readChat(req, res, next) {
  try {
    const chat = await whatsappRepo.resetUnreadCount(req.user.tenantId, req.params.chatId);
    res.json({ chat });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /webhook request from Meta to verify the webhook token challenge.
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === env.whatsapp.verifyToken) {
      // Respond with the challenge token from the request
      return res.status(200).send(challenge);
    }
  }
  return res.status(403).json({ message: 'Verification failed.' });
}

/**
 * Handles POST /webhook notification events from Meta (async).
 */
async function receiveWebhook(req, res) {
  const body = req.body;
  
  logger.info({ body }, '[WhatsApp Webhook] Full Incoming Payload');

  // Check if this is an event from a WhatsApp API subscription
  if (body.object === 'whatsapp_business_account') {
    // Return a '200 OK' response to Meta quickly to avoid request retries
    res.status(200).send('EVENT_RECEIVED');

    try {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value) {
        const value = body.entry[0].changes[0].value;
        const phoneId = value.metadata?.phone_number_id;

        // Resolve Tenant ID
        const tenantRows = await query(
          `SELECT tenant_id FROM settings WHERE whatsapp_phone_number_id = $1`,
          [phoneId]
        );
        let tenantId;
        if (tenantRows.rows.length > 0) {
          tenantId = tenantRows.rows[0].tenant_id;
          logger.info({ phoneId, tenantId }, '[WhatsApp Webhook] Resolved tenant ID from phone_number_id');
        } else {
          const fallback = await query(`SELECT id FROM tenants LIMIT 1`);
          tenantId = fallback.rows[0]?.id;
          logger.info({ phoneId, fallbackTenantId: tenantId }, '[WhatsApp Webhook] Using fallback tenant ID (phone_number_id not matched)');
        }

        if (tenantId && value.messages && value.messages[0]) {
          const message = value.messages[0];
          const from = message.from; // Sender's phone number
          const contactName = value.contacts?.[0]?.profile?.name || '';
          const messageId = message.id; // wamid from Meta
          const msgTimestamp = message.timestamp; // Epoch seconds string from Meta

          let messageType = 'text';
          let mediaUrl = null;
          let text = '';

          // Duplicate guard — skip if we already processed this message ID
          const dupCheck = await query(
            `SELECT id FROM whatsapp_messages WHERE message_id = $1 AND tenant_id = $2 LIMIT 1`,
            [messageId, tenantId]
          );
          if (dupCheck.rows.length > 0) {
            logger.info({ messageId, tenantId }, '[WhatsApp Webhook] Duplicate message ID — skipping to avoid double reply');
            return; // 200 already sent at top of handler
          }


          if (message.type === 'text') {
            text = message.text ? message.text.body : '';
          } else if (message.type === 'image') {
            messageType = 'image';
            text = message.image?.caption || '[Image]';
            const settings = await settingsService.getSettings(tenantId);
            mediaUrl = await whatsappService.downloadMetaMedia(message.image.id, settings);
          } else if (message.type === 'document') {
            messageType = 'document';
            text = message.document?.caption || message.document?.filename || '[Document]';
            const settings = await settingsService.getSettings(tenantId);
            mediaUrl = await whatsappService.downloadMetaMedia(message.document.id, settings);
          } else {
            text = `[Unsupported Media: ${message.type}]`;
          }

          logger.info({ tenantId, from, text, contactName, messageId, msgTimestamp, messageType, mediaUrl }, '[WhatsApp Webhook] Saving inbound message');

          // Save the inbound message to DB (increment unread count by 1)
          // Fetch settings first to get admin-configured default chat mode
          const inboundSettings = await settingsService.getSettings(tenantId);
          const defaultChatMode = inboundSettings?.whatsappDefaultChatMode || 'ai';

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
            defaultChatMode
          );

          logger.info({ dbMessageId: saved.message.id, chatId: saved.chat.id }, '[WhatsApp Webhook] Inbound message saved successfully');

          // Auto-capture Lead if it doesn't exist in CRM leads or bookings
          try {
            const cleanPhone = normalizePhone(from);
            
            // Check if lead exists
            const existingLead = await query(
              `SELECT lead_id FROM leads WHERE tenant_id = $1 AND (phone = $2 OR phone LIKE $3) AND deleted = FALSE LIMIT 1`,
              [tenantId, cleanPhone, `%${cleanPhone}`]
            );

            // Check if booking exists
            const existingBooking = await query(
              `SELECT id FROM bookings WHERE tenant_id = $1 AND (phone = $2 OR phone LIKE $3) LIMIT 1`,
              [tenantId, cleanPhone, `%${cleanPhone}`]
            );

            if (existingLead.rows.length === 0 && existingBooking.rows.length === 0) {
              const leadService = require('../services/leadService');
              await leadService.createLead(
                tenantId,
                {
                  customerName: contactName || 'WhatsApp Contact',
                  phone: cleanPhone,
                  interest: 'Inquiry via WhatsApp',
                  source: 'WhatsApp',
                  stage: 'New',
                  notes: `Auto-captured from first WhatsApp message: "${text}"`,
                },
                'WhatsApp Bot'
              );
              logger.info({ tenantId, phone: cleanPhone }, '[WhatsApp Webhook] Auto-created new Lead for inbound message (not in leads or bookings)');
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
            const settings = await settingsService.getSettings(tenantId);
            const chatManagedBy = saved.chat.managed_by || 'ai';

            if (settings.whatsappAiAutoReply === true && chatManagedBy === 'ai') {
              // ── Human-like delay: wait 5 seconds before replying ──────────────
              // This also acts as a debounce — if the customer sends another
              // message within these 5 seconds we will detect it below and skip.
              await new Promise((resolve) => setTimeout(resolve, 5000));

              // ── Debounce guard: check if a newer message arrived from this
              // sender during the 5-second delay. Use integer id comparison
              // (more reliable than timestamp which can collide in same second).
              const newerMsg = await query(
                `SELECT id, message_text FROM whatsapp_messages
                 WHERE tenant_id = $1
                   AND chat_id = $2
                   AND direction = 'inbound'
                   AND id > $3
                 ORDER BY id DESC
                 LIMIT 1`,
                [tenantId, saved.chat.id, saved.message.id]
              );
              if (newerMsg.rows.length > 0) {
                // A newer message exists — only the LAST message handler should reply.
                // Let all earlier ones skip; the last one will have no newer msg and will reply.
                logger.info({ tenantId, from, newerMsgId: newerMsg.rows[0].id }, '[WhatsApp Webhook] Newer message detected — skipping, last message will reply');
                return; // 200 already sent at top of handler
              }

              // This IS the latest message — fetch the most recent inbound text
              // (combines all messages the customer sent in this burst)
              const recentInbound = await query(
                `SELECT message_text FROM whatsapp_messages
                 WHERE tenant_id = $1 AND chat_id = $2 AND direction = 'inbound'
                 ORDER BY id DESC LIMIT 3`,
                [tenantId, saved.chat.id]
              );
              const latestText = recentInbound.rows.length > 0
                ? recentInbound.rows.map(r => r.message_text).reverse().join(' ')
                : text;

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

                    // Update chat managed_by to 'human'
                    await query(
                      `UPDATE whatsapp_chats SET managed_by = 'human', updated_at = now() WHERE tenant_id = $1 AND id = $2`,
                      [tenantId, saved.chat.id]
                    );

                    // Broadcast handoff notification to websocket clients
                    broadcastToTenant(tenantId, {
                      type: 'WHATSAPP_HUMAN_HANDOFF_TRIGGERED',
                      chatId: saved.chat.id,
                      customerName: saved.chat.customer_name || from,
                      phone: from
                    });
                    // Reload chats to reflect managed_by change
                    broadcastToTenant(tenantId, {
                      type: 'WHATSAPP_MESSAGE_RECEIVED',
                      chat: { ...saved.chat, managed_by: 'human' },
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

                    const messageId = sendResult?.messages?.[0]?.id || null;

                    // Save outbound message to DB
                    const outboundSaved = await whatsappRepo.saveMessage(
                      tenantId,
                      from,
                      'outbound',
                      replyText,
                      saved.chat.customer_name || from,
                      0,
                      messageId
                    );

                    // Broadcast outbound message to websocket clients
                    broadcastToTenant(tenantId, {
                      type: 'WHATSAPP_MESSAGE_RECEIVED',
                      chat: outboundSaved.chat,
                      message: outboundSaved.message
                    });
                  }
                }
              } catch (aiErr) {
                logger.error({ err: aiErr }, '[WhatsApp Webhook] Error during AI auto-reply processing');
              } finally {
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
        if (tenantId && value.statuses && value.statuses[0]) {
          const statusObj = value.statuses[0];
          const messageId = statusObj.id;
          const status = statusObj.status; // 'sent', 'delivered', 'read' or 'failed'

          logger.info({ tenantId, messageId, status }, '[WhatsApp Webhook] Processing status update');

          // Update message status in the DB
          const updatedMessage = await whatsappRepo.updateMessageStatus(messageId, status);
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
    } catch (err) {
      logger.error({ err }, '[WhatsApp Webhook] Error processing incoming webhook');
    }
  } else {
    // Return 404 if the event is not from a whatsapp subscription
    res.sendStatus(404);
  }
}

async function updateChatManagement(req, res, next) {
  try {
    const { chatId } = req.params;
    const { managedBy } = req.body; // 'ai' or 'human'

    if (!['ai', 'human'].includes(managedBy)) {
      return res.status(400).json({ message: 'Invalid management mode. Supported values: ai, human' });
    }

    const { rows } = await query(
      `UPDATE whatsapp_chats 
       SET managed_by = $1, updated_at = now() 
       WHERE tenant_id = $2 AND id = $3 
       RETURNING *`,
      [managedBy, req.user.tenantId, chatId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    res.json({ message: `Management mode updated to ${managedBy}`, chat: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { 
  sendMessage, 
  verifyWebhook, 
  receiveWebhook,
  getChats,
  startNewChat,
  getChatMessages,
  sendChatMessage,
  readChat,
  updateChatManagement
};
