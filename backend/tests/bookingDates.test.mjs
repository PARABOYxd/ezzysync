import { describe, it, expect } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const bookingService = appRequire('../services/bookingService');
const { createTenant } = helpers;

/**
 * Hotel check-in/out are DATE columns. The pg driver used to turn them into a
 * JS Date at local midnight, and the mapper's .toISOString() then moved them
 * to UTC - one day early on any server east of Greenwich, which is every
 * server in India. The customer's voucher carried the wrong check-in date.
 *
 * Run under TZ=Asia/Kolkata as well as UTC to be meaningful; the date must
 * come back as the same calendar day either way.
 */
describe('booking hotel dates', () => {
  it('reads back the same check-in and check-out day that was saved', async () => {
    const { tenantId } = await createTenant();
    const created = await bookingService.createBooking(tenantId, {
      customerName: 'Date Person', phone: '9876500051', trip: 'Kashmir', departure: '2026-10-28',
      members: 2, pricePerPerson: 10000, travelStatus: 'Confirming',
      hotelCheckIn: '2026-10-28', hotelCheckOut: '2026-10-31',
    }, 'test');

    const stored = await bookingService.getBookingById(tenantId, created.bookingId);
    expect(stored.hotelCheckIn).toBe('2026-10-28');
    expect(stored.hotelCheckOut).toBe('2026-10-31');
  });

  it('keeps the first and last day of a month and a leap day', async () => {
    const { tenantId } = await createTenant();
    for (const [checkIn, checkOut] of [['2026-01-01', '2026-01-31'], ['2028-02-29', '2028-03-01']]) {
      const b = await bookingService.createBooking(tenantId, {
        customerName: 'Edge Dates', phone: `98765${checkIn.replace(/-/g, '').slice(-5)}`, trip: 'Edge', departure: checkIn,
        members: 1, pricePerPerson: 1000, travelStatus: 'Confirming', hotelCheckIn: checkIn, hotelCheckOut: checkOut,
      }, 'test');
      const stored = await bookingService.getBookingById(tenantId, b.bookingId);
      expect([stored.hotelCheckIn, stored.hotelCheckOut]).toEqual([checkIn, checkOut]);
    }
  });
});
