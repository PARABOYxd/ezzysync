const customerRepository = require('../repositories/customerRepository');

/**
 * Upserts the customer rollup row for a contact and returns its id.
 * Called from bookingService/quotationService/leadService right before
 * insert - the only touch point in those flows, no shape change to their
 * forms/validation. Never throws into the caller's create flow; a rollup
 * failure shouldn't block a booking/lead/quotation from being saved.
 */
async function upsertFromContact(tenantId, { name, email, phone }, log) {
  if (!phone) return null;
  try {
    const customer = await customerRepository.upsertByPhone(tenantId, { name, email, phone });
    return customer.id;
  } catch (err) {
    (log || require('../utils/logger')).warn({ err, tenantId }, 'Failed to upsert customer rollup');
    return null;
  }
}

async function getProfile(tenantId, customerId) {
  const customer = await customerRepository.getCustomerById(tenantId, customerId);
  if (!customer) return null;
  const history = await customerRepository.getCustomerHistory(tenantId, customerId);
  return { ...customer, ...history };
}

async function listCustomers(params) {
  return customerRepository.listCustomersPaged(params);
}

module.exports = {
  upsertFromContact,
  getProfile,
  listCustomers,
};
