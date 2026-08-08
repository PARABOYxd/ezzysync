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


async function fetchUnsplashImage(keyword, isLandscape = true) {
  if (!env.unsplashAccessKey) {
    return fetchPlaceholderImage(isLandscape);
  }
  try {
    const orientation = isLandscape ? 'landscape' : 'squarish';
    // Use Unsplash API
    const res = await axios.get(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=${orientation}&client_id=${env.unsplashAccessKey}`);
    const imgUrl = res.data.urls.regular;
    const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 8000 });
    return Buffer.from(imgRes.data, 'binary');
  } catch (err) {
    return fetchPlaceholderImage(isLandscape);
  }
}

async function fetchPlaceholderImage(isLandscape = true) {
  try {
    const width = isLandscape ? 800 : 400;
    const height = isLandscape ? 400 : 400;
    const imgRes = await axios.get(`https://picsum.photos/${width}/${height}?blur=1`, { responseType: 'arraybuffer', timeout: 5000 });
    return Buffer.from(imgRes.data, 'binary');
  } catch (e) {
    return null;
  }
}

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
CRITICAL FORMATTING RULES:
- Output must be exactly in this format. Do NOT use markdown bold/italics. Do not output anything else.
- Keep each day's description strictly to 80-120 words maximum. Be concise and brochure-like.

Day 1 — [Title of Day]

[1-2 sentences of vivid, concise description of the day's main vibe or activities]

Highlights:
• [Highlight 1]
• [Highlight 2]
• [Highlight 3]

Meals: [e.g. Breakfast, Dinner]
Stay: [e.g. Premium Hotel]
`;
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

    const isPremium = req.user && req.user.planId !== 'FREE';
    
    let coverImageBuffer = null;
    let dayImages = [];

    if (isPremium) {
      try {
        coverImageBuffer = await fetchUnsplashImage(tripName + ' travel landmark', true);
        
        // Try to parse days to pre-fetch images concurrently
        const dayBlocks = itineraryText.split(/(?=Day \d+\s*—\s*)/i).filter(b => b.trim().startsWith('Day '));
        const imagePromises = dayBlocks.map(block => {
          const titleMatch = block.match(/Day \d+\s*—\s*([^\n]+)/i);
          const keyword = titleMatch ? titleMatch[1].trim() + ' travel' : tripName;
          return fetchUnsplashImage(keyword, false);
        });
        dayImages = await Promise.all(imagePromises);
      } catch (err) {
        req.log.warn('Could not fetch premium cover images');
      }
    }

    const pdfBuffer = await new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const primaryColor = isPremium ? '#042f2e' : '#0f766e'; 
        const darkColor = '#111827';
        const secondaryColor = '#4b5563';
        
        if (isPremium) {
          if (coverImageBuffer) {
            doc.image(coverImageBuffer, 0, 0, { width: 595.28, height: 250 }); 
            doc.rect(0, 0, 595.28, 250).fillColor('black', 0.4).fill();
          } else {
            doc.rect(0, 0, 595.28, 250).fillColor(primaryColor).fill();
          }
          doc.fillColor('white').font('Helvetica-Bold').fontSize(32).text(tripName.toUpperCase(), 50, 100, { align: 'center', width: 495 });
          doc.fillColor('white', 0.9).font('Helvetica').fontSize(14).text('Curated Premium Itinerary by EzzySync', 50, 150, { align: 'center', width: 495 });
          
          doc.fillOpacity(1); 
          doc.y = 280;

          // Process each day block for side-by-side layout
          const dayBlocks = itineraryText.split(/(?=Day \d+\s*—\s*)/i).filter(b => b.trim().startsWith('Day '));
          
          dayBlocks.forEach((block, index) => {
            const isImageLeft = index % 2 === 0;
            const yStart = doc.y;

            // Check if we need a new page
            if (yStart > 600) {
              doc.addPage();
              doc.y = 50;
            }

            const currentY = doc.y;
            const imgBuffer = dayImages[index];

            // Setup columns
            const textX = isImageLeft ? 260 : 50;
            const imgX = isImageLeft ? 50 : 355;
            const textWidth = 285;
            const imgSize = 190;

            if (imgBuffer) {
              doc.image(imgBuffer, imgX, currentY, { width: imgSize, height: imgSize, fit: [imgSize, imgSize] });
            }

            doc.x = textX;
            doc.y = currentY;

            const lines = block.split('\n');
            let isHighlights = false;

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) { doc.moveDown(0.3); continue; }

              if (line.match(/^Day \d+\s*—\s*/i)) {
                doc.font('Helvetica-Bold').fontSize(16).fillColor(primaryColor).text(line, textX, doc.y, { width: textWidth });
                doc.moveDown(0.3);
              } else if (line.toLowerCase().startsWith('highlights:')) {
                doc.moveDown(0.3);
                doc.font('Helvetica-Bold').fontSize(11).fillColor(darkColor).text('Highlights:', textX, doc.y, { width: textWidth });
                doc.moveDown(0.2);
                isHighlights = true;
              } else if (isHighlights && (line.startsWith('•') || line.startsWith('-'))) {
                doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text(line, textX + 10, doc.y, { width: textWidth - 10, lineGap: 2 });
              } else if (line.toLowerCase().startsWith('meals:') || line.toLowerCase().startsWith('stay:')) {
                isHighlights = false; // end highlights
                doc.moveDown(0.2);
                const split = line.split(':');
                doc.font('Helvetica-Bold').fontSize(10).fillColor(darkColor).text(split[0] + ':', textX, doc.y, { width: textWidth, continued: true });
                doc.font('Helvetica').fillColor(secondaryColor).text(split.slice(1).join(':'));
              } else {
                isHighlights = false;
                doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text(line, textX, doc.y, { width: textWidth, lineGap: 3 });
              }
            }

            // Move below the tallest column (text or image)
            const newY = Math.max(doc.y, currentY + imgSize);
            doc.y = newY + 40; 
          });

          const pages = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
          doc.moveDown(2);
          doc.font('Helvetica-Oblique').fontSize(9).fillColor('#9ca3af').text('Powered by EzzySync AI | Premium Experience', 50, doc.y, { align: 'center', width: 495 });

        } else {
          // Standard Free Header
          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('EzzySync Travel Itinerary', 50, 50);
          doc.fillColor(secondaryColor).font('Helvetica').fontSize(10).text(`Trip: ${tripName}`, 50, 78);
          doc.fillColor(secondaryColor).fontSize(9).text(`Generated Date: ${new Date().toLocaleDateString('en-IN')}`, 50, 92);
          doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#e5e7eb').lineWidth(1).stroke();
          doc.x = 50;
          doc.y = 130;

          const lines = itineraryText.split('\n');
          for (const line of lines) {
            const cleanLine = line.replace(/\*\*/g, '').replace(/[^\x00-\x7F]/g, '').trim();

            if (line.startsWith('# ')) {
              doc.moveDown(1);
              doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor).text(cleanLine, { lineGap: 6 });
              doc.moveDown(0.5);
            } else if (line.startsWith('## ')) {
              doc.moveDown(1);
              doc.font('Helvetica-Bold').fontSize(14).fillColor(darkColor).text(cleanLine, { lineGap: 5 });
              doc.moveDown(0.4);
            } else if (line.startsWith('### ')) {
              doc.moveDown(0.6);
              doc.font('Helvetica-Bold').fontSize(11).fillColor(darkColor).text(cleanLine, { lineGap: 4 });
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
