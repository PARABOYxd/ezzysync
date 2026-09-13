import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const batchService = appRequire('../services/batchService');
const batchRepository = appRequire('../repositories/batchRepository');
const bookingService = appRequire('../services/bookingService');
const quotationService = appRequire('../services/quotationService');
const { createTenant, resetTenantData, unique } = helpers;

describe('Group Tour batches', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  async function makeBatch(overrides = {}) {
    return batchRepository.insertBatch(tenant.tenantId, unique('BATCH'), {
      name: 'Goa Group', tripName: 'Goa Beach Tour', departureDate: '2026-12-20', totalCapacity: 10, pricePerPerson: 4000,
      ...overrides,
    }, 'agent');
  }

  function bookingFor(batch, overrides = {}) {
    return {
      customerName: 'Batch Traveler',
      email: `${unique('bt')}@example.com`,
      phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '3'),
      trip: batch.trip_name,
      departure: batch.departure_date,
      members: 1,
      pricePerPerson: 4000,
      paid: 0,
      ...overrides,
    };
  }

  describe('linking a booking to a batch', () => {
    it('links normally when there is room', async () => {
      const batch = await makeBatch({ totalCapacity: 10 });
      const booking = await bookingService.createBooking(tenant.tenantId, bookingFor(batch, { members: 4 }), 'agent@test.com');

      const linked = await batchService.linkBooking(tenant.tenantId, batch.batch_id, booking.bookingId);
      expect(linked.batchId).toBe(batch.id);
    });

    it('warns instead of blocking when it would exceed capacity', async () => {
      const batch = await makeBatch({ totalCapacity: 5 });
      const booking = await bookingService.createBooking(tenant.tenantId, bookingFor(batch, { members: 8 }), 'agent@test.com');

      await expect(
        batchService.linkBooking(tenant.tenantId, batch.batch_id, booking.bookingId)
      ).rejects.toMatchObject({ status: 409, code: 'BATCH_CAPACITY_EXCEEDED', remainingSeats: 5 });

      // Not actually linked yet - the warning didn't silently go through.
      const detail = await batchService.getBatchDetail(tenant.tenantId, batch.batch_id);
      expect(detail.bookings).toHaveLength(0);
    });

    it('links anyway once the agent confirms the overbook with force', async () => {
      const batch = await makeBatch({ totalCapacity: 5 });
      const booking = await bookingService.createBooking(tenant.tenantId, bookingFor(batch, { members: 8 }), 'agent@test.com');

      const linked = await batchService.linkBooking(tenant.tenantId, batch.batch_id, booking.bookingId, { force: true });
      expect(linked.batchId).toBe(batch.id);
    });

    it('still refuses a booking for a different trip/date, even with force', async () => {
      const batch = await makeBatch();
      const booking = await bookingService.createBooking(
        tenant.tenantId,
        bookingFor(batch, { trip: 'A Totally Different Trip', departure: '2027-01-01' }),
        'agent@test.com'
      );

      await expect(
        batchService.linkBooking(tenant.tenantId, batch.batch_id, booking.bookingId, { force: true })
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});

describe('Converting a Quotation to a Booking', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  it('creates a booking from an accepted quotation', async () => {
    const quote = await quotationService.createQuotation(tenant.tenantId, {
      customerName: 'Priya Nair', email: 'priya@example.com', phone: '9876543299',
      tripName: 'Munnar Escape', priceQuote: 25000, validUntil: '2026-12-05',
    });

    const { booking } = await quotationService.acceptQuotation(tenant.tenantId, quote.quotationId, 'agent@test.com');
    expect(booking.trip).toBe('Munnar Escape');
    expect(booking.sourceQuotationId).toBe(quote.quotationId);
  });

  it('does not create a second booking when accepted twice', async () => {
    const quote = await quotationService.createQuotation(tenant.tenantId, {
      customerName: 'Priya Nair', email: 'priya@example.com', phone: '9876543298',
      tripName: 'Munnar Escape', priceQuote: 25000, validUntil: '2026-12-05',
    });

    const first = await quotationService.acceptQuotation(tenant.tenantId, quote.quotationId, 'agent@test.com');
    const second = await quotationService.acceptQuotation(tenant.tenantId, quote.quotationId, 'agent@test.com');

    expect(second.booking.id).toBe(first.booking.id);

    const bookings = await bookingService.listBookings(tenant.tenantId);
    expect(bookings.filter((b) => b.sourceQuotationId === quote.quotationId)).toHaveLength(1);
  });
});
