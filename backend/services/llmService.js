/**
 * Unified LLM Service (OpenAI & Google Gemini)
 * 
 * Automatically selects OpenAI (gpt-4o / gpt-4o-mini) or Google Gemini (gemini-2.0-flash / 1.5-flash)
 * based on configured environment variables, with graceful fallback.
 */

const axios = require('axios');
const env = require('../config/env');
const aiService = require('./aiService');
const logger = require('../utils/logger').child({ module: 'llmService' });

const OPENAI_PRIMARY_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Generates an itinerary by providing the LLM with structured real-world context
 * (Maps route/hours, weather forecast, live attractions/trek trailheads, and DB hotels).
 */
async function generateItinerary({
  destination,
  days = 4,
  tripType = 'Family Vacation',
  agencyName = 'EzzySync Partner Agency',
  phone = '',
  description = '',
  enrichedContext = {},
}) {
  const { route, weather, attractions, stays } = enrichedContext;

  // Build the live context block
  let realDataContext = `
--- LIVE REAL-WORLD TRAVEL TELEMETRY ---
1. TRANSIT & ROUTE (from Maps/OSRM):
   - Journey: ${route?.origin || 'Origin'} to ${route?.destination || destination}
   - Distance: ${route?.distanceKm ? route.distanceKm + ' km' : 'Standard highway distance'}
   - Expected Driving Time: ${route?.durationHours ? route.durationHours + ' hours' : 'Standard transit'}
   - Vehicle Assigned: ${route?.vehicle || 'AC Tourist Vehicle'}
   - Route Corridor: ${route?.routeSummary || 'National Highway'}

2. LIVE WEATHER FORECAST (from Weather API):
   - Current Temp: ${weather?.temperature || 'Pleasant'}
   - Conditions: ${weather?.condition || 'Clear'}
   - Rain Probability: ${weather?.rainChance || 'Low'}
   - Travel Advisory: ${weather?.advisory || 'Good travel weather'}

3. LIVE ATTRACTIONS & LOGISTICS:
`;

  if (attractions?.isTrek && attractions?.trekDetails) {
    const t = attractions.trekDetails;
    realDataContext += `
   - Trek Name: ${t.name}
   - Base Village / Trailhead: ${t.baseVillage}
   - Trail Length: ${t.trailLengthKm} km one-way | Difficulty: ${t.difficulty}
   - Altitude: ${t.altitude}
   - Required Permits: ${t.permits}
   - Key Trail Points: ${t.highlights.join(', ')}
   - Accommodation Type: ${t.stayType}
`;
  } else if (attractions?.liveSnippets && attractions.liveSnippets.length > 0) {
    realDataContext += `
   - Verified Attractions & Spot Notices:
${attractions.liveSnippets.map(s => '     * ' + s).join('\n')}
`;
  }

  if (stays && stays.length > 0) {
    realDataContext += `
4. VERIFIED ACCOMMODATIONS (from Database):
${stays.map(s => `   - ${s.hotelName} (${s.rating})`).join('\n')}
`;
  }

  const prompt = `AI ITINERARY GENERATOR — SYSTEM PROMPT
You are a senior travel logistics specialist in India.
Convert this travel request into a realistic, geographically sequential day-by-day itinerary.

USER DETAILS:
- Destination: ${destination}
- Duration: ${days} Days / ${Math.max(1, Number(days) - 1)} Nights
- Trip Style: ${tripType}
- Agency Branding: ${agencyName}
- User Specifics / Command: ${description}

${realDataContext}

STRICT GEOGRAPHIC & REALISTIC RULES:
1. Incorporate the exact road distance (${route?.distanceKm || '240'} km), driving time (~${route?.durationHours || '5'} hrs), and assigned vehicle (${route?.vehicle || 'AC Tourist Vehicle'}).
2. If overnight travel was specified, Day 1 must state overnight departure and early morning arrival.
3. If this is a trek, start from the actual base village (${attractions?.trekDetails?.baseVillage || 'trailhead'}), detail the trail climb, and provide trek safety guidelines.
4. On the final day (${days}), explicitly include check-out, souvenir stops, and return transfer back to ${route?.origin || 'the origin'}.
5. Include realistic Package Inclusions (meals, vehicle, stays, permits, guide) and Exclusions (personal items, entry tickets).

Format strictly in clean Markdown:
# ${destination} ${days}D/${Math.max(1, Number(days) - 1)}N Tour Itinerary ✈️
**Duration:** ${days} Days | **Prepared By:** ${agencyName}

---

## Day 1: [Day Title with Route & Transport]
- **Morning:** [Exact departure / approach road / breakfast stop]
- **Afternoon:** [Arrival, check-in, lunch]
- **Evening:** [First attraction / scenic relaxation / dinner]
- **Stay:** [Night Stay location & property type]

(Repeat for all ${days} days with realistic timings)

---

## 🎒 Package Inclusions
- [Item 1]
- [Item 2]

## ❌ Package Exclusions
- [Item 1]
- [Item 2]

## 💡 Travel Specialist Tips for ${destination}
- [Live weather note, clothing advice, route tip]`;

  // 1. Try OpenAI if configured
  const openaiApiKey = (env.openaiApiKey || '').trim();
  if (openaiApiKey) {
    try {
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: OPENAI_PRIMARY_MODEL,
          messages: [
            { role: 'system', content: 'You are an elite, realistic travel planning assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2800,
        },
        {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      const text = res.data?.choices?.[0]?.message?.content;
      if (text && text.trim().length > 100) {
        return text;
      }
    } catch (err) {
      logger.warn({ err: err.response?.data || err.message }, 'OpenAI itinerary call failed, falling back to Gemini');
    }
  }

  // 2. Try Gemini via aiService
  if (aiService.isConfigured()) {
    try {
      const geminiText = await aiService.generateContent([{ text: prompt }], {
        maxOutputTokens: 2800,
        temperature: 0.7,
      });
      if (geminiText && geminiText.trim().length > 100) {
        return geminiText;
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Gemini itinerary call failed');
    }
  }

  return '';
}

module.exports = {
  generateItinerary,
};
