const settingsRepository = require('../repositories/settingsRepository');
const walkthroughRepository = require('../repositories/walkthroughRepository');
const leadService = require('./leadService');

/**
 * Resolves a tenant's rotatable public lead-capture key and records the lead
 * against that tenant. Returns null when the key doesn't match any tenant so
 * the caller can answer 404 without leaking whether the key ever existed.
 */
async function captureLeadByPublicKey(publicLeadKey, { customerName, email, phone, interest }) {
  const tenantId = await settingsRepository.getTenantIdByPublicLeadKey(publicLeadKey);
  if (!tenantId) return null;

  return leadService.createLead(
    tenantId,
    { customerName, email, phone, interest, source: 'Landing Page' },
    'Landing Page Widget'
  );
}

const aiService = require('./aiService');

async function generateFreeItinerary({ destination, days = 4, tripType = 'Family & Leisure', agencyName, email, phone, name, description }) {
  // 1. Record lead in background for EzzySync sales funnel
  if (email || phone) {
    try {
      await walkthroughRepository.insertWalkthroughRequest({
        name: name || agencyName || 'Free Itinerary User',
        agencyName: agencyName || `${destination} Itinerary Lead`,
        email: email || `${(phone || 'user').replace(/\D/g, '') || Date.now()}@itinerary-lead.com`,
        phone: phone || '',
      });
    } catch (e) {
      // Non-blocking lead logging
    }
  }

  // 2. Generate Itinerary with Gemini AI
  const userCommandPrompt = description && description.trim()
    ? `\nUSER NATURAL-LANGUAGE COMMAND / SPECIFIC REQUEST:
"""
${description.trim()}
"""`
    : '';

  const prompt = `AI ITINERARY GENERATOR — SYSTEM PROMPT
You are an expert travel itinerary planner.
Your job is to convert a user's natural-language travel request into a realistic, geographically logical, time-feasible day-wise travel itinerary.

INPUT DATA:
- Main Destination: ${destination}
- Requested Duration: ${days} Days / ${Math.max(1, Number(days) - 1)} Nights
- Trip Style / Category: ${tripType}
- Agency Branding: ${agencyName || 'EzzySync Partner Agency'}
${userCommandPrompt}

CORE RULES & GUIDELINES:
1. GEOGRAPHICALLY LOGICAL & PRACTICAL ROUTE:
   - Group nearby attractions together, avoid unnecessary backtracking.
   - For mountainous, remote, or trekking destinations (e.g., Chopta, Tungnath, Aadrai Jungle Trek, Mussoorie, Kasol, Spiti), use realistic road/rail combinations (cars, private cabs, overnight Volvo buses, trains to nearest railhead like Rishikesh/Haridwar/Dehradun/Kalka).
   - Never recommend flights to destinations that don't have practical airport connectivity.

2. TREKKING LOGIC:
   - Treat trekking differently from normal sightseeing. A trek is not just a point on a map.
   - Distinguish driving from trekking. Identify actual base village / trailhead (e.g., Khireshwar for Aadrai Jungle Trek in Malshej Ghat; Chopta base for Tungnath & Chandrashila; Sari for Deoria Tal).
   - Account for trek distance, walking duration, elevation, rest, and safe return before dark.
   - Do not combine multiple heavy treks in one day.

3. DAILY TIME MANAGEMENT:
   - Account for realistic wake-up time, travel time, sightseeing, meals, and check-in.
   - Do not create rushed schedules. Include reasonable meal stops and leisure.

4. INCLUSIONS & EXCLUSIONS:
   - Include practical items tailored to the trip (e.g. hotel/resort stay or alpine camping, meals/breakfast/dinner, private cab/transfers, forest entry permits, trek guide, safety equipment).
   - Exclusions should mention personal expenses, adventure activities, flights, etc.

Format the response strictly in clean Markdown:
# ${destination} ${days}D/${Math.max(1, Number(days) - 1)}N Tour Itinerary ✈️
**Duration:** ${days} Days | **Prepared By:** ${agencyName || 'EzzySync Partner Agency'}

---

## Day 1: [Day Title with Route / Start]
- **Morning:** [Departure / Arrival / Route journey]
- **Afternoon:** [Check-in / Lunch / First attraction]
- **Evening:** [Local leisure / Sunset point / Dinner]
- **Stay:** [Night Stay location & type]

(Continue for all ${days} days with realistic timings and geographically ordered stops)

---

## 🎒 Package Inclusions
- [List 4-6 realistic inclusions like stays, meals, private cab, trek guide, permits]

## ❌ Package Exclusions
- [List 3-4 realistic exclusions like personal expenses, flights, optional gear]

## 💡 Travel Specialist Tips for ${destination}
- [3 authentic, local tips regarding terrain, best time, gear, or permits]`;

  let itinerary = '';
  if (aiService.isConfigured()) {
    try {
      itinerary = await aiService.generateContent([{ text: prompt }], {
        maxOutputTokens: 2500,
        temperature: 0.7,
      });
    } catch (err) {
      console.warn('[publicService] Gemini itinerary generation failed:', err.message);
    }
  }

  return itinerary;
}

async function submitWalkthroughRequest({ name, agencyName, email, phone }) {
  return walkthroughRepository.insertWalkthroughRequest({ name, agencyName, email, phone });
}

async function listWalkthroughRequests() {
  return walkthroughRepository.listWalkthroughRequests();
}

module.exports = {
  captureLeadByPublicKey,
  submitWalkthroughRequest,
  listWalkthroughRequests,
  generateFreeItinerary,
};
