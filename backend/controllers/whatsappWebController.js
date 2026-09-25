const whatsappWebService = require('../services/whatsappWebService');
const whatsappWebRepository = require('../repositories/whatsappWebRepository');
const whatsappWindow = require('../services/whatsappWindowService');
const r2Service = require('../services/r2Service');
const whatsappSendService = require('../services/whatsappSendService');
const templateRepo = require('../repositories/whatsappTemplateRepository');
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

/** Everything the Settings page needs to explain the WhatsApp setup in one
 * place: what is live, what a reply will use, and what the AI may answer. */
async function getConnectionOverview(req, res, next) {
  try {
    res.json(await whatsappWebService.getConnectionOverview(req.user.tenantId));
  } catch (err) {
    next(err);
  }
}

/** Applies the AI on/off decision to every existing chat, which the
 * tenant-level default deliberately does not touch. */
async function setAiForAllChats(req, res, next) {
  try {
    const updated = await whatsappWebRepository.setAiEnabledForAllChats(req.user.tenantId, req.body.enabled);
    res.json({ updated, enabled: Boolean(req.body.enabled) });
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

    let chat = await whatsappWebRepository.getChatWithContext(req.user.tenantId, chatId);
    // Stored media is a private reference; each read gets short-lived links.
    const messages = (await whatsappWebRepository.listMessages(req.user.tenantId, chatId))
      .map((m) => ({ ...m, media_url: r2Service.resolveMediaUrl(m.media_url) }));

    // If chat row was merged into another ID, resolve context from messages
    if (!chat && messages.length > 0) {
      const canonicalChatId = messages[messages.length - 1].chat_id;
      chat = await whatsappWebRepository.getChatWithContext(req.user.tenantId, canonicalChatId);
    }
    // Neither a chat nor any messages under this id for this tenant.
    if (!chat && messages.length === 0) return res.status(404).json({ message: 'Chat not found' });

    // If chat has no linked lead, try to link an existing lead by phone
    if (chat && !chat.lead_id) {
      const leadId = await whatsappWebRepository.findLeadIdByPhone(req.user.tenantId, chat.phone);
      if (leadId) {
        await whatsappWebRepository.setChatLeadId(req.user.tenantId, chat.id, leadId);
        chat = await whatsappWebRepository.getChatWithContext(req.user.tenantId, chat.id);
      }
    }

    // The agent needs to know what WhatsApp will actually accept here before
    // they type, not after the send silently fails.
    res.json({ chat, messages, window: chat ? whatsappWindow.toClientWindow(chat) : null });
  } catch (err) {
    next(err);
  }
}

