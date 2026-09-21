import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Buffer } from 'node:buffer';
import { db, appRequire, helpers } from './app.mjs';

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

    it('creates fine with no email - most WhatsApp-first leads never give one', async () => {
      const withoutEmail = { ...bookingData() };
      delete withoutEmail.email;
      const booking = await bookingService.createBooking(tenant.tenantId, withoutEmail, 'agent@test.com');
      expect(booking.email).toBe('');
      expect(booking.bookingId).toBeTruthy();

      // Updating it stays email-optional too, not just the initial insert.
      const updated = await bookingService.updateBooking(tenant.tenantId, booking.bookingId, { notes: 'Called to confirm.' }, 'agent@test.com');
      expect(updated.email).toBe('');
    });
  });

  describe('payment ledger', () => {
    it('logs an installment and rolls it into paid/remaining/status without the caller recomputing anything', async () => {
      const booking = await bookingService.createBooking(tenant.tenantId, bookingData({ members: 2, pricePerPerson: 5000, paid: 0 }), 'agent@test.com');
      expect(booking.totalAmount).toBe(10000);

      const first = await bookingService.addPayment(tenant.tenantId, booking.bookingId, {
        amount: 4000,
        method: 'UPI',
        reference: 'txn_1',
        createdBy: 'agent@test.com',
      });
      expect(first.paid).toBe(4000);
      expect(first.remaining).toBe(6000);
      expect(first.paymentStatus).toBe('Partial');

      const second = await bookingService.addPayment(tenant.tenantId, booking.bookingId, {
        amount: 6000,
        method: 'Cash',
        createdBy: 'agent@test.com',
      });
      expect(second.paid).toBe(10000);
      expect(second.remaining).toBe(0);
      expect(second.paymentStatus).toBe('Paid');

      const payments = await bookingService.getPayments(tenant.tenantId, booking.bookingId);
      expect(payments).toHaveLength(2);
    });

    it('rejects a zero or negative payment', async () => {
      const booking = await bookingService.createBooking(tenant.tenantId, bookingData(), 'agent@test.com');
      await expect(
        bookingService.addPayment(tenant.tenantId, booking.bookingId, { amount: 0, createdBy: 'agent@test.com' })
      ).rejects.toThrow();
    });

    it('reverses a mistaken entry back out of paid/remaining on delete', async () => {
      const booking = await bookingService.createBooking(tenant.tenantId, bookingData({ members: 1, pricePerPerson: 5000, paid: 0 }), 'agent@test.com');
      const { payment } = await bookingService.addPayment(tenant.tenantId, booking.bookingId, { amount: 5000, createdBy: 'agent@test.com' });

      const afterDelete = await bookingService.removePayment(tenant.tenantId, booking.bookingId, payment.id);
      expect(afterDelete.paid).toBe(0);
      expect(afterDelete.remaining).toBe(5000);
      expect(afterDelete.paymentStatus).toBe('Pending');

      const payments = await bookingService.getPayments(tenant.tenantId, booking.bookingId);
      expect(payments).toHaveLength(0);
    });

    it('404s adding a payment to a booking that does not exist', async () => {
      await expect(
        bookingService.addPayment(tenant.tenantId, 'BK-NOPE', { amount: 100, createdBy: 'agent@test.com' })
      ).rejects.toThrow();
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

  describe('cancelling and refunding', () => {
    it('records how much was actually returned to the customer', async () => {
      const booking = await bookingService.createBooking(
        tenant.tenantId, bookingData({ paid: 10000 }), 'agent@test.com'
      );

      const cancelled = await bookingService.updateBooking(
        tenant.tenantId, booking.bookingId,
        { travelStatus: 'Cancelled', refundedAmount: 6000 },
        'agent@test.com'
      );

      expect(cancelled.travelStatus).toBe('Cancelled');
      expect(cancelled.refundedAmount).toBe(6000);
      // The collected amount itself is untouched - refundedAmount is a
      // separate record of what went back, not a correction to `paid`.
      expect(cancelled.paid).toBe(10000);
    });

    it('refuses to refund more than was actually collected', async () => {
      const booking = await bookingService.createBooking(
        tenant.tenantId, bookingData({ paid: 3000 }), 'agent@test.com'
      );

      await expect(
        bookingService.updateBooking(
          tenant.tenantId, booking.bookingId,
          { travelStatus: 'Cancelled', refundedAmount: 5000 },
          'agent@test.com'
        )
      ).rejects.toMatchObject({ status: 400 });
    });

    it('supports the dedicated Refunded status', async () => {
      const booking = await bookingService.createBooking(
        tenant.tenantId, bookingData({ paid: 4000, travelStatus: 'Cancelled' }), 'agent@test.com'
      );

      const refunded = await bookingService.updateBooking(
        tenant.tenantId, booking.bookingId,
        { travelStatus: 'Refunded', refundedAmount: 4000 },
        'agent@test.com'
      );
      expect(refunded.travelStatus).toBe('Refunded');
      expect(refunded.refundedAmount).toBe(4000);
    });
  });

  describe('linking a hotel', () => {
    it('round-trips the hotel fields the form now collects', async () => {
      const hotelRepository = appRequire('../repositories/hotelRepository');
      const hotel = await hotelRepository.createHotel(tenant.tenantId, {
        name: 'Lake View Resort', city: 'Udaipur', roomsAndRates: [{ roomType: 'Deluxe', costPrice: 3000, sellingPrice: 4500 }],
      });

      const booking = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({ hotelId: hotel.id, roomCategory: 'Deluxe', hotelBookingStatus: 'Confirmed', hotelConfirmationNo: 'RES-9981' }),
        'agent@test.com'
      );

      expect(booking.hotelId).toBe(hotel.id);
      expect(booking.roomCategory).toBe('Deluxe');
      expect(booking.hotelBookingStatus).toBe('Confirmed');
      expect(booking.hotelConfirmationNo).toBe('RES-9981');
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

  describe('billing analytics date range', () => {
    const day = (offset) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    const setBookedOn = (bookingId, isoDay) =>
      db.query(`UPDATE bookings SET booking_timestamp = $1 WHERE booking_id = $2`, [`${isoDay}T10:00:00.000Z`, bookingId]);

    // Regression: the range filtered on a createdAt field bookings never had,
    // so every range - Last 30 Days, This Month, Custom - showed zero.
    it('includes bookings made inside a custom range', async () => {
      await bookingService.createBooking(tenant.tenantId, bookingData({ members: 1, pricePerPerson: 5000 }), 'agent@test.com');

      const data = await bookingService.billingAnalytics(tenant.tenantId, null, day(-30), day(0));
      expect(data.bookings).toHaveLength(1);
      expect(data.bookings[0].totalAmount).toBe(5000);
    });

    it('treats the end date as inclusive of that whole day', async () => {
      const b = await bookingService.createBooking(tenant.tenantId, bookingData(), 'agent@test.com');
      await setBookedOn(b.bookingId, day(-5));

      const data = await bookingService.billingAnalytics(tenant.tenantId, null, day(-10), day(-5));
      expect(data.bookings.map((x) => x.bookingId)).toContain(b.bookingId);
    });

    it('leaves out bookings made before or after the range', async () => {
      const before = await bookingService.createBooking(tenant.tenantId, bookingData(), 'agent@test.com');
      const inside = await bookingService.createBooking(tenant.tenantId, bookingData(), 'agent@test.com');
      const after = await bookingService.createBooking(tenant.tenantId, bookingData(), 'agent@test.com');
      await setBookedOn(before.bookingId, day(-40));
      await setBookedOn(inside.bookingId, day(-20));
      await setBookedOn(after.bookingId, day(-1));

      const data = await bookingService.billingAnalytics(tenant.tenantId, null, day(-30), day(-10));
      expect(data.bookings.map((x) => x.bookingId)).toEqual([inside.bookingId]);
    });

    it('carries teamMember on each booking, which the page filters by', async () => {
      await bookingService.createBooking(tenant.tenantId, bookingData({ teamMember: 'Amit' }), 'agent@test.com');
      const data = await bookingService.billingAnalytics(tenant.tenantId);
      expect(data.bookings[0].teamMember).toBe('Amit');
    });

    it('with no range, matches the dashboard revenue exactly (cancelled excluded from both)', async () => {
      await bookingService.createBooking(tenant.tenantId, bookingData({ members: 2, pricePerPerson: 5000 }), 'agent@test.com');
      const c = await bookingService.createBooking(tenant.tenantId, bookingData({ members: 1, pricePerPerson: 7000 }), 'agent@test.com');
      await bookingService.updateBooking(tenant.tenantId, c.bookingId, { travelStatus: 'Cancelled' }, 'agent@test.com');

      const billing = await bookingService.billingAnalytics(tenant.tenantId);
      const { stats } = await bookingService.dashboardStats(tenant.tenantId);
      const billingRevenue = billing.bookings.reduce((s, b) => s + b.totalAmount, 0);
      expect(billingRevenue).toBe(stats.totalRevenue);
      expect(billing.bookings).toHaveLength(stats.totalBookings - stats.cancelledTrips);
    });
  });

  describe('dashboard stats', () => {
    it('compares last-30-day revenue with the 30 days before, instead of a fixed +100%', async () => {
      const recent = await bookingService.createBooking(tenant.tenantId, bookingData({ members: 1, pricePerPerson: 15000 }), 'agent@test.com');
      const older = await bookingService.createBooking(tenant.tenantId, bookingData({ members: 1, pricePerPerson: 10000 }), 'agent@test.com');
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 45);
      await db.query(`UPDATE bookings SET booking_timestamp = $1 WHERE booking_id = $2`, [d.toISOString(), older.bookingId]);

      const { stats } = await bookingService.dashboardStats(tenant.tenantId);
      expect(recent.totalAmount).toBe(15000);
      expect(stats.revenue30Days).toBe(15000);
      expect(stats.revenuePrev30Days).toBe(10000);
      expect(stats.revenue30DaysChangePct).toBe(50);
    });

    it('reports no change percentage when there is nothing to compare against', async () => {
      await bookingService.createBooking(tenant.tenantId, bookingData(), 'agent@test.com');
      const { stats } = await bookingService.dashboardStats(tenant.tenantId);
      expect(stats.revenue30DaysChangePct).toBeNull();
    });

    // These now run as a single SQL aggregate (getDashboardCounts) instead of
    // pulling every booking into JS and summing in a loop - this test is what
    // pins the arithmetic to the old behaviour across that rewrite.
    it('excludes cancelled trips from revenue, but still counts them as bookings', async () => {
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
      expect(stats.totalBookings).toBe(2);
    });

    it('only counts another tenant\'s bookings toward their own stats', async () => {
      const other = await createTenant();
      await bookingService.createBooking(tenant.tenantId, bookingData({ members: 1, pricePerPerson: 5000 }), 'agent@test.com');
      await bookingService.createBooking(other.tenantId, bookingData({ members: 1, pricePerPerson: 7000 }), 'agent@test.com');

      const { stats } = await bookingService.dashboardStats(tenant.tenantId);
      expect(stats.totalBookings).toBe(1);
      expect(stats.totalRevenue).toBe(5000);
    });

    it('returns at most the 10 most recent bookings, newest first', async () => {
      let last;
      for (let i = 0; i < 12; i += 1) {
        last = await bookingService.createBooking(tenant.tenantId, bookingData({ notes: `booking ${i}` }), 'agent@test.com');
      }

      const { recentBookings } = await bookingService.dashboardStats(tenant.tenantId);
      expect(recentBookings).toHaveLength(10);
      expect(recentBookings[0].bookingId).toBe(last.bookingId);
    });

    it('collapses bookings sharing a batch into one upcoming-departure entry', async () => {
      const batchRepository = appRequire('../repositories/batchRepository');
      const batch = await batchRepository.insertBatch(tenant.tenantId, unique('BATCH'), {
        name: 'Goa Group', tripName: 'Goa', departureDate: '2026-12-15', totalCapacity: 20, pricePerPerson: 4000,
      }, 'agent');

      await bookingService.createBooking(tenant.tenantId, bookingData({ departure: '2026-12-15', batchId: batch.id }), 'agent@test.com');
      await bookingService.createBooking(tenant.tenantId, bookingData({ departure: '2026-12-15', batchId: batch.id }), 'agent@test.com');

      const { upcomingDepartures } = await bookingService.dashboardStats(tenant.tenantId);
      const batchEntries = upcomingDepartures.filter((e) => e.type === 'batch' && e.batch.batchId === batch.batch_id);
      expect(batchEntries).toHaveLength(1);
    });
  });

  describe('hotel and cab vouchers', () => {
    it('persists and retrieves all voucher fields on create and update', async () => {
      const created = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({
          mealPlan: 'MAP',
          hotelCheckIn: '2026-12-01',
          hotelCheckOut: '2026-12-05',
          vehicleType: 'Innova Crysta',
          driverName: 'Rajesh Sharma',
          driverPhone: '+91 9876543210',
          vehicleNumber: 'GA 01 AB 1234',
          pickupTime: '09:00 AM',
          pickupLocation: 'Dabolim Airport',
          dropLocation: 'Taj Resort North Goa',
          voucherNotes: 'VIP Welcome drink requested upon arrival',
        }),
        'agent@test.com'
      );

      expect(created.mealPlan).toBe('MAP');
      expect(created.vehicleType).toBe('Innova Crysta');
      expect(created.driverName).toBe('Rajesh Sharma');
      expect(created.driverPhone).toBe('+91 9876543210');
      expect(created.vehicleNumber).toBe('GA 01 AB 1234');
      expect(created.pickupLocation).toBe('Dabolim Airport');
      expect(created.voucherNotes).toBe('VIP Welcome drink requested upon arrival');

      const updated = await bookingService.updateBooking(
        tenant.tenantId,
        created.bookingId,
        {
          mealPlan: 'AP',
          vehicleType: 'Tempo Traveller 17 Seater',
          driverName: 'Sunil Verma',
        },
        'agent@test.com'
      );

      expect(updated.mealPlan).toBe('AP');
      expect(updated.vehicleType).toBe('Tempo Traveller 17 Seater');
      expect(updated.driverName).toBe('Sunil Verma');
      expect(updated.driverPhone).toBe('+91 9876543210'); // Unchanged
    });

    it('generates valid PDF vouchers for both hotel and cab types', async () => {
      const booking = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({
          hotelConfirmationNo: 'HTL-GOA-9921',
          mealPlan: 'CP',
          hotelCheckIn: '2026-12-01',
          hotelCheckOut: '2026-12-05',
          vehicleType: 'Toyota Ertiga',
          driverName: 'Vikram Singh',
          driverPhone: '9988776655',
          vehicleNumber: 'MH 02 CZ 4433',
          pickupTime: '10:30 AM',
          pickupLocation: 'Panjim Bus Stand',
          dropLocation: 'Calangute Beach Hotel',
        }),
        'agent@test.com'
      );

      // Hotel Voucher
      const hotelRes = await bookingService.generateVoucherPdf(tenant.tenantId, booking.bookingId, 'hotel');
      expect(Buffer.isBuffer(hotelRes.buffer)).toBe(true);
      expect(hotelRes.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(hotelRes.filename).toContain('Hotel-Voucher');

      // Cab / Transport Voucher
      const cabRes = await bookingService.generateVoucherPdf(tenant.tenantId, booking.bookingId, 'cab');
      expect(Buffer.isBuffer(cabRes.buffer)).toBe(true);
      expect(cabRes.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(cabRes.filename).toContain('Cab-Voucher');
    });

    it('persists and generates PDFs with multiple drivers/vehicles and multiple hotels', async () => {
      const multiBooking = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({
          transports: [
            {
              vehicleType: 'Innova Crysta',
              vehicleNumber: 'DL 01 AB 1234',
              driverName: 'Ramesh Kumar',
              driverPhone: '+91 9876543210',
              pickupTime: '06:00 AM',
              pickupLocation: 'IGI Airport T3',
              dropLocation: 'Manali Hotel River View',
              voucherNotes: 'AC switched off in hills',
            },
            {
              vehicleType: 'Toyota Ertiga',
              vehicleNumber: 'HP 02 CD 5678',
              driverName: 'Suresh Sharma',
              driverPhone: '+91 9811223344',
              pickupTime: '09:00 AM',
              pickupLocation: 'Manali Hotel',
              dropLocation: 'Solang Valley & Rohtang Pass',
              voucherNotes: 'Local sightseeing guide included',
            },
          ],
          hotelsStay: [
            {
              roomCategory: 'Luxury Valley View Suite',
              mealPlan: 'MAP',
              hotelCheckIn: '2026-12-01',
              hotelCheckOut: '2026-12-03',
              hotelConfirmationNo: 'MNL-9988',
              hotelBookingStatus: 'Confirmed',
            },
            {
              roomCategory: 'Heritage Pine Deluxe',
              mealPlan: 'CP',
              hotelCheckIn: '2026-12-03',
              hotelCheckOut: '2026-12-05',
              hotelConfirmationNo: 'SML-7766',
              hotelBookingStatus: 'Confirmed',
            },
          ],
        }),
        'agent@test.com'
      );

      // Verify array persistence
      expect(multiBooking.transports).toHaveLength(2);
      expect(multiBooking.transports[0].driverName).toBe('Ramesh Kumar');
      expect(multiBooking.transports[1].driverName).toBe('Suresh Sharma');

      expect(multiBooking.hotelsStay).toHaveLength(2);
      expect(multiBooking.hotelsStay[0].hotelConfirmationNo).toBe('MNL-9988');
      expect(multiBooking.hotelsStay[1].hotelConfirmationNo).toBe('SML-7766');

      // Verify primary sync for backward compatibility
      expect(multiBooking.driverName).toBe('Ramesh Kumar');
      expect(multiBooking.vehicleNumber).toBe('DL 01 AB 1234');
      expect(multiBooking.hotelConfirmationNo).toBe('MNL-9988');

      // Verify Multi-Cab PDF Generation
      const cabPdf = await bookingService.generateVoucherPdf(tenant.tenantId, multiBooking.bookingId, 'cab');
      expect(Buffer.isBuffer(cabPdf.buffer)).toBe(true);
      expect(cabPdf.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');

      // Verify Multi-Hotel PDF Generation
      const hotelPdf = await bookingService.generateVoucherPdf(tenant.tenantId, multiBooking.bookingId, 'hotel');
      expect(Buffer.isBuffer(hotelPdf.buffer)).toBe(true);
      expect(hotelPdf.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });

  describe('automated and manual trip reminders', () => {
    let originalSendText;
    let whatsappSendService;

    beforeEach(() => {
      whatsappSendService = appRequire('../services/whatsappSendService');
      originalSendText = whatsappSendService.sendText;
      whatsappSendService.sendText = async () => ({ sent: true, via: 'mock' });
    });

    afterEach(() => {
      if (originalSendText && whatsappSendService) {
        whatsappSendService.sendText = originalSendText;
      }
    });

    it('sends departure reminder, logs to timeline, and records in remindersSent', async () => {
      const reminderService = appRequire('../services/reminderService');
      const booking = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({
          customerName: 'Rohit Sharma',
          phone: '9876543210',
          email: 'rohit@example.com',
          trip: 'Kashmir Paradise',
          departure: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          paid: 2000,
          pricePerPerson: 5000,
          members: 2,
        }),
        'agent@test.com'
      );

      const res = await reminderService.sendDepartureReminder(tenant.tenantId, booking.bookingId, {
        daysAhead: 1,
        force: true,
      });

      expect(res.success).toBe(true);
      expect(res.record.type).toBe('departure_1day');

      // Verify recorded in DB
      const updated = await bookingService.getBookingById(tenant.tenantId, booking.bookingId);
      expect(updated.remindersSent).toBeDefined();
      expect(updated.remindersSent.length).toBeGreaterThanOrEqual(1);
      expect(updated.remindersSent[0].type).toBe('departure_1day');

      // Verify deduplication: non-forced send today should be skipped
      const dedupRes = await reminderService.sendDepartureReminder(tenant.tenantId, booking.bookingId, {
        daysAhead: 1,
        force: false,
      });
      expect(dedupRes.skipped).toBe(true);

      // Verify follow-up timeline activity logged
      const logs = await bookingService.getFollowUps(tenant.tenantId, booking.bookingId);
      expect(logs.some((l) => l.note.includes('Departure alert'))).toBe(true);
    });

    it('sends payment due reminder when remaining balance exists', async () => {
      const reminderService = appRequire('../services/reminderService');
      const booking = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({
          customerName: 'Sunita Patel',
          phone: '9811223344',
          email: 'sunita@example.com',
          trip: 'Kerala Backwaters',
          pricePerPerson: 8000,
          members: 2,
          paid: 5000, // Remaining: 11000
        }),
        'agent@test.com'
      );

      const res = await reminderService.sendPaymentReminder(tenant.tenantId, booking.bookingId, {
        force: true,
      });

      expect(res.success).toBe(true);
      expect(res.record.type).toBe('payment_due');
      expect(res.record.amountDue).toBe(11000);

      // Verify follow-up timeline activity logged
      const logs = await bookingService.getFollowUps(tenant.tenantId, booking.bookingId);
      expect(logs.some((l) => l.note.includes('Payment reminder of ₹11,000'))).toBe(true);
    });

    it('works for a booking with a hotel, and the timeline note is plain text', async () => {
      // getHotelsByIds did not exist, so any booking with a hotel threw before
      // anything was sent; and the timeline note was stored as a JSON object.
      const reminderService = appRequire('../services/reminderService');
      const hotelRepository = appRequire('../repositories/hotelRepository');
      const hotel = await hotelRepository.createHotel(tenant.tenantId, { name: 'Lake View', city: 'Udaipur' });
      const booking = await bookingService.createBooking(
        tenant.tenantId,
        bookingData({ hotelId: hotel.id, phone: '9876543210' }),
        'agent@test.com'
      );

      const res = await reminderService.sendDepartureReminder(tenant.tenantId, booking.bookingId, {
        daysAhead: 1, channel: 'whatsapp', force: true,
      });
      expect(res.success).toBe(true);

      const logs = await bookingService.getFollowUps(tenant.tenantId, booking.bookingId);
      const note = logs.find((l) => l.note.includes('Departure alert')).note;
      expect(note).toBe('Departure alert (1 day before) sent via WhatsApp.');
    });

    it('sends once when several runs start at the same moment', async () => {
      const reminderService = appRequire('../services/reminderService');
      let sends = 0;
      whatsappSendService.sendText = async () => { sends += 1; return { sent: true }; };
      const booking = await bookingService.createBooking(
        tenant.tenantId, bookingData({ phone: '9876543210' }), 'agent@test.com'
      );

      const results = await Promise.all(
        Array.from({ length: 4 }, () =>
          reminderService.sendDepartureReminder(tenant.tenantId, booking.bookingId, { daysAhead: 3, channel: 'whatsapp' })
        )
      );

      expect(sends).toBe(1);
      expect(results.filter((r) => r.skipped)).toHaveLength(3);
      const updated = await bookingService.getBookingById(tenant.tenantId, booking.bookingId);
      expect(updated.remindersSent.map((r) => r.status)).toEqual(['sent']);
    });

    it('lets a failed reminder be retried the same day', async () => {
      const reminderService = appRequire('../services/reminderService');
      whatsappSendService.sendText = async () => { throw new Error('WhatsApp is not connected'); };
      const booking = await bookingService.createBooking(
        tenant.tenantId, bookingData({ phone: '9876543210' }), 'agent@test.com'
      );

      const first = await reminderService.sendDepartureReminder(tenant.tenantId, booking.bookingId, { daysAhead: 3, channel: 'whatsapp' });
      expect(first.success).toBe(false);

      whatsappSendService.sendText = async () => ({ sent: true });
      const second = await reminderService.sendDepartureReminder(tenant.tenantId, booking.bookingId, { daysAhead: 3, channel: 'whatsapp' });
      expect(second.success).toBe(true);
      expect(second.skipped).toBeUndefined();
    });

    it('finds tomorrow\'s departures by India date and ignores unparseable dates', async () => {
      const tomorrowIst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })
        .format(new Date(Date.now() + 86400000));
      const bookingRepository = appRequire('../repositories/bookingRepository');
      await enableAutoReminders(tenant.tenantId);
      const good = await bookingService.createBooking(
        tenant.tenantId, bookingData({ departure: tomorrowIst, travelStatus: 'Booked' }), 'agent@test.com'
      );
      // Free text used to throw inside DATE() and fail the run for everyone.
      await bookingService.createBooking(tenant.tenantId, bookingData({ departure: '15 Oct' }), 'agent@test.com');

      const rows = await bookingRepository.getUpcomingDepartures(1);
      expect(rows.map((r) => r.booking_id)).toContain(good.bookingId);
    });

    it('escapes customer-entered text in the email', async () => {
      const reminderService = appRequire('../services/reminderService');
      const emailService = appRequire('../services/emailService');
      const originalSendMail = emailService.sendMail;
      let html = '';
      emailService.sendMail = async (mail) => { html = mail.html; return { sent: true }; };
      try {
        const booking = await bookingService.createBooking(
          tenant.tenantId,
          bookingData({ customerName: '<a href="https://evil.test">Pay here</a>', email: 'x@example.com' }),
          'agent@test.com'
        );
        await reminderService.sendDepartureReminder(tenant.tenantId, booking.bookingId, {
          daysAhead: 1, channel: 'email', force: true, customNotes: '<script>x</script>',
        });
      } finally {
        emailService.sendMail = originalSendMail;
      }
      expect(html).not.toContain('<a href="https://evil.test">');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;a href=');
    });

    describe('the automated daily run', () => {
      const tomorrowIst = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })
        .format(new Date(Date.now() + 86400000));

      it('sends nothing for a tenant that has not switched reminders on', async () => {
        const bookingRepository = appRequire('../repositories/bookingRepository');
        const booking = await bookingService.createBooking(
          tenant.tenantId, bookingData({ departure: tomorrowIst(), travelStatus: 'Booked' }), 'agent@test.com'
        );

        const rows = await bookingRepository.getUpcomingDepartures(1);
        expect(rows.map((r) => r.booking_id)).not.toContain(booking.bookingId);
      });

      it('skips trips that are not Booked yet', async () => {
        const bookingRepository = appRequire('../repositories/bookingRepository');
        await enableAutoReminders(tenant.tenantId);
        const booking = await bookingService.createBooking(
          tenant.tenantId, bookingData({ departure: tomorrowIst(), travelStatus: 'Confirming' }), 'agent@test.com'
        );
        await db.query(`UPDATE bookings SET travel_status = 'Confirming' WHERE booking_id = $1`, [booking.bookingId]);

        const rows = await bookingRepository.getUpcomingDepartures(1);
        expect(rows.map((r) => r.booking_id)).not.toContain(booking.bookingId);
      });

      it('skips a tenant whose plan has expired', async () => {
        const reminderService = appRequire('../services/reminderService');
        let sends = 0;
        whatsappSendService.sendText = async () => { sends += 1; return { sent: true }; };
        await enableAutoReminders(tenant.tenantId);
        await bookingService.createBooking(
          tenant.tenantId, bookingData({ departure: tomorrowIst(), phone: '9876543210', email: '', travelStatus: 'Booked' }), 'agent@test.com'
        );
        await db.query(`UPDATE tenants SET plan_expires_at = now() - interval '1 day' WHERE id = $1`, [tenant.tenantId]);

        sends = 0;
        const stats = await reminderService.runDailyRemindersCron();
        expect(sends).toBe(0);
        expect(stats.skippedExpiredPlan).toBeGreaterThanOrEqual(1);
      });

      it('sends for an active tenant that switched it on', async () => {
        const reminderService = appRequire('../services/reminderService');
        let sends = 0;
        whatsappSendService.sendText = async () => { sends += 1; return { sent: true }; };
        await enableAutoReminders(tenant.tenantId);
        await bookingService.createBooking(
          tenant.tenantId, bookingData({ departure: tomorrowIst(), phone: '9876543210', email: '', travelStatus: 'Booked' }), 'agent@test.com'
        );

        sends = 0;
        const stats = await reminderService.runDailyRemindersCron();
        expect(sends).toBe(1);
        expect(stats.oneDayAlerts).toBe(1);
      });
    });
  });
});

async function enableAutoReminders(tenantId) {
  await db.query(
    `INSERT INTO settings (tenant_id, auto_reminders_enabled) VALUES ($1, TRUE)
     ON CONFLICT (tenant_id) DO UPDATE SET auto_reminders_enabled = TRUE`,
    [tenantId]
  );
}
