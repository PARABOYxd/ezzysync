const LEAD_STAGES = ['New', 'Contacted', 'Negotiating', 'Won', 'Lost'];
const LEAD_SOURCES = ['Manual', 'Landing Page', 'Referral', 'Website', 'WhatsApp', 'Excel Import'];

/**
 * Postgres TIMESTAMPTZ accepts 'infinity', which pg hands back as the number
 * Infinity - and `new Date(Infinity).toISOString()` throws. One such row made
 * every lead list, the pool and the pipeline 500 for the whole tenant. The
 * write path now refuses it; this keeps any row already stored from taking
 * the screen down.
 */
function toIsoOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

/** Maps a Postgres `leads` row (snake_case) to the camelCase shape the frontend expects. */
function rowToLead(row) {
  if (!row) return null;
  return {
    leadId: row.lead_id,
    customerId: row.customer_id || null,
    customerName: row.customer_name,
    email: row.email || '',
    phone: row.phone,
    interest: row.interest || '',
    source: row.source || 'Manual',
    stage: row.stage || 'New',
    assignedTo: row.assigned_to || '',
    notes: row.notes || '',
    nextFollowUpDate: toIsoOrNull(row.next_follow_up_date),
    convertedBookingId: row.converted_booking_id || null,
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deleted: !!row.deleted,
    followUpCount: row.follow_up_count !== undefined ? Number(row.follow_up_count) : null,
    batchId: row.batch_id || null,
    departureDate: row.departure_date || '',
    travelers: row.travelers !== null && row.travelers !== undefined ? Number(row.travelers) : '',
    priority: row.priority || 'Cold',
  };
}

module.exports = { LEAD_STAGES, LEAD_SOURCES, rowToLead };
