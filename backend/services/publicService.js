const settingsRepository = require('../repositories/settingsRepository');
const walkthroughRepository = require('../repositories/walkthroughRepository');
const leadService = require('./leadService');
const realtimeTravelService = require('./realtimeTravelService');
const llmService = require('./llmService');

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

/**
 * Generates a free day-wise travel itinerary using real-time travel telemetry:
 * 1. Routing & Highway Transit (OSRM / Maps API)
 * 2. Live Weather & Rain Forecast (Open-Meteo / Weather API)
 * 3. Live Attractions & Trek Trailheads (Tavily & Verified Registry)
 * 4. Accommodations & Pricing (PostgreSQL hotels)
 * 5. LLM Synthesis (OpenAI GPT / Google Gemini)
 */
async function generateFreeItinerary({
  destination,
  days = 4,
  tripType = 'Family Vacation',
  agencyName = 'EzzySync Partner Agency',
  email,
  phone,
  name,
  description = '',
}) {
  // 1. Capture public lead if contact info provided
  if (phone || email) {
    try {
      await submitWalkthroughRequest({
        name: name || agencyName || 'Free Itinerary User',
        agencyName: agencyName || 'Direct Inquiry',
        email: email || `${(phone || 'user').replace(/\D/g, '') || Date.now()}@itinerary-lead.com`,
        phone: phone || '',
      });
    } catch (e) {
      // Non-blocking lead logging
    }
  }

  // 2. Extract origin, vehicle & overnight intent from description
  const desc = (description || '').toLowerCase();
  let origin = 'Delhi';
  if (desc.includes('from mumbai') || desc.includes('mumbai to')) origin = 'Mumbai';
  else if (desc.includes('from pune') || desc.includes('pune to')) origin = 'Pune';
  else if (desc.includes('from bangalore') || desc.includes('bangalore to')) origin = 'Bangalore';
  else if (desc.includes('from hyderabad') || desc.includes('hyderabad to')) origin = 'Hyderabad';
  else if (desc.includes('from ahmedabad') || desc.includes('ahmedabad to')) origin = 'Ahmedabad';
  else if (desc.includes('from chandigarh') || desc.includes('chandigarh to')) origin = 'Chandigarh';
  else if (desc.includes('from dehradun') || desc.includes('dehradun to')) origin = 'Dehradun';
  else if (desc.includes('from jaipur') || desc.includes('jaipur to')) origin = 'Jaipur';
  else if (desc.includes('from kolkata') || desc.includes('kolkata to')) origin = 'Kolkata';

  let vehicle = 'AC Tourist Vehicle';
  if (desc.includes('tempo traveller') || desc.includes('traveller')) vehicle = 'AC Tempo Traveller';
  else if (desc.includes('innova') || desc.includes('suv')) vehicle = 'AC Innova Crysta / SUV';
  else if (desc.includes('sedan') || desc.includes('dzire')) vehicle = 'AC Sedan';
  else if (desc.includes('volvo') || desc.includes('bus')) vehicle = 'AC Luxury Volvo Bus';

  // 3. Fetch real-time telemetry from all 4 streams in parallel
  const enrichedContext = await realtimeTravelService.getEnrichedTravelContext({
    destination,
    origin,
    vehicle,
  });

  // 4. Synthesize with unified LLM (OpenAI GPT or Google Gemini)
  let itinerary = await llmService.generateItinerary({
    destination,
    days: Number(days) || 4,
    tripType,
    agencyName,
    phone,
    description,
    enrichedContext,
  });

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
