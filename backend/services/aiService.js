const axios = require('axios');
const env = require('../config/env');
const bookingService = require('./bookingService');
const logger = require('../utils/logger');

const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const FALLBACK_GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.7-flash'];
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 30000;

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

/**
 * Generation settings for WhatsApp-length replies.
 *
 * thinkingBudget: 0 is the big one. Gemini 3.x bills its private reasoning as
 * output, and on a two-line sales reply it spent ~410 thinking tokens to
 * produce ~40 of actual message - measured 478 total tokens with thinking on
 * versus 72 with it off, for answers of equal quality. Reasoning earns its
 * keep on hard problems; this is not one.
 *
 * It also makes maxOutputTokens mean what it looks like it means. Thinking
 * tokens count against that same budget, so a 200 cap left only a handful for
 * the reply and returned truncated fragments with finishReason MAX_TOKENS.
 */
const WHATSAPP_REPLY_CONFIG = {
  maxOutputTokens: 300,
  temperature: 0.7,
  thinkingConfig: { thinkingBudget: 0 },
};

function isConfigured() {
  return Boolean(env.geminiApiKey && env.geminiApiKey.trim());
}

/** Single entry point for Gemini generateContent with automatic model fallback.
 * Returns the first candidate's text, or undefined when the model returned nothing usable. */
async function generateContent(parts, generationConfig) {
  const apiKey = (env.geminiApiKey || '').trim();
  if (!apiKey) {
    logger.warn('[aiService] GEMINI_API_KEY is not configured in env.');
    return undefined;
  }

  const modelsToTry = Array.from(new Set([PRIMARY_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS]));
  let lastError = null;

  const url = (model) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const call = async (model, config) => {
    const requestBody = { contents: [{ parts }] };
    if (config) requestBody.generationConfig = config;
    return axios.post(url(model), requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: GEMINI_TIMEOUT_MS,
    });
  };

  for (const model of modelsToTry) {
    try {
      let response;
      try {
        response = await call(model, generationConfig);
      } catch (err) {
        // Lighter models reject thinkingConfig with a bare 400
        // "Request contains an invalid argument" that names no field, so the
        // trigger has to be the status code rather than the message text.
        // Retrying without it beats skipping a model that otherwise works.
        const rejectsThinking =
          generationConfig?.thinkingConfig && err.response?.status === 400;
        if (!rejectsThinking) throw err;

        logger.warn({ model }, '[aiService] Model rejected thinkingConfig, retrying without it');
        const { thinkingConfig, ...rest } = generationConfig;
        response = await call(model, rest);
      }

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const finishReason = response.data?.candidates?.[0]?.finishReason;
      if (finishReason === 'MAX_TOKENS') {
        logger.warn({ model, finishReason }, '[aiService] Reply hit the output cap and may be truncated');
      }
      if (text) return text;
    } catch (err) {
      lastError = err;
      logger.warn({ model, err: err.response?.data || err.message }, `[aiService] Model ${model} generateContent failed, trying next...`);
    }
  }

  logger.error({ err: lastError?.response?.data || lastError?.message }, '[aiService] All Gemini models failed to generate content');
  return undefined;
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

const aiContextRepository = require('../repositories/aiContextRepository');

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


/**
 * Renders the agency's packages compactly for the prompt.
 *
 * The previous version inlined JSON.stringify(itinerary_days) for up to 60
 * packages. On a real agency's data that is thousands of tokens per WhatsApp
 * reply, for detail the model almost never needs - it is answering a one-line
 * question, not writing the itinerary. Day titles alone preserve the useful
 * signal ("what does this trip cover") at a fraction of the size, and the full
 * itinerary is still one shareable link away.
 */
