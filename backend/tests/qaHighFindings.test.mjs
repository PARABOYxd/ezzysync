import { describe, it, expect, beforeEach } from 'vitest';
import { db, appRequire, helpers } from './app.mjs';

const { query } = db;
const leadController = appRequire('../controllers/leadController');
const leadService = appRequire('../services/leadService');
const leadImportController = appRequire('../controllers/leadImportController');
const dashboardController = appRequire('../controllers/dashboardController');
const { errorHandler } = appRequire('../middleware/errorHandler');
const { flattenQuery } = appRequire('../middleware/flattenQuery');
const { pageParams } = appRequire('../utils/pagination');
const { withoutProtectedFields } = appRequire('../utils/protectedFields');
const { createTenant, resetTenantData } = helpers;

/**
 * Regressions for the high-severity findings from the QA matrix's second
 * pass. Most were a 500 where the request was simply wrong; one - deleting a
 * lead through its update route - was a permission bypass.
 */

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

describe('QA matrix high findings', () => {
  beforeEach(async () => {
    await resetTenantData();
  });

  it('an update cannot delete a lead, even when the body says deleted: true', async () => {
    const { tenantId, userId } = await createTenant();
    const lead = await leadService.createLead(tenantId, { customerName: 'QA', phone: '9876511111' }, 'test');

    const res = mockRes();
    await leadController.update(
      { params: { id: lead.leadId }, body: { deleted: true, tenantId: 'x', notes: 'kept' }, user: { tenantId, userId, role: 'TEAM_MEMBER', name: 'Agent' } },
      res,
      (err) => { throw err; }
    );
    expect(res.statusCode).toBe(200);
    const after = await leadService.getLeadById(tenantId, lead.leadId);
    expect(after).not.toBeNull();
    expect(after.notes).toBe('kept');
    const { rows } = await query('SELECT deleted FROM leads WHERE lead_id = $1', [lead.leadId]);
    expect(rows[0].deleted).toBe(false);
  });

  it('protected fields are stripped, prototype keys included', () => {
    const body = JSON.parse('{"deleted":true,"tenant_id":"t","name":"ok","__proto__":{"x":1}}');
    expect(withoutProtectedFields(body)).toEqual({ name: 'ok' });
    expect(withoutProtectedFields(null)).toEqual({});
    expect(withoutProtectedFields([1, 2])).toEqual({});
  });

  it('page and page size are always within bounds', () => {
    expect(pageParams({ page: '-3', limit: '-10' })).toEqual({ page: 1, limit: 10 });
    expect(pageParams({ page: 'abc', limit: '99999999' })).toEqual({ page: 1, limit: 500 });
    expect(pageParams({ page: '2', limit: '150' })).toEqual({ page: 2, limit: 150 });
  });

  it('a repeated or nested query parameter arrives as one string', () => {
    const req = { query: { search: ['a', 'b'], limit: '5', nested: { x: '1' }, weird: [{}] } };
    flattenQuery(req, {}, () => {});
    expect(req.query).toEqual({ search: 'b', limit: '5' });
  });

  it('a NUL byte, an oversized number or a bad date is a 400, not a 500', () => {
    for (const code of ['22021', '22003', '22007', '22008', '2201W', '2201X']) {
      const res = mockRes();
      res.getHeader = () => null;
      errorHandler(Object.assign(new Error('pg'), { code }), { method: 'POST', originalUrl: '/x' }, res, () => {});
      expect(res.statusCode).toBe(400);
    }
  });

  it('a lead import with no column mapping is refused, not crashed on', async () => {
    const res = mockRes();
    await leadImportController.analyze(
      { body: { rows: [['A', '9876500000']] }, user: { tenantId: 'x' } },
      res,
      (err) => { throw err; }
    );
    expect(res.statusCode).toBe(400);
  });

  it('billing analytics refuses a date range it cannot read', async () => {
    const { tenantId, userId } = await createTenant();
    const res = mockRes();
    await dashboardController.getBillingAnalytics(
      { query: { startDate: 'not-a-date' }, user: { tenantId, userId, role: 'ADMIN' } },
      res,
      (err) => { throw err; }
    );
    expect(res.statusCode).toBe(400);
  });

  it('an enquiry booking can be saved before the trip and date are known', async () => {
    const { tenantId } = await createTenant();
    const bookingService = appRequire('../services/bookingService');
    const booking = await bookingService.createBooking(
      tenantId, { customerName: 'QA Enquiry', phone: '9876522222', travelStatus: 'Enquiry' }, 'test'
    );
    expect(booking.travelStatus).toBe('Enquiry');
  });

  describe('booking payments go through the ledger', () => {
    const bookingService = appRequire('../services/bookingService');
    const bookingController = appRequire('../controllers/bookingController');

    async function newBooking(tenantId, extra = {}) {
      return bookingService.createBooking(tenantId, {
        customerName: 'QA Ledger', phone: '9876533333', email: 'qa@example.com',
        trip: 'Goa', departure: '2026-12-01', members: 2, pricePerPerson: 10000, travelStatus: 'Booked', ...extra,
      }, 'test');
    }

    it('an update cannot set the paid amount directly', async () => {
      const { tenantId, userId } = await createTenant();
      const booking = await newBooking(tenantId);

      const res = mockRes();
      await bookingController.update(
        { params: { id: booking.bookingId }, body: { paid: 20000, remaining: 0, notes: 'edited' }, user: { tenantId, userId, role: 'ADMIN', name: 'Admin' } },
        res,
        (err) => { throw err; }
      );
      expect(res.statusCode).toBe(200);
      const after = await bookingService.getBookingById(tenantId, booking.bookingId);
      expect(after.paid).toBe(0);
      expect(after.remaining).toBe(20000);
      expect(after.notes).toBe('edited');
    });

    it('payments recorded at the same moment are all counted', async () => {
      const { tenantId } = await createTenant();
      const booking = await newBooking(tenantId);

      // Open enough pool connections first. Otherwise each call waits for a
      // fresh connection and they end up running one after another by
      // accident, which hides the race this test is about.
      await Promise.all(Array.from({ length: 6 }, () => query('SELECT pg_sleep(0.05)')));

      await Promise.all([1000, 2000, 3000, 4000, 5000].map((amount) =>
        bookingService.addPayment(tenantId, booking.bookingId, { amount, method: 'Cash', createdBy: 'test' })
      ));

      const after = await bookingService.getBookingById(tenantId, booking.bookingId);
      expect(after.paid).toBe(15000);
      expect(after.remaining).toBe(5000);
      const { rows } = await query(
        'SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM booking_payments bp JOIN bookings b ON b.id = bp.booking_id WHERE b.booking_id = $1',
        [booking.bookingId]
      );
      expect(Number(rows[0].total)).toBe(15000);
    });

    it('an advance at creation cannot be negative', async () => {
      const { tenantId } = await createTenant();
      await expect(newBooking(tenantId, { paid: -5000 })).rejects.toMatchObject({ status: 400 });
    });
  });
});
