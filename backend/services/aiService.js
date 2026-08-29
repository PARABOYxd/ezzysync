const axios = require('axios');
const env = require('../config/env');
const bookingService = require('./bookingService');

const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_TIMEOUT_MS = 30000;

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

function isConfigured() {
  return Boolean(env.geminiApiKey);
}

/** Single entry point for Gemini generateContent. Returns the first candidate's
 * text, or undefined when the model returned nothing usable - callers decide
 * what HTTP status that deserves. */
async function generateContent(parts, generationConfig) {
  const requestBody = { contents: [{ parts }] };
  if (generationConfig) requestBody.generationConfig = generationConfig;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.geminiApiKey}`;
  const response = await axios.post(url, requestBody, {
    headers: { 'Content-Type': 'application/json' },
    timeout: GEMINI_TIMEOUT_MS,
  });

  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

/** Extracts structured booking fields from a PDF ticket buffer or raw chat
 * text. Returns null when the model produced no text. */
async function parseTicketOrChat({ text, file }) {
  const promptParts = [];

  if (file) {
    promptParts.push({
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString('base64'),
      },
    });
    promptParts.push({
      text: 'Extract the travel booking details from this PDF ticket.',
    });
  } else {
    promptParts.push({
      text: `Extract travel booking details from the following text or chat history:\n\n${text}`,
    });
  }

  const parsedText = await generateContent(promptParts, {
    responseMimeType: 'application/json',
    responseSchema: bookingJsonSchema,
  });
  if (!parsedText) return null;

  return JSON.parse(parsedText);
}

function buildItineraryPrompt(tripName, days, notes, isJson) {
  if (isJson) {
    return `You are a professional travel planner. Generate a highly detailed, premium day-by-day travel itinerary for the trip: "${tripName}" spanning ${days} days.
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
  }

  return `You are a professional travel planner. Generate a highly detailed, premium day-by-day travel itinerary for the trip: "${tripName}" spanning ${days} days.
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

/** Raw itinerary text from the model, or null when nothing came back. */
async function generateItineraryText({ tripName, days, notes, isJson }) {
  const prompt = buildItineraryPrompt(tripName, days, notes, isJson);
  const responseText = await generateContent([{ text: prompt }]);
  return responseText || null;
}

/** The model is asked for bare JSON but sometimes still wraps it in a fenced
 * code block, so strip fences before parsing. Throws on invalid JSON. */
function parseItineraryJson(responseText) {
  const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJsonText);
}

/**
 * Finds the booking whose phone number matches the inbound WhatsApp number.
 * Numbers are compared on digits only and by suffix, since the stored number
 * and the WhatsApp sender may disagree about the country code.
 */
function findBookingByPhone(bookings, phone) {
  const cleanTargetPhone = phone.replace(/[^\d]/g, '');
  return bookings.find((b) => {
    const cleanPhone = b.phone.replace(/[^\d]/g, '');
    return cleanPhone.endsWith(cleanTargetPhone) || cleanTargetPhone.endsWith(cleanPhone);
  });
}

const { query } = require('../config/db');

function formatFollowUpHistory(logs) {
  if (!logs || logs.length === 0) return null;
  return logs
    .map((log) => `[${new Date(log.created_at).toLocaleDateString('en-IN')}] ${log.activity_type.toUpperCase()}: ${log.note}`)
    .join('\n');
}

function findLeadByPhone(leads, phone) {
  const cleanTargetPhone = phone.replace(/[^\d]/g, '');
  return leads.find((l) => {
    const cleanPhone = (l.phone || '').replace(/[^\d]/g, '');
    return cleanPhone.endsWith(cleanTargetPhone) || cleanTargetPhone.endsWith(cleanPhone);
  });
}

function buildWhatsappReplyPrompt({ booking, lead, itineraries, followUpHistory, chatHistory, phone, message }) {
  let context = '';
  
  if (booking) {
    context += `Here is the customer's active BOOKING details:
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
${followUpHistory}\n\n`;
  } else if (lead) {
    context += `Here is the prospect's active LEAD details:
- Name: ${lead.customer_name}
- Phone: ${lead.phone}
- Email: ${lead.email || 'none'}
- Interested Trip: ${lead.trip_name || 'none'}
- Lead Status: ${lead.status}
- Notes: ${lead.notes || 'none'}\n\n`;
  } else {
    context += `No active booking or lead was found in our database for the customer's phone number (${phone}).\n\n`;
  }

  if (itineraries && itineraries.length > 0) {
    context += `Here are our agency's active trip packages/itineraries:
${itineraries.map((it, idx) => {
  return `${idx + 1}. Trip: ${it.trip_name || it.name}
   - Price: ₹${it.price_quote || it.price_per_person || 'Contact sales'}
   - Shareable Itinerary Link: ${it.previewUrl || 'none'}
   - Days Details: ${JSON.stringify(it.itinerary_days || [])}`;
}).join('\n')}\n\n`;
  } else {
    context += `No active itineraries or tour packages are currently listed.\n\n`;
  }

  let historyContext = '';
  if (chatHistory && chatHistory.length > 0) {
    historyContext = `RECENT CHAT HISTORY (ordered oldest to newest):
${chatHistory.map((m) => {
  const sender = m.direction === 'inbound' ? 'Customer' : 'Bot';
  return `[${sender}]: ${m.message_text}`;
}).join('\n')}\n\n`;
  }

  return `You are a helpful travel assistant chat bot for our travel agency.
We received a WhatsApp message from a customer.

DATABASE CONTEXT:
${context}

${historyContext}
Customer's Current Message: "${message}"

Write a short, friendly, and helpful WhatsApp response answering their query.

STRICT INSTRUCTIONS AND RULES:
1. Grounding: ONLY answer the question using the database details provided above (booking details, lead details, or the active itinerary days/pricing).
2. Customization / Modifications Handoff: If the customer asks to customize, edit, or modify an itinerary/plan (e.g. "I want to customize it", "add a day", "Change the hotels", "Change the itinerary"), OR if they ask for a trip details not in our list, OR if they ask to speak to a person, you MUST reply ONLY with the exact code: [FALLBACK_HUMAN_NEEDED].
3. Answer Missing Handoff: If you cannot find the answer to the customer's question from the provided database context (e.g., they ask about a policy we don't list, or ask about another trip not in context), you MUST reply ONLY with the exact code: [FALLBACK_HUMAN_NEEDED].
4. No Hallucinations: Do not assume, invent, or make up any prices, trip dates, trip details, itineraries, or pickup locations. If the data is not in the context, output [FALLBACK_HUMAN_NEEDED].
5. Format for WhatsApp: Keep normal replies concise (1-4 sentences), use *bold* for emphasis, emojis where appropriate, and line breaks. Do not mention [FALLBACK_HUMAN_NEEDED] in normal replies.
6. Shareable Itinerary Links: If the customer asks for the itinerary details, trip plan, itinerary PDF/link, or schedule for a specific trip, and a "Shareable Itinerary Link" is available for that trip in the database context, you MUST include that link in your response (e.g., "You can view the full itinerary here: [Link]"). If no link is available for that trip but the trip details are in context, describe the days briefly and offer to connect them with a human helper.
7. Greeting and Personalization: Address the customer by name if known (e.g. "Pinky", "Payal"). If the RECENT CHAT HISTORY shows you have already greeted the customer in recent messages, DO NOT repeat the greeting (e.g., do not say "Hi Pinky!" or "Hello Pinky!" again). Just answer their question directly, keeping the flow natural like a continuous chat.`;
}

/**
 * Composes an AI reply to an inbound WhatsApp message, grounded in the
 * matching booking/lead and its follow-up history when one can be found.
 * `onHistoryError` lets the caller log a non-fatal history lookup failure
 * without this service depending on the request logger.
 */
async function generateWhatsappReply(tenantId, { phone, message }, { onHistoryError } = {}) {
  // 1. Check bookings
  const bookings = await bookingService.listBookings(tenantId);
  const booking = findBookingByPhone(bookings, phone);

  // 2. Check leads
  const leadsRes = await query(`SELECT * FROM leads WHERE tenant_id = $1 AND deleted = FALSE`, [tenantId]);
  const lead = findLeadByPhone(leadsRes.rows, phone);

  // 3. Check itineraries/quotations
  const quotationsRes = await query(
    `SELECT uuid, trip_name, price_quote, itinerary_days FROM quotations WHERE tenant_id = $1 LIMIT 30`,
    [tenantId]
  );
  const batchesRes = await query(
    `SELECT name, trip_name, departure_date, price_per_person, itinerary_days FROM tour_batches WHERE tenant_id = $1 AND deleted = FALSE LIMIT 30`,
    [tenantId]
  );

  const itineraries = [
    ...quotationsRes.rows.map((q) => ({
      ...q,
      previewUrl: q.uuid ? `${env.frontendUrl}/quote-preview/${q.uuid}` : null
    })),
    ...batchesRes.rows.map((b) => ({
      ...b,
      trip_name: b.trip_name || b.name,
      previewUrl: null
    }))
  ];

  // 4. Fetch last 8 WhatsApp messages for conversation history context
  let chatHistory = [];
  try {
    const historyRes = await query(
      `SELECT direction, message_text, message_timestamp 
       FROM whatsapp_messages 
       WHERE tenant_id = $1 AND chat_id = (
         SELECT id FROM whatsapp_chats WHERE tenant_id = $1 AND phone = $2 LIMIT 1
       )
       ORDER BY message_timestamp DESC 
       LIMIT 8`,
      [tenantId, phone]
    );
    // Reverse to chronological order
    chatHistory = historyRes.rows.reverse();
  } catch (err) {
    if (onHistoryError) onHistoryError(err);
  }

  let followUpHistory = 'none';
  if (booking) {
    try {
      const logs = await bookingService.getFollowUps(tenantId, booking.bookingId);
      followUpHistory = formatFollowUpHistory(logs) || followUpHistory;
    } catch (err) {
      if (onHistoryError) onHistoryError(err);
    }
  }

  const prompt = buildWhatsappReplyPrompt({ booking, lead, itineraries, followUpHistory, chatHistory, phone, message });
  const reply = await generateContent([{ text: prompt }]);

  return { reply: reply || null, booking: booking || null, lead: lead || null };
}

module.exports = {
  isConfigured,
  parseTicketOrChat,
  generateItineraryText,
  parseItineraryJson,
  generateWhatsappReply,
};