function formatPackagesForPrompt(itineraries, { maxPackages = 8, maxDays = 6 } = {}) {
  if (!itineraries || itineraries.length === 0) return '';

  const lines = itineraries.slice(0, maxPackages).map((it, idx) => {
    const price = it.price_quote || it.price_per_person;
    const days = Array.isArray(it.itinerary_days) ? it.itinerary_days : [];
    const dayTitles = days
      .slice(0, maxDays)
      .map((d, i) => (typeof d === 'string' ? d : d?.title || d?.heading || d?.name || `Day ${i + 1}`))
      .map((t) => String(t).slice(0, 60))
      .join(' | ');

    const parts = [`${idx + 1}. ${it.trip_name || it.name}`];
    parts.push(price ? `₹${price}` : 'price on request');
    if (days.length) parts.push(`${days.length}d: ${dayTitles}${days.length > maxDays ? ' …' : ''}`);
    if (it.previewUrl) parts.push(`link: ${it.previewUrl}`);
    return parts.join(' — ');
  });

  const extra =
    itineraries.length > maxPackages
      ? `\n(+${itineraries.length - maxPackages} more packages - ask the customer what they want and look it up)`
      : '';

  return `OUR ACTIVE PACKAGES:\n${lines.join('\n')}${extra}\n\n`;
}

/**
 * Loads only the rows this conversation actually needs.
 * Matching by phone in SQL avoids pulling every booking and lead the tenant
 * owns into memory on each inbound message.
 */
