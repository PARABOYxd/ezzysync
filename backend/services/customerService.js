const customerRepository = require('../repositories/customerRepository');
const r2Service = require('./r2Service');

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

/** Backs the "Add Booking" phone lookup - lets the form offer to reuse an
 * existing customer's name/email instead of the agent retyping them from
 * scratch for someone who has already booked, been quoted, or been a lead. */
async function findByPhone(tenantId, phone) {
  if (!phone) return null;
  const customer = await customerRepository.findByPhone(tenantId, phone);
  return customer || null;
}

async function getProfile(tenantId, customerId) {
  const customer = await customerRepository.getCustomerById(tenantId, customerId);
  if (!customer) return null;
  const history = await customerRepository.getCustomerHistory(tenantId, customerId, customer.phone);
  // Stored media is a private reference; each read gets a fresh short-lived link.
  const media = history.media.map((m) => ({ ...m, media_url: r2Service.resolveMediaUrl(m.media_url) }));
  return { ...customer, ...history, media };
}

async function listCustomers(params) {
  return customerRepository.listCustomersPaged(params);
}

module.exports = {
  upsertFromContact,
  findByPhone,
  getProfile,
  listCustomers,
};
