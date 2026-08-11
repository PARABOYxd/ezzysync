const { query } = require('../config/db');

// Seats/bookings currently counted against a batch's capacity - excludes
// soft-deleted and terminal-cancelled bookings, same convention as
// bookingRepository.getActiveBookingsByCustomer.
const CAPACITY_SUBQUERY = `
  (SELECT COALESCE(SUM(b.members), 0) FROM bookings b
    WHERE b.batch_id = tb.id AND b.deleted = FALSE AND b.travel_status NOT IN ('Cancelled', 'Refunded')) AS confirmed_seats,
  (SELECT COUNT(*) FROM bookings b
    WHERE b.batch_id = tb.id AND b.deleted = FALSE) AS linked_bookings_count
`;

async function insertBatch(tenantId, batchId, data, createdBy) {
  const { rows } = await query(
    `INSERT INTO tour_batches (
       tenant_id, batch_id, name, trip_name, departure_date, total_capacity,
       price_per_person, itinerary_days, status, notes, created_by, source_quotation_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      tenantId, batchId, data.name, data.tripName, data.departureDate,
      Number(data.totalCapacity || 0), Number(data.pricePerPerson || 0),
      JSON.stringify(data.itineraryDays || []), data.status || 'Planning',
      data.notes || '', createdBy || '', data.sourceQuotationId || null
    ]
  );
  return rows[0];
}

async function listBatches(tenantId, includeDeleted = false) {
  const sql = `
    SELECT tb.*, ${CAPACITY_SUBQUERY}
    FROM tour_batches tb
    WHERE tb.tenant_id = $1 ${includeDeleted ? '' : 'AND tb.deleted = FALSE'}
    ORDER BY tb.departure_date ASC
  `;
  const { rows } = await query(sql, [tenantId]);
  return rows;
}

async function getBatchByBatchId(tenantId, batchId) {
  const { rows } = await query(
    `SELECT tb.*, ${CAPACITY_SUBQUERY} FROM tour_batches tb WHERE tb.tenant_id = $1 AND tb.batch_id = $2`,
    [tenantId, batchId]
  );
  return rows[0];
}

async function updateBatch(tenantId, batchId, merged) {
  const { rows } = await query(
    `UPDATE tour_batches SET
       name = $1, trip_name = $2, departure_date = $3, total_capacity = $4,
       price_per_person = $5, itinerary_days = $6, status = $7, notes = $8,
       deleted = $9, source_quotation_id = $12, updated_at = now()
     WHERE tenant_id = $10 AND batch_id = $11
     RETURNING *`,
    [
      merged.name, merged.tripName, merged.departureDate, Number(merged.totalCapacity || 0),
      Number(merged.pricePerPerson || 0), JSON.stringify(merged.itineraryDays || []),
      merged.status || 'Planning', merged.notes || '', !!merged.deleted,
      tenantId, batchId, merged.sourceQuotationId || null
    ]
  );
  return rows[0];
}

async function listBookingsForBatch(tenantId, batchUuid) {
  const { rows } = await query(
    `SELECT * FROM bookings WHERE tenant_id = $1 AND batch_id = $2 AND deleted = FALSE ORDER BY booking_timestamp DESC`,
    [tenantId, batchUuid]
  );
  return rows;
}

async function assignBookingToBatch(tenantId, bookingIdText, batchUuid) {
  const { rows } = await query(
    `UPDATE bookings SET batch_id = $1 WHERE tenant_id = $2 AND booking_id = $3 RETURNING *`,
    [batchUuid, tenantId, bookingIdText]
  );
  return rows[0];
}

async function unassignBookingFromBatch(tenantId, bookingIdText) {
  const { rows } = await query(
    `UPDATE bookings SET batch_id = NULL WHERE tenant_id = $1 AND booking_id = $2 RETURNING *`,
    [tenantId, bookingIdText]
  );
  return rows[0];
}

/** How many active batches still import this itinerary - guards Quotation delete. */
async function countBySourceQuotation(tenantId, quotationId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM tour_batches WHERE tenant_id = $1 AND source_quotation_id = $2 AND deleted = FALSE`,
    [tenantId, quotationId]
  );
  return rows[0]?.count || 0;
}

async function listLeadsForBatch(tenantId, batchUuid) {
  const { rows } = await query(
    `SELECT * FROM leads WHERE tenant_id = $1 AND batch_id = $2 AND deleted = FALSE ORDER BY created_at DESC`,
    [tenantId, batchUuid]
  );
  return rows;
}

async function assignLeadToBatch(tenantId, leadIdText, batchUuid) {
  const { rows } = await query(
    `UPDATE leads SET batch_id = $1 WHERE tenant_id = $2 AND lead_id = $3 RETURNING *`,
    [batchUuid, tenantId, leadIdText]
  );
  return rows[0];
}

async function unassignLeadFromBatch(tenantId, leadIdText) {
  const { rows } = await query(
    `UPDATE leads SET batch_id = NULL WHERE tenant_id = $1 AND lead_id = $2 RETURNING *`,
    [tenantId, leadIdText]
  );
  return rows[0];
}

async function nextBatchSeq() {
  const { rows } = await query(`SELECT nextval('tour_batches_seq') AS seq`);
  return rows[0].seq;
}

module.exports = {
  nextBatchSeq,
  insertBatch,
  listBatches,
  getBatchByBatchId,
  updateBatch,
  listBookingsForBatch,
  assignBookingToBatch,
  unassignBookingFromBatch,
  listLeadsForBatch,
  assignLeadToBatch,
  unassignLeadFromBatch,
  countBySourceQuotation,
};
