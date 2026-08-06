const quotationRepository = require('../repositories/quotationRepository');
const bookingService = require('./bookingService');
const bookingRepository = require('../repositories/bookingRepository');
const batchRepository = require('../repositories/batchRepository');
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
    inclusions: row.inclusions || [],
    exclusions: row.exclusions || [],
    highlights: row.highlights || [],
    pickupOptions: row.pickup_options || [],
    bannerUrl: row.banner_url || '',
    relatedQuotations: row.related_quotations || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hotelCostPerPax: Number(row.hotel_cost_per_pax || 0),
    flightCostPerPax: Number(row.flight_cost_per_pax || 0),
    transportCostPerPax: Number(row.transport_cost_per_pax || 0),
    otherCostPerPax: Number(row.other_cost_per_pax || 0),
    costTemplateId: row.cost_template_id || null,
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
      vendorHotelCost: Number(quote.hotelCostPerPax || 0) * (existingBooking.members || 1),
      vendorFlightCost: Number(quote.flightCostPerPax || 0) * (existingBooking.members || 1),
      vendorTransportCost: Number(quote.transportCostPerPax || 0) * (existingBooking.members || 1),
      vendorOtherCost: Number(quote.otherCostPerPax || 0) * (existingBooking.members || 1),
      costTemplateId: quote.costTemplateId || null,
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
      vendorHotelCost: Number(quote.hotelCostPerPax || 0),
      vendorFlightCost: Number(quote.flightCostPerPax || 0),
      vendorTransportCost: Number(quote.transportCostPerPax || 0),
      vendorOtherCost: Number(quote.otherCostPerPax || 0),
      costTemplateId: quote.costTemplateId || null,
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
  const existing = await getQuotationById(tenantId, quotationId);
  if (!existing) {
    const err = new Error('Quotation not found.');
    err.status = 404;
    throw err;
  }

  // An itinerary that's still powering a live Group Tour batch or a
  // booking can't be silently deleted out from under them - surface what
  // it's used in instead of guessing (e.g. cascading the delete).
  const [batchCount, bookingCount] = await Promise.all([
    batchRepository.countBySourceQuotation(tenantId, quotationId),
    bookingRepository.countBySourceQuotation(tenantId, quotationId),
  ]);

  if (batchCount > 0 || bookingCount > 0) {
    const parts = [];
    if (batchCount > 0) parts.push(`${batchCount} tour batch${batchCount > 1 ? 'es' : ''}`);
    if (bookingCount > 0) parts.push(`${bookingCount} booking${bookingCount > 1 ? 's' : ''}`);
    const err = new Error(`This itinerary is used in ${parts.join(' and ')}. Unlink or remove those first before deleting it.`);
    err.status = 409;
    throw err;
  }

  const row = await quotationRepository.deleteQuotation(tenantId, quotationId);
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

async function getDashboardStats(tenantId) {
  return await quotationRepository.getQuotationStats(tenantId);
}

async function duplicateQuotation(tenantId, quotationId) {
  const existing = await getQuotationById(tenantId, quotationId);
  if (!existing) {
    const err = new Error('Quotation not found.');
    err.status = 404;
    throw err;
  }
  
  const duplicatedData = {
    ...existing,
    tripName: `${existing.tripName} - Copy`,
    status: 'Draft',
  };
  
  delete duplicatedData.id;
  delete duplicatedData.quotationId;
  delete duplicatedData.createdAt;
  delete duplicatedData.updatedAt;

  return await createQuotation(tenantId, duplicatedData);
}

module.exports = {
  createQuotation,
  getQuotationById,
  getQuotationByUuid,
  updateQuotation,
  deleteQuotation,
  listQuotationsPaged,
  acceptQuotation,
  getDashboardStats,
  duplicateQuotation,
};
