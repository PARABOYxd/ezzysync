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

async function getBookingBySourceQuotation(tenantId, quotationId) {
  const { rows } = await query(
    `SELECT * FROM bookings WHERE tenant_id = $1 AND source_quotation_id = $2`,
    [tenantId, quotationId]
  );
  return rows[0];
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
       source_quotation_id, customer_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,FALSE,$22,$23,$24,$25,$26,$27,$28)
     RETURNING *`,
    [
      tenantId, bookingId, data.customerName, data.email, data.phone, data.emergencyContact || '',
      data.trip, data.departure, data.pickup || '', Number(data.members || 0), Number(data.pricePerPerson || 0),
      totalAmount, paid, remaining, data.teamMember || '', travelStatus, paymentStatus, now,
      data.notes || '', createdBy || '', now,
      hotelCost, flightCost, transportCost, otherCost, netProfit,
      sourceQuotationId, customerId || null
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
       customer_id = COALESCE($26, customer_id)
     WHERE tenant_id = $24 AND booking_id = $25
     RETURNING *`,
    [
      merged.customerName, merged.email, merged.phone, merged.emergencyContact || '', merged.trip, merged.departure,
      merged.pickup || '', Number(merged.members || 0), Number(merged.pricePerPerson || 0), totalAmount,
      Number(merged.paid || 0), remaining, merged.teamMember || '', merged.travelStatus, merged.paymentStatus,
      merged.notes || '', updatedAt, !!merged.deleted,
      hotelCost, flightCost, transportCost, otherCost, netProfit,
      tenantId, bookingId, customerId || null,
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
    sort = 'newest',
    includeDeleted = false
  } = params;

  const values = [tenantId];
  let paramIndex = 2;

  let whereClauses = ['tenant_id = $1'];

  if (!includeDeleted) {
    whereClauses.push('deleted = FALSE');
  }

  if (status) {
    whereClauses.push(`travel_status = $${paramIndex++}`);
    values.push(status);
  }

  if (trip) {
    whereClauses.push(`trip ILIKE $${paramIndex++}`);
    values.push(`%${trip}%`);
  }

  if (teamMember) {
    whereClauses.push(`team_member ILIKE $${paramIndex++}`);
    values.push(`%${teamMember}%`);
  }

  if (departureFrom) {
    whereClauses.push(`departure >= $${paramIndex++}`);
    values.push(departureFrom);
  }

  if (departureTo) {
    whereClauses.push(`departure <= $${paramIndex++}`);
    values.push(departureTo);
  }

  if (search) {
    whereClauses.push(`(customer_name ILIKE $${paramIndex} OR booking_id ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  const whereSql = whereClauses.join(' AND ');

  let orderSql = 'ORDER BY booking_timestamp DESC';
  if (sort === 'oldest') {
    orderSql = 'ORDER BY booking_timestamp ASC';
  }

  // Exact total matching count query
  const countRes = await query(`SELECT COUNT(*)::int as count FROM bookings WHERE ${whereSql}`, values);
  const totalCount = countRes.rows[0]?.count || 0;

  // Pagination calculation
  const offset = Math.max((page - 1) * limit, 0);

  values.push(Number(limit));
  const limitIndex = paramIndex++;
  values.push(Number(offset));
  const offsetIndex = paramIndex++;

  const selectSql = `
    SELECT * 
    FROM bookings 
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
  insertBooking,
  updateBooking,
  listBookingsPaged,
  listFollowUps,
  insertFollowUp,
  getBookingBySourceQuotation,
  getUpcomingDepartures,
};
