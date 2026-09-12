import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const bookingService = appRequire('../services/bookingService');
const { createTenant, resetTenantData, unique } = helpers;

const { computeAmounts } = bookingService;

function bookingData(overrides = {}) {
  return {
    customerName: 'Asha Rao',
    email: `${unique('asha')}@example.com`,
    phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1'),
    trip: 'Goa Getaway',
    departure: '2026-12-01',
    members: 2,
    pricePerPerson: 5000,
    paid: 0,
    ...overrides,
  };
}

describe('Bookings', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  describe('computeAmounts', () => {
    it('totals members x price and subtracts what has been paid', () => {
      expect(computeAmounts({ members: 2, pricePerPerson: 5000, paid: 3000 })).toEqual({
        totalAmount: 10000,
        remaining: 7000,
      });
    });

    it('clamps remaining to zero rather than going negative on overpayment', () => {
      // computeAmounts has no ceiling check on `paid` - an overpayment is
      // clamped silently here, not rejected. This test exists so that if a
      // cap is added later, it is this test that has to change.
      expect(computeAmounts({ members: 1, pricePerPerson: 1000, paid: 999999 })).toEqual({
        totalAmount: 1000,
        remaining: 0,
      });
    });
  });

  describe('creating a booking', () => {
    it('derives Paid / Partial / Pending from what was actually paid', async () => {
      const paid = await bookingService.createBooking(tenant.tenantId, bookingData({ paid: 10000 }), 'agent@test.com');
      expect(paid.paymentStatus).toBe('Paid');

      const partial = await bookingService.createBooking(tenant.tenantId, bookingData({ paid: 4000 }), 'agent@test.com');
      expect(partial.paymentStatus).toBe('Partial');

      const pending = await bookingService.createBooking(tenant.tenantId, bookingData({ paid: 0 }), 'agent@test.com');
      expect(pending.paymentStatus).toBe('Pending');
    });

    it('KNOWN GAP: accepts paid greater than the total with no rejection', async () => {
      const booking = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({ members: 1, pricePerPerson: 1000, paid: 999999 }),
        'agent@test.com'
      );
      expect(booking.remaining).toBe(0);
      expect(booking.paymentStatus).toBe('Paid');
    });

    it('is isolated per tenant', async () => {
      const other = await createTenant();
      await bookingService.createBooking(tenant.tenantId, bookingData(), 'agent@test.com');
      const otherList = await bookingService.listBookings(other.tenantId);
      expect(otherList).toHaveLength(0);
    });
  });

  describe('updating a booking', () => {
    it('404s on a booking that does not exist', async () => {
      await expect(
        bookingService.updateBooking(tenant.tenantId, 'BK-NOPE', { notes: 'x' }, 'agent@test.com')
      ).rejects.toMatchObject({ status: 404 });
    });

    it('will not let another tenant see or touch this booking', async () => {
      const mine = await bookingService.createBooking(tenant.tenantId, bookingData(), 'agent@test.com');
      const other = await createTenant();

      await expect(
        bookingService.updateBooking(other.tenantId, mine.bookingId, { notes: 'hijacked' }, 'intruder@test.com')
      ).rejects.toMatchObject({ status: 404 });
    });

    it('refuses to mark Completed unless the booking was Booked', async () => {
      const booking = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({ travelStatus: 'Confirming' }),
        'agent@test.com'
      );

      await expect(
        bookingService.updateBooking(tenant.tenantId, booking.bookingId, { travelStatus: 'Completed' }, 'agent@test.com')
      ).rejects.toMatchObject({ status: 400 });
    });

    it('allows Completed once the booking is Booked', async () => {
      const booking = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({ travelStatus: 'Booked' }),
        'agent@test.com'
      );

      const updated = await bookingService.updateBooking(
        tenant.tenantId, booking.bookingId, { travelStatus: 'Completed' }, 'agent@test.com'
      );
      expect(updated.travelStatus).toBe('Completed');
    });

    it('KNOWN GAP: Cancelled has no such guard - even a Completed trip can be "cancelled"', async () => {
      const booking = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({ travelStatus: 'Booked' }),
        'agent@test.com'
      );
      await bookingService.updateBooking(tenant.tenantId, booking.bookingId, { travelStatus: 'Completed' }, 'agent@test.com');

      const cancelled = await bookingService.updateBooking(
        tenant.tenantId, booking.bookingId, { travelStatus: 'Cancelled' }, 'agent@test.com'
      );
      expect(cancelled.travelStatus).toBe('Cancelled');
    });

    it('recomputes remaining when members or price change', async () => {
      const booking = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({ members: 2, pricePerPerson: 5000, paid: 0 }),
        'agent@test.com'
      );
      expect(booking.totalAmount).toBe(10000);

      const updated = await bookingService.updateBooking(
        tenant.tenantId, booking.bookingId, { members: 4 }, 'agent@test.com'
      );
      expect(updated.totalAmount).toBe(20000);
      expect(updated.remaining).toBe(20000);
    });
  });

  describe('deleting a booking', () => {
    it('soft-deletes: hidden from the default list, still readable with includeDeleted', async () => {
      const booking = await bookingService.createBooking(tenant.tenantId, bookingData(), 'agent@test.com');
      await bookingService.softDeleteBooking(tenant.tenantId, booking.bookingId, 'agent@test.com');

      const visible = await bookingService.listBookings(tenant.tenantId);
      expect(visible.find((b) => b.bookingId === booking.bookingId)).toBeUndefined();

      const withDeleted = await bookingService.listBookings(tenant.tenantId, { includeDeleted: true });
      const deletedRow = withDeleted.find((b) => b.bookingId === booking.bookingId);
      expect(deletedRow).toBeTruthy();
      expect(deletedRow.deleted).toBe(true);
    });
  });

  describe('dashboard stats', () => {
    it('excludes cancelled trips from revenue', async () => {
      await bookingService.createBooking(
        tenant.tenantId, bookingData({ paid: 10000, travelStatus: 'Booked' }), 'agent@test.com'
      );
      const cancelled = await bookingService.createBooking(
        tenant.tenantId, bookingData({ pricePerPerson: 99999, paid: 99999 }), 'agent@test.com'
      );
      await bookingService.updateBooking(tenant.tenantId, cancelled.bookingId, { travelStatus: 'Cancelled' }, 'agent@test.com');

      const { stats } = await bookingService.dashboardStats(tenant.tenantId);
      expect(stats.totalRevenue).toBe(10000);
      expect(stats.cancelledTrips).toBe(1);
    });
  });
});
