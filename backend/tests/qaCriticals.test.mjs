import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, appRequire, helpers } from './app.mjs';

const { query } = db;
const authController = appRequire('../controllers/authController');
const leadService = appRequire('../services/leadService');
const batchService = appRequire('../services/batchService');
const leadRepository = appRequire('../repositories/leadRepository');
const bookingRepository = appRequire('../repositories/bookingRepository');
const whatsappWebController = appRequire('../controllers/whatsappWebController');
const { isDialablePhone } = appRequire('../services/whatsappSendService');
const { rowToLead } = appRequire('../models/leadSchema');
const { MODULES } = appRequire('../config/permissions');
const emailService = appRequire('../services/emailService');
const otpService = appRequire('../services/otpService');
const jwt = appRequire('jsonwebtoken');
const { createTenant, createChat, resetTenantData, unique } = helpers;

/**
 * Regressions for the eight critical findings the QA matrix (qa/matrix)
 * reported on its first run. Each one was reproduced against a real database
 * before it was fixed; these keep them fixed.
 */

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

describe('QA matrix critical findings', () => {
  beforeEach(async () => {
    await resetTenantData();
  });

  it('logout and refresh answer a non-string refresh token instead of crashing the process', async () => {
    for (const refreshToken of [-1, 0, true, {}, []]) {
      const res = mockRes();
      let passedToNext = null;
      await authController.logout({ body: { refreshToken } }, res, (err) => { passedToNext = err; });
      expect(passedToNext).toBeNull();
      expect(res.body).toEqual({ message: 'Logged out.' });

      const refreshRes = mockRes();
      await authController.refresh({ body: { refreshToken } }, refreshRes);
      expect([400, 401]).toContain(refreshRes.statusCode);
    }
  });

  it('registration never skips the OTP check for a falsy verification token', async () => {
    for (const regToken of [0, false, '0', ' ']) {
      const email = `${unique('bypass')}@example.com`;
      const res = mockRes();
      await authController.register(
        { body: { email, password: 'CorrectHorse123', name: 'X', companyName: 'X Co', otp: '123456', regToken } },
        res,
        (err) => { throw err; }
      );
      expect(res.statusCode).toBe(400);
      const { rows } = await query('SELECT 1 FROM users WHERE email = $1', [email]);
      expect(rows).toHaveLength(0);
    }
  });

  it('refuses a follow-up date Postgres would store as infinity, and survives one already stored', async () => {
    const { tenantId } = await createTenant();
    for (const bad of ['Infinity', '-infinity', 'epoch', 'not-a-date', 12345]) {
      await expect(
        leadService.createLead(tenantId, { customerName: 'QA', phone: '9876500001', nextFollowUpDate: bad }, 'test')
      ).rejects.toMatchObject({ status: 400 });
    }
    expect(rowToLead({ lead_id: 'LD-1', next_follow_up_date: Infinity }).nextFollowUpDate).toBeNull();

    const ok = await leadService.createLead(tenantId, { customerName: 'QA', phone: '9876500002', nextFollowUpDate: '2026-12-01' }, 'test');
    expect(ok.nextFollowUpDate).toBe(new Date('2026-12-01').toISOString());
  });

  it('creates a tour batch on a freshly migrated database', async () => {
    const { tenantId } = await createTenant();
    const batch = await batchService.createBatch(
      tenantId,
      { name: 'Dec batch', tripName: 'Goa', departureDate: '2026-12-10', totalCapacity: 10 },
      'test'
    );
    expect(batch.batchId).toMatch(/^TB-\d+$/);
  });

  it('every permission a router asks for exists in the permission matrix', () => {
    const routesDir = path.resolve(import.meta.dirname, '..', 'routes');
    const unknown = [];
    for (const file of fs.readdirSync(routesDir)) {
      const src = fs.readFileSync(path.join(routesDir, file), 'utf8');
      for (const [, mod, action] of src.matchAll(/requirePermission\(\s*['"](\w+)['"]\s*,\s*['"](\w+)['"]\s*\)/g)) {
        if (!MODULES[mod]?.includes(action)) unknown.push(`${file}: ${mod}.${action}`);
      }
      expect(src).not.toMatch(/permissions.canManageSettings/);
    }
    expect(unknown).toEqual([]);
  });

  it('only opens a WhatsApp chat for a number that can be dialled', () => {
    for (const bad of ['not-a-phone', '12', '1234567890123456789012345', '@@@@@@@@', 9876543210, "9999999999' OR 1=1 --"]) {
      expect(isDialablePhone(bad)).toBe(false);
    }
    for (const good of ['9876543210', '+91 98765 43210', '919876543210']) {
      expect(isDialablePhone(good)).toBe(true);
    }
  });

  it('a deleted lead can no longer be fetched or followed up', async () => {
    const { tenantId } = await createTenant();
    const lead = await leadService.createLead(tenantId, { customerName: 'QA', phone: '9876500003' }, 'test');
    await leadService.softDeleteLead(tenantId, lead.leadId, 'test');

    expect(await leadService.getLeadById(tenantId, lead.leadId)).toBeNull();
    await expect(
      leadRepository.insertFollowUp(tenantId, lead.leadId, 'note', 'note', null, 'test')
    ).rejects.toMatchObject({ status: 404 });
  });

  it("another tenant's lead, booking or chat is a 404, not a 500 or a false success", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const leadB = await leadService.createLead(b.tenantId, { customerName: 'B', phone: '9876500004' }, 'test');

    await expect(
      leadRepository.insertFollowUp(a.tenantId, leadB.leadId, 'note', 'note', null, 'test')
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      bookingRepository.insertFollowUp(a.tenantId, 'BK-not-yours', 'note', 'note', null, 'test')
    ).rejects.toMatchObject({ status: 404 });

    const chatB = await createChat(b.tenantId, { phone: '919876500005' });
    const res = mockRes();
    await whatsappWebController.toggleChatAi(
      { params: { chatId: chatB.id }, body: { enabled: true }, user: { tenantId: a.tenantId, userId: a.userId } },
      res,
      (err) => { throw err; }
    );
    expect(res.statusCode).toBe(404);
    const { rows } = await query('SELECT ai_enabled FROM whatsapp_chats WHERE id = $1', [chatB.id]);
    expect(rows[0].ai_enabled).toBe(false);
  });

  it('the registration token handed to the browser does not contain the code', async () => {
    let emailedOtp = null;
    const spy = vi.spyOn(emailService, 'sendRegistrationOTPEmail').mockImplementation(async ({ otp }) => { emailedOtp = otp; });
    try {
      const email = `${unique('otp')}@example.com`;
      const res = mockRes();
      await authController.sendRegistrationOTP({ body: { email } }, res, (err) => { throw err; });

      expect(res.statusCode).toBe(200);
      const payload = jwt.decode(res.body.regToken);
      expect(payload.otp).toBeUndefined();
      expect(Object.values(payload).map(String)).not.toContain(emailedOtp);

      // Only the emailed code completes the flow.
      const wrong = mockRes();
      await authController.verifyRegistrationOTP({ body: { email, otp: emailedOtp === '123456' ? '654321' : '123456', regToken: res.body.regToken } }, wrong);
      expect(wrong.statusCode).toBe(400);
      const right = mockRes();
      await authController.verifyRegistrationOTP({ body: { email, otp: emailedOtp, regToken: res.body.regToken } }, right);
      expect(right.statusCode).toBe(200);

      // An old-style token that carries the code in clear is no longer honoured.
      const legacy = jwt.sign({ email, otp: '111111', expiry: new Date(Date.now() + 60000).toISOString() }, appRequire('../config/env').jwtSecret);
      const legacyRes = mockRes();
      await authController.verifyRegistrationOTP({ body: { email, otp: '111111', regToken: legacy } }, legacyRes);
      expect(legacyRes.statusCode).toBe(400);
    } finally {
      spy.mockRestore();
    }
  });

  it('a digest for one address does not verify another', () => {
    const digest = otpService.registrationOtpDigest('a@example.com', '123456');
    expect(otpService.registrationOtpMatches('a@example.com', '123456', digest)).toBe(true);
    expect(otpService.registrationOtpMatches('b@example.com', '123456', digest)).toBe(false);
    expect(otpService.registrationOtpMatches('a@example.com', '123457', digest)).toBe(false);
    expect(otpService.registrationOtpMatches('a@example.com', '123456', 'short')).toBe(false);
  });
});
