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
};
