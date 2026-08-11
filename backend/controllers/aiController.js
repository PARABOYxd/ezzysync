const aiService = require('../services/aiService');
const itineraryPdfService = require('../services/itineraryPdfService');

async function parseTicketOrChat(req, res, next) {
  try {
    const { text } = req.body;
    const file = req.file;

    if (!aiService.isConfigured()) {
      return res.status(500).json({ message: 'Gemini API Key is not configured on the server.' });
    }

    if (file) {
      if (file.mimetype !== 'application/pdf') {
        return res.status(400).json({ message: 'Only PDF ticket files are supported.' });
      }
    } else if (!text) {
      return res.status(400).json({ message: 'Please provide either text or a PDF file to parse.' });
    }

    const result = await aiService.parseTicketOrChat({ text, file });
    if (!result) {
      return res.status(500).json({ message: 'Failed to extract booking details from AI response.' });
    }

    res.json({ result });
  } catch (err) {
    req.log.error({ err, apiResponse: err.response?.data }, 'Error parsing ticket with AI');
    res.status(500).json({ message: 'Failed to parse ticket with AI. Please try again.' });
  }
}

async function generateItinerary(req, res, next) {
  try {
    const { tripName, days, notes, format } = req.body;
    if (!tripName || !days) {
      return res.status(400).json({ message: 'Trip name and duration (days) are required.' });
    }

    if (!aiService.isConfigured()) {
      return res.status(500).json({ message: 'Gemini API Key is not configured.' });
    }

    const isJson = format === 'json';
    const responseText = await aiService.generateItineraryText({ tripName, days, notes, isJson });
    if (!responseText) {
      return res.status(500).json({ message: 'Failed to generate itinerary.' });
    }

    if (isJson) {
      try {
        const itineraryArray = aiService.parseItineraryJson(responseText);
        return res.json({ itinerary: itineraryArray });
      } catch (err) {
        req.log.error({ err, responseText }, 'Failed to parse Gemini JSON itinerary');
        return res.status(500).json({ message: 'AI generated invalid structured data. Please try again.' });
      }
    }

    res.json({ itinerary: responseText });
  } catch (err) {
    req.log.error({ err, apiResponse: err.response?.data }, 'Error generating itinerary');
    res.status(500).json({ message: 'Failed to generate itinerary. Please try again.' });
  }
}

async function whatsappReply(req, res, next) {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ message: 'Phone number and customer message are required.' });
    }

    if (!aiService.isConfigured()) {
      return res.status(500).json({ message: 'Gemini API Key is not configured.' });
    }

    const { reply, booking } = await aiService.generateWhatsappReply(
      req.user.tenantId,
      { phone, message },
      { onHistoryError: (err) => req.log.warn({ err }, 'Error fetching follow-up logs for AI context') }
    );

    if (!reply) {
      return res.status(500).json({ message: 'Failed to generate auto-reply.' });
    }

    res.json({ reply, matchedBooking: booking });
  } catch (err) {
    req.log.error({ err, apiResponse: err.response?.data }, 'Error formulating WhatsApp auto-reply');
    res.status(500).json({ message: 'Failed to generate auto-reply. Please try again.' });
  }
}

async function downloadItinerary(req, res, next) {
  try {
    const { tripName, itineraryText } = req.body;
    if (!tripName || !itineraryText) {
      return res.status(400).json({ message: 'Trip name and itinerary text are required.' });
    }

    const isPremium = req.user && req.user.planId !== 'FREE';

    let coverImages = [];
    if (isPremium) {
      coverImages = await itineraryPdfService.fetchCoverImages(tripName, {
        onError: () => req.log.warn('Could not fetch premium cover images'),
      });
    }

    const pdfBuffer = await itineraryPdfService.buildItineraryPdf({
      tripName,
      itineraryText,
      isPremium,
      coverImages,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${itineraryPdfService.itineraryFileName(tripName)}"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { parseTicketOrChat, generateItinerary, whatsappReply, downloadItinerary };
