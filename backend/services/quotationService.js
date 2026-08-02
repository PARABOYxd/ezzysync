const quotationRepository = require('../repositories/quotationRepository');
const bookingService = require('./bookingService');
const customerService = require('./customerService');

function rowToQuotation(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    quotationId: row.quotation_id,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    tripName: row.trip_name,
    priceQuote: Number(row.price_quote || 0),
    validUntil: row.valid_until || '',
    status: row.status || 'Draft',
    itineraryDays: row.itinerary_days || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usedInBatches: row.used_in_batches || [],
  };
}

async function getQuotationById(tenantId, quotationId) {
  const row = await quotationRepository.getQuotationById(tenantId, quotationId);
  return rowToQuotation(row);
}

async function getQuotationByUuid(uuid) {
  const row = await quotationRepository.getQuotationByUuid(uuid);
  return rowToQuotation(row);
}

async function createQuotation(tenantId, data) {
  const quotationId = `QT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const customerId = data.phone
    ? await customerService.upsertFromContact(tenantId, { name: data.customerName, email: data.email, phone: data.phone })
    : null;
  const row = await quotationRepository.insertQuotation(tenantId, quotationId, data, customerId);
  return rowToQuotation(row);
}

async function syncBookingForQuotation(tenantId, quote, actor) {
  const existingBooking = await bookingService.getBookingBySourceQuotation(tenantId, quote.quotationId);
  if (existingBooking) {
    const booking = await bookingService.updateBooking(tenantId, existingBooking.bookingId, {
      ...existingBooking,
      customerName: quote.customerName,
      email: quote.email,
      phone: quote.phone,
      trip: quote.tripName,
      departure: quote.validUntil || new Date().toISOString().slice(0, 10),
      pricePerPerson: quote.priceQuote,
      travelStatus: 'Booked',
      deleted: false,
    });
    return { booking, possibleDuplicates: [] };
  } else {
    // This quotation has no booking of its own yet. Check whether the
    // customer already has a different open booking (e.g. from a Lead
    // conversion) - the two paths don't cross-reference each other, so
    // without this check we'd silently create a second booking for the
    // same person instead of flagging it.
    const customerId = quote.phone
      ? await customerService.upsertFromContact(tenantId, { name: quote.customerName, email: quote.email, phone: quote.phone })
      : null;
    const possibleDuplicates = customerId ? await bookingService.getActiveBookingsByCustomer(tenantId, customerId) : [];

    const bookingPayload = {
      customerName: quote.customerName,
      email: quote.email,
      phone: quote.phone,
      trip: quote.tripName,
      departure: quote.validUntil || new Date().toISOString().slice(0, 10),
      members: 1,
      pricePerPerson: quote.priceQuote,
      paid: 0,
      travelStatus: 'Booked',
      paymentStatus: 'Pending',
      notes: `Automatically generated from Accepted Quotation #: ${quote.quotationId}`,
      sourceQuotationId: quote.quotationId,
    };
    const booking = await bookingService.createBooking(tenantId, bookingPayload, actor || 'System');
    return { booking, possibleDuplicates };
  }
}

async function updateQuotation(tenantId, quotationId, updates) {
  const existing = await getQuotationById(tenantId, quotationId);
  if (!existing) {
    const err = new Error('Quotation not found.');
    err.status = 404;
    throw err;
  }

  // Intercept status transition
  if (updates.status && updates.status !== existing.status) {
    if (updates.status === 'Accepted') {
      await syncBookingForQuotation(tenantId, { ...existing, ...updates }, 'Admin Panel');
    } else if (existing.status === 'Accepted' && updates.status !== 'Accepted') {
      const booking = await bookingService.getBookingBySourceQuotation(tenantId, quotationId);
      if (booking) {
        await bookingService.softDeleteBooking(tenantId, booking.bookingId, 'Admin Panel');
      }
    }
  }

  const merged = { ...existing, ...updates };
  const row = await quotationRepository.updateQuotation(tenantId, quotationId, merged);
  return rowToQuotation(row);
}

async function deleteQuotation(tenantId, quotationId) {
  const row = await quotationRepository.deleteQuotation(tenantId, quotationId);
  // Also soft-delete any linked bookings when a quotation is deleted
  const booking = await bookingService.getBookingBySourceQuotation(tenantId, quotationId);
  if (booking) {
    await bookingService.softDeleteBooking(tenantId, booking.bookingId, 'Admin Panel');
  }
  return rowToQuotation(row);
}

async function listQuotationsPaged(tenantId, params) {
  const result = await quotationRepository.listQuotationsPaged({ ...params, tenantId });
  return {
    quotations: result.quotations.map(rowToQuotation),
    totalCount: result.totalCount,
  };
}

async function acceptQuotation(tenantId, quotationId, acceptedBy) {
  const quote = await getQuotationById(tenantId, quotationId);
  if (!quote) {
    const err = new Error('Quotation not found.');
    err.status = 404;
    throw err;
  }

  // Sync booking (will create or restore)
  const { booking, possibleDuplicates } = await syncBookingForQuotation(tenantId, quote, acceptedBy);

  // Update status directly using repository to prevent double hook calls
  const merged = { ...quote, status: 'Accepted' };
  await quotationRepository.updateQuotation(tenantId, quotationId, merged);

  return { booking, quotation: merged, possibleDuplicates };
}

module.exports = {
  getQuotationById,
  getQuotationByUuid,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  listQuotationsPaged,
  acceptQuotation,
};
