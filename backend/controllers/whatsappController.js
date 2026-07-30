const env = require('../config/env');
const bookingService = require('../services/bookingService');
const settingsService = require('../services/settingsService');
const whatsappService = require('../services/whatsappService');

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
    res.json({ message: 'WhatsApp message sent.', result });
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
 * Handles POST /webhook notification events from Meta.
 */
function receiveWebhook(req, res) {
  const body = req.body;

  // Check if this is an event from a WhatsApp API subscription
  if (body.object === 'whatsapp_business_account') {
    // Return a '200 OK' response to Meta quickly to avoid request retries
    res.status(200).send('EVENT_RECEIVED');

    // Parse values and optionally trigger background operations
    // e.g. logging incoming customer chats, AI processing, or delivery status updates.
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value) {
      const value = body.entry[0].changes[0].value;
      if (value.messages && value.messages[0]) {
        const message = value.messages[0];
        const from = message.from; // Sender's phone number
        const text = message.text ? message.text.body : ''; // Message content
        // Log incoming message to console/logs for live debugging
        // eslint-disable-next-line no-console
        console.log(`[WhatsApp Webhook] Received message from ${from}: "${text}"`);
      }
    }
  } else {
    // Return 404 if the event is not from a whatsapp subscription
    res.sendStatus(404);
  }
}

module.exports = { sendMessage, verifyWebhook, receiveWebhook };
