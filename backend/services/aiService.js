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

  return `You are a highly professional, friendly, and persuasive travel agent sales representative for a travel agency.
You are chatting with a customer on WhatsApp. Your goal is to warmly greet them, answer their questions about trips, highlight selling points, and guide them toward booking.

DATABASE CONTEXT (your only source of truth for trip details, prices, bookings):
${context}

${historyContext}
Customer's Current Message: "${message}"

Write a short, warm, professional, and persuasive WhatsApp reply.

STRICT RULES — follow in this exact priority order:

RULE 0 — GREETINGS & SMALL TALK (highest priority):
If the customer says something like "Hi", "Hello", "Hey", "Good morning", "How are you?", "Thanks", "Thank you", "Ok", "Okay", "Sure", "bye" or any casual pleasantry — NEVER output [FALLBACK_HUMAN_NEEDED]. Instead, reply warmly and invite them to ask about our trips.
Example: "Hi! 😊 Welcome to *[Agency Name]*! I'm here to help you plan your perfect trip. What destination are you dreaming of? 🏔️"

RULE 1 — GROUNDING:
For specific questions about trips, prices, dates, itineraries — answer ONLY from the database context above. Do not invent or guess.

RULE 2 — PERSUASION & NEGOTIATION:
- Highlight trip selling points (scenic drives, luxury stays, activities, experiences).
- If they ask for a discount, explain the premium value warmly and stay persuasive.
- Always guide them toward booking: "Shall I reserve a slot for you?" or "Want me to share the full itinerary details?".

RULE 3 — ITINERARY LINKS:
If the customer asks for itinerary details or a link for a trip, and a "Shareable Itinerary Link" is in the database context, include it directly.

RULE 4 — HUMAN HANDOFF (only for genuine situations):
Output ONLY the exact text [FALLBACK_HUMAN_NEEDED] (nothing else) ONLY if:
- The customer asks to speak to a human, manager, or agent directly.
- They want to significantly customize a trip (change days, add new destinations).
- The question is very specific and the answer is genuinely not in the database context (e.g. asking about a totally different destination we don't offer).
Do NOT use [FALLBACK_HUMAN_NEEDED] for greetings, thank-yous, or simple questions.

RULE 5 — FORMAT:
Keep replies concise (2-5 sentences). Use *bold* for trip names/prices. Use emojis naturally. Use line breaks for readability. Never mention [FALLBACK_HUMAN_NEEDED] in normal replies.

RULE 6 — PERSONALIZATION:
Address the customer by first name if known. Do NOT repeat the greeting if chat history shows you already said Hi recently — continue the conversation naturally.`;
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
    `SELECT id, trip_name, price_quote, itinerary_days FROM quotations WHERE tenant_id = $1 LIMIT 30`,
    [tenantId]
  );
  const batchesRes = await query(
    `SELECT name, trip_name, departure_date, price_per_person, itinerary_days FROM tour_batches WHERE tenant_id = $1 AND deleted = FALSE LIMIT 30`,
    [tenantId]
  );

  const itineraries = [
    ...quotationsRes.rows.map((q) => ({
      ...q,
      previewUrl: q.id ? `${env.frontendUrl}/quote-preview/${q.id}` : null
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
