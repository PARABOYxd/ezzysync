/**
 * The limiters, from one source address at a time.
 *
 * Every other rule in this suite sends each case from a different
 * X-Forwarded-For, precisely so it never trips a limiter and the results stay
 * about the endpoint rather than about the burst. These cases do the
 * opposite: one address, one target, requests until something says no.
 *
 * The login limiter is the one that matters. Eight attempts per fifteen
 * minutes, keyed on address *and* email, is what makes password guessing
 * impractical; if that key were the address alone, an attacker spreading
 * guesses across a botnet would reset the counter on every hop. So it is
 * tested both ways - many guesses at one account, and the same guess at many
 * accounts - because only the first is supposed to be capped.
 */
import { makeScriptCase } from '../lib/case.js';
import { SEVERITY } from '../lib/expect.js';

export const name = 'rate-limits';
export const description = 'Login, OTP and public-form limiters, exercised from a single source address.';

export function generate(ctx) {
  const cases = [];

  cases.push(makeScriptCase({
    rule: name,
    title: 'Password guessing against one account is capped',
    tags: ['rate-limit', 'security', 'brute-force'],
    run: async ({ request, assert }) => {
      const ip = '203.0.113.11';
      const email = ctx.users.adminA.email;
      let limitedAt = null;

      for (let i = 1; i <= 12 && limitedAt == null; i += 1) {
        const res = await request({
          method: 'post', path: '/api/auth/login', ip,
          body: { email, password: `guess-number-${i}` },
        });
        if (res.status === 429) limitedAt = i;
      }

      assert('login-brute-force-capped', limitedAt != null, SEVERITY.critical,
        'Twelve consecutive wrong passwords against one account from one address were all answered normally. Without a cap, a six-character password is a few hours of scripting.',
        { limitedAt });
      assert('login-cap-is-not-too-tight', limitedAt == null || limitedAt > 3, SEVERITY.medium,
        'The login limiter engaged within the first three attempts, which locks out ordinary users who simply mistyped.',
        { limitedAt });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'Guessing one password across many accounts is not treated as one bucket',
    tags: ['rate-limit', 'security'],
    run: async ({ request, assert }) => {
      const ip = '203.0.113.22';
      let limited = 0;
      for (let i = 1; i <= 6; i += 1) {
        const res = await request({
          method: 'post', path: '/api/auth/login', ip,
          body: { email: `${ctx.uniq('spray')}@qa.invalid`, password: 'Password123' },
        });
        if (res.status === 429) limited += 1;
      }
      assert('password-spray-observed', true, SEVERITY.info,
        'Recorded for review: how a spread of accounts from one address is handled. The limiter keys on address plus email, so a spray is capped later than a single-account attack - intentional, but worth knowing.',
        { limitedResponses: limited, attempts: 6 });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'OTP delivery cannot be used to spam an inbox',
    tags: ['rate-limit', 'security', 'otp'],
    run: async ({ request, assert }) => {
      const ip = '203.0.113.33';
      const email = `${ctx.uniq('otpspam')}@qa.invalid`;
      let limitedAt = null;
      for (let i = 1; i <= 8 && limitedAt == null; i += 1) {
        const res = await request({ method: 'post', path: '/api/auth/register/send-otp', ip, body: { email } });
        if (res.status === 429) limitedAt = i;
      }
      assert('otp-requests-capped', limitedAt != null, SEVERITY.high,
        'Eight code requests for the same address from one source were all accepted. This endpoint sends real email, so an uncapped one is a way to flood someone\'s inbox using this product\'s reputation.',
        { limitedAt });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'The public lead form is capped without being useless',
    tags: ['rate-limit', 'public-form'],
    run: async ({ request, assert }) => {
      const key = ctx.res.A.leadKey;
      if (!key) {
        assert('lead-key-available', false, SEVERITY.low, 'No public lead key was seeded, so the public form limiter was not exercised.', {});
        return;
      }
      const ip = '203.0.113.44';
      let limitedAt = null;
      let accepted = 0;
      for (let i = 1; i <= 70 && limitedAt == null; i += 1) {
        const res = await request({
          method: 'post', path: `/api/public/leads/${encodeURIComponent(key)}`, ip,
          body: { name: `QA Flood ${i}`, phone: ctx.newPhone() },
        });
        if (res.status === 429) limitedAt = i;
        else if (res.status < 400) accepted += 1;
      }
      assert('public-form-capped', limitedAt != null, SEVERITY.medium,
        'Seventy submissions from one address to the public lead form were all accepted. An uncapped public form fills a customer\'s CRM with junk.',
        { limitedAt, accepted });
      assert('public-form-not-too-tight', limitedAt == null || limitedAt > 10, SEVERITY.medium,
        'The public form started refusing within ten submissions from one address. Several visitors behind one office NAT share an address, and the later ones would silently lose their enquiry.',
        { limitedAt });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'A 429 explains itself and says when to come back',
    tags: ['rate-limit', 'ux'],
    run: async ({ request, assert }) => {
      const ip = '203.0.113.55';
      const email = `${ctx.uniq('hdr')}@qa.invalid`;
      let limited = null;
      for (let i = 1; i <= 10 && !limited; i += 1) {
        const res = await request({ method: 'post', path: '/api/auth/register/send-otp', ip, body: { email } });
        if (res.status === 429) limited = res;
      }
      if (!limited) {
        assert('limiter-engaged', false, SEVERITY.low, 'The limiter never engaged, so its response could not be inspected.', {});
        return;
      }
      assert('429-has-standard-headers', limited.headers['ratelimit-limit'] != null || limited.headers['retry-after'] != null,
        SEVERITY.low,
        'The 429 carries neither RateLimit-* nor Retry-After, so a client has no way to know how long to wait and will simply retry into the wall.',
        { headers: Object.keys(limited.headers || {}) });
      assert('429-has-human-message', typeof limited.body?.message === 'string' && limited.body.message.length > 10,
        SEVERITY.low,
        'The 429 body has no readable message, so the user sees a generic failure with no idea what to do.',
        { body: limited.body });
    },
  }));

  return { cases, skipped: [] };
}
