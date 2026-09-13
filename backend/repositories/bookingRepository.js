const { query } = require('../config/db');

async function getBookingById(tenantId, bookingId) {
  const { rows } = await query(
    `SELECT * FROM bookings WHERE tenant_id = $1 AND booking_id = $2`,
    [tenantId, bookingId]
  );
  return rows[0];
}

async function listBookings(tenantId, includeDeleted = false) {
  const sql = includeDeleted
    ? `SELECT * FROM bookings WHERE tenant_id = $1 ORDER BY booking_timestamp DESC`
    : `SELECT * FROM bookings WHERE tenant_id = $1 AND deleted = FALSE ORDER BY booking_timestamp DESC`;
  const { rows } = await query(sql, [tenantId]);
  return rows;
}

/**
 * The dashboard's headline numbers, computed by Postgres in one pass instead
 * of pulling every booking into Node to sum/count in a loop. Mirrors
 * dashboardStats' old JS exactly: totalBookings counts everything (Cancelled
 * included), the money fields exclude Cancelled, todaysBookings/revenue30Days
 * compare against the first 10 characters of booking_timestamp (a TEXT
 * column storing an ISO string, not a real timestamp) the same way the JS
 * version did with `.slice(0, 10)`.
 */
async function getDashboardCounts(tenantId, { teamMember = null, today, thirtyDaysAgo } = {}) {
  const values = [tenantId, today, thirtyDaysAgo];
  let teamClause = '';
  if (teamMember) {
    values.push(teamMember);
    teamClause = `AND team_member = $${values.length}`;
  }

  const { rows } = await query(
    `SELECT
       COUNT(*) AS total_bookings,
       COUNT(*) FILTER (WHERE travel_status = 'Booked' AND departure >= $2) AS upcoming_trips,
       COUNT(*) FILTER (WHERE travel_status = 'Completed') AS completed_trips,
       COUNT(*) FILTER (WHERE travel_status = 'Cancelled') AS cancelled_trips,
       COUNT(*) FILTER (WHERE LEFT(booking_timestamp, 10) = $2) AS todays_bookings,
       COALESCE(SUM(total_amount) FILTER (WHERE travel_status != 'Cancelled'), 0) AS total_revenue,
       COALESCE(SUM(paid) FILTER (WHERE travel_status != 'Cancelled'), 0) AS total_paid,
       COALESCE(SUM(vendor_hotel_cost + vendor_flight_cost + vendor_transport_cost + vendor_other_cost)
         FILTER (WHERE travel_status != 'Cancelled'), 0) AS total_cost,
       COALESCE(SUM(net_profit) FILTER (WHERE travel_status != 'Cancelled'), 0) AS total_profit,
       COALESCE(SUM(total_amount) FILTER (
         WHERE travel_status != 'Cancelled' AND LEFT(booking_timestamp, 10) >= $3
       ), 0) AS revenue_30_days
     FROM bookings
     WHERE tenant_id = $1 AND deleted = FALSE ${teamClause}`,
    values
  );
  return rows[0];
}

/** Most recent N bookings, sorted in SQL rather than sorting the whole table
 * in JS just to throw all but ten rows away. */
async function listRecentBookings(tenantId, { teamMember = null, limit = 10 } = {}) {
  const values = [tenantId];
  let teamClause = '';
  if (teamMember) {
    values.push(teamMember);
    teamClause = `AND team_member = $${values.length}`;
  }
  values.push(limit);

  const { rows } = await query(
    `SELECT * FROM bookings
      WHERE tenant_id = $1 AND deleted = FALSE ${teamClause}
      ORDER BY booking_timestamp DESC
      LIMIT $${values.length}`,
    values
  );
  return rows;
}

/**
 * Candidate rows for the "upcoming departures" panel: not-cancelled bookings
 * departing today or later. Bounded by `limit` rather than unbounded so a
 * tenant with years of history doesn't have every past booking pulled in -
 * bookingService still does the batch-collapsing and final top-10 slice in
 * JS, since that logic depends on tour_batches data this query doesn't have.
 */
