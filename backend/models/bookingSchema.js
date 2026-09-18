const TRAVEL_STATUSES = ['Confirming', 'Booked', 'Completed', 'Cancelled', 'Refunded'];
const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid'];

/** Maps a Postgres `bookings` row (snake_case) to the camelCase shape the frontend expects. */
function rowToBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
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
    travelStatus: row.travel_status || 'Confirming',
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
    batchId: row.batch_id || null,
    batchName: row.batch_name || null,
    batchCustomId: row.batch_custom_id || null,
    costTemplateId: row.cost_template_id || null,
    sharingType: row.sharing_type || 'Double',
    // Written by insertBooking/updateBooking for a while but never mapped
    // back here - the "Linked Hotel" card in BookingViewDrawer always read
    // undefined, and the form's fields (now wired up) had nothing to load.
    hotelId: row.hotel_id || null,
    roomCategory: row.room_category || '',
    hotelBookingStatus: row.hotel_booking_status || 'Pending',
    hotelConfirmationNo: row.hotel_confirmation_no || '',
    refundedAmount: Number(row.refunded_amount || 0),
    mealPlan: row.meal_plan || 'CP',
    hotelCheckIn: row.hotel_check_in ? (typeof row.hotel_check_in === 'string' ? row.hotel_check_in.split('T')[0] : new Date(row.hotel_check_in).toISOString().split('T')[0]) : null,
    hotelCheckOut: row.hotel_check_out ? (typeof row.hotel_check_out === 'string' ? row.hotel_check_out.split('T')[0] : new Date(row.hotel_check_out).toISOString().split('T')[0]) : null,
    vehicleType: row.vehicle_type || '',
    driverName: row.driver_name || '',
    driverPhone: row.driver_phone || '',
    vehicleNumber: row.vehicle_number || '',
    pickupTime: row.pickup_time || '',
    pickupLocation: row.pickup_location || '',
    dropLocation: row.drop_location || '',
    voucherNotes: row.voucher_notes || '',
    transports: Array.isArray(row.transports) ? row.transports : (row.transports ? JSON.parse(row.transports) : []),
    hotelsStay: Array.isArray(row.hotels_stay) ? row.hotels_stay : (row.hotels_stay ? JSON.parse(row.hotels_stay) : []),
  };
}

/** Maps a `booking_payments` row (snake_case) to the camelCase shape the frontend expects. */
function rowToPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    amount: Number(row.amount || 0),
    method: row.method || 'Cash',
    reference: row.reference || '',
    paidOn: row.paid_on,
    notes: row.notes || '',
    createdBy: row.created_by || '',
    createdAt: row.created_at,
  };
}

module.exports = { TRAVEL_STATUSES, PAYMENT_STATUSES, rowToBooking, rowToPayment };
