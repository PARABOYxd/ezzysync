import { describe, it, expect, beforeAll } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const express = appRequire('express');
const request = appRequire('supertest');
const { query } = appRequire('../config/db');
const superAdminRoutes = appRequire('../routes/superAdminRoutes');
const userService = appRequire('../services/userService');
const { createTenant, authHeaderFor } = helpers;

/**
 * POST /api/super-admin/tenants creates an agency + ADMIN login without the
 * email OTP, so it must be unreachable for anyone who is not a super admin.
 */
function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/super-admin', superAdminRoutes);
  return a;
}

const uniqueEmail = () => `created_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

let superAdminAuth;
let agencyAdminAuth;

beforeAll(async () => {
  const platform = await createTenant();
  await query('UPDATE users SET is_super_admin = true WHERE id = $1', [platform.userId]);
  superAdminAuth = authHeaderFor(platform);

  const agency = await createTenant();
  agencyAdminAuth = authHeaderFor(agency);
});

describe('POST /api/super-admin/tenants', () => {
  it('creates an agency whose owner can log in with the given password', async () => {
    const email = uniqueEmail();
    const res = await request(app())
      .post('/api/super-admin/tenants')
      .set('Authorization', superAdminAuth)
      .send({ email, password: 'Secret@123', name: 'New Owner', companyName: 'New Travels' });

    expect(res.status).toBe(201);
    expect(res.body.tenant).toMatchObject({ email, name: 'New Owner', role: 'ADMIN', companyName: 'New Travels' });
    expect(res.body.tenant.tenantId).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toMatch(/Secret@123|passwordHash|password_hash/);

    const user = await userService.findUserByEmail(email);
    expect(await userService.verifyPassword(user, 'Secret@123')).toBe(true);
  });

  it('refuses an email that already has an account', async () => {
    const email = uniqueEmail();
    const body = { email, password: 'Secret@123', name: 'Owner', companyName: 'Dup Travels' };
    await request(app()).post('/api/super-admin/tenants').set('Authorization', superAdminAuth).send(body);
    const res = await request(app()).post('/api/super-admin/tenants').set('Authorization', superAdminAuth).send(body);
    expect(res.status).toBe(409);
  });

  it('treats the same email in different case as a duplicate', async () => {
    const email = uniqueEmail();
    await request(app()).post('/api/super-admin/tenants').set('Authorization', superAdminAuth)
      .send({ email, password: 'Secret@123', name: 'Owner', companyName: 'Case Travels' });
    const res = await request(app()).post('/api/super-admin/tenants').set('Authorization', superAdminAuth)
      .send({ email: `  ${email.toUpperCase()} `, password: 'Secret@123', name: 'Owner', companyName: 'Case Travels' });
    expect(res.status).toBe(409);
  });

  it.each([
    ['123456', /at least 8 characters.*uppercase letter.*special character/],
    ['alllowercase1!', /uppercase letter/],
    ['NoDigitsHere!', /a number/],
    ['NoSpecial123', /special character/],
    ['Has Space@123', /no spaces/],
    ['Admin@123', /too common/],
  ])('rejects the weak password %j', async (password, message) => {
    const res = await request(app())
      .post('/api/super-admin/tenants')
      .set('Authorization', superAdminAuth)
      .send({ email: uniqueEmail(), password, name: 'Owner', companyName: 'Weak Travels' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(message);
  });

  it('rejects a password that contains the email name', async () => {
    const res = await request(app())
      .post('/api/super-admin/tenants')
      .set('Authorization', superAdminAuth)
      .send({ email: 'rishabtravels@example.com', password: 'Rishabtravels@1', name: 'Owner', companyName: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/must not contain the email/);
  });

  it('validates the fields and names what is wrong', async () => {
    const res = await request(app())
      .post('/api/super-admin/tenants')
      .set('Authorization', superAdminAuth)
      .send({ email: 'not-an-email', password: '123', name: '', companyName: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field).sort()).toEqual(['email', 'name', 'password']);
  });

  it('is forbidden for a regular agency admin', async () => {
    const res = await request(app())
      .post('/api/super-admin/tenants')
      .set('Authorization', agencyAdminAuth)
      .send({ email: uniqueEmail(), password: 'Secret@123', name: 'X', companyName: 'X' });
    expect(res.status).toBe(403);
  });

  it('requires a session', async () => {
    const res = await request(app())
      .post('/api/super-admin/tenants')
      .send({ email: uniqueEmail(), password: 'Secret@123', name: 'X', companyName: 'X' });
    expect(res.status).toBe(401);
  });
});
