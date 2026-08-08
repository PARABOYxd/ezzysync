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
- Output must be exactly in this format. Do NOT use markdown bold/italics or paragraphs.
- Output ONLY a strict time-based schedule for each day.
- Guess logical times for activities if not specified.
- The destination keyword in brackets must be 2 words maximum (e.g., [Uluwatu Temple]).

Day 1 [ImageSearchKeyword]
- 08:00 AM - 09:00 AM: Breakfast at the villa
- 09:30 AM - 12:00 PM: Explore the ancient temples
- 12:30 PM - 02:00 PM: Lunch at a local cafe
- 02:30 PM - 05:00 PM: Relaxing at the beach
- 07:00 PM - 09:00 PM: Dinner under the stars
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
    
    let coverImages = [];

    if (isPremium) {
      try {
        // Fetch 2 images for the top right header based on the trip name
        const p1 = fetchUnsplashImage(tripName + ' landscape travel', true);
        const p2 = fetchUnsplashImage(tripName + ' nature travel', true);
        coverImages = await Promise.all([p1, p2]);
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

        const primaryColor = isPremium ? '#437370' : '#0f766e'; // Dark teal from Template 1
        const darkColor = '#111827';
        const secondaryColor = '#4b5563';
        
        if (isPremium) {
          // Template 1 Header
          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(45).text('TRAVEL', 50, 70);
          doc.text('ITINERARY', 50, 115);

          // Top right overlapping images
          if (coverImages[0]) {
            doc.save();
            doc.roundedRect(300, 50, 130, 110, 15).clip();
            doc.image(coverImages[0], 300, 50, { width: 130, height: 110, fit: [130, 110] });
            doc.restore();
          }
          if (coverImages[1]) {
            doc.save();
            doc.roundedRect(400, 120, 130, 110, 15).clip();
            doc.image(coverImages[1], 400, 120, { width: 130, height: 110, fit: [130, 110] });
            doc.restore();
          }
          
          doc.y = 260;

          // Parse Timeline blocks
          const dayBlocks = itineraryText.split(/(?=Day \d+)/i).filter(b => b.trim().startsWith('Day '));
          
          dayBlocks.forEach((block, index) => {
            // Extract schedule items
            const items = [];
            const itemRegex = /-\s*(\d{2}:\d{2}\s*[AP]M\s*-\s*\d{2}:\d{2}\s*[AP]M):\s*(.+)/gi;
            let match;
            while ((match = itemRegex.exec(block)) !== null) {
              items.push({ time: match[1], activity: match[2] });
            }

            // Fallback parsing if the strict format wasn't followed
            if (items.length === 0) {
              const lines = block.split('\n');
              for (const line of lines) {
                if (line.trim().startsWith('-')) {
                  items.push({ time: 'Scheduled Activity', activity: line.replace(/^- /, '').trim() });
                }
              }
            }
            if (items.length === 0) {
              items.push({ time: 'All Day', activity: 'Explore and enjoy the destination at your leisure.' });
            }

            const rowsNeeded = Math.ceil(items.length / 2);
            const blockHeight = 40 + (rowsNeeded * 45);
            
            if (doc.y + blockHeight > 780) {
              doc.addPage();
              doc.y = 50;
            }

            const currentY = doc.y;

            // Draw Rounded Block
            doc.roundedRect(70, currentY, 470, blockHeight, 15).fill(primaryColor);
            
            // Draw Circle Badge (D-1)
            doc.circle(70, currentY + 40, 28).fill('white');
            doc.lineWidth(3).strokeColor(primaryColor).circle(70, currentY + 40, 28).stroke();
            doc.font('Helvetica-Bold').fontSize(20).fillColor(primaryColor).text(`D-${index + 1}`, 45, currentY + 33, { align: 'center', width: 50 });

            // Draw Schedule Items in 2 Columns
            let col1X = 110;
            let col2X = 330;
            let startY = currentY + 20;

            items.forEach((item, i) => {
              const isCol1 = i % 2 === 0;
              const rowIdx = Math.floor(i / 2);
              const xPos = isCol1 ? col1X : col2X;
              const yPos = startY + (rowIdx * 45);

              doc.font('Helvetica-Bold').fontSize(11).fillColor('white').text(item.time, xPos, yPos);
              doc.font('Helvetica').fontSize(9).fillColor('#e2e8f0').text(item.activity, xPos, yPos + 15, { width: 200, height: 25, lineBreak: true });
            });

            // Move to next day
            doc.y = currentY + blockHeight + 30; 
          });

          const pages = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
          doc.moveDown(1);
          doc.font('Helvetica-Oblique').fontSize(9).fillColor('#a0aec0').text('Powered by EzzySync AI | Premium Experience', 50, doc.y, { align: 'center', width: 495 });

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
