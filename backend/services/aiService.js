const axios = require('axios');
const env = require('../config/env');
const bookingService = require('./bookingService');
const settingsService = require('./settingsService');
const logger = require('../utils/logger');

const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const FALLBACK_GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.7-flash', 'gemini-3.6-flash'];
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

// JSON schema for complete commercial quotation generation (itinerary, highlights, inclusions, exclusions, pickups)
const quotationPlanJsonSchema = {
  type: 'OBJECT',
  properties: {
    tripName: {
      type: 'STRING',
      description: 'Refined, commercial travel package title (e.g. "3D/2N Chopta Tungnath & Chandrashila Peak Trek", "5N/6D Scenic Kerala Backwaters & Munnar")',
    },
    estimatedPrice: {
      type: 'INTEGER',
      description: 'Realistic package price in INR per person. If price is mentioned in prompt/notes, use that exact price. Otherwise give a realistic standard rate in INR.',
    },
    itineraryDays: {
      type: 'ARRAY',
      description: 'Day-by-day travel timeline nodes',
      items: {
        type: 'OBJECT',
        properties: {
          day: { type: 'INTEGER', description: 'Day index starting at 1' },
          title: { type: 'STRING', description: 'Milestone / day heading, e.g. "Day 1: Drive from Rishikesh to Chopta via Devprayag & Rudraprayag"' },
          description: { type: 'STRING', description: 'Detailed itinerary breakdown covering transit, sightseeing stopovers, meal inclusions (B/L/D), and night stay' },
        },
        required: ['day', 'title', 'description'],
      },
    },
    highlights: {
      type: 'ARRAY',
      description: '4 to 8 top attraction spots, route stopovers, viewpoints, and signature experiences. E.g. for Chopta: Devprayag Sangam, Rudraprayag, Tungnath Temple, Chandrashila Summit 360° Panorama, Deoriatal Lake, Camping under star-lit skies.',
      items: { type: 'STRING' },
    },
    inclusions: {
      type: 'ARRAY',
      description: '5 to 8 tour inclusions (Stay, Meals, Certified Guide/Trek Leader, Permits & entry fees, Transport from pickup, Medical first aid)',
      items: { type: 'STRING' },
    },
    exclusions: {
      type: 'ARRAY',
      description: '4 to 7 standard exclusions (Lunch/transit snacks, Personal expenses, Porter/mule charges, 5% GST, Insurance)',
      items: { type: 'STRING' },
    },
    pickupOptions: {
      type: 'ARRAY',
      description: '2 to 4 pickup options with total package price per person in INR. If user specified pickups & prices in notes (e.g. "Delhi 4500, Rishikesh 3500"), parse and match them! If not, provide standard pickup points with realistic rates.',
      items: {
        type: 'OBJECT',
        properties: {
          location: { type: 'STRING', description: 'Pickup point name (e.g. "Delhi NCR", "Rishikesh / Haridwar", "Dehradun")' },
          price: { type: 'INTEGER', description: 'Total package price in INR from this pickup point' },
        },
        required: ['location', 'price'],
      },
    },
    departureDays: {
      type: 'ARRAY',
      description: 'Days of the week when this tour departs. Use 3-letter codes: "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun". If daily departure, include all 7. If weekend, include ["Fri", "Sat"].',
      items: { type: 'STRING' },
    },
    tripTypes: {
      type: 'ARRAY',
      description: 'Available trip formats: "group" (fixed batch/group departure) and/or "customized" (private/customized departure). E.g. ["group", "customized"]',
      items: { type: 'STRING' },
    },
  },
  required: ['tripName', 'estimatedPrice', 'itineraryDays', 'highlights', 'inclusions', 'exclusions', 'pickupOptions', 'departureDays', 'tripTypes'],
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

/**
 * Generates a complete commercial quotation plan:
 * Refined trip title, estimated price, day-by-day itinerary, attraction highlights (e.g. Devprayag, Rudraprayag, Tungnath),
 * inclusions, exclusions, and pickup options with pricing.
 */
async function generateFullQuotationPlan({ tripName, days, notes }) {
  const prompt = `You are a world-class travel planner and tour operator creating an end-to-end commercial travel quotation and itinerary for clients.

TRIP DETAILS / ROUGH PROMPT:
- Trip Title / Rough Concept: "${tripName || 'Tour Package'}"
- Duration: ${days || 3} Days
- Rough details, client preferences, route, attractions, pickup & pricing instructions: "${notes || 'None'}"

CRITICAL INSTRUCTIONS:
1. TRIP NAME: Refine or create a polished, attractive tour title (e.g. "3D/2N Chopta Tungnath & Chandrashila Peak Trek" or "5N/6D Enchanting Kerala Backwaters & Hills").
2. ESTIMATED PRICE: If a price is mentioned in the notes or rough prompt (e.g. 4500, 6500, etc.), use that price. Otherwise, provide a realistic commercial package price per person in INR (e.g. 4500, 7500, 12000 depending on duration and destination).
3. DAY-BY-DAY ITINERARY: Provide exactly ${days || 3} sequential days. Each day must have:
   - day: integer (1, 2, 3...)
   - title: catchy milestone (e.g. "Day 1: Departure to Chopta via Devprayag Sangam & Rudraprayag")
   - description: comprehensive breakdown of morning journey, scenic stopovers, activities, sightseeing, meal plan (e.g. Dinner included), and night stay details.
4. TRIP HIGHLIGHTS & ATTRACTIONS:
   - Identify key route attractions, viewpoints, religious/cultural spots, and natural marvels.
   - For example, for Chopta/Tungnath: Include Devprayag (Sangam of Alaknanda & Bhagirathi), Rudraprayag, Ukhimath, Tungnath (highest Shiva temple in the world), Chandrashila Peak (360-degree Himalayan panorama), Deoriatal Lake, Camping under star-lit skies.
   - For Himachal/Spiti/Manali: Include Atal Tunnel, Solang Valley, Rohtang Pass, Kasol, Manikaran, etc.
   - For Goa/Kerala/Rajasthan/etc.: Include respective iconic attractions and signature experiences.
   - Provide 4 to 8 crisp, compelling highlights.
5. INCLUSIONS & EXCLUSIONS:
   - Inclusions: 5-8 essential inclusions (Accommodation, Meals (Breakfast & Dinner), Trek Guide/Leader, Forest & camping permits, Transport from pickup, First Aid kit).
   - Exclusions: 4-7 realistic exclusions (Lunch & en-route snacks, Personal expenses & tips, Mules/porters, 5% GST, Insurance).
6. PICKUP OPTIONS WITH PRICING:
   - If user mentioned specific pickup locations and prices in rough notes (e.g. "Delhi 4500, Rishikesh 3500"), parse and include them with their specified prices!
   - If not explicitly mentioned, provide 2-4 standard pickup hubs for this travel sector with realistic per-person INR package prices (e.g. Delhi NCR: ₹6,500; Rishikesh/Haridwar: ₹4,500; Dehradun: ₹5,000).
   - Each item must have: location (string) and price (integer number).
7. DEPARTURE DAYS & TRIP TYPES:
   - departureDays: Array of 3-letter codes ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"). If daily or not restricted, include all 7. If weekend batch specified, include ["Fri", "Sat"].
   - tripTypes: Array of available formats: ["group", "customized"] or whichever matches the request (default both).

Return ONLY a valid JSON object matching the schema.`;

  const parsedText = await generateContent([{ text: prompt }], {
    responseMimeType: 'application/json',
    responseSchema: quotationPlanJsonSchema,
  });

  if (!parsedText) return null;
  return parseItineraryJson(parsedText);
}

/** The model is asked for bare JSON but sometimes still wraps it in a fenced
 * code block, so strip fences before parsing. Throws on invalid JSON. */
function parseItineraryJson(responseText) {
  if (!responseText) return null;
  const cleanJsonText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleanJsonText);
  } catch (err) {
    const firstBrace = cleanJsonText.indexOf('{');
    const lastBrace = cleanJsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleanJsonText.slice(firstBrace, lastBrace + 1));
    }
    const firstBracket = cleanJsonText.indexOf('[');
    const lastBracket = cleanJsonText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(cleanJsonText.slice(firstBracket, lastBracket + 1));
    }
    throw err;
  }
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
    parts.push(price ? `Base Price: ₹${price}` : 'price on request');
    if (days.length) parts.push(`${days.length}d: ${dayTitles}${days.length > maxDays ? ' …' : ''}`);

    const pickups = it.pickup_options || it.pickupOptions;
    if (Array.isArray(pickups) && pickups.length > 0) {
      const pickupStrs = pickups
        .map((p) => (typeof p === 'object' ? `${p.location || p.name} (₹${p.price})` : String(p)))
        .filter(Boolean);
      if (pickupStrs.length) parts.push(`Pickups: ${pickupStrs.join(', ')}`);
    }

    const depDays = it.departure_days || it.departureDays;
    if (Array.isArray(depDays) && depDays.length > 0) {
      if (depDays.length === 7) {
        parts.push('Departures: Daily (All 7 days)');
      } else {
        parts.push(`Departures: Every ${depDays.join(', ')}`);
      }
    }

    const types = it.trip_types || it.tripTypes;
    if (Array.isArray(types) && types.length > 0) {
      const typeLabels = types.map((t) => (t === 'group' ? 'Group Batch' : t === 'customized' ? 'Customized Private' : t));
      parts.push(`Availability: ${typeLabels.join(' & ')}`);
    }

    const highlights = it.highlights;
    if (Array.isArray(highlights) && highlights.length > 0) {
      parts.push(`Key Highlights: ${highlights.slice(0, 6).join(', ')}`);
    }

    const inclusions = it.inclusions;
    if (Array.isArray(inclusions) && inclusions.length > 0) {
      parts.push(`Inclusions: ${inclusions.slice(0, 5).join(', ')}`);
    }

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
- Once a trip name is known, check the package data for that trip's designated 'Pickups' options and prices. If the lead asks where pickup is available or mentions their city (e.g. "Delhi se pickup milega?"), tell them the exact pickup points and pricing on file (e.g. "Yes! We offer pickup from Delhi NCR at ₹6,500/person, and Rishikesh at ₹4,500/person"). Do not hand off to a human for pickup queries that are listed in our packages!

