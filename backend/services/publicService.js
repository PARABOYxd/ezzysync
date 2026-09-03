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

async function generateFreeItinerary({ destination, days = 4, tripType = 'Family & Leisure', agencyName, email, phone, name }) {
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
  const prompt = `You are an expert travel agency tour designer.
Create a detailed, beautiful day-wise travel itinerary for:
- Destination: ${destination}
- Duration: ${days} Days / ${Math.max(1, Number(days) - 1)} Nights
- Trip Style: ${tripType}
- Agency Branding: ${agencyName || 'Your Travel Partner'}

Format the response cleanly in markdown with:
# ${destination} ${days}D/${Math.max(1, Number(days) - 1)}N Tour Itinerary ✈️
**Duration:** ${days} Days | **Style:** ${tripType} | **Prepared By:** ${agencyName || 'EzzySync Partner Agency'}

---

## Day 1: [Day Title]
- **Morning:** [Arrival & Transfer details]
- **Afternoon:** [Local sightseeing / check-in]
- **Evening:** [Attraction / Leisure]
- **Stay:** [Recommended stay & meal plan]

(Continue for all ${days} days with realistic, exciting local attractions for ${destination})

---

## 🎒 Package Inclusions
- Daily Breakfast at Hotel
- Private AC Vehicle for transfers & sightseeing
- All Toll, Parking & Driver allowances

## ❌ Package Exclusions
- Flights / Train tickets
- Personal expenses, adventure activities & entry tickets

## 💡 Travel Specialist Tips for ${destination}
- [2-3 authentic, useful tips for travelers]`;

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
