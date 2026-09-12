import { describe, it, expect, beforeEach } from 'vitest';
import { db, appRequire, helpers } from './app.mjs';

const { query } = db;
const authController = appRequire('../controllers/authController');
const { requireAuth } = appRequire('../middleware/authMiddleware');
const userService = appRequire('../services/userService');
const tokenService = appRequire('../services/tokenService');
const env = appRequire('../config/env');
const jwt = appRequire('jsonwebtoken');
const { authHeaderFor, resetTenantData, unique } = helpers;

/**
 * Who gets in, and who gets kept out.
 *
 * These reproduce the specific failure modes the code has comments about:
 * bcrypt thrown at with a null hash for Google accounts, a replayed refresh
 * token, a session surviving the user it belonged to being deleted.
 */

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

function regTokenFor({ email, otp, expiryMs = 15 * 60 * 1000 }) {
  return jwt.sign(
    { email: email.toLowerCase(), otp, expiry: new Date(Date.now() + expiryMs).toISOString() },
    env.jwtSecret,
    { expiresIn: '15m' }
  );
}

describe('Auth', () => {
  beforeEach(async () => {
    await resetTenantData();
  });

  describe('register', () => {
    it('creates the account when the OTP matches the token', async () => {
      const email = `${unique('newuser')}@example.com`;
      const otp = '123456';
      const req = {
        body: { email, password: 'CorrectHorse123', name: 'New User', companyName: 'New Co', otp, regToken: regTokenFor({ email, otp }) },
      };
      const res = mockRes();
      await authController.register(req, res, (err) => { throw err; });

      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      expect(res.body.user.email).toBe(email);
    });

    it('rejects a token issued for a different email', async () => {
      const email = `${unique('newuser')}@example.com`;
      const otp = '123456';
      const req = {
        body: { email, password: 'CorrectHorse123', name: 'New User', companyName: 'New Co', otp, regToken: regTokenFor({ email: 'someone-else@example.com', otp }) },
      };
      const res = mockRes();
      await authController.register(req, res, () => {});
      expect(res.statusCode).toBe(400);
    });

    it('rejects the wrong OTP', async () => {
      const email = `${unique('newuser')}@example.com`;
      const req = {
        body: { email, password: 'CorrectHorse123', name: 'New User', companyName: 'New Co', otp: '000000', regToken: regTokenFor({ email, otp: '999999' }) },
      };
      const res = mockRes();
      await authController.register(req, res, () => {});
      expect(res.statusCode).toBe(400);
    });

    it('rejects an expired OTP token', async () => {
      const email = `${unique('newuser')}@example.com`;
      const otp = '123456';
      const req = {
        body: { email, password: 'CorrectHorse123', name: 'New User', companyName: 'New Co', otp, regToken: regTokenFor({ email, otp, expiryMs: -1000 }) },
      };
      const res = mockRes();
      await authController.register(req, res, () => {});
      expect(res.statusCode).toBe(400);
    });

    it('refuses a duplicate email', async () => {
      const email = `${unique('dupe')}@example.com`;
      await userService.createUser({ email, password: 'CorrectHorse123', name: 'First', companyName: 'First Co' });

      const otp = '123456';
      const req = {
        body: { email, password: 'AnotherPass123', name: 'Second', companyName: 'Second Co', otp, regToken: regTokenFor({ email, otp }) },
      };
      const res = mockRes();
      await authController.register(req, res, (err) => { res.status(err.status || 500).json({ message: err.message }); });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('login', () => {
    it('accepts the right password', async () => {
      const email = `${unique('login')}@example.com`;
      await userService.createUser({ email, password: 'CorrectHorse123', name: 'Login User', companyName: 'Co' });

      const res = mockRes();
      await authController.login({ body: { email, password: 'CorrectHorse123' } }, res, () => {});
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeTruthy();
    });

    it('rejects the wrong password without saying which part was wrong', async () => {
      const email = `${unique('login')}@example.com`;
      await userService.createUser({ email, password: 'CorrectHorse123', name: 'Login User', companyName: 'Co' });

      const res = mockRes();
      await authController.login({ body: { email, password: 'WrongPassword' } }, res, () => {});
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBeUndefined();
    });

    it('rejects an email that was never registered', async () => {
      const res = mockRes();
      await authController.login({ body: { email: 'nobody@example.com', password: 'whatever' } }, res, () => {});
      expect(res.statusCode).toBe(401);
    });

    it('points a Google-only account at Google sign-in instead of 500ing on a null hash', async () => {
      const email = `${unique('google')}@example.com`;
      await userService.findOrCreateGoogleUser({ email, name: 'Google User', googleId: unique('gid') });

      const res = mockRes();
      await authController.login({ body: { email, password: 'anything' } }, res, () => {});
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('USE_GOOGLE_SIGNIN');
    });
  });

  describe('refresh token rotation', () => {
    it('issues a new pair and revokes the old refresh token', async () => {
      const email = `${unique('refresh')}@example.com`;
      const user = await userService.createUser({ email, password: 'CorrectHorse123', name: 'R', companyName: 'Co' });
      const { refreshToken } = await tokenService.issueTokenPair(user);

      const res = mockRes();
      await authController.refresh({ body: { refreshToken } }, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.refreshToken).toBeTruthy();
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('refuses a refresh token that was already used once', async () => {
      const email = `${unique('replay')}@example.com`;
      const user = await userService.createUser({ email, password: 'CorrectHorse123', name: 'R', companyName: 'Co' });
      const { refreshToken } = await tokenService.issueTokenPair(user);

      await authController.refresh({ body: { refreshToken } }, mockRes());

      const replay = mockRes();
      await authController.refresh({ body: { refreshToken } }, replay);
      expect(replay.statusCode).toBe(401);
    });

    it('logout revokes the refresh token so a later refresh fails', async () => {
      const email = `${unique('logout')}@example.com`;
      const user = await userService.createUser({ email, password: 'CorrectHorse123', name: 'R', companyName: 'Co' });
      const { refreshToken } = await tokenService.issueTokenPair(user);

      await authController.logout({ body: { refreshToken } }, mockRes());

      const res = mockRes();
      await authController.refresh({ body: { refreshToken } }, res);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('password reset', () => {
    it('stores an OTP that resetPassword accepts, and lets the new password log in', async () => {
      const email = `${unique('forgot')}@example.com`;
      await userService.createUser({ email, password: 'OldPassword123', name: 'F', companyName: 'Co' });

      await authController.forgotPassword({ body: { email } }, mockRes(), () => {});

      const { rows } = await query('SELECT reset_otp FROM users WHERE email = $1', [email]);
      const otp = rows[0].reset_otp;
      expect(otp).toBeTruthy();

      const res = mockRes();
      await authController.resetPassword({ body: { email, otp, newPassword: 'NewPassword456' } }, res, () => {});
      expect(res.statusCode).toBe(200);

      const login = mockRes();
      await authController.login({ body: { email, password: 'NewPassword456' } }, login, () => {});
      expect(login.statusCode).toBe(200);
    });

    it('gives the same generic response for an email that does not exist', async () => {
      const res = mockRes();
      await authController.forgotPassword({ body: { email: 'ghost@example.com' } }, res, () => {});
      expect(res.statusCode).toBe(200);
    });

    it('rejects a wrong OTP', async () => {
      const email = `${unique('badotp')}@example.com`;
      await userService.createUser({ email, password: 'OldPassword123', name: 'F', companyName: 'Co' });
      await authController.forgotPassword({ body: { email } }, mockRes(), () => {});

      const res = mockRes();
      await authController.resetPassword(
        { body: { email, otp: '000000', newPassword: 'NewPassword456' } },
        res,
        (err) => res.status(err.status || 500).json({ message: err.message })
      );
      expect(res.statusCode).toBe(400);
    });

    it('rejects an OTP past its expiry', async () => {
      const email = `${unique('expiredotp')}@example.com`;
      await userService.createUser({ email, password: 'OldPassword123', name: 'F', companyName: 'Co' });
      await authController.forgotPassword({ body: { email } }, mockRes(), () => {});

      await query(`UPDATE users SET reset_otp_expiry = now() - interval '1 hour' WHERE email = $1`, [email]);
      const { rows } = await query('SELECT reset_otp FROM users WHERE email = $1', [email]);

      const res = mockRes();
      await authController.resetPassword(
        { body: { email, otp: rows[0].reset_otp, newPassword: 'NewPassword456' } },
        res,
        (err) => res.status(err.status || 500).json({ message: err.message })
      );
      expect(res.statusCode).toBe(400);
    });
  });

  describe('requireAuth', () => {
    it('trusts tenantId only from the signed token, and refreshes role/permissions from the DB', async () => {
      const { tenantId, userId } = await helpers.createTenant();
      // The token below is signed as TEAM_MEMBER with no permissions at all.
      // requireAuth is supposed to ignore that and re-read both from the DB
      // on every request, so a permission grant takes effect without the
      // team member having to log out and back in.
      const grantedPermissions = { bookings: { create: true, read: true, update: true, delete: true, editPhone: false, viewAll: true } };
      await query(`UPDATE users SET role = 'TEAM_MEMBER', permissions = $1 WHERE id = $2`, [JSON.stringify(grantedPermissions), userId]);

      const req = { headers: { authorization: authHeaderFor({ tenantId, userId, role: 'TEAM_MEMBER', permissions: null }) }, query: {} };
      const res = mockRes();
      let nextCalled = false;
      await requireAuth(req, res, () => { nextCalled = true; });

      expect(nextCalled).toBe(true);
      expect(req.user.tenantId).toBe(tenantId);
      expect(req.user.permissions.bookings).toMatchObject({ delete: true, viewAll: true });
    });

    it('rejects when there is no token at all', async () => {
      const res = mockRes();
      await requireAuth({ headers: {}, query: {} }, res, () => {});
      expect(res.statusCode).toBe(401);
    });

    it('rejects a token signed with the wrong secret', async () => {
      const badToken = jwt.sign({ userId: 'x', tenantId: 'y' }, 'not-the-real-secret');
      const res = mockRes();
      await requireAuth({ headers: { authorization: `Bearer ${badToken}` }, query: {} }, res, () => {});
      expect(res.statusCode).toBe(401);
    });

    it('rejects a valid token whose user has since been deleted', async () => {
      const { tenantId, userId } = await helpers.createTenant();
      const header = authHeaderFor({ tenantId, userId });
      await query('DELETE FROM users WHERE id = $1', [userId]);

      const res = mockRes();
      await requireAuth({ headers: { authorization: header }, query: {} }, res, () => {});
      expect(res.statusCode).toBe(401);
    });
  });
});