============================================================
STEP 2B — ONCE DETAILS ARE CONFIRMED: PITCH & ASK TO PROCEED (CRITICAL: DO NOT HAND OFF YET!)
============================================================
When the lead has shared or confirmed the key details (e.g. group size, trip name, pickup location, travel timeframe like "10 people, Chopta, Delhi pickup, next weekend"):
DO NOT HAND OVER TO A HUMAN YET! Do NOT say "let me get our team to lock your slot" and hand off.

Instead, execute this exact 2-step flow:
1. Enthusiastically summarize their trip with real pricing from the package:
   - Confirm group size, destination, pickup point, and exact price per person (and total if simple).
   - Highlight key inclusions (e.g. stays, meals, trek leader, transport from pickup).
2. Ask this exact closing question:
   "Do you have any questions about the itinerary, stays, or inclusions, or would you like to proceed with the booking?"
   (Or in Hindi/Hinglish if lead speaks Hindi: "Kya aapka itinerary, stay ya inclusions ko lekar koi question hai, ya shall we proceed with the booking?")

If the lead asks any questions:
- Answer their questions clearly and enthusiastically using the package data.
- After answering, gently ask: "Would you like us to go ahead and proceed with your booking?"

ONLY WHEN THE LEAD SAYS YES TO PROCEED WITH BOOKING (e.g. "Yes proceed", "Haan book karo", "Yes lock it", "How to pay?", "Confirm 10 slots"):
- Cheerfully confirm: "Awesome! Let me connect you with our team right away to share the booking confirmation and payment details."
- Output [FALLBACK_HUMAN_NEEDED] at the end so our human team can collect the deposit and issue the voucher.

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

