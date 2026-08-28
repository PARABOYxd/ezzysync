const env = require('../config/env');
const bookingService = require('../services/bookingService');
const settingsService = require('../services/settingsService');
const whatsappService = require('../services/whatsappService');
const whatsappRepo = require('../repositories/whatsappRepository');
const { query } = require('../config/db');
const { broadcastToTenant } = require('../services/websocketService');
const logger = require('../utils/logger');

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
      const cleanPhone = booking.phone.replace(/\D/g, '');
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
    const { text, mediaLink, mediaType, filename } = req.body;
    
    // Find the chat details to get the phone number
    const { rows } = await query(
      `SELECT * FROM whatsapp_chats WHERE tenant_id = $1 AND id = $2`,
      [req.user.tenantId, chatId]
    );
    const chat = rows[0];
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });

    const settings = await settingsService.getSettings(req.user.tenantId);

    // Send using current WhatsApp service
    const mockBooking = { phone: chat.phone, bookingId: 'CHAT' };
    const result = await whatsappService.sendWhatsAppMessage(mockBooking, settings, mediaLink, text, mediaType, filename);
    const messageId = result?.messages?.[0]?.id || null;

    // Save as outbound message (storing media parameters in the database)
    const saved = await whatsappRepo.saveMessage(
      req.user.tenantId,
      chat.phone,
      'outbound',
      text || filename || (mediaType === 'image' ? 'Image' : 'Document.pdf'),
      null,
      0,
      messageId,
      'sent',
      null,
      mediaType || 'text',
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
            mediaUrl
          );

          logger.info({ dbMessageId: saved.message.id, chatId: saved.chat.id }, '[WhatsApp Webhook] Inbound message saved successfully');

          // Broadcast to tenant's WebSocket clients
          broadcastToTenant(tenantId, {
            type: 'WHATSAPP_MESSAGE_RECEIVED',
            chat: saved.chat,
            message: saved.message
          });
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

module.exports = { 
  sendMessage, 
  verifyWebhook, 
  receiveWebhook,
  getChats,
  getChatMessages,
  sendChatMessage,
  readChat
};
