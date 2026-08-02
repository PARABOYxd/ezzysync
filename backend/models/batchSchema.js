const BATCH_STATUSES = ['Planning', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled'];

/** Maps a Postgres `tour_batches` row (snake_case) to the camelCase shape the frontend expects. */
function rowToBatch(row) {
  if (!row) return null;
  return {
    id: row.id,
    batchId: row.batch_id,
    name: row.name,
    tripName: row.trip_name,
    departureDate: row.departure_date,
    totalCapacity: Number(row.total_capacity || 0),
    pricePerPerson: Number(row.price_per_person || 0),
    itineraryDays: row.itinerary_days || [],
    status: row.status || 'Planning',
    notes: row.notes || '',
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deleted: !!row.deleted,
    confirmedSeats: Number(row.confirmed_seats || 0),
    linkedBookingsCount: Number(row.linked_bookings_count || 0),
    sourceQuotationId: row.source_quotation_id || null,
  };
}

module.exports = { BATCH_STATUSES, rowToBatch };