async function listUpcomingBookingCandidates(tenantId, { teamMember = null, today, limit = 200 } = {}) {
  const values = [tenantId, today];
  let teamClause = '';
  if (teamMember) {
    values.push(teamMember);
    teamClause = `AND team_member = $${values.length}`;
  }
  values.push(limit);

  const { rows } = await query(
    `SELECT * FROM bookings
      WHERE tenant_id = $1 AND deleted = FALSE AND travel_status != 'Cancelled' AND departure >= $2 ${teamClause}
      ORDER BY departure ASC
      LIMIT $${values.length}`,
    values
  );
  return rows;
}

async function getBookingBySourceQuotation(tenantId, quotationId) {
  const { rows } = await query(
    `SELECT * FROM bookings WHERE tenant_id = $1 AND source_quotation_id = $2`,
    [tenantId, quotationId]
  );
  return rows[0];
}

/** How many active bookings still reference this itinerary - guards Quotation delete. */
async function countBySourceQuotation(tenantId, quotationId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM bookings WHERE tenant_id = $1 AND source_quotation_id = $2 AND deleted = FALSE`,
    [tenantId, quotationId]
  );
  return rows[0]?.count || 0;
}

// Still-open bookings for a customer - used to warn when a Lead-convert or
// Quotation-accept is about to create a booking for someone who already has
// an unresolved one, since those two paths don't otherwise know about each
// other. "Open" means anything not yet at a terminal state - Lead-convert
// creates bookings as 'New' (not 'Booked'), so this can't be a single exact
// status match; it has to exclude the terminal ones instead.
async function getActiveBookingsByCustomer(tenantId, customerId) {
  if (!customerId) return [];
  const { rows } = await query(
    `SELECT * FROM bookings WHERE tenant_id = $1 AND customer_id = $2 AND deleted = FALSE AND travel_status NOT IN ('Completed', 'Cancelled', 'Refunded')`,
    [tenantId, customerId]
  );
  return rows;
}

async function insertBooking(tenantId, bookingId, data, now, paid, totalAmount, remaining, travelStatus, paymentStatus, createdBy, customerId) {
  const hotelCost = Number(data.vendorHotelCost || 0);
  const flightCost = Number(data.vendorFlightCost || 0);
  const transportCost = Number(data.vendorTransportCost || 0);
  const otherCost = Number(data.vendorOtherCost || 0);
  const totalCost = hotelCost + flightCost + transportCost + otherCost;
  const netProfit = totalAmount - totalCost;
  const sourceQuotationId = data.sourceQuotationId || null;

  const { rows } = await query(
    `INSERT INTO bookings (
       tenant_id, booking_id, customer_name, email, phone, emergency_contact, trip, departure,
       pickup, members, price_per_person, total_amount, paid, remaining, team_member,
       travel_status, payment_status, booking_timestamp, notes, created_by, updated_at, deleted,
       vendor_hotel_cost, vendor_flight_cost, vendor_transport_cost, vendor_other_cost, net_profit,
       source_quotation_id, customer_id, hotel_id, room_category, hotel_booking_status, hotel_confirmation_no,
       batch_id, cost_template_id, sharing_type
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,FALSE,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35)
     RETURNING *`,
    [
      tenantId, bookingId, data.customerName, data.email, data.phone, data.emergencyContact || '',
      data.trip, data.departure, data.pickup || '', Number(data.members || 0), Number(data.pricePerPerson || 0),
      totalAmount, paid, remaining, data.teamMember || '', travelStatus, paymentStatus, now,
      data.notes || '', createdBy || '', now,
      hotelCost, flightCost, transportCost, otherCost, netProfit,
      sourceQuotationId, customerId || null,
      data.hotelId || null, data.roomCategory || '', data.hotelBookingStatus || 'Pending', data.hotelConfirmationNo || '',
      data.batchId || null, data.costTemplateId || null, data.sharingType || 'Double'
    ]
  );
  return rows[0];
}

async function updateBooking(tenantId, bookingId, merged, totalAmount, remaining, updatedAt, customerId) {
  const hotelCost = Number(merged.vendorHotelCost || 0);
  const flightCost = Number(merged.vendorFlightCost || 0);
  const transportCost = Number(merged.vendorTransportCost || 0);
  const otherCost = Number(merged.vendorOtherCost || 0);
  const totalCost = hotelCost + flightCost + transportCost + otherCost;
  const netProfit = totalAmount - totalCost;

  const { rows } = await query(
    `UPDATE bookings SET
       customer_name = $1, email = $2, phone = $3, emergency_contact = $4, trip = $5, departure = $6,
       pickup = $7, members = $8, price_per_person = $9, total_amount = $10, paid = $11, remaining = $12,
       team_member = $13, travel_status = $14, payment_status = $15, notes = $16, updated_at = $17, deleted = $18,
       vendor_hotel_cost = $19, vendor_flight_cost = $20, vendor_transport_cost = $21, vendor_other_cost = $22, net_profit = $23,
       customer_id = COALESCE($26, customer_id),
       hotel_id = $27, room_category = $28, hotel_booking_status = $29, hotel_confirmation_no = $30,
       batch_id = $31, cost_template_id = $32, sharing_type = $33
     WHERE tenant_id = $24 AND booking_id = $25
     RETURNING *`,
    [
      merged.customerName, merged.email, merged.phone, merged.emergencyContact || '', merged.trip, merged.departure,
      merged.pickup || '', Number(merged.members || 0), Number(merged.pricePerPerson || 0), totalAmount,
      Number(merged.paid || 0), remaining, merged.teamMember || '', merged.travelStatus, merged.paymentStatus,
      merged.notes || '', updatedAt, !!merged.deleted,
      hotelCost, flightCost, transportCost, otherCost, netProfit,
      tenantId, bookingId, customerId || null,
      merged.hotelId || null, merged.roomCategory || '', merged.hotelBookingStatus || 'Pending', merged.hotelConfirmationNo || '',
      merged.batchId || null, merged.costTemplateId || null, merged.sharingType || 'Double'
    ]
  );
  return rows[0];
}

async function listBookingsPaged(params) {
  const {
    tenantId,
    page = 1,
    limit = 10,
    search = '',
    status = '',
    trip = '',
    teamMember = '',
    departureFrom = '',
    departureTo = '',
    createdFrom = '',
    createdTo = '',
    sort = 'newest',
    includeDeleted = false
  } = params;

  const values = [tenantId];
  let paramIndex = 2;

  let whereClauses = ['b.tenant_id = $1'];

  if (!includeDeleted) {
    whereClauses.push('b.deleted = FALSE');
  }

  if (status) {
    whereClauses.push(`b.travel_status = $${paramIndex++}`);
    values.push(status);
  }

  if (trip) {
    whereClauses.push(`b.trip ILIKE $${paramIndex++}`);
    values.push(`%${trip}%`);
  }

  if (teamMember) {
    whereClauses.push(`b.team_member ILIKE $${paramIndex++}`);
    values.push(`%${teamMember}%`);
  }

  if (departureFrom) {
    whereClauses.push(`b.departure >= $${paramIndex++}`);
    values.push(departureFrom);
  }

  if (departureTo) {
    whereClauses.push(`b.departure <= $${paramIndex++}`);
    values.push(departureTo);
  }

  if (createdFrom) {
    whereClauses.push(`b.booking_timestamp::date >= $${paramIndex++}::date`);
    values.push(createdFrom);
  }

  if (createdTo) {
    whereClauses.push(`b.booking_timestamp::date <= $${paramIndex++}::date`);
    values.push(createdTo);
  }

  if (search) {
    whereClauses.push(`(b.customer_name ILIKE $${paramIndex} OR b.booking_id ILIKE $${paramIndex} OR b.email ILIKE $${paramIndex} OR b.phone ILIKE $${paramIndex} OR b.trip ILIKE $${paramIndex} OR b.team_member ILIKE $${paramIndex} OR b.travel_status ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  const whereSql = whereClauses.join(' AND ');

  let orderSql = 'ORDER BY b.booking_timestamp DESC';
  if (sort === 'oldest') {
    orderSql = 'ORDER BY b.booking_timestamp ASC';
  } else if (sort === 'departure_asc') {
    orderSql = 'ORDER BY b.departure ASC';
  }

  // Exact total matching count query
  const countRes = await query(`SELECT COUNT(*)::int as count FROM bookings b WHERE ${whereSql}`, values);
  const totalCount = countRes.rows[0]?.count || 0;

  // Pagination calculation
  const offset = Math.max((page - 1) * limit, 0);

  values.push(Number(limit));
  const limitIndex = paramIndex++;
  values.push(Number(offset));
  const offsetIndex = paramIndex++;

  const selectSql = `
    SELECT b.*, tb.name AS batch_name, tb.batch_id AS batch_custom_id
    FROM bookings b
    LEFT JOIN tour_batches tb ON b.batch_id = tb.id
    WHERE ${whereSql} 
    ${orderSql} 
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const { rows } = await query(selectSql, values);

  return {
    bookings: rows,
    totalCount,
  };
}

async function listFollowUps(tenantId, bookingIdText) {
  const { rows } = await query(
    `SELECT f.* 
     FROM follow_up_logs f
     JOIN bookings b ON f.booking_id = b.id
     WHERE f.tenant_id = $1 AND b.booking_id = $2
     ORDER BY f.created_at DESC`,
    [tenantId, bookingIdText]
  );
  return rows;
}

async function insertFollowUp(tenantId, bookingIdText, note, activityType, nextFollowUpDate, createdBy) {
  const { rows: bRows } = await query(
    `SELECT id FROM bookings WHERE tenant_id = $1 AND booking_id = $2`,
    [tenantId, bookingIdText]
  );
  if (bRows.length === 0) {
    throw new Error('Booking not found.');
  }
  const bookingUuid = bRows[0].id;

  const { rows: fRows } = await query(
    `INSERT INTO follow_up_logs (tenant_id, booking_id, note, activity_type, next_follow_up_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [tenantId, bookingUuid, note, activityType, nextFollowUpDate || null, createdBy || '']
  );

  if (nextFollowUpDate) {
    await query(
      `UPDATE bookings SET next_follow_up_date = $1 WHERE id = $2`,
      [nextFollowUpDate, bookingUuid]
    );
  }

  return fRows[0];
}

async function getUpcomingDepartures(daysAhead) {
  // Get all Booked bookings with departure date = today + daysAhead
  const { rows } = await query(
    `SELECT b.*, t.company_name, t.id as tenant_uuid_id
     FROM bookings b
     JOIN tenants t ON b.tenant_id = t.id
     WHERE b.deleted = FALSE
       AND b.travel_status = 'Booked'
       AND DATE(b.departure) = CURRENT_DATE + INTERVAL '${daysAhead} days'
       AND b.email IS NOT NULL AND b.email != ''`,
    []
  );
  return rows;
}

module.exports = {
  getBookingById,
  listBookings,
  getDashboardCounts,
  listRecentBookings,
  listUpcomingBookingCandidates,
  insertBooking,
  updateBooking,
  listBookingsPaged,
  listFollowUps,
  insertFollowUp,
  getBookingBySourceQuotation,
  countBySourceQuotation,
  getActiveBookingsByCustomer,
  getUpcomingDepartures,
};
