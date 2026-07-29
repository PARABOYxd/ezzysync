const axios = require('axios');
const env = require('../config/env');
const bookingService = require('../services/bookingService');
const PDFDocument = require('pdfkit');

// JSON schema for Gemini structured output
const bookingJsonSchema = {
  type: 'OBJECT',
  properties: {
    customerName: { type: 'STRING', description: 'Name of the main contact passenger' },
    email: { type: 'STRING', description: 'Email address of the customer' },
    phone: { type: 'STRING', description: 'Phone/mobile number of the customer, preferably including country code' },
    emergencyContact: { type: 'STRING', description: 'Alternative or emergency contact number if mentioned' },
    trip: { type: 'STRING', description: 'Name of the trip, tour package, hotel, flight itinerary description or destination' },
    departure: { type: 'STRING', description: 'Departure or travel starting date in YYYY-MM-DD format' },
    pickup: { type: 'STRING', description: 'Pickup location details or airport/station name if mentioned' },
    members: { type: 'INTEGER', description: 'Total number of travelers' },
    pricePerPerson: { type: 'INTEGER', description: 'Cost per single member or traveler' },
    paid: { type: 'INTEGER', description: 'Amount already paid in advance' },
    notes: { type: 'STRING', description: 'Any special requests, flight timings, hotel configurations or miscellaneous notes' },
  },
  required: ['customerName', 'trip', 'departure'],
};

