const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost'];
const LEAD_SOURCES = ['Manual', 'Landing Page', 'Referral', 'Website', 'WhatsApp'];

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
    nextFollowUpDate: row.next_follow_up_date ? new Date(row.next_follow_up_date).toISOString() : null,
    convertedBookingId: row.converted_booking_id || null,
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deleted: !!row.deleted,
    followUpCount: row.follow_up_count !== undefined ? Number(row.follow_up_count) : null,
  };
}

module.exports = { LEAD_STAGES, LEAD_SOURCES, rowToLead };
