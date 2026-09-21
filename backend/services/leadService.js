const { v4: uuidv4 } = require('uuid');
const leadRepository = require('../repositories/leadRepository');
const bookingRepository = require('../repositories/bookingRepository');
const customerService = require('./customerService');
const bookingService = require('./bookingService');
const { rowToLead } = require('../models/leadSchema');

// Deliberately does NOT add a country-code prefix - leads/bookings store
// phone numbers exactly as entered everywhere else in the app (no forced
// '91'), and existsByPhone's suffix match only works if a shorter digits-only
// value here can genuinely be a suffix of whatever's already stored. Adding
// a prefix here would make this value longer than a shorter existing record
// and the match would silently fail.
function normalizePhone(phone = '') {
  return String(phone).replace(/\D/g, '');
}

/**
 * A follow-up date from the client, as something Postgres will store and we
 * can read back. Postgres takes far more than dates here - 'infinity',
 * 'epoch', 'now' - and 'infinity' comes back as a value that crashes every
 * read of the row, so only real, finite dates get through.
 */
function parseOptionalDate(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const d = typeof value === 'string' || value instanceof Date ? new Date(value) : new Date(NaN);
  if (!Number.isFinite(d.getTime())) {
    const err = new Error(`${label} must be a valid date.`);
    err.status = 400;
    throw err;
  }
  return d.toISOString();
}

async function getLeadById(tenantId, leadId) {
  const row = await leadRepository.getLeadById(tenantId, leadId);
  return rowToLead(row);
}

async function createLead(tenantId, data, createdBy) {
  const leadId = `LD-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;
  const now = new Date().toISOString();

  const customerName = data.customerName || 'New Inquiry';
  data = { ...data, nextFollowUpDate: parseOptionalDate(data.nextFollowUpDate, 'Next follow-up date') };

  // The form has always shown an "Active Enquiry Found" choice for this, but
  // nothing ever raised it, so the same customer piled up as parallel leads.
  if (data.phone && !data.bypassDuplicateCheck) {
    const existing = await leadRepository.findActiveByPhone(tenantId, data.phone);
    if (existing) {
      const err = new Error('An active enquiry already exists for this contact.');
      err.status = 409;
      err.details = {
        existingLead: {
          leadId: existing.lead_id,
          customerName: existing.customer_name,
          interest: existing.interest,
          stage: existing.stage,
        },
      };
      throw err;
    }
  }
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

/**
 * Imports a batch of leads (from a parsed CSV), applying the same
 * phone-based dedup rule the WhatsApp auto-capture path uses: a row whose
 * phone already belongs to a lead or a booking is skipped, never turned into
 * a second record. Rows are processed one at a time rather than in bulk SQL
 * so each one gets the same validation and side effects (customer upsert,
 * follow-up log, pool notification) a normal single create would.
 *
 * Returns a summary rather than throwing on a bad row, so one malformed line
 * in a hundred-row file doesn't fail the whole import.
 */
async function bulkImportLeads(tenantId, rows, createdBy) {
  const result = { created: 0, skipped: 0, failed: 0, errors: [] };

  for (const [index, row] of rows.entries()) {
    const phone = normalizePhone(row.phone);
    if (!phone) {
      result.failed += 1;
      result.errors.push({ row: index + 1, reason: 'Missing or invalid phone number.' });
      continue;
    }

    try {
      const [leadExists, bookingExists] = await Promise.all([
        leadRepository.existsByPhone(tenantId, phone),
        bookingRepository.existsByPhone(tenantId, phone),
      ]);
      if (leadExists || bookingExists) {
        result.skipped += 1;
        continue;
      }

      await createLead(tenantId, {
        customerName: row.customerName || row.name || 'New Inquiry',
        phone,
        email: row.email || '',
        interest: row.interest || row.trip || '',
        source: 'Manual',
        stage: 'New',
        notes: 'Imported from bulk CSV upload.',
        bypassDuplicateCheck: true,
      }, createdBy);
      result.created += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push({ row: index + 1, reason: err.message });
    }
  }

  return result;
}

async function updateLead(tenantId, leadId, updates, updatedByUser) {
  const existing = await getLeadById(tenantId, leadId);
  if (!existing) {
    const err = new Error('Lead not found.');
    err.status = 404;
    throw err;
  }

  if (updates.nextFollowUpDate !== undefined) {
    updates = { ...updates, nextFollowUpDate: parseOptionalDate(updates.nextFollowUpDate, 'Next follow-up date') };
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
  return leadRepository.insertFollowUp(
    tenantId, leadId, note, activityType,
    parseOptionalDate(nextFollowUpDate, 'Next follow-up date'), createdBy
  );
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
    trip: bookingExtras?.trip || bookingExtras?.interest || lead.interest,
    departure: bookingExtras?.departure || lead.departureDate || new Date().toISOString().slice(0, 10),
    members: bookingExtras?.members || (lead.travelers ? Number(lead.travelers) : 1),
    pricePerPerson: bookingExtras?.pricePerPerson || 0,
    teamMember: lead.assignedTo,
    travelStatus: 'Booked',
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

/**
 * After an AI reply, checks whether the trip/travelers/departure-date the AI
 * is collecting (see aiService's conversation prompt) can be confidently read
 * from the conversation and are still missing on the matching lead - if so,
 * fills them in. Deliberately conservative: a field is only written when it
 * is both (a) currently empty on the lead, so a human's own entry - or an
 * earlier auto-fill - is never silently overwritten, and (b) explicitly
 * stated per the extraction, never inferred. The fill is logged as an
 * ordinary, visible follow-up note, so it reads in the lead's timeline
 * exactly like a human logging what the customer said, and is just as easy
 * to correct by hand if the AI got it wrong.
 */
async function autoFillFromConversation(tenantId, phone, conversationText) {
  const lead = await leadRepository.findByPhone(tenantId, phone);
  if (!lead) return;

  const missingTrip = !lead.interest || lead.interest === 'Inquiry via WhatsApp';
  const missingMembers = !lead.travelers;
  const missingDeparture = !lead.departure_date;
  if (!missingTrip && !missingMembers && !missingDeparture) return;

  const aiService = require('./aiService');
  const extracted = await aiService.extractLeadFieldsFromConversation(conversationText);
  if (!extracted) return;

  const updates = {};
  const filled = [];
  if (missingTrip && extracted.tripName) {
    updates.interest = extracted.tripName;
    filled.push(`Trip: ${extracted.tripName}`);
  }
  if (missingMembers && Number(extracted.members) > 0) {
    updates.travelers = Number(extracted.members);
    filled.push(`Travelers: ${extracted.members}`);
  }
  if (missingDeparture && /^\d{4}-\d{2}-\d{2}$/.test(extracted.departureDate || '')) {
    updates.departureDate = extracted.departureDate;
    filled.push(`Departure: ${extracted.departureDate}`);
  }
  if (Object.keys(updates).length === 0) return;

  await updateLead(tenantId, lead.lead_id, updates, 'AI Auto-Fill');
  await leadRepository.insertFollowUp(
    tenantId, lead.lead_id,
    `AI auto-filled from the conversation: ${filled.join(', ')}.`,
    'note', null, 'AI Auto-Fill'
  );
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
  autoFillFromConversation,
  bulkImportLeads,
};
