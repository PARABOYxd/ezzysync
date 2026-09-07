const whatsappWebService = require('../services/whatsappWebService');
const whatsappWebRepository = require('../repositories/whatsappWebRepository');
const settingsService = require('../services/settingsService');
const itineraryPdfService = require('../services/itineraryPdfService');
const aiService = require('../services/aiService');

async function getStatus(req, res, next) {
  try {
    const status = await whatsappWebService.getSessionStatus(req.user.tenantId);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

async function startSession(req, res, next) {
  try {
    await whatsappWebService.initWhatsAppSession(req.user.tenantId, true);
    // Give it 1 second to generate QR if not connected
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const status = await whatsappWebService.getSessionStatus(req.user.tenantId);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

async function disconnect(req, res, next) {
  try {
    const result = await whatsappWebService.disconnectSession(req.user.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function toggleAiAutopilot(req, res, next) {
  try {
    const { enabled } = req.body;
    await whatsappWebRepository.setAutopilotDefault(req.user.tenantId, enabled);
    res.json({ success: true, aiAutopilotEnabled: Boolean(enabled) });
  } catch (err) {
    next(err);
  }
}

async function listChats(req, res, next) {
  try {
    const { search } = req.query;
    const chats = await whatsappWebRepository.listChats(req.user.tenantId, search);
    res.json({ chats });
  } catch (err) {
    next(err);
  }
}

async function getChatMessages(req, res, next) {
  try {
    const { chatId } = req.params;

    // Reset unread count
    await whatsappWebRepository.clearUnread(req.user.tenantId, chatId);

    const messages = await whatsappWebRepository.listMessages(req.user.tenantId, chatId);
    const chat = await whatsappWebRepository.getChatWithContext(req.user.tenantId, chatId);

    res.json({ chat, messages });
  } catch (err) {
    next(err);
  }
}

/**
 * Sends one customer message: text, up to eight attachments, or both.
 *
 * Each attachment becomes its own WhatsApp message, which is how WhatsApp
 * itself handles a multi-file send. The caption rides on the first one only -
 * repeating it under every photo reads as spam to the customer.
 *
 * Sends are sequential with a gap between them on purpose. Firing eight media
 * uploads at WhatsApp back-to-back from one account is exactly the burst
 * pattern that gets a number rate-limited or flagged.
 */
async function sendMessage(req, res, next) {
  try {
    const { chatId } = req.params;
    const { messageText } = req.body;
    const files = req.files || [];

    const chat = await whatsappWebRepository.findChatById(req.user.tenantId, chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    const caption = String(messageText || '').trim();
    if (!files.length && !caption) {
      return res.status(400).json({ message: 'Nothing to send. Type a message or attach a file.' });
    }

    const base = { chatId, phone: chat.phone, jid: chat.jid };
    const results = [];

    if (!files.length) {
      results.push(
        await whatsappWebService.sendManualMessage(req.user.tenantId, { ...base, messageText: caption })
      );
    } else {
      for (const [index, file] of files.entries()) {
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }

        results.push(
          await whatsappWebService.sendManualMessage(req.user.tenantId, {
            ...base,
            messageText: index === 0 ? caption : '',
            mediaBuffer: file.buffer,
            fileName: file.originalname,
            mimeType: file.mimetype,
          })
        );
      }
    }

    res.json({ success: true, sent: results.length, results });
  } catch (err) {
    next(err);
  }
}

async function toggleChatAi(req, res, next) {
  try {
    const { chatId } = req.params;
    const { enabled } = req.body;

    await whatsappWebRepository.setChatAiEnabled(req.user.tenantId, chatId, enabled);

    // Handing a chat to AI mid-conversation should actually move it forward,
    // so if the customer is sitting on an unanswered message the AI replies
    // straight away instead of waiting for them to write again. Never fatal:
    // the toggle itself has already succeeded by this point.
    let catchUp = { sent: false, reason: 'not_requested' };
    if (Boolean(enabled)) {
      try {
        catchUp = await whatsappWebService.sendAiCatchUpMessage(req.user.tenantId, chatId);
      } catch (err) {
        catchUp = { sent: false, reason: 'error' };
        req.log?.warn?.({ err, chatId }, 'AI catch-up message failed after enabling autopilot');
      }
    }

    res.json({ success: true, aiEnabled: Boolean(enabled), catchUp });
  } catch (err) {
    next(err);
  }
}

async function sendItineraryPdf(req, res, next) {
  try {
    const { chatId, tripName, itineraryText } = req.body;
    if (!chatId || !tripName || !itineraryText) {
      return res.status(400).json({ message: 'chatId, tripName, and itineraryText are required.' });
    }

    const chat = await whatsappWebRepository.findChatById(req.user.tenantId, chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // One generator, shared with the AI Tools download. This used to be a
    // second, inline copy that printed "JourneyFlow Travel Itinerary" - a
    // product name that no longer exists - and stripped every non-ASCII
    // character, so the rupee sign vanished from any price it quoted. Both
    // went out to customers on WhatsApp.
    const settings = await settingsService.getSettings(req.user.tenantId);
    const branding = await itineraryPdfService.buildBranding(settings);

    const pdfBuffer = await itineraryPdfService.buildItineraryPdf({
      tripName,
      itineraryText,
      isPremium: false,
      branding,
    });

    const result = await whatsappWebService.sendManualMessage(req.user.tenantId, {
      chatId,
      phone: chat.phone,
      jid: chat.jid,
      messageText: `Hi! Please find attached the customized travel itinerary for *${tripName}* ✈️`,
      mediaBuffer: pdfBuffer,
      fileName: itineraryPdfService.itineraryFileName(tripName),
      mimeType: 'application/pdf',
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}


/**
 * Returns an AI draft for the agent to read, edit and send themselves.
 * Deliberately does not touch the socket - nothing here reaches the customer.
 */
async function aiSuggest(req, res, next) {
  try {
    const { chatId } = req.params;
    const { draft = '', mode = 'suggest' } = req.body;

    // Everything except 'suggest' rewrites something the agent typed, so it
    // needs that text to exist.
    const REWRITE_MODES = ['improve', 'shorten', 'friendly', 'professional', 'hinglish'];
    if (REWRITE_MODES.includes(mode) && !draft.trim()) {
      return res.status(400).json({ message: 'Type a message first, then ask AI to rewrite it.' });
    }
    if (mode !== 'suggest' && !REWRITE_MODES.includes(mode)) {
      return res.status(400).json({ message: 'Unknown AI action.' });
    }

    const chat = await whatsappWebRepository.findChatById(req.user.tenantId, chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    if (!aiService.isConfigured()) {
      return res.status(503).json({ message: 'AI is not configured. Add a Gemini API key in your environment.' });
    }

    const lastInbound = await whatsappWebRepository.getLastInboundMessage(req.user.tenantId, chatId);

    const { suggestion } = await aiService.suggestWhatsappDraft(req.user.tenantId, {
      phone: chat.phone,
      mode,
      draft,
      lastCustomerMessage: lastInbound,
    });

    if (!suggestion) {
      return res.status(502).json({ message: 'AI could not produce a suggestion. Please try again.' });
    }

    res.json({ suggestion });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ *
 * Quick replies - canned messages an agent inserts with "/shortcut"
 * ------------------------------------------------------------------ */

async function listQuickReplies(req, res, next) {
  try {
    const quickReplies = await whatsappWebRepository.listQuickReplies(req.user.tenantId);
    res.json({ quickReplies });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStatus,
  startSession,
  disconnect,
  toggleAiAutopilot,
  listChats,
  getChatMessages,
  sendMessage,
  toggleChatAi,
  sendItineraryPdf,
  aiSuggest,
  listQuickReplies,
};