async function loadChatContext(tenantId, phone) {
  const { bookingRow, lead } = await aiContextRepository.findCustomerContext(tenantId, phone);

  // Mapped to the same camelCase shape bookingService.listBookings returns,
  // since buildWhatsappReplyPrompt and the follow-up lookup both read that.
  const booking = bookingRow
    ? {
        bookingId: bookingRow.booking_id,
        customerName: bookingRow.customer_name,
        phone: bookingRow.phone,
        email: bookingRow.email,
        trip: bookingRow.trip,
        departure: bookingRow.departure,
        pickup: bookingRow.pickup,
        members: bookingRow.members,
        totalAmount: bookingRow.total_amount,
        paid: bookingRow.paid,
        remaining: bookingRow.remaining,
        travelStatus: bookingRow.travel_status,
        paymentStatus: bookingRow.payment_status,
        notes: bookingRow.notes,
      }
    : null;

  return { booking, lead };
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
    context += formatPackagesForPrompt(itineraries);
  } else {
    context += `No active itineraries or tour packages are currently listed.\n\n`;
  }

  let historyContext = '';
  if (chatHistory && chatHistory.length > 0) {
    // Labelled per sender, not just by direction. When AI takes over a chat a
    // human was handling, it needs to see which lines were the agent's so it
    // continues that thread instead of re-introducing itself or repeating an
    // offer the agent already made. Each line is capped so one pasted
    // paragraph cannot crowd out the rest of the history.
    historyContext = `CONVERSATION SO FAR (oldest to newest). Read it, pick up exactly where it left off, and never repeat a question already answered here:
${chatHistory
  .map((m) => {
    const who = m.direction === 'inbound' ? 'Customer' : m.sender === 'ai_bot' ? 'You (AI)' : 'Our agent';
    const text = String(m.message_text || '').replace(/\s+/g, ' ').slice(0, 300);
    return `[${who}]: ${text}`;
  })
  .join('\n')}\n\n`;
  }

  return `You are a warm, sharp, genuinely helpful travel consultant for a travel agency, chatting with a customer on WhatsApp.

YOUR MISSION: turn this conversation into a booking. A chat is only "won" when you know three things - WHERE they want to go, WHEN they want to travel, and HOW MANY people are coming. Every reply should either answer what they asked or move one step closer to learning those three. Never let a conversation die on a polite dead end.

Sound like a real person who books trips for a living, not a chatbot. Short sentences. No corporate filler. No "I'd be happy to assist you with that".

DATABASE CONTEXT (your only source of truth for trip details, prices, bookings):
${context}

${historyContext}
Customer's Current Message: "${message}"

Write a short, warm, professional, and persuasive WhatsApp reply.

STRICT RULES — follow in this exact priority order:

RULE 0 — GREETINGS & SMALL TALK (highest priority, always handle these yourself):
If the message is a simple greeting or pleasantry ("Hi", "Hello", "Hey", "Good morning", "How are you?", "Thanks", "Thank you", "Ok", "Okay", "Hmm", "Sure", "👋", "Bye", etc.) — reply warmly and naturally in 1 short sentence. Do NOT pitch any trips or mention prices. Just be friendly.
Good example: "Hi! 😊 How can I help you today?"
Bad example (never do this): "Hi! We have an amazing Harshil Valley trip for ₹7000..."
NEVER output [FALLBACK_HUMAN_NEEDED] for greetings or small talk.

RULE 1 — GROUNDING:
For specific questions about trips, prices, dates, itineraries — answer ONLY from the database context above. Do not invent or guess.

RULE 2 — QUALIFY, THEN PERSUADE:
- Only mention trip selling points when the customer asks about a trip or shows interest.
- Whenever the destination, travel dates or passenger count is still unknown, end your reply with ONE easy question that fills the biggest gap. One question only - never interrogate.
- If they ask for a discount, warmly justify the value (inclusions, hotel quality, support) before anything else. Never invent a discount that is not in the database context.
- Once they show clear interest, ask for the commitment directly: "Shall I hold a slot for you?"

RULE 2B — BRUSH-OFFS ARE NOT A GOODBYE (very important):
When the customer stalls - "I'll think about it", "just looking", "I'll ask ChatGPT/someone else", "too expensive", "let me check with family", "will get back to you" - do NOT simply accept it and sign off.
Reply in this shape, in one or two short sentences:
  1. Acknowledge them lightly, with zero pressure and zero guilt.
  2. Give ONE concrete reason you are more useful than a search engine or a competitor - you have live prices, real availability, and you handle the booking end to end.
  3. Close with one low-effort question that keeps the door open ("Which month were you thinking?" / "Want me to send a quick quote for those dates?").
Good example: "Totally fair 😊 Though ChatGPT can't check live availability or hold a slot for you — I can. Which month were you looking at?"
Never reply with just "Okay, let me know!" or "Sure, feel free to reach out" - that loses the lead.

RULE 3 — ITINERARY LINKS:
If the customer asks for itinerary details or a link for a trip, and a "Shareable Itinerary Link" is in the database context, include it directly.

RULE 4 — HUMAN HANDOFF (this rule OVERRIDES every other rule, including RULE 2B):
Output ONLY the exact text [FALLBACK_HUMAN_NEEDED] and nothing else - no apology, no greeting, no "let me connect you", not one extra word - whenever ANY of these is true:

a) They ask for a human, manager, owner, or "real person".
b) They are angry, upset, insulting, threatening, or complaining about service, a refund, a cancellation, a delay, or something that went wrong on a trip.
c) Money is in dispute: refunds, cancellation charges, a payment they say they made, an amount they disagree with, or any demand to change what was already paid or agreed.
d) The request is genuinely complex: heavy trip customization, group/corporate bookings, multi-city planning, or anything needing negotiation or approval.
e) It is outside travel and outside this agency's business - visas, insurance claims, legal or medical questions, jobs, partnerships, other companies' products, or plain spam.
f) The answer is simply not in the DATABASE CONTEXT above and you would have to guess a price, a date, an availability or a policy to answer.
g) You are unsure which of the rules applies, or unsure whether your answer would be correct.

The test is simple: if a wrong answer here could cost the agency money, a customer, or trust, hand it over. Saying nothing is always safer than guessing. A human will read the whole conversation and reply - so an unanswered message is never lost, it is escalated.

DO NOT hand off for ordinary sales work: greetings, small talk, questions you can answer from the context, price questions already covered above, or a customer merely hesitating (that is RULE 2B, handle it yourself).

RULE 5 — FORMAT & LENGTH:
Keep ALL replies short and conversational — 1 to 3 sentences max. No long paragraphs. Write like a friendly human agent texting on WhatsApp. Use emojis sparingly (1-2 max). Use *bold* only for key details like trip names or prices.

RULE 6 — PERSONALIZATION:
Address the customer by first name if known. Do NOT repeat "Hi [Name]!" if you already greeted them in recent messages. Continue the conversation naturally.`;
}

/**
 * Composes an AI reply to an inbound WhatsApp message, grounded in the
 * matching booking/lead and its follow-up history when one can be found.
 * `onHistoryError` lets the caller log a non-fatal history lookup failure
 * without this service depending on the request logger.
 */
