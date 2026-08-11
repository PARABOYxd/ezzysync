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

function formatFollowUpHistory(logs) {
  if (!logs || logs.length === 0) return null;
  return logs
    .map((log) => `[${new Date(log.created_at).toLocaleDateString('en-IN')}] ${log.activity_type.toUpperCase()}: ${log.note}`)
    .join('\n');
}

function buildWhatsappReplyPrompt({ booking, followUpHistory, phone, message }) {
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

  return `You are a helpful travel assistant chat bot for our travel agency.
We received a WhatsApp message from a customer.

${context}

Customer's Message: "${message}"

Write a short, friendly, and helpful WhatsApp response answering their query.
Rules:
- Keep it concise (1-4 sentences).
- Format for WhatsApp (use *bold* for emphasis, emojis where appropriate, and line breaks).
- Answer specifically using the booking details and the past interaction history if provided (e.g. if they ask for remaining amount, state the exact amount pending, or reference past agreements).
- If no booking was found, ask them for their email or booking ID to help locate it.`;
}

/**
 * Composes an AI reply to an inbound WhatsApp message, grounded in the
 * matching booking and its follow-up history when one can be found.
 * `onHistoryError` lets the caller log a non-fatal history lookup failure
 * without this service depending on the request logger.
 */
async function generateWhatsappReply(tenantId, { phone, message }, { onHistoryError } = {}) {
  const bookings = await bookingService.listBookings(tenantId);
  const booking = findBookingByPhone(bookings, phone);

  let followUpHistory = 'none';
  if (booking) {
    try {
      const logs = await bookingService.getFollowUps(tenantId, booking.bookingId);
      followUpHistory = formatFollowUpHistory(logs) || followUpHistory;
    } catch (err) {
      if (onHistoryError) onHistoryError(err);
    }
  }

  const prompt = buildWhatsappReplyPrompt({ booking, followUpHistory, phone, message });
  const reply = await generateContent([{ text: prompt }]);

  return { reply: reply || null, booking: booking || null };
}

module.exports = {
  isConfigured,
  parseTicketOrChat,
  generateItineraryText,
  parseItineraryJson,
  generateWhatsappReply,
};
