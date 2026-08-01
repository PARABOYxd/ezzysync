const { v4: uuidv4 } = require('uuid');
const leadRepository = require('../repositories/leadRepository');
const customerService = require('./customerService');
const bookingService = require('./bookingService');
const { rowToLead } = require('../models/leadSchema');
const db = require('../config/db');

const STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost'];
const STAGE_ORDER = { 'New': 1, 'Contacted': 2, 'Qualified': 3, 'Negotiating': 4, 'Won': 5, 'Lost': 5 };

async function getLeadById(tenantId, leadId) {
  const row = await leadRepository.getLeadById(tenantId, leadId);
  return rowToLead(row);
}

async function createLead(tenantId, data, createdBy) {
  if (data.phone && (data.phone.length < 10 || data.phone.length > 15)) {
    throw new Error('Phone number must be 10-15 digits (E.164 format).');
  }

  const duplicateCheck = await db.query(
    `SELECT lead_id FROM leads WHERE tenant_id = $1 AND stage NOT IN ('Won', 'Lost') AND (phone = $2 OR (email != '' AND email = $3))`,
    [tenantId, data.phone, data.email]
  );
  if (duplicateCheck.rowCount > 0) {
    throw new Error('Duplicate phone/email open lead validation warning.');
  }

  if (data.stage && !STAGES.includes(data.stage)) {
    throw new Error('Invalid stage.');
  }

  const { rows } = await db.query(`SELECT nextval('leads_seq') AS seq`);
  const leadId = `LD-${rows[0].seq}`;
  const now = new Date().toISOString();

  const customerId = await customerService.upsertFromContact(tenantId, {
    name: data.customerName, email: data.email, phone: data.phone,
  });

  const row = await leadRepository.insertLead(tenantId, leadId, data, now, createdBy, customerId);

  await leadRepository.insertFollowUp(
    tenantId, leadId,
    `Lead created via ${data.source || 'Manual'}.` + (data.notes ? `\nNote: ${data.notes}` : ''),
    'note', null, createdBy || 'System'
  );

  await db.query(
    "INSERT INTO audit_logs (tenant_id, action, details) VALUES ($1, $2, $3)",
    [tenantId, 'LEAD_CREATED', { leadId }]
  );

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
    if (!STAGES.includes(updates.stage)) {
      throw new Error('Invalid stage.');
    }
    const oldOrder = STAGE_ORDER[existing.stage] || 0;
    const newOrder = STAGE_ORDER[updates.stage] || 0;
    if (newOrder < oldOrder) {
      throw new Error('Backward stage transitions are not allowed.');
    }

    await leadRepository.insertFollowUp(
      tenantId, leadId,
      `Stage changed from *${existing.stage}* to *${updates.stage}*.`,
      'meeting', null, updatedByUser || 'System'
    );
  }

  await db.query(
    "INSERT INTO audit_logs (tenant_id, action, details) VALUES ($1, $2, $3)",
    [tenantId, 'LEAD_UPDATED', { leadId, updates }]
  );

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

async function listLeadsForPipeline(tenantId) {
  const rows = await leadRepository.listLeadsForPipeline(tenantId);
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
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    const leadRes = await client.query('SELECT * FROM leads WHERE tenant_id = $1 AND lead_id = $2 FOR UPDATE', [tenantId, leadId]);
    if (leadRes.rowCount === 0) {
      const err = new Error('Lead not found.');
      err.status = 404;
      throw err;
    }
    const leadRow = leadRes.rows[0];
    if (leadRow.converted_booking_id) {
      const err = new Error('This lead has already been converted to a booking.');
      err.status = 400;
      throw err;
    }

    const booking = await bookingService.createBooking(tenantId, {
      customerName: leadRow.customer_name,
      email: leadRow.email,
      phone: leadRow.phone,
      trip: leadRow.interest,
      departure: bookingExtras?.departure || new Date().toISOString().slice(0, 10),
      members: bookingExtras?.members || 1,
      pricePerPerson: bookingExtras?.pricePerPerson || 0,
      teamMember: leadRow.assigned_to,
      travelStatus: 'New',
      notes: `Converted from Lead #${leadId}.` + (leadRow.notes ? `\n${leadRow.notes}` : ''),
      ...bookingExtras,
    }, actor || 'System');

    await client.query(
      `UPDATE bookings SET lead_id = $1 WHERE tenant_id = $2 AND booking_id = $3`,
      [leadRow.id, tenantId, booking.bookingId]
    );

    await client.query(
      `UPDATE leads SET stage = 'Won', converted_booking_id = $1, updated_at = $2 WHERE id = $3`,
      [booking.bookingId, new Date().toISOString(), leadRow.id]
    );

    await client.query(
      `INSERT INTO follow_up_logs (tenant_id, lead_id, note, activity_type, created_by) VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, leadRow.id, `Converted to Booking #${booking.bookingId}.`, 'meeting', actor || 'System']
    );

    await client.query(
      "INSERT INTO audit_logs (tenant_id, action, details) VALUES ($1, $2, $3)",
      [tenantId, 'LEAD_CONVERTED', { leadId, bookingId: booking.bookingId }]
    );

    await client.query('COMMIT');
    return { lead: await getLeadById(tenantId, leadId), booking };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
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
};