async function generateWhatsappReply(tenantId, { phone, message }, { onHistoryError } = {}) {
  // 1 + 2. Matching booking and lead, resolved in SQL rather than by scanning
  // every row the tenant owns on each inbound message.
  const { booking, lead } = await loadChatContext(tenantId, phone);

  // 3. Packages. Capped here and summarised in formatPackagesForPrompt - the
  // model is writing a two-line WhatsApp reply, not the itinerary itself.
  const [quotationRows, batchRows] = await Promise.all([
    aiContextRepository.listQuotationsForPrompt(tenantId),
    aiContextRepository.listTourBatchesForPrompt(tenantId),
  ]);

  const itineraries = [
    ...quotationRows.map((q) => ({
      ...q,
      previewUrl: q.id ? `${env.frontendUrl}/quote-preview/${q.id}` : null
    })),
    ...batchRows.map((b) => ({
      ...b,
      trip_name: b.trip_name || b.name,
      previewUrl: null
    }))
  ];

  // 4. Fetch last 8 WhatsApp messages for conversation history context
  let chatHistory = [];
  try {
    chatHistory = await aiContextRepository.getChatHistoryByPhone(tenantId, phone);
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
  // A WhatsApp reply is 1-3 sentences. Capping output stops the model from
  // drifting into paragraphs and caps the billed completion tokens with it.
  const reply = await generateContent([{ text: prompt }], WHATSAPP_REPLY_CONFIG);

  return { reply: reply || null, booking: booking || null, lead: lead || null };
}


/**
 * Drafts a reply *for the agent to review*, never to be auto-sent.
 *
 * Two modes share one grounding pass so a suggestion is as well-informed as an
 * autopilot reply would have been:
 *  - 'suggest' writes a fresh reply to the customer's last message.
 *  - 'improve' rewrites the agent's own draft, keeping their intent and facts
 *    but fixing tone, grammar and length for WhatsApp.
 *
 * The goal in both cases is to move the conversation toward a booking, so the
 * prompt asks for one concrete next step rather than a polite dead end.
 */
async function suggestWhatsappDraft(tenantId, { phone, mode = 'suggest', draft = '', lastCustomerMessage = '' }) {
  // Same targeted, capped loads as the autopilot path. This used to pull every
  // booking and lead the tenant owns and 30 full itineraries per suggestion.
  const { booking, lead } = await loadChatContext(tenantId, phone);

  const quotationRows = await aiContextRepository.listQuotationsForPrompt(tenantId);
  const itineraries = quotationRows.map((q) => ({
    ...q,
    previewUrl: q.id ? `${env.frontendUrl}/quote-preview/${q.id}` : null,
  }));

  let chatHistory = [];
  try {
    chatHistory = await aiContextRepository.getChatHistoryByPhone(tenantId, phone);
  } catch (err) {
    logger.warn({ err, tenantId }, '[aiService] Could not load history for draft suggestion');
  }

  const base = buildWhatsappReplyPrompt({
    booking,
    lead,
    itineraries,
    followUpHistory: 'none',
    chatHistory,
    phone,
    message: lastCustomerMessage || draft,
  });

  const task =
    mode === 'improve'
      ? `TASK OVERRIDE — REWRITE MODE:
The agent has drafted this reply: "${draft}"
Rewrite it for WhatsApp. Keep the agent's intent and every factual claim they made.
Fix grammar, tone and length; make it warm, confident and easy to read.
Do NOT invent prices, dates or offers the agent did not mention.
Output ONLY the rewritten message - no preamble, no options, no quotes around it.`
      : `TASK OVERRIDE — SUGGESTION MODE:
Draft the reply the agent should send next, based on the conversation above.
Move the customer one concrete step closer to booking - ask for travel dates,
passenger count, or offer to hold a slot, whichever fits naturally.
Output ONLY the message text - no preamble, no options, no quotes around it.`;

  const text = await generateContent([{ text: `${base}

${task}` }], WHATSAPP_REPLY_CONFIG);
  return { suggestion: (text || '').trim() || null };
}

module.exports = {
  isConfigured,
  parseTicketOrChat,
  generateItineraryText,
  parseItineraryJson,
  generateWhatsappReply,
  suggestWhatsappDraft,
};
