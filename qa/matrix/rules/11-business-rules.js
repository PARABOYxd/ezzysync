/**
 * The invariants the money depends on.
 *
 * Everything else in this suite asks whether the app can be broken from
 * outside. These ask whether it is right when used exactly as intended: does
 * a booking's total match its own line items, does paying twice leave the
 * balance correct, does accepting a quotation twice produce two bookings and
 * therefore bill a customer twice.
 *
 * Each script builds its own records and works only on those, so it can
 * delete what it made and never touches the shared fixtures the rest of the
 * run depends on.
 */
import { makeScriptCase } from '../lib/case.js';
import { SEVERITY } from '../lib/expect.js';

export const name = 'business-rules';
export const description = 'Domain invariants: totals, balances, capacity, conversion, soft deletes and plan limits.';

const num = (v) => (v == null ? null : Number(v));
const idOf = (body, keys) => {
  const o = body?.data || body?.booking || body?.lead || body?.quotation || body?.batch || body;
  for (const k of keys) if (o?.[k] != null) return String(o[k]);
  return null;
};

export function generate(ctx) {
  const cases = [];
  const admin = () => ctx.users.adminA.token;

  cases.push(makeScriptCase({
    rule: name,
    title: 'A booking total equals members x price per person',
    tags: ['bookings', 'money'],
    run: async ({ request, assert }) => {
      const members = 4;
      const pricePerPerson = 12500;
      const res = await request({
        method: 'post', path: '/api/bookings', token: admin(),
        body: {
          customerName: 'QA Total Check', phone: ctx.newPhone(), email: 'qa.total@qa.invalid',
          trip: 'QA Total Trip', departure: '2026-12-08', members, pricePerPerson, travelStatus: 'Booked',
        },
      });
      if (res.status !== 201 && res.status !== 200) {
        assert('booking-created', false, SEVERITY.high, 'A valid booking could not be created, so its totals could not be checked.', { status: res.status, body: res.body });
        return;
      }
      const b = res.body?.data || res.body?.booking || res.body;
      const total = num(b.total_amount ?? b.totalAmount);
      assert('total-matches-line-items', total === members * pricePerPerson, SEVERITY.critical,
        'The stored total does not equal members x price per person. Every invoice, balance and revenue figure derives from this number.',
        { total, expected: members * pricePerPerson });

      const remaining = num(b.remaining);
      const paid = num(b.paid) || 0;
      assert('remaining-is-total-minus-paid', remaining === total - paid, SEVERITY.critical,
        'Remaining does not equal total minus paid on a brand-new booking.',
        { total, paid, remaining });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'Payments add up, and overpayment does not go unnoticed',
    tags: ['bookings', 'payments', 'money'],
    run: async ({ request, assert }) => {
      const created = await request({
        method: 'post', path: '/api/bookings', token: admin(),
        body: {
          customerName: 'QA Payment Check', phone: ctx.newPhone(), email: 'qa.pay@qa.invalid',
          trip: 'QA Payment Trip', departure: '2026-12-09', members: 2, pricePerPerson: 10000, travelStatus: 'Booked',
        },
      });
      const bookingId = idOf(created.body, ['booking_id', 'bookingId', 'id']);
      if (!bookingId) {
        assert('booking-created', false, SEVERITY.high, 'Could not create the booking this check needs.', { status: created.status });
        return;
      }

      await request({ method: 'post', path: `/api/bookings/${bookingId}/payments`, token: admin(), body: { amount: 5000, method: 'Cash' } });
      await request({ method: 'post', path: `/api/bookings/${bookingId}/payments`, token: admin(), body: { amount: 7000, method: 'UPI' } });

      const after = await request({ method: 'get', path: `/api/bookings/${bookingId}`, token: admin() });
      const b = after.body?.data || after.body?.booking || after.body;
      assert('paid-is-sum-of-payments', num(b.paid) === 12000, SEVERITY.critical,
        'The booking\'s paid amount is not the sum of the payments recorded against it.',
        { paid: b.paid, expected: 12000 });
      assert('remaining-follows-payments', num(b.remaining) === num(b.total_amount ?? b.totalAmount) - 12000, SEVERITY.critical,
        'The outstanding balance did not move with the payments.',
        { remaining: b.remaining, total: b.total_amount ?? b.totalAmount });

      const negative = await request({ method: 'post', path: `/api/bookings/${bookingId}/payments`, token: admin(), body: { amount: -5000, method: 'Cash' } });
      assert('negative-payment-refused', negative.status >= 400, SEVERITY.high,
        'A payment of a negative amount was accepted, which silently reduces what a customer has paid with no audit trail of a refund.',
        { status: negative.status });

      const overpay = await request({ method: 'post', path: `/api/bookings/${bookingId}/payments`, token: admin(), body: { amount: 999999, method: 'Cash' } });
      const afterOver = await request({ method: 'get', path: `/api/bookings/${bookingId}`, token: admin() });
      const b2 = afterOver.body?.data || afterOver.body?.booking || afterOver.body;
      assert('overpayment-does-not-corrupt-balance', overpay.status >= 400 || num(b2.remaining) <= 0, SEVERITY.medium,
        'A payment far larger than the balance was accepted and the remaining figure did not settle at or below zero.',
        { status: overpay.status, remaining: b2?.remaining });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'A booking marked Booked cannot be missing the details a voucher needs',
    tags: ['bookings', 'validation'],
    run: async ({ request, assert }) => {
      const missing = await request({
        method: 'post', path: '/api/bookings', token: admin(),
        body: { customerName: 'QA Partial', phone: ctx.newPhone(), travelStatus: 'Booked' },
      });
      assert('booked-requires-full-details', missing.status >= 400, SEVERITY.high,
        'A booking was accepted as Booked without a trip, a departure date, members or a price - the fields every voucher and invoice reads.',
        { status: missing.status });

      const enquiry = await request({
        method: 'post', path: '/api/bookings', token: admin(),
        body: { customerName: 'QA Enquiry', phone: ctx.newPhone(), travelStatus: 'Enquiry' },
      });
      assert('enquiry-allows-partial-details', enquiry.status < 400, SEVERITY.medium,
        'An early-stage enquiry was refused for missing details it is not supposed to have yet, which forces staff to invent data to save a record.',
        { status: enquiry.status, body: enquiry.body });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'Accepting a quotation twice does not produce two bookings',
    tags: ['quotations', 'money', 'idempotency'],
    run: async ({ request, assert }) => {
      const q = await request({
        method: 'post', path: '/api/quotations', token: admin(),
        body: { customerName: 'QA Double Accept', tripName: 'QA Accept Trip', phone: ctx.newPhone(), email: 'qa.accept@qa.invalid', priceQuote: 30000 },
      });
      const qid = idOf(q.body, ['quotation_id', 'quotationId', 'id']);
      if (!qid) {
        assert('quotation-created', false, SEVERITY.high, 'Could not create the quotation this check needs.', { status: q.status });
        return;
      }

      const before = await request({ method: 'get', path: '/api/bookings', token: admin(), query: { limit: 1000 } });
      const countOf = (res) => {
        const rows = Array.isArray(res.body) ? res.body : Object.values(res.body || {}).find(Array.isArray);
        return Array.isArray(rows) ? rows.length : null;
      };

      const first = await request({ method: 'post', path: `/api/quotations/${qid}/accept`, token: admin(), body: {} });
      const second = await request({ method: 'post', path: `/api/quotations/${qid}/accept`, token: admin(), body: {} });
      const after = await request({ method: 'get', path: '/api/bookings', token: admin(), query: { limit: 1000 } });

      const delta = countOf(after) != null && countOf(before) != null ? countOf(after) - countOf(before) : null;
      assert('accept-is-idempotent', delta == null || delta <= 1, SEVERITY.critical,
        'Accepting the same quotation twice created two bookings. The customer is now on the books - and invoiced - twice for one trip.',
        { first: first.status, second: second.status, delta });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'Converting a lead twice does not produce two bookings',
    tags: ['leads', 'idempotency'],
    run: async ({ request, assert }) => {
      const lead = await request({
        method: 'post', path: '/api/leads', token: admin(),
        body: { customerName: 'QA Convert Twice', phone: ctx.newPhone(), email: 'qa.convert@qa.invalid', source: 'Manual' },
      });
      const leadId = idOf(lead.body, ['lead_id', 'leadId', 'id']);
      if (!leadId) {
        assert('lead-created', false, SEVERITY.high, 'Could not create the lead this check needs.', { status: lead.status });
        return;
      }
      const payload = { trip: 'QA Converted', departure: '2026-12-22', members: 2, pricePerPerson: 8000, travelStatus: 'Booked', email: 'qa.convert@qa.invalid' };
      const first = await request({ method: 'post', path: `/api/leads/${leadId}/convert`, token: admin(), body: payload });
      const second = await request({ method: 'post', path: `/api/leads/${leadId}/convert`, token: admin(), body: payload });

      assert('second-conversion-refused', first.status >= 400 || second.status >= 400, SEVERITY.high,
        'The same lead converted to a booking twice, leaving two bookings for one customer and a pipeline that double-counts the revenue.',
        { first: first.status, second: second.status });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'A deleted lead stops appearing and stops being fetchable',
    tags: ['leads', 'soft-delete'],
    run: async ({ request, assert }) => {
      const lead = await request({
        method: 'post', path: '/api/leads', token: admin(),
        body: { customerName: 'QA Delete Me', phone: ctx.newPhone(), source: 'Manual' },
      });
      const leadId = idOf(lead.body, ['lead_id', 'leadId', 'id']);
      if (!leadId) return;

      const del = await request({ method: 'delete', path: `/api/leads/${leadId}`, token: admin() });
      assert('delete-succeeds', del.status < 400, SEVERITY.medium, 'Deleting a lead failed.', { status: del.status });

      const fetched = await request({ method: 'get', path: `/api/leads/${leadId}`, token: admin() });
      assert('deleted-lead-not-fetchable', fetched.status === 404 || fetched.status === 403, SEVERITY.high,
        'A deleted lead is still returned by its own endpoint, so anything holding the id keeps seeing a record the user believes is gone.',
        { status: fetched.status });

      const list = await request({ method: 'get', path: '/api/leads', token: admin(), query: { limit: 1000 } });
      const text = JSON.stringify(list.body || {});
      assert('deleted-lead-not-listed', !text.includes(leadId), SEVERITY.high,
        'A deleted lead is still in the list response.',
        { leadId });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'Batch capacity is enforced when bookings are linked to it',
    tags: ['batches', 'capacity'],
    run: async ({ request, assert }) => {
      const batch = await request({
        method: 'post', path: '/api/batches', token: admin(),
        body: { name: 'QA Tiny Batch', tripName: 'QA Capacity Trip', departureDate: '2026-12-18', totalCapacity: 1, pricePerPerson: 5000 },
      });
      const batchId = idOf(batch.body, ['batch_id', 'batchId', 'id']);
      if (!batchId) {
        assert('batch-created', false, SEVERITY.medium, 'Could not create the batch this check needs.', { status: batch.status });
        return;
      }

      const mk = async (members) => {
        const res = await request({
          method: 'post', path: '/api/bookings', token: admin(),
          body: {
            customerName: 'QA Capacity', phone: ctx.newPhone(), email: 'qa.cap@qa.invalid',
            trip: 'QA Capacity Trip', departure: '2026-12-18', members, pricePerPerson: 5000, travelStatus: 'Booked',
          },
        });
        return idOf(res.body, ['booking_id', 'bookingId', 'id']);
      };

      const one = await mk(1);
      const two = await mk(4);
      if (!one || !two) return;

      const firstLink = await request({ method: 'post', path: `/api/batches/${batchId}/link`, token: admin(), body: { bookingId: one } });
      const overLink = await request({ method: 'post', path: `/api/batches/${batchId}/link`, token: admin(), body: { bookingId: two } });

      assert('first-link-accepted', firstLink.status < 400, SEVERITY.medium,
        'A booking within capacity could not be linked to its batch.', { status: firstLink.status, body: firstLink.body });
      assert('over-capacity-link-refused', overLink.status >= 400, SEVERITY.high,
        'Four more travellers were linked to a batch with one seat left and no confirmation was required. Overselling a fixed-departure tour is not recoverable once the coach is full.',
        { status: overLink.status, body: overLink.body });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'Regenerating the lead-capture key retires the old one',
    tags: ['settings', 'security', 'public-form'],
    run: async ({ request, assert }) => {
      const before = await request({ method: 'get', path: '/api/settings/lead-capture-key', token: admin() });
      const oldKey = before.body?.publicLeadKey || before.body?.key || before.body?.leadCaptureKey;
      if (!oldKey) {
        assert('lead-key-readable', false, SEVERITY.low, 'The lead capture key could not be read, so rotation could not be checked.', { body: before.body });
        return;
      }

      const regen = await request({ method: 'post', path: '/api/settings/lead-capture-key/regenerate', token: admin() });
      assert('regenerate-succeeds', regen.status < 400, SEVERITY.medium, 'Rotating the public lead key failed.', { status: regen.status });

      const withOld = await request({
        method: 'post', path: `/api/public/leads/${encodeURIComponent(oldKey)}`,
        body: { name: 'QA Rotated Key', phone: ctx.newPhone() },
      });
      assert('old-key-stops-working', withOld.status >= 400, SEVERITY.high,
        'A lead-capture key still accepts submissions after being rotated. Rotation is the only remedy when a key leaks, so it has to take effect immediately.',
        { status: withOld.status });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'A completed follow-up moves out of the pending list',
    tags: ['follow-ups'],
    run: async ({ request, assert }) => {
      const bookingId = ctx.res.A.booking;
      if (!bookingId) return;
      const created = await request({
        method: 'post', path: `/api/bookings/${bookingId}/follow-ups`, token: admin(),
        body: { note: 'QA completion check', followUpDate: '2026-11-30' },
      });
      const fid = idOf(created.body, ['id', 'followUpId']);
      if (!fid) {
        assert('follow-up-created', created.status < 400, SEVERITY.medium, 'A follow-up could not be created.', { status: created.status });
        return;
      }

      const done = await request({ method: 'patch', path: `/api/follow-ups/${fid}/done`, token: admin(), body: {} });
      assert('mark-done-succeeds', done.status < 400, SEVERITY.medium, 'Marking a follow-up done failed.', { status: done.status });

      const pending = await request({ method: 'get', path: '/api/follow-ups', token: admin(), query: { limit: 1000 } });
      assert('completed-not-in-pending', !JSON.stringify(pending.body || {}).includes(`"id":${fid}`), SEVERITY.medium,
        'A follow-up marked done is still in the pending list, so the same task is chased twice.',
        { followUpId: fid });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'Team seats are capped by the tenant\'s plan',
    tags: ['plans', 'limits'],
    run: async ({ request, assert }) => {
      const plan = await request({ method: 'get', path: '/api/plans/me', token: admin() });
      const limit = plan.body?.limits?.teamMembers ?? plan.body?.teamMembers ?? null;
      if (limit == null || limit > 25) {
        assert('plan-limit-readable', plan.status < 400, SEVERITY.low,
          'The plan limits endpoint did not report a seat cap that could be tested against.',
          { status: plan.status, limit });
        return;
      }

      let refusedAt = null;
      for (let i = 0; i < limit + 2 && refusedAt == null; i += 1) {
        const res = await request({
          method: 'post', path: '/api/users', token: admin(),
          body: { name: `QA Seat ${i}`, email: `${ctx.uniq('seat')}@qa.invalid`, password: 'QaPassword123', role: 'TEAM_MEMBER' },
        });
        if (res.status === 402 || res.status === 403 || res.status === 409) refusedAt = i;
        else if (res.status >= 400) break;
      }

      assert('seat-limit-enforced', refusedAt != null, SEVERITY.high,
        'More team members were created than the tenant\'s plan allows. A paid limit that the API does not enforce is not a limit.',
        { limit, refusedAt });
    },
  }));

  return { cases, skipped: [] };
}