If they ask something SPECIFIC:
- Pickups & Pricing: Check the package's 'Pickups' list. Share the exact pickup points and rates (e.g. "We provide pickup from Delhi NCR (₹6,500) and Rishikesh (₹4,500)"). If they ask to be picked up from one of those cities, confirm it happily and ask how many members are traveling!
- Departure Days: Check the package's 'Departures'. If 'Daily (All 7 days)', enthusiastically tell them departures are available every single day! If specific days are listed (e.g. 'Every Friday, Saturday'), state the exact departure days.
- Tour Format (Group vs Private/Customized): Check the package's 'Availability'. If both are listed, explain that we offer exciting fixed group batches (great for meeting fellow travelers) as well as 100% customized private tours tailored for their family or friend group! DO NOT hand off to human just because they ask about customized or group tours when availability is listed!
- Sightseeing & Attractions: Use the package's 'Key Highlights' (e.g. Devprayag Sangam, Tungnath Temple, Chandrashila Summit) to describe what they will experience with genuine enthusiasm.
- Inclusions & Stays: Mention key inclusions (Stays, Meals, Trek Leader, Permits) accurately from the package data.
- Do NOT resend the whole itinerary again just because they asked one specific thing.
- If images or links are available in the data for what they asked, share them.

If the answer to their specific question is not available in the data given to you:
- Do not guess or make up an answer.
- Say you'll get the exact details confirmed and hand off to a human (see Step 5).

