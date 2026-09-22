import { describe, it, expect, afterEach } from 'vitest';
import { appRequire } from './app.mjs';

const express = appRequire('express');
const request = appRequire('supertest');
const env = appRequire('../config/env');
const authRoutes = appRequire('../routes/authRoutes');

/**
 * ENABLE_SELF_SIGNUP gates email registration and Google sign-in together.
 * Off (the default): the EzzySync team creates accounts and visitors can only
 * request access. The flag is read per request, so these flip it in place.
 */
function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/auth', authRoutes);
  return a;
}

const original = env.features.selfSignup;
afterEach(() => { env.features.selfSignup = original; });

describe('self sign-up flag', () => {
  it('is off unless ENABLE_SELF_SIGNUP=true', () => {
    expect(process.env.ENABLE_SELF_SIGNUP === 'true').toBe(original);
  });

  describe('when off', () => {
    it('refuses every registration step with a message saying why', async () => {
      env.features.selfSignup = false;
      for (const path of ['/api/auth/register', '/api/auth/register/send-otp', '/api/auth/register/verify-otp']) {
        const res = await request(app()).post(path).send({ email: 'someone@example.com' });
        expect(res.status, path).toBe(403);
        expect(res.body.code).toBe('SIGNUP_DISABLED');
        expect(res.body.message).toMatch(/request access/i);
      }
    });

    it('sends Google sign-in links back to the login page instead of to Google', async () => {
      env.features.selfSignup = false;
      for (const path of ['/api/auth/google', '/api/auth/google/callback?code=x']) {
        const res = await request(app()).get(path);
        expect(res.status, path).toBe(302);
        expect(res.headers.location).toMatch(/\/login\?error=signup_disabled$/);
      }
    });

    it('still lets existing users log in', async () => {
      env.features.selfSignup = false;
      const res = await request(app()).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrong-password' });
      expect(res.status).toBe(401);
    });
  });

  describe('when on', () => {
    it('lets registration through to its normal validation', async () => {
      env.features.selfSignup = true;
      const res = await request(app()).post('/api/auth/register/send-otp').send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
      expect(res.body.code).not.toBe('SIGNUP_DISABLED');
    });

    it('sends Google sign-in on to Google', async () => {
      env.features.selfSignup = true;
      const res = await request(app()).get('/api/auth/google');
      expect(res.headers.location || '').not.toMatch(/signup_disabled/);
    });
  });
});
