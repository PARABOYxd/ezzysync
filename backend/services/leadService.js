const { v4: uuidv4 } = require('uuid');
const leadRepository = require('../repositories/leadRepository');
const customerService = require('./customerService');
const bookingService = require('./bookingService');
const { rowToLead } = require('../models/leadSchema');

async function getLeadById(tenantId, leadId) {
  const row = await leadRepository.getLeadById(tenantId, leadId);
  return rowToLead(row);
}

async function createLead(tenantId, data, createdBy) {
  const leadId = `LD-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;
  const now = new Date().toISOString();

  const customerName = data.customerName || 'New Inquiry';
  const customerId = await customerService.upsertFromContact(tenantId, {
    name: customerName, email: data.email, phone: data.phone,
  });

  const row = await leadRepository.insertLead(tenantId, leadId, { ...data, customerName }, now, createdBy, customerId);

  await leadRepository.insertFollowUp(
    tenantId, leadId,
    `Lead created via ${data.source || 'Manual'}.` + (data.notes ? `\nNote: ${data.notes}` : ''),
    'note', null, createdBy || 'System'
  );

  const websocketService = require('./websocketService');
  if (!row.assigned_to) {
    getLeadPool(tenantId).then((poolLeads) => {
      websocketService.broadcastToTenant(tenantId, {
        type: 'LEAD_POOL_UPDATED',
        count: poolLeads.length
      });
    }).catch(() => {});
  }

  return rowToLead(row);
}

async function updateLead(tenantId, leadId, updates, updatedByUser) {
  const existing = await getLeadById(tenantId, leadId);
  if (!existing) {
    const err = new Error('Lead not found.');
    err.status = 404;
    throw err;
  }

  const merged = { ...existing, ...updates };
  const updatedAt = new Date().toISOString();

  const contactChanged = updates.phone !== undefined || updates.email !== undefined || updates.customerName !== undefined;
  const customerId = contactChanged
    ? await customerService.upsertFromContact(tenantId, { name: merged.customerName, email: merged.email, phone: merged.phone })
    : null;

  const row = await leadRepository.updateLead(tenantId, leadId, merged, updatedAt, customerId);

  const stageChanged = updates.stage && updates.stage !== existing.stage;
  if (stageChanged) {
    await leadRepository.insertFollowUp(
      tenantId, leadId,
      `Stage changed from *${existing.stage}* to *${updates.stage}*.`,
      'meeting', null, updatedByUser || 'System'
    );
  }

  return rowToLead(row);
}

async function updateStage(tenantId, leadId, stage, updatedByUser) {
  return updateLead(tenantId, leadId, { stage }, updatedByUser);
}

async function softDeleteLead(tenantId, leadId, updatedByUser) {
  return updateLead(tenantId, leadId, { deleted: true }, updatedByUser);
}

async function listLeadsPaged(tenantId, params) {
  const result = await leadRepository.listLeadsPaged({ ...params, tenantId });
  return { leads: result.leads.map(rowToLead), totalCount: result.totalCount };
}

async function listLeadsForPipeline(tenantId, assignedTo) {
  const rows = await leadRepository.listLeadsForPipeline(tenantId, assignedTo);
  return rows.map(rowToLead);
}

async function getFollowUps(tenantId, leadId) {
  return leadRepository.listFollowUps(tenantId, leadId);
}

async function addFollowUp(tenantId, leadId, { note, activityType, nextFollowUpDate, createdBy }) {
  return leadRepository.insertFollowUp(tenantId, leadId, note, activityType, nextFollowUpDate, createdBy);
}

/**
 * Converts a lead into a booking: creates the booking from the lead's
 * fields, marks the lead Won + linked, and logs it on the lead's timeline.
 */
async function convertToBooking(tenantId, leadId, bookingExtras, actor) {
  const lead = await getLeadById(tenantId, leadId);
  if (!lead) {
    const err = new Error('Lead not found.');
    err.status = 404;
    throw err;
  }
  if (lead.convertedBookingId) {
    const err = new Error('This lead has already been converted to a booking.');
    err.status = 400;
    throw err;
  }

  const booking = await bookingService.createBooking(tenantId, {
    customerName: lead.customerName,
    email: lead.email,
    phone: lead.phone,
    trip: lead.interest,
    departure: bookingExtras?.departure || new Date().toISOString().slice(0, 10),
    members: bookingExtras?.members || 1,
    pricePerPerson: bookingExtras?.pricePerPerson || 0,
    teamMember: lead.assignedTo,
    travelStatus: 'New',
    notes: `Converted from Lead #${leadId}.` + (lead.notes ? `\n${lead.notes}` : ''),
    ...bookingExtras,
  }, actor || 'System');

  await leadRepository.updateLead(
    tenantId, leadId,
    { ...lead, stage: 'Won', convertedBookingId: booking.bookingId },
    new Date().toISOString(),
    null
  );
  await leadRepository.insertFollowUp(
    tenantId, leadId,
    `Converted to Booking #${booking.bookingId}.`,
    'meeting', null, actor || 'System'
  );

  return { lead: await getLeadById(tenantId, leadId), booking };
}

async function getLeadPool(tenantId) {
  const rows = await leadRepository.listPool(tenantId);
  return rows.map(rowToLead);
}

async function claimLead(tenantId, leadId, username) {
  const row = await leadRepository.claimLead(tenantId, leadId, username);
  if (!row) {
    const err = new Error('This lead has already been claimed by another team member.');
    err.status = 409;
    throw err;
  }
  return rowToLead(row);
}

module.exports = {
  getLeadById,
  createLead,
  updateLead,
  updateStage,
  softDeleteLead,
  listLeadsPaged,
  listLeadsForPipeline,
  getFollowUps,
  addFollowUp,
  convertToBooking,
  getLeadPool,
  claimLead,
};