async function parseTicketOrChat(req, res, next) {
  try {
    const { text } = req.body;
    const file = req.file;

    if (!env.geminiApiKey) {
      return res.status(500).json({ message: 'Gemini API Key is not configured on the server.' });
    }

    let promptParts = [];

    if (file) {
      if (file.mimetype !== 'application/pdf') {
        return res.status(400).json({ message: 'Only PDF ticket files are supported.' });
      }
      promptParts.push({
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString('base64'),
        },
      });
      promptParts.push({
        text: 'Extract the travel booking details from this PDF ticket.',
      });
    } else if (text) {
      promptParts.push({
        text: `Extract travel booking details from the following text or chat history:\n\n${text}`,
      });
    } else {
      return res.status(400).json({ message: 'Please provide either text or a PDF file to parse.' });
    }

    const requestBody = {
      contents: [
        {
          parts: promptParts,
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: bookingJsonSchema,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${env.geminiApiKey}`;
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    const parsedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!parsedText) {
      return res.status(500).json({ message: 'Failed to extract booking details from AI response.' });
    }

    const result = JSON.parse(parsedText);
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

    if (!env.geminiApiKey) {
      return res.status(500).json({ message: 'Gemini API Key is not configured.' });
    }

    const isJson = format === 'json';
    let prompt;
    if (isJson) {
      prompt = `You are a professional travel planner. Generate a highly detailed, premium day-by-day travel itinerary for the trip: "${tripName}" spanning ${days} days. 
Special requests/preferences/travel style: "${notes || 'none'}".
Return ONLY a valid JSON array of objects representing each day, with no surrounding markdown code block wrappers (do NOT include \`\`\`json or anything else). The JSON must be parseable.
Format:
[
  {
    "day": 1,
    "title": "Day title/heading",
    "description": "Detailed bullet points or paragraph of activities, sightseeing, stays, and meals included."
  },
  ...
]`;
    } else {
      prompt = `You are a professional travel planner. Generate a highly detailed, premium day-by-day travel itinerary for the trip: "${tripName}" spanning ${days} days. 
Special requests/preferences/travel style: "${notes || 'none'}".
Format the output beautifully in Markdown, using clean headings, detailed bullet points, activities, and emojis where appropriate. Do not include any meta-introductions or conclusions; start directly with the title.`;
    }

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${env.geminiApiKey}`;

    const response = await axios.post(url, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      return res.status(500).json({ message: 'Failed to generate itinerary.' });
    }

    if (isJson) {
      try {
        const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const itineraryArray = JSON.parse(cleanJsonText);
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

    if (!env.geminiApiKey) {
      return res.status(500).json({ message: 'Gemini API Key is not configured.' });
    }

    // Find the matching booking record
    const bookings = await bookingService.listBookings(req.user.tenantId);
    const cleanTargetPhone = phone.replace(/[^\d]/g, '');
    const booking = bookings.find((b) => {
      const cleanPhone = b.phone.replace(/[^\d]/g, '');
      return cleanPhone.endsWith(cleanTargetPhone) || cleanTargetPhone.endsWith(cleanPhone);
    });

    let followUpHistory = 'none';
    if (booking) {
      try {
        const logs = await bookingService.getFollowUps(req.user.tenantId, booking.bookingId);
        if (logs && logs.length > 0) {
          followUpHistory = logs
            .map((log) => `[${new Date(log.created_at).toLocaleDateString('en-IN')}] ${log.activity_type.toUpperCase()}: ${log.note}`)
            .join('\n');
        }
      } catch (err) {
        req.log.warn({ err }, 'Error fetching follow-up logs for AI context');
      }
    }

    const context = booking
      ? `Here is the customer's active booking details:
- Name: ${booking.customerName}
- Phone: ${booking.phone}
- Email: ${booking.email}
- Trip: ${booking.trip}
- Departure Date: ${booking.departure}
- Number of travelers: ${booking.members}
- Total Price: ₹${booking.totalAmount}
- Amount Paid: ₹${booking.paid}
- Amount Remaining/Pending: ₹${booking.remaining}
- Travel Status: ${booking.travelStatus}
- Payment Status: ${booking.paymentStatus}
- Pickup Details: ${booking.pickup || 'none'}
- Special Notes: ${booking.notes || 'none'}
- Past Interaction History / Follow-up Notes:
${followUpHistory}`
      : `No active booking was found in our database for the customer's phone number (${phone}).`;

    const prompt = `You are a helpful travel assistant chat bot for our travel agency. 
We received a WhatsApp message from a customer. 

${context}

Customer's Message: "${message}"

Write a short, friendly, and helpful WhatsApp response answering their query. 
Rules:
- Keep it concise (1-4 sentences).
- Format for WhatsApp (use *bold* for emphasis, emojis where appropriate, and line breaks).
- Answer specifically using the booking details and the past interaction history if provided (e.g. if they ask for remaining amount, state the exact amount pending, or reference past agreements).
- If no booking was found, ask them for their email or booking ID to help locate it.`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${env.geminiApiKey}`;

    const response = await axios.post(url, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      return res.status(500).json({ message: 'Failed to generate auto-reply.' });
    }

    res.json({ reply, matchedBooking: booking || null });
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

    const pdfBuffer = await new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Styling
        const primaryColor = '#0f766e';
        const darkColor = '#111827';
        const secondaryColor = '#4b5563';

        // Title and Header metadata
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('EzzySync Travel Itinerary', 50, 50);
        doc.fillColor(secondaryColor).font('Helvetica').fontSize(10).text(`Trip: ${tripName}`, 50, 78);
        doc.fillColor(secondaryColor).fontSize(9).text(`Generated Date: ${new Date().toLocaleDateString('en-IN')}`, 50, 92);
        
        doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#e5e7eb').lineWidth(1).stroke();

        // Position flow pointer
        doc.x = 50;
        doc.y = 130;

        const lines = itineraryText.split('\n');
        for (const line of lines) {
          // Clean emojis and strip bold markdown markers
          const cleanLine = line.replace(/\*\*/g, '').replace(/[^\x00-\x7F]/g, '').trim();

          if (line.startsWith('# ')) {
            doc.moveDown(1);
            doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor).text(cleanLine, { lineGap: 6 });
            doc.moveDown(0.5);
          } else if (line.startsWith('## ')) {
            doc.moveDown(0.8);
            doc.font('Helvetica-Bold').fontSize(14).fillColor(darkColor).text(cleanLine, { lineGap: 5 });
            doc.moveDown(0.4);
          } else if (line.startsWith('### ')) {
            doc.moveDown(0.6);
            doc.font('Helvetica-Bold').fontSize(11).fillColor(secondaryColor).text(cleanLine, { lineGap: 4 });
            doc.moveDown(0.3);
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            const bulletContent = cleanLine.replace(/^[-*]\s*/, '');
            doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text(`•  ${bulletContent}`, { indent: 12, lineGap: 4 });
          } else if (line.trim() === '') {
            doc.moveDown(0.4);
          } else {
            doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text(cleanLine, { lineGap: 4 });
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    const safeName = tripName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Itinerary-${safeName}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { parseTicketOrChat, generateItinerary, whatsappReply, downloadItinerary };
