const env = require('../config/env');
const bookingService = require('../services/bookingService');
const settingsService = require('../services/settingsService');
const invoiceService = require('../services/invoiceService');
const whatsappService = require('../services/whatsappService');
const whatsappWebService = require('../services/whatsappWebService');
const whatsappWebhookService = require('../services/whatsappWebhookService');
const whatsappWebRepository = require('../repositories/whatsappWebRepository');
const whatsappRepo = require('../repositories/whatsappRepository');
const whatsappTemplateRepository = require('../repositories/whatsappTemplateRepository');
const r2Service = require('../services/r2Service');
const instagramDirectService = require('../services/instagramDirectService');
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

    if (!booking.phone) {
      return res.status(400).json({ message: 'This booking has no customer phone number on file.' });
    }

    const settings = await settingsService.getSettingsWithSecrets(req.user.tenantId);
    const mediaLink = req.body.mediaLink || null;
    const messageText = req.body.messageText || null;
    const invoiceNumber = `INV-${booking.bookingId}`;

    // 1. Generate official PDF invoice buffer
    let pdfBuffer = null;
    try {
      pdfBuffer = await invoiceService.generateInvoicePDF({ booking, settings, invoiceNumber });
    } catch (pdfErr) {
      logger.warn({ err: pdfErr, bookingId: booking.bookingId }, 'Could not generate invoice PDF buffer for WhatsApp');
    }

    const text = messageText || whatsappService.buildMessageText(booking, settings);
    const cleanDigits = normalizePhone(booking.phone);

    // 2. Check WhatsApp connection status
    // Check WhatsApp Web (QR Scanner / Live Chat engine)
    let isWebConnected = false;
    try {
      const webStatus = await whatsappWebService.getSessionStatus(req.user.tenantId);
      isWebConnected = Boolean(
        webStatus?.canSend || 
        (webStatus?.status === 'connected' && webStatus?.hasLiveSocket !== false)
      );
    } catch (wsErr) {
      logger.warn({ err: wsErr, tenantId: req.user.tenantId }, 'Error checking WhatsApp Web session status');
    }

    // Check Meta WhatsApp API credentials
    const hasMetaCredentials = Boolean(
      settings?.whatsappPhoneNumberId &&
      settings?.whatsappPhoneNumberId.trim() !== '' &&
      settings?.whatsappAccessToken &&
      settings?.whatsappAccessToken.trim() !== ''
    );

    // 3. If neither WhatsApp channel is connected, guide user to connect WhatsApp
    if (!isWebConnected && !hasMetaCredentials) {
      return res.status(400).json({
        message: 'WhatsApp is not connected. Please connect WhatsApp in WhatsApp Live Chat or Settings to send invoices.',
        code: 'WHATSAPP_NOT_CONNECTED',
      });
    }

    // 4. Primary: If WhatsApp Web (Live Chat) is connected, send PDF invoice and reflect in Live Chat
    if (isWebConnected) {
      let chat = await whatsappWebRepository.findChatByPhone(req.user.tenantId, cleanDigits);
      if (!chat) {
        chat = await whatsappWebRepository.createChat(req.user.tenantId, {
          phone: cleanDigits,
          jid: `${cleanDigits}@s.whatsapp.net`,
          customerName: booking.customerName || 'Customer',
          leadId: null,
          lastMessage: text,
          aiEnabled: false,
        });
      }

      const result = await whatsappWebService.sendManualMessage(req.user.tenantId, {
        chatId: chat?.id,
        phone: cleanDigits,
        jid: chat?.jid || `${cleanDigits}@s.whatsapp.net`,
        messageText: text,
        mediaBuffer: pdfBuffer,
        fileName: `${invoiceNumber}.pdf`,
        mimeType: 'application/pdf',
      });

      // Broadcast event so WhatsApp Live Chat updates in real-time
      broadcastToTenant(req.user.tenantId, {
        type: 'WHATSAPP_WEB_MESSAGE_SENT',
        chatId: chat?.id,
        message: {
          id: result.messageId,
          messageId: result.messageId,
          direction: 'outbound',
          sender: 'agent',
          messageText: text,
          messageType: 'document',
          mediaUrl: result.mediaUrl,
          fileName: `${invoiceNumber}.pdf`,
          status: 'sent',
          created_at: new Date().toISOString(),
        },
      });

      // Save to shared repository for history
      try {
        await whatsappRepo.saveMessage(
          req.user.tenantId,
          cleanDigits,
          'outbound',
          text,
          booking.customerName,
          0,
          result.messageId
        );
      } catch (dbErr) {
        logger.warn({ err: dbErr }, 'Failed to save sent invoice message to history');
      }

      return res.json({
        message: `Invoice PDF sent to ${booking.phone} on WhatsApp & shared on Live Chat.`,
        result,
        channel: 'whatsapp_web',
      });
    }

    // 5. Fallback: If Meta WhatsApp Cloud API is connected
    let invoiceMediaLink = mediaLink;
    if (!invoiceMediaLink && pdfBuffer) {
      try {
        invoiceMediaLink = await r2Service.uploadPrivateFile(
          pdfBuffer,
          `${invoiceNumber}.pdf`,
          'application/pdf',
          `invoices/${req.user.tenantId}`
        );
      } catch (r2Err) {
        logger.warn({ err: r2Err }, 'Could not upload invoice to R2 for Meta mediaLink');
      }
    }

    const result = await whatsappService.sendWhatsAppMessage(
      booking,
      settings,
      invoiceMediaLink,
      messageText,
      'document',
      `${invoiceNumber}.pdf`
    );

    // Save outbound message to history
    try {
      const messageId = result?.messages?.[0]?.id || null;
      const saved = await whatsappRepo.saveMessage(
        req.user.tenantId,
        cleanDigits,
        'outbound',
        text,
        booking.customerName,
        0,
        messageId
      );

      broadcastToTenant(req.user.tenantId, {
        type: 'WHATSAPP_MESSAGE_RECEIVED',
        chat: saved.chat,
        message: saved.message,
      });
    } catch (dbErr) {
      logger.warn({ err: dbErr }, 'Failed to save sent message to history');
    }

    return res.json({
      message: `Invoice PDF sent to ${booking.phone} on WhatsApp.`,
      result,
      channel: 'meta_api',
    });
  } catch (err) {
    const errorText = err.message || '';
    if (
      errorText.includes('Unsupported post request') ||
      errorText.includes('does not exist') ||
      errorText.includes('permission') ||
      errorText.includes('not connected')
    ) {
      return res.status(400).json({
        message: 'WhatsApp is not connected. Please connect WhatsApp in WhatsApp Live Chat or Settings to send invoices.',
        code: 'WHATSAPP_NOT_CONNECTED',
      });
    }
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
    let chat = await whatsappRepo.findChatByPhone(tenantId, cleanPhone);
    if (!chat) {
      // Create new chat header. Human-handled to start with, like every
      // other inbound path; managed_by is gone from this table.
      chat = await whatsappRepo.createBareChat(tenantId, { phone: cleanPhone, customerName: cleanPhone });
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
    const messages = (await whatsappRepo.getChatMessages(req.user.tenantId, req.params.chatId))
      .map((m) => ({ ...m, media_url: r2Service.resolveMediaUrl(m.media_url) }));
    // Was a console.log of every message body - customer conversations printed
    // to stdout, outside the logger and so outside its redaction rules.
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
    const chat = await whatsappRepo.findChatById(req.user.tenantId, chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });

    // Update chat to human-managed since the admin is manually typing a reply
    await whatsappRepo.setChatAiEnabled(req.user.tenantId, chatId, false);

    const settings = await settingsService.getSettingsWithSecrets(req.user.tenantId);

    let templateComponents = null;
    let messageTextToSave = text;

    if (templateName) {
      const tpl = await whatsappTemplateRepository.findByNameVariants(req.user.tenantId, templateName);

      if (tpl) {
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

    // Check if destination is Instagram Direct Chat
    if (chat.phone.startsWith('IG_')) {
      const textToSend = messageTextToSave || text || (filename || 'Attachment');
      await instagramDirectService.sendManualDm(req.user.tenantId, {
        recipientUsername: chat.phone,
        text: textToSend,
      });

      const saved = await whatsappRepo.saveMessage(
        req.user.tenantId,
        chat.phone,
        'outbound',
        textToSend,
        null,
        0,
        `ig_out_${Date.now()}`,
        'sent',
        null,
        'text',
        mediaLink || null
      );

      broadcastToTenant(req.user.tenantId, {
        type: 'WHATSAPP_MESSAGE_RECEIVED',
        chat: saved.chat,
        message: saved.message,
      });

      return res.json({ message: 'Instagram DM sent successfully.', chat: saved.chat, messageData: saved.message });
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
 *
 * The actual per-message/per-status processing lives in
 * whatsappWebhookService.processIncomingWebhook - moved there verbatim (see
 * that file for the batching/dedup/AI-reply logic and the comments
 * explaining each safeguard). This handler's only job is the HTTP contract:
 * acknowledge Meta immediately, then process.
 */
async function receiveWebhook(req, res) {
  const body = req.body;

  logger.info({ body }, '[WhatsApp Webhook] Full Incoming Payload');

  // Check if this is an event from a WhatsApp API subscription
  if (body.object === 'whatsapp_business_account') {
    // Return a '200 OK' response to Meta quickly to avoid request retries
    res.status(200).send('EVENT_RECEIVED');

    try {
      await whatsappWebhookService.processIncomingWebhook(body);
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

    // 'ai'/'human' is kept as the API contract this endpoint already had;
    // it maps onto ai_enabled, which is what the table stores now. Switching
    // to human also clears any escalation, since a person is taking it on.
    const enableAi = managedBy === 'ai';
    const chat = await whatsappRepo.setChatManagement(req.user.tenantId, chatId, enableAi);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    res.json({ message: `Management mode updated to ${managedBy}`, chat });
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