async function createLeadFromChat(req, res, next) {
  try {
    const { chatId } = req.params;
    let chat = await whatsappWebRepository.getChatWithContext(req.user.tenantId, chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    if (chat.lead_id) {
      return res.json({ message: 'Lead already linked', chat });
    }

    const created = await whatsappWebRepository.createLeadFromWhatsapp(req.user.tenantId, {
      customerName: chat.customer_name || 'WhatsApp Contact',
      phone: chat.phone,
    });

    if (created?.id) {
      await whatsappWebRepository.setChatLeadId(req.user.tenantId, chat.id, created.id);
      try {
        const aiContextRepository = require('../repositories/aiContextRepository');
        const leadService = require('../services/leadService');
        const historyRows = await aiContextRepository.getChatHistoryByPhone(req.user.tenantId, chat.phone, 20);
        const conversationText = historyRows
          .map((r) => `${r.direction === 'inbound' ? 'Customer' : 'Agent'}: ${r.message_text || ''}`)
          .join('\n');
        if (conversationText) {
          await leadService.autoFillFromConversation(req.user.tenantId, chat.phone, conversationText);
        }
      } catch (fillErr) {
        // ignore
      }
      chat = await whatsappWebRepository.getChatWithContext(req.user.tenantId, chat.id);
    }

    res.json({ success: true, chat });
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

    // Meta refuses free-form messages outside the 24-hour window with error
    // 131047, and that refusal never reaches the agent - the message just does
    // not arrive. Failing here instead means they get told why, and what to do.
    whatsappWindow.assertCanSendFreeform(chat);

    const base = { chatId, phone: chat.phone, jid: chat.jid };
    const results = [];

    if (!files.length) {
      results.push(
        await whatsappSendService.sendText(req.user.tenantId, {
          chat,
          messageText: caption,
          userId: req.user.userId,
        })
      );
    } else {
      for (const [index, file] of files.entries()) {
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }

        results.push(
          await whatsappSendService.sendText(req.user.tenantId, {
            chat,
            userId: req.user.userId,
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

    // The update below is tenant-scoped, so another tenant's chat was never
    // actually changed - but the response still said success, and a caller
    // could not tell "toggled" from "that chat is not yours". Look first.
    const chat = await whatsappWebRepository.findChatById(req.user.tenantId, chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

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

    const pdfBuffer = await itineraryPdfService.buildSimpleWhatsappItineraryPdf({ tripName, itineraryText });

    const result = await whatsappWebService.sendManualMessage(req.user.tenantId, {
      userId: req.user.userId,
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

async function startChat(req, res, next) {
  try {
    const { phone, message } = req.body;
    if (!phone) return res.status(400).json({ message: 'phone is required.' });
    if (!whatsappSendService.isDialablePhone(phone)) {
      return res.status(400).json({ message: 'Enter a valid phone number (10 to 15 digits).' });
    }

    const normalized = whatsappSendService.toWhatsAppNumber(phone);

    const tenantId = req.user.tenantId;

    // Re-uses an existing chat, otherwise opens one on the connection that can
    // actually deliver (a Cloud-API-only tenant used to get a QR chat that
    // could never send). The last message is left for sendText to set, so a
    // rejected send does not leave a preview of a message that never went.
    const chat = await whatsappSendService.findOrStartChat(tenantId, {
      phone: normalized,
      aiEnabled: await whatsappWebRepository.getAutopilotDefault(tenantId),
    });

    if (message && message.trim()) {
      // Transport-aware: routes to Cloud API or the QR socket depending on
      // chat.transport, instead of always assuming the QR path.
      whatsappWindow.assertCanSendFreeform(chat);
      await whatsappSendService.sendText(tenantId, {
        chat,
        messageText: message.trim(),
        userId: req.user.userId,
      });
    }

    res.json({ success: true, chatId: chat.id });
  } catch (err) {
    next(err);
  }
}


/**
 * The ready-made messages an agent can send when the 24-hour window has shut.
 *
 * Seeded on first use, so an agency that has just connected is not staring at
 * an empty list at the exact moment it needs one.
 */
async function listSendableTemplates(req, res, next) {
  try {
    await templateRepo.seedStarterTemplates(req.user.tenantId);
    const templates = await templateRepo.getTemplates(req.user.tenantId);
    res.json({ templates });
  } catch (err) {
    next(err);
  }
}

async function sendTemplateMessage(req, res, next) {
  try {
    const { chatId } = req.params;
    const { templateId, variables } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: 'Choose a message to send.' });
    }

    const chat = await whatsappWebRepository.findChatById(req.user.tenantId, chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });

    const template = await templateRepo.getTemplateById(req.user.tenantId, templateId);
    if (!template) return res.status(404).json({ message: 'That message is no longer available.' });

    const result = await whatsappSendService.sendTemplate(req.user.tenantId, {
      chat,
      template,
      variables: { customer_name: chat.customer_name, ...(variables || {}) },
      userId: req.user.userId,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  setAiForAllChats,
  getConnectionOverview,
  listSendableTemplates,
  sendTemplateMessage,
  getStatus,
  startSession,
  disconnect,
  toggleAiAutopilot,
  listChats,
  getChatMessages,
  createLeadFromChat,
  sendMessage,
  toggleChatAi,
  sendItineraryPdf,
  aiSuggest,
  listQuickReplies,
  startChat,
};
