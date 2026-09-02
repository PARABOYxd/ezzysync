const whatsappWebService = require('../services/whatsappWebService');
const { query } = require('../config/db');
const PDFDocument = require('pdfkit');
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
    await query(
      `UPDATE whatsapp_sessions SET ai_autopilot_enabled = $1, updated_at = now() WHERE tenant_id = $2`,
      [Boolean(enabled), req.user.tenantId]
    );
    res.json({ success: true, aiAutopilotEnabled: Boolean(enabled) });
  } catch (err) {
    next(err);
  }
}

async function listChats(req, res, next) {
  try {
    const { search } = req.query;
    let sql = `
      SELECT c.*, 
             l.lead_id AS formatted_lead_id, l.stage AS lead_stage, l.interest AS lead_interest,
             b.trip AS booking_trip, b.travel_status AS booking_travel_status, b.payment_status AS booking_payment_status
      FROM whatsapp_chats c
      LEFT JOIN leads l ON l.id = c.lead_id
      LEFT JOIN bookings b ON b.id = c.booking_id
      WHERE c.tenant_id = $1
    `;
    const params = [req.user.tenantId];

    if (search && search.trim()) {
      sql += ` AND (c.customer_name ILIKE $2 OR c.phone ILIKE $2 OR c.last_message ILIKE $2)`;
      params.push(`%${search.trim()}%`);
    }

    sql += ` ORDER BY c.last_message_timestamp DESC LIMIT 100`;

    const result = await query(sql, params);
    res.json({ chats: result.rows });
  } catch (err) {
    next(err);
  }
}

async function getChatMessages(req, res, next) {
  try {
    const { chatId } = req.params;

    // Reset unread count
    await query(
      `UPDATE whatsapp_chats SET unread_count = 0, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
      [chatId, req.user.tenantId]
    );

    const messagesRes = await query(
      `SELECT * FROM whatsapp_messages 
       WHERE chat_id = $1 AND tenant_id = $2 
       ORDER BY message_timestamp ASC 
       LIMIT 300`,
      [chatId, req.user.tenantId]
    );

    const chatRes = await query(
      `SELECT c.*, 
              l.id AS lead_uuid, l.lead_id AS formatted_lead_id, l.customer_name AS lead_name, l.stage AS lead_stage, l.interest AS lead_interest, l.notes AS lead_notes,
              b.id AS booking_uuid, b.booking_id AS formatted_booking_id, b.trip AS booking_trip, b.total_amount, b.paid, b.remaining, b.travel_status, b.payment_status
       FROM whatsapp_chats c
       LEFT JOIN leads l ON l.id = c.lead_id
       LEFT JOIN bookings b ON b.id = c.booking_id
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [chatId, req.user.tenantId]
    );

    res.json({
      chat: chatRes.rows[0] || null,
      messages: messagesRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { chatId } = req.params;
    const { messageText } = req.body;
    const file = req.file;

    const chatRes = await query(
      `SELECT * FROM whatsapp_chats WHERE id = $1 AND tenant_id = $2`,
      [chatId, req.user.tenantId]
    );
    const chat = chatRes.rows[0];
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    let mediaBuffer = null;
    let fileName = null;
    let mimeType = null;

    if (file) {
      mediaBuffer = file.buffer;
      fileName = file.originalname;
      mimeType = file.mimetype;
    }

    const result = await whatsappWebService.sendManualMessage(req.user.tenantId, {
      chatId,
      phone: chat.phone,
      jid: chat.jid,
      messageText,
      mediaBuffer,
      fileName,
      mimeType,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function toggleChatAi(req, res, next) {
  try {
    const { chatId } = req.params;
    const { enabled } = req.body;

    await query(
      `UPDATE whatsapp_chats SET ai_enabled = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
      [Boolean(enabled), chatId, req.user.tenantId]
    );

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

    const chatRes = await query(
      `SELECT * FROM whatsapp_chats WHERE id = $1 AND tenant_id = $2`,
      [chatId, req.user.tenantId]
    );
    const chat = chatRes.rows[0];
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // Generate clean PDF in memory
    const pdfBuffer = await new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fillColor('#0f766e').font('Helvetica-Bold').fontSize(22).text('JourneyFlow Travel Itinerary', 50, 50);
        doc.fillColor('#4b5563').font('Helvetica').fontSize(11).text(`Trip: ${tripName}`, 50, 78);
        doc.fillColor('#6b7280').fontSize(9).text(`Generated Date: ${new Date().toLocaleDateString('en-IN')}`, 50, 94);
        doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#e5e7eb').lineWidth(1).stroke();

        doc.x = 50;
        doc.y = 130;

        const lines = itineraryText.split('\n');
        for (const line of lines) {
          const cleanLine = line.replace(/\*\*/g, '').replace(/[^\x00-\x7F]/g, '').trim();
          if (line.startsWith('# ')) {
            doc.moveDown(1);
            doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f766e').text(cleanLine, { lineGap: 6 });
          } else if (line.startsWith('## ') || line.startsWith('Day ')) {
            doc.moveDown(0.8);
            doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827').text(cleanLine, { lineGap: 5 });
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            doc.font('Helvetica').fontSize(10).fillColor('#374151').text(`•  ${cleanLine.replace(/^[-*]\s*/, '')}`, { indent: 12, lineGap: 4 });
          } else if (line.trim() === '') {
            doc.moveDown(0.3);
          } else {
            doc.font('Helvetica').fontSize(10).fillColor('#374151').text(cleanLine, { lineGap: 4 });
          }
        }
        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    const safeName = tripName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const result = await whatsappWebService.sendManualMessage(req.user.tenantId, {
      chatId,
      phone: chat.phone,
      jid: chat.jid,
      messageText: `Hi! Please find attached the customized travel itinerary for *${tripName}* ✈️`,
      mediaBuffer: pdfBuffer,
      fileName: `Itinerary-${safeName}.pdf`,
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

    if (mode === 'improve' && !draft.trim()) {
      return res.status(400).json({ message: 'Type a message first, then ask AI to improve it.' });
    }

    const chatRes = await query(
      `SELECT * FROM whatsapp_chats WHERE id = $1 AND tenant_id = $2`,
      [chatId, req.user.tenantId]
    );
    const chat = chatRes.rows[0];
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    if (!aiService.isConfigured()) {
      return res.status(503).json({ message: 'AI is not configured. Add a Gemini API key in your environment.' });
    }

    const lastInbound = await query(
      `SELECT message_text FROM whatsapp_messages
       WHERE tenant_id = $1 AND chat_id = $2 AND direction = 'inbound'
       ORDER BY message_timestamp DESC LIMIT 1`,
      [req.user.tenantId, chatId]
    );

    const { suggestion } = await aiService.suggestWhatsappDraft(req.user.tenantId, {
      phone: chat.phone,
      mode,
      draft,
      lastCustomerMessage: lastInbound.rows[0]?.message_text || '',
    });

    if (!suggestion) {
      return res.status(502).json({ message: 'AI could not produce a suggestion. Please try again.' });
    }

    res.json({ suggestion });
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
};
