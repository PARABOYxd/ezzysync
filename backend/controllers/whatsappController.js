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

module.exports = { sendMessage };