============================================================
STEP 4 — TONE & STYLE
============================================================
- Talk like a real, engaging human travel executive who's good at their job — not a robotic
  script, and not a dry form-filler either.
- Answer exactly what was asked, but don't stop at bare facts — bring genuine enthusiasm
  about the trip using real data. Keep it tight (no long paragraphs), but let the excitement
  show.
- Every reply should actively move the conversation toward a booking — after answering,
  steer toward next steps (checking availability, confirming the slot, sharing payment/
  booking process) instead of leaving the chat hanging.
- Be confidently persuasive, not pushy or desperate. The goal is to make the lead want to
  book, not to pressure them.
- Keep every message as SHORT as the question deserves. A simple question gets a simple,
  short answer. Do not add extra sentences, extra context, or extra explanation the lead
  didn't ask for. When in doubt, cut it shorter, not longer.

============================================================
STEP 4B — NEVER REVEAL YOUR SOURCE OR REASONING (CRITICAL)
============================================================
You must NEVER, under any circumstance, mention to the customer:
- "database", "our database", "as per the database provided"
- "data provided", "active package data", "our records show"
- "context given to me", "based on the information available to me"
- any phrase that reveals you are an AI working off a data file/system

You are a human executive who simply knows the trip details — you don't explain WHERE you
know them from. Talk about the trip directly.

WRONG: "Based on the database provided, the pickup details for the Chopta Tungnath trip are
listed as 'none' (pickup details are not available in our active package data)."
RIGHT: "Let me just confirm the exact pickup point for you — connecting you with our team so
you get the right details."

This applies especially to missing-data / handoff situations — never explain the internal
reason data is missing. Just say naturally that you're checking/confirming and hand off.
Keep that handoff line to one short sentence, not an explanation.
- No emojis except a light touch in greeting, if at all. Keep it professional-friendly.
- Reply in the same language/style the lead is using (Hindi, English, Hinglish) — mirror them
  naturally without forcing translations.

============================================================
STEP 5 — HUMAN HANDOFF (mandatory, not optional)
============================================================
Immediately hand off to a human agent (respond with tag: [FALLBACK_HUMAN_NEEDED]) ONLY if ANY of these are true:
- The lead explicitly confirms they want to proceed with the booking or asks for payment/UPI/bank details (AFTER you ask them per Step 2B).
- The customer asks for a pickup city or location that is NOT listed in the package's Pickups options.
- The lead asks for an entirely custom route or modifications that cannot be served by any of our listed packages.
- The lead asks for discounts, bargaining, or price negotiation beyond our listed rates.
- The lead is upset, angry, or raises a complaint/dispute/refund issue.
- The lead explicitly asks to speak to a human or agent.

CRITICAL RULE: DO NOT hand off when the lead simply confirms their trip details (e.g. 10 people, Chopta, Delhi pickup)! Follow Step 2B: summarize the trip and pricing, and ask: "Do you have any questions, or would you like to proceed with the booking?" Only hand off AFTER they say YES to booking!

When handing off, tell the lead politely and BRIEFLY that you're connecting them with the
team for exact details — one short line, no explanation of what data is missing or why —
then output [FALLBACK_HUMAN_NEEDED].

============================================================
HARD RULES SUMMARY
============================================================
1. Your main job is to sell the destination and convert the lead — be genuinely engaging,
   not just informative.
2. Never invent or assume any data point (price, dates, pickup, itinerary, images, inclusions)
   — sell using only real data, never made-up excitement or fake urgency.
3. NEVER mention "database," "data provided," or any other phrase that reveals you're
   working off a data source — talk like a human who just knows the trip.
4. Ask one question at a time when collecting details.
5. Answer only what is asked — don't repeat the full itinerary for a specific question — but
   answer it with energy, not flatly.
6. Every reply should keep moving the lead toward booking, including gently handling
   hesitation/stalls instead of dropping the conversation.
7. If required data isn't available — hand off to a human in ONE short line, no explanation.
   Do not guess.
8. Keep every message as short as the question deserves — no unrequested extra detail.
9. Output ONLY the response text to send to the customer.`;
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
  generateFullQuotationPlan,
  parseItineraryJson,
  generateWhatsappReply,
  suggestWhatsappDraft,
};
