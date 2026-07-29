const TRAVEL_STATUSES = ['New', 'Confirming', 'Booked', 'Completed', 'Cancelled', 'Refunded', 'Postponed'];
const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid'];

/** Maps a Postgres `bookings` row (snake_case) to the camelCase shape the frontend expects. */
function rowToBooking(row) {
  if (!row) return null;
  return {
    bookingId: row.booking_id,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    emergencyContact: row.emergency_contact || '',
    trip: row.trip,
    departure: row.departure,
    pickup: row.pickup || '',
    members: Number(row.members || 0),
    pricePerPerson: Number(row.price_per_person || 0),
    totalAmount: Number(row.total_amount || 0),
    paid: Number(row.paid || 0),
    remaining: Number(row.remaining || 0),
    teamMember: row.team_member || '',
    travelStatus: row.travel_status || 'New',
    paymentStatus: row.payment_status || 'Pending',
    bookingTimestamp: row.booking_timestamp,
    notes: row.notes || '',
    createdBy: row.created_by || '',
    updatedAt: row.updated_at,
    deleted: !!row.deleted,
    vendorHotelCost: Number(row.vendor_hotel_cost || 0),
    vendorFlightCost: Number(row.vendor_flight_cost || 0),
    vendorTransportCost: Number(row.vendor_transport_cost || 0),
    vendorOtherCost: Number(row.vendor_other_cost || 0),
    netProfit: Number(row.net_profit || 0),
    nextFollowUpDate: row.next_follow_up_date ? new Date(row.next_follow_up_date).toISOString() : null,
    sourceQuotationId: row.source_quotation_id || null,
    customerId: row.customer_id || null,
  };
}

module.exports = { TRAVEL_STATUSES, PAYMENT_STATUSES, rowToBooking };
