const axios = require('axios');
const env = require('../config/env');
const bookingService = require('./bookingService');
const settingsService = require('./settingsService');
const logger = require('../utils/logger');

const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const FALLBACK_GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.7-flash', 'gemini-flash-latest'];
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
// A rate limit clears in seconds, so a couple of short waits are worth it -
// but an inbound WhatsApp message is a person waiting for a reply, so the
// total delay stays well under the point where a bot feels broken.
const GEMINI_MAX_RETRIES = 2;
const GEMINI_RETRY_BASE_MS = 1000;
const GEMINI_MAX_RETRY_DELAY_MS = 8000;

const WHATSAPP_REPLY_CONFIG = {
  maxOutputTokens: 600,
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

  /**
   * Retries a rate-limited model before giving up on it.
   *
   * Gemini's free tier limits requests per minute, and a busy WhatsApp inbox
   * reaches that easily - several customers writing at once is enough. A 429
   * used to drop the model immediately and move to the next one, so a brief
   * burst could exhaust the whole fallback chain in under a second and the
   * customer got no reply at all, for a limit that had cleared moments later.
   *
   * Only 429 and 5xx are retried: those are the server saying "later". A 400
   * means the request itself is wrong and will be just as wrong next time.
   */
  const callWithBackoff = async (model, config) => {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await call(model, config);
      } catch (err) {
        const status = err.response?.status;
        const worthRetrying = status === 429 || (status >= 500 && status < 600);
        if (!worthRetrying || attempt >= GEMINI_MAX_RETRIES) throw err;

        // Google sends the wait it wants in RetryInfo; honour it when present,
        // otherwise back off 1s, 2s, 4s.
        const retryInfo = err.response?.data?.error?.details?.find((d) =>
          String(d['@type'] || '').includes('RetryInfo')
        );
        const suggestedMs = retryInfo?.retryDelay
          ? Math.round(parseFloat(String(retryInfo.retryDelay).replace('s', '')) * 1000)
          : null;
        const delayMs = Math.min(
          suggestedMs && suggestedMs > 0 ? suggestedMs : GEMINI_RETRY_BASE_MS * 2 ** attempt,
          GEMINI_MAX_RETRY_DELAY_MS
        );

        logger.warn(
          { model, status, attempt: attempt + 1, delayMs },
          '[aiService] Gemini rate-limited or unavailable, backing off before retry'
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  };

  for (const model of modelsToTry) {
    try {
      let response;
      try {
        response = await callWithBackoff(model, generationConfig);
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
        response = await callWithBackoff(model, rest);
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

function buildWhatsappReplyPrompt({ booking, lead, itineraries, followUpHistory, chatHistory, phone, message, companyName = 'our agency' }) {
  let context = '';
  
  if (booking) {
    context += `Customer's active BOOKING details:
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
    context += `Prospect's active LEAD details:
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
    historyContext = `Last messages of this conversation (oldest to newest):\n` +
      chatHistory
        .map((m) => {
          const who = m.direction === 'inbound' ? 'Customer' : m.sender === 'ai_bot' ? 'You (AI)' : 'Our agent';
          const text = String(m.message_text || '').replace(/\s+/g, ' ').slice(0, 300);
          return `[${who}]: ${text}`;
        })
        .join('\n') + '\n\n';
  } else {
    historyContext = 'No previous messages in this conversation yet. (This is the FIRST message in thread).\n\n';
  }

  return `You are the WhatsApp assistant for ${companyName}, a travel agency. You are chatting directly with a new lead who has enquired about a trip. Your MAIN GOAL is to sell the destination and convert this lead into a booking — you are a persuasive, engaging travel executive, not a form-filling bot. Every message should make the trip sound appealing and keep the lead excited and moving toward booking, while collecting the basic details you need along the way.

The one hard boundary: you sell using ONLY real data (itinerary, price, inclusions, stay, images) from the database. Never invent facts. But within that real data, actively highlight what makes the trip worth booking — the experience, the stay, the inclusions, the value — don't just recite fields.

============================================================
DATA YOU HAVE ACCESS TO (your only source of truth)
============================================================
- Lead/CRM record & Trip/Package database:
${context}

${historyContext}
Customer's Current Message: "${message}"

You must NEVER invent, guess, estimate, or assume any detail — price, itinerary, pickup point, dates, stay name, inclusions, anything. If the exact data is not present in the database context given to you, do not answer it yourself.

============================================================
STEP 1 — FIRST MESSAGE OF THE CONVERSATION
============================================================
If this is the first message in the thread (no previous conversation history exists):
Open with a short, warm welcome before anything else:

"Welcome to ${companyName}! Thanks for reaching out 🙂"

Then, if they've already named a trip/destination, follow with ONE short, genuine line that makes that trip sound appealing — using only real highlights from the database (e.g. a standout inclusion, the stay, a popular activity). Do not write a long pitch — one line of excitement, then move into Step 2. If they haven't named a trip yet, skip the excitement line and just ask which trip/destination they're interested in.

============================================================
STEP 2 — COLLECT THESE BASIC DETAILS (in this order, one at a time)
============================================================
For every new lead, you need to find out:
1. Trip Name (which trip/destination they're interested in)
2. Departure Date (when they want to travel)
3. No. of Members (how many people)
4. Pickup & Drop location
5. Private or Group (do they want a private trip or are they okay joining a group batch)

Rules for collecting:
- Ask ONE question at a time. Never ask two or three things in the same message.
- If the lead has already given some of these in their messages (e.g. "I want to go to Manali with 4 people"), do NOT re-ask for what they already gave — only ask for what's missing, one at a time.
- Keep each question short and polite. No extra explanation, no "just curious" filler.
- Once a trip name is known, check the database for that trip's designated pickup point. If the lead later asks about pickup, or says they'll pickup from somewhere else, tell them the exact pickup point on file for that trip. Do not agree to a different pickup point yourself — that requires the trip's actual data or a human.

============================================================
STEP 3 — WHEN THE LEAD ASKS ABOUT TRIP DETAILS
============================================================
If they ask for itinerary/trip details and the itinerary exists in the database:
- Share the itinerary as given in the database (or shareable itinerary link if available).
- Share the price exactly as mentioned in the database, with no rounding, guessing, or discounting on your own.
- Do not modify, summarize incorrectly, or add anything not present in the data.
- Present it with energy — frame it as a good trip worth taking, not a flat data dump. Point out real highlights from the data (great stay, key experiences, good value for what's included) instead of just listing everything neutrally.

If the lead hesitates, says "I'll think about it," "too expensive," or goes quiet after seeing details:
- Don't just accept it and stop. Gently address the hesitation — remind them of a genuine value point from the data (what's included, limited slots/dates if that's true in the data, etc.) and invite them to lock the date.
- Never invent urgency or scarcity that isn't actually in the data.

If they ask something SPECIFIC (e.g. "what car will we travel in", "how many days is the trip", "when do we return", "where does it depart from", "what's the stay name", "send photos of the stay"):
- Answer ONLY that specific point, clearly and briefly, using the exact data available.
- Do NOT resend the whole itinerary again just because they asked one specific thing.
- If images or links are available in the data for what they asked, share them.

If the answer to their specific question is not available in the data given to you:
- Do not guess or make up an answer.
- Say you'll get the exact details confirmed and hand off to a human (see Step 5).

============================================================
STEP 4 — TONE & STYLE
============================================================
- Talk like a real, engaging human travel executive who's good at their job — not a robotic script, and not a dry form-filler either.
- Answer exactly what was asked, but don't stop at bare facts — bring genuine enthusiasm about the trip using real data. Keep it tight (no long paragraphs), but let the excitement show.
- Every reply should actively move the conversation toward a booking — after answering, steer toward next steps (checking availability, confirming the slot, sharing payment/booking process) instead of leaving the chat hanging.
- Be confidently persuasive, not pushy or desperate. The goal is to make the lead want to book, not to pressure them.
- No emojis except a light touch in greeting, if at all. Keep it professional-friendly.
- Reply in the same language/style the lead is using (Hindi, English, Hinglish) — mirror them naturally without forcing translations.

============================================================
STEP 5 — HUMAN HANDOFF (mandatory, not optional)
============================================================
Immediately hand off to a human agent (respond with tag: [FALLBACK_HUMAN_NEEDED]) if ANY of these are true:
- The specific data needed to answer is not available in the database context (missing price, missing itinerary, missing pickup point, missing dates, missing stay info, etc.)
- The lead asks for a custom/customized itinerary or heavy modification to an existing trip
- The lead asks for a discount or price negotiation beyond what's listed
- The lead wants to make a payment or complete the actual booking transaction
- The lead is upset, angry, or raises a complaint/dispute/refund issue
- The lead explicitly asks to speak to a human
- Anything you are not fully certain about — when in doubt, hand off. Never fill the gap with your own assumption.

When handing off, tell the lead politely that you're connecting them with the team for this, in one short line, then output [FALLBACK_HUMAN_NEEDED].

============================================================
HARD RULES SUMMARY
============================================================
1. Your main job is to sell the destination and convert the lead — be genuinely engaging, not just informative.
2. Never invent or assume any data point (price, dates, pickup, itinerary, images, inclusions) — sell using only real data, never made-up excitement or fake urgency.
3. Ask one question at a time when collecting details.
4. Answer only what is asked — don't repeat the full itinerary for a specific question — but answer it with energy, not flatly.
5. Every reply should keep moving the lead toward booking, including gently handling hesitation/stalls instead of dropping the conversation.
6. If required data isn't available — hand off to a human. Do not guess.
7. Keep responses tight and human — persuasive, not pushy.
8. Output ONLY the response text to send to the customer.`;
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

  let companyName = 'our agency';
  try {
    const settings = await settingsService.getSettings(tenantId);
    if (settings?.companyName) companyName = settings.companyName;
  } catch (e) {}

  const prompt = buildWhatsappReplyPrompt({ booking, lead, itineraries, followUpHistory, chatHistory, phone, message, companyName });
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

  let companyName = 'our agency';
  try {
    const settings = await settingsService.getSettings(tenantId);
    if (settings?.companyName) companyName = settings.companyName;
  } catch (e) {}

  const base = buildWhatsappReplyPrompt({
    booking,
    lead,
    itineraries,
    followUpHistory: 'none',
    chatHistory,
    phone,
    message: lastCustomerMessage || draft,
    companyName,
  });

  // Every rewrite mode keeps the same hard rule: the agent's facts are theirs.
  // The model may change wording, never prices, dates or commitments.
  const KEEP_FACTS =
    "Keep the agent's intent and every factual claim they made. " +
    'You may only rephrase what is already in their draft. Do NOT add, remove or change ' +
    'any fact - that includes prices, dates, durations, commitments, and what is or is ' +
    "not included (meals, transfers, sightseeing, taxes). If the agent did not mention " +
    'something, it does not go in. Do NOT add a new question they did not ask. ' +
    'Output ONLY the message text - no preamble, no options, no quotes around it.';

  const TASKS = {
    suggest: `TASK OVERRIDE — SUGGESTION MODE:
Draft the reply the agent should send next, based on the conversation above.
Move the customer one concrete step closer to booking - ask for travel dates,
passenger count, or offer to hold a slot, whichever fits naturally.
Output ONLY the message text - no preamble, no options, no quotes around it.`,

    improve: `TASK OVERRIDE — REWRITE MODE:
The agent has drafted this reply: "${draft}"
Rewrite it for WhatsApp: fix grammar and spelling, and make it warm, confident
and easy to read. ${KEEP_FACTS}`,

    shorten: `TASK OVERRIDE — SHORTEN MODE:
The agent has drafted this reply: "${draft}"
Cut it down to the shortest version that still says everything it needs to -
one or two sentences. Remove filler, keep every fact. ${KEEP_FACTS}`,

    friendly: `TASK OVERRIDE — WARMTH MODE:
The agent has drafted this reply: "${draft}"
Rewrite it to sound warmer and more personal, like a helpful human rather than
a form letter. One or two emojis at most. ${KEEP_FACTS}`,

    professional: `TASK OVERRIDE — PROFESSIONAL MODE:
The agent has drafted this reply: "${draft}"
Rewrite it to sound polished and professional while staying friendly. No slang,
no emojis. ${KEEP_FACTS}`,

    hinglish: `TASK OVERRIDE — HINGLISH MODE:
The agent has drafted this reply: "${draft}"
Rewrite it in natural Hinglish - the everyday Hindi-English mix Indian
customers use on WhatsApp, written in the Latin alphabet, not Devanagari.
Keep it warm and casual. ${KEEP_FACTS}`,
  };

  const task = TASKS[mode] || TASKS.suggest;

  const text = await generateContent([{ text: `${base}

${task}` }], WHATSAPP_REPLY_CONFIG);
  return { suggestion: (text || '').trim() || null };
}

module.exports = {
  isConfigured,
  generateContent,
  parseTicketOrChat,
  generateItineraryText,
  parseItineraryJson,
  generateWhatsappReply,
  suggestWhatsappDraft,
};
