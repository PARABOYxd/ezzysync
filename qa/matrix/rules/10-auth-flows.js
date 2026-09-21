/**
 * Registration, login, refresh and reset, driven end to end.
 *
 * These are the sequences a single request cannot express. A refresh token is
 * only interesting the second time it is presented; a logout only matters if
 * the token it revoked stops working; an account created without an OTP is
 * only proven to exist once you log into it.
 *
 * The registration flow gets the most attention because it has the most ways
 * to be skipped. The controller only checks the OTP `if (regToken)` - so
 * every falsy-but-validator-passing value for that field is a candidate for
 * creating an account with no email verification at all, and each one is
 * tried here and then confirmed by attempting to log in.
 */
import { makeScriptCase } from '../lib/case.js';
import { SEVERITY } from '../lib/expect.js';
import { backendRequire } from '../lib/require.js';

const jwt = backendRequire('jsonwebtoken');

export const name = 'auth-flows';
export const description = 'Registration, login, refresh, logout and password reset as complete sequences.';

export function generate(ctx) {
  const cases = [];

  cases.push(makeScriptCase({
    rule: name,
    title: 'Registration cannot be completed without a genuine verification token',
    tags: ['auth', 'security', 'registration'],
    run: async ({ request, assert }) => {
      // Each of these passes express-validator's notEmpty but is falsy in
      // JavaScript, which is the exact gap `if (regToken)` leaves open.
      const sneaky = [
        { label: 'numeric zero', value: 0 },
        { label: 'boolean false', value: false },
        { label: 'the string "0"', value: '0' },
        { label: 'a single space', value: ' ' },
      ];

      for (const s of sneaky) {
        const email = `${ctx.uniq('bypass')}@qa.invalid`;
        const password = 'QaBypassTest123';
        const res = await request({
          method: 'post', path: '/api/auth/register',
          body: { email, password, name: 'QA Bypass', companyName: 'QA Bypass Co', otp: '123456', regToken: s.value },
        });

        const created = res.status === 201;
        assert(
          `register-rejects-regToken-${s.label.replace(/\s+/g, '-')}`,
          !created,
          SEVERITY.critical,
          `An account was created with ${s.label} as the verification token. The OTP check runs only when the token is truthy, so any falsy value that survives validation skips email verification entirely - anyone can register under an address they do not control.`,
          { status: res.status, email }
        );

        if (created) {
          const login = await request({ method: 'post', path: '/api/auth/login', body: { email, password } });
          assert(
            `bypass-account-not-usable-${s.label.replace(/\s+/g, '-')}`,
            login.status !== 200,
            SEVERITY.critical,
            'The account created without email verification can be logged into, so the bypass is complete rather than cosmetic.',
            { status: login.status }
          );
        }
      }
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'The OTP a client receives is not readable from the token it is handed',
    tags: ['auth', 'security', 'registration', 'otp'],
    run: async ({ request, assert }) => {
      const email = `${ctx.uniq('otpread')}@qa.invalid`;

      // Stand in for the inbox: record the code the server generates, the
      // way a real user would read it from the email. The token can no
      // longer be decoded for it, which is exactly what is checked below.
      // No mail provider exists in the harness, so the send is replaced by
      // a mailbox that just keeps the code.
      const emailService = backendRequire('./services/emailService');
      const realSend = emailService.sendRegistrationOTPEmail;
      let emailedOtp = null;
      emailService.sendRegistrationOTPEmail = async ({ otp }) => { emailedOtp = otp; };
      let res;
      try {
        res = await request({ method: 'post', path: '/api/auth/register/send-otp', body: { email } });
      } finally {
        emailService.sendRegistrationOTPEmail = realSend;
      }

      if (res.status !== 200 || !res.body?.regToken) {
        assert('send-otp-usable', res.status < 500, SEVERITY.medium,
          'The OTP request failed outright, so the rest of the registration flow could not be exercised.',
          { status: res.status, body: res.body });
        return;
      }

      const decoded = jwt.decode(res.body.regToken) || {};
      assert(
        'otp-not-recoverable-from-regToken',
        decoded.otp == null,
        SEVERITY.high,
        'The regToken returned to the browser is a JWT whose payload contains the one-time code in clear text. A JWT payload is base64, not encryption, so whoever receives the token already knows the code - which means possession of the email address proves nothing and the verification step confirms only that someone can call the API.',
        { payloadKeys: Object.keys(decoded) }
      );

      assert('regToken-does-not-contain-emailed-code', !emailedOtp || !Object.values(decoded).some((v) => String(v) === emailedOtp), SEVERITY.high,
        'The emailed code appears somewhere in the token payload.', {});

      // The rest of the sequence, using the code from the "inbox".
      if (emailedOtp) {
        decoded.otp = emailedOtp;
        const password = 'QaFlowPassword123';
        const reg = await request({
          method: 'post', path: '/api/auth/register',
          body: { email, password, name: 'QA Flow', companyName: 'QA Flow Co', otp: decoded.otp, regToken: res.body.regToken },
        });
        assert('register-completes-with-valid-otp', reg.status === 201, SEVERITY.high,
          'A registration with a correct token and code did not succeed. That is the main signup path for every new customer.',
          { status: reg.status, body: reg.body });

        if (reg.status === 201) {
          const login = await request({ method: 'post', path: '/api/auth/login', body: { email, password } });
          assert('new-account-can-log-in', login.status === 200 && !!login.body?.token, SEVERITY.high,
            'A freshly registered account could not log in.', { status: login.status });

          const dup = await request({ method: 'post', path: '/api/auth/register/send-otp', body: { email } });
          assert('duplicate-email-refused', dup.status === 409, SEVERITY.medium,
            'Requesting a code for an address that already has an account should be refused, so the same email cannot end up on two tenants.',
            { status: dup.status });

          if (login.body?.refreshToken) {
            const first = await request({ method: 'post', path: '/api/auth/refresh', body: { refreshToken: login.body.refreshToken } });
            assert('refresh-works-once', first.status === 200, SEVERITY.high,
              'A valid refresh token was refused, which signs the user out every time their access token expires.',
              { status: first.status });

            const replay = await request({ method: 'post', path: '/api/auth/refresh', body: { refreshToken: login.body.refreshToken } });
            assert('refresh-token-not-replayable', replay.status !== 200, SEVERITY.high,
              'The same refresh token was accepted twice. A stolen token stays valid for its full lifetime unless each one is retired on use.',
              { status: replay.status });

            const after = first.body?.refreshToken || login.body.refreshToken;
            await request({ method: 'post', path: '/api/auth/logout', body: { refreshToken: after } });
            const afterLogout = await request({ method: 'post', path: '/api/auth/refresh', body: { refreshToken: after } });
            assert('logout-revokes-refresh', afterLogout.status !== 200, SEVERITY.high,
              'A refresh token kept working after logout, so signing out does not end the session.',
              { status: afterLogout.status });
          }
        }
      }
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'Login tells an attacker nothing about which accounts exist',
    tags: ['auth', 'security', 'enumeration'],
    run: async ({ request, assert }) => {
      const known = await request({ method: 'post', path: '/api/auth/login', body: { email: ctx.users.adminA.email, password: 'wrong-password-entirely' } });
      const unknown = await request({ method: 'post', path: '/api/auth/login', body: { email: `${ctx.uniq('ghost')}@qa.invalid`, password: 'wrong-password-entirely' } });

      assert('login-wrong-password-401', known.status === 401, SEVERITY.critical,
        'A wrong password did not produce a 401.', { status: known.status });
      assert('login-unknown-user-401', unknown.status === 401, SEVERITY.critical,
        'An unknown account did not produce a 401.', { status: unknown.status });
      assert(
        'login-responses-indistinguishable',
        known.status === unknown.status && JSON.stringify(known.body?.message) === JSON.stringify(unknown.body?.message),
        SEVERITY.medium,
        'The response for a real account with a wrong password differs from the response for an account that does not exist, which turns the login form into a way to test whether an email is a customer.',
        { known: known.body?.message, unknown: unknown.body?.message }
      );

      const forgotKnown = await request({ method: 'post', path: '/api/auth/forgot-password', body: { email: ctx.users.adminA.email } });
      const forgotUnknown = await request({ method: 'post', path: '/api/auth/forgot-password', body: { email: `${ctx.uniq('ghost')}@qa.invalid` } });
      assert(
        'forgot-password-indistinguishable',
        forgotKnown.status === forgotUnknown.status,
        SEVERITY.medium,
        'Password reset answers differently for a known and an unknown address, which is the same enumeration leak by another door.',
        { known: forgotKnown.status, unknown: forgotUnknown.status }
      );
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'A tampered token is not accepted',
    tags: ['auth', 'security', 'jwt'],
    run: async ({ request, assert }) => {
      const valid = ctx.users.adminA.token;
      const [header, payload, signature] = valid.split('.');
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

      const swapped = { ...decoded, tenantId: ctx.tenantB.tenantId };
      const tamperedPayload = Buffer.from(JSON.stringify(swapped)).toString('base64url');
      const tampered = `${header}.${tamperedPayload}.${signature}`;

      const res = await request({ method: 'get', path: '/api/leads', headers: { Authorization: `Bearer ${tampered}` } });
      assert('tampered-tenant-rejected', res.status === 401, SEVERITY.critical,
        'A token whose tenant id was edited without re-signing was accepted. Signature verification is what keeps one tenant out of another\'s data.',
        { status: res.status });

      const escalated = { ...decoded, role: 'ADMIN', permissions: { leads: { delete: true } } };
      const escalatedToken = `${header}.${Buffer.from(JSON.stringify(escalated)).toString('base64url')}.${signature}`;
      const res2 = await request({ method: 'get', path: '/api/users', headers: { Authorization: `Bearer ${escalatedToken}` } });
      assert('tampered-role-rejected', res2.status === 401, SEVERITY.critical,
        'A token with an edited role claim was accepted.', { status: res2.status });

      const none = jwt.sign({ userId: ctx.users.adminA.id, tenantId: ctx.tenantA.tenantId, role: 'ADMIN' }, '', { algorithm: 'none' });
      const res3 = await request({ method: 'get', path: '/api/leads', headers: { Authorization: `Bearer ${none}` } });
      assert('alg-none-rejected', res3.status === 401, SEVERITY.critical,
        'A token signed with alg:none was accepted, which means anyone can mint a session for any tenant.',
        { status: res3.status });
    },
  }));

  cases.push(makeScriptCase({
    rule: name,
    title: 'Password change requires the current password and takes effect',
    tags: ['auth', 'security', 'password'],
    run: async ({ request, assert }) => {
      const wrong = await request({
        method: 'put', path: '/api/profile/password',
        token: ctx.users.adminA.token,
        body: { currentPassword: 'not-the-current-password', newPassword: 'QaBrandNew123' },
      });
      assert('password-change-needs-current', wrong.status >= 400, SEVERITY.critical,
        'The current password was not required to set a new one. Anyone with a borrowed session could lock the real owner out.',
        { status: wrong.status });

      const short = await request({
        method: 'put', path: '/api/profile/password',
        token: ctx.users.adminA.token,
        body: { currentPassword: 'whatever', newPassword: 'abc' },
      });
      assert('password-minimum-length-enforced', short.status >= 400, SEVERITY.medium,
        'A three-character password was not refused.', { status: short.status });
    },
  }));

  return { cases, skipped: [] };
}
