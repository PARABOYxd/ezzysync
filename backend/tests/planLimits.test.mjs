import { describe, it, expect } from 'vitest';
import { appRequire, helpers, db } from './app.mjs';

const express = appRequire('express');
const request = appRequire('supertest');
const planService = appRequire('../services/planService');
const aiUsageService = appRequire('../services/aiUsageService');
const aiPolicy = appRequire('../services/whatsappAiPolicy');
const { requireAiAllowance } = appRequire('../middleware/planMiddleware');
const { createTenant, createUser } = helpers;
const { query } = db;

/**
 * What each plan is sold as, enforced:
 *   Solo  ₹999   - every feature, 1 login (the owner), 500 AI actions a month
 *   Growth ₹2,499 - every feature, up to 5 logins, 2,000 AI actions a month
 *   Trial        - everything, up to 5 logins, 500 AI actions
 *   Lapsed FREE  - nothing
 * Bookings and leads are unlimited on both paid plans.
 */

async function setUsed(tenantId, used) {
  await query(
    `INSERT INTO ai_usage_monthly (tenant_id, period, used) VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, period) DO UPDATE SET used = EXCLUDED.used`,
    [tenantId, aiUsageService.currentPeriod(), used]
  );
}

describe('plan limits', () => {
  describe('Solo (₹999)', () => {
    it('is the owner alone: no team member can be added', async () => {
      const t = await createTenant({ planId: 'SOLO' });
      expect(await planService.checkUsageLimit(t.tenantId, 'teamMembers')).toBe(false);
    });

    it('has every feature, AI included, and no cap on bookings', async () => {
      const t = await createTenant({ planId: 'SOLO' });
      const limits = await planService.getTenantPlanLimits(t.tenantId);
      expect(limits).toMatchObject({
        canUseAi: true, canSendWhatsapp: true, canDownloadInvoice: true, canExportReports: true,
        maxBookings: -1, aiActionsPerMonth: 500,
      });
      expect(await planService.checkUsageLimit(t.tenantId, 'bookings')).toBe(true);
    });
  });

  describe('Agency Growth (₹2,499)', () => {
    it('allows up to five logins, owner included', async () => {
      const t = await createTenant({ planId: 'PRO' });
      for (let i = 0; i < 3; i += 1) await createUser(t.tenantId);
      expect(await planService.checkUsageLimit(t.tenantId, 'teamMembers')).toBe(true); // 4 of 5
      await createUser(t.tenantId);
      expect(await planService.checkUsageLimit(t.tenantId, 'teamMembers')).toBe(false); // 5 of 5
    });

    it('gets 2,000 AI actions a month', async () => {
      const t = await createTenant({ planId: 'PRO' });
      expect((await planService.getTenantPlanLimits(t.tenantId)).aiActionsPerMonth).toBe(2000);
    });
  });

  it('a trial gets everything, on the Solo AI allowance', async () => {
    const t = await createTenant({ planId: 'FREE' });
    const limits = await planService.getTenantPlanLimits(t.tenantId);
    expect(limits).toMatchObject({ isTrial: true, canUseAi: true, aiActionsPerMonth: 500, maxTeamMembers: 5 });
  });

  it('a lapsed trial gets no AI at all', async () => {
    const t = await createTenant({ planId: 'FREE' });
    await query(`UPDATE tenants SET created_at = now() - interval '60 days' WHERE id = $1`, [t.tenantId]);
    const result = await aiUsageService.tryConsume(t.tenantId);
    expect(result).toMatchObject({ ok: false, reason: 'plan' });
  });
});

describe('AI allowance', () => {
  it('counts each action and refuses the one after the last', async () => {
    const t = await createTenant({ planId: 'SOLO' });
    await setUsed(t.tenantId, 498);
    expect(await aiUsageService.tryConsume(t.tenantId)).toMatchObject({ ok: true, used: 499 });
    expect(await aiUsageService.tryConsume(t.tenantId)).toMatchObject({ ok: true, used: 500 });
    expect(await aiUsageService.tryConsume(t.tenantId)).toMatchObject({ ok: false, reason: 'limit', limit: 500 });
    expect(await aiUsageService.getUsage(t.tenantId)).toMatchObject({ used: 500, limit: 500 });
  });

  it('never lets two simultaneous calls share the last action', async () => {
    const t = await createTenant({ planId: 'SOLO' });
    await setUsed(t.tenantId, 499);
    const results = await Promise.all(Array.from({ length: 6 }, () => aiUsageService.tryConsume(t.tenantId)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await aiUsageService.getUsage(t.tenantId)).used).toBe(500);
  });

  it('keeps each agency\'s count separate', async () => {
    const a = await createTenant({ planId: 'SOLO' });
    const b = await createTenant({ planId: 'SOLO' });
    await setUsed(a.tenantId, 500);
    expect((await aiUsageService.tryConsume(b.tenantId)).ok).toBe(true);
  });

  it('says when the allowance resets', async () => {
    const t = await createTenant({ planId: 'SOLO' });
    await setUsed(t.tenantId, 500);
    const result = await aiUsageService.tryConsume(t.tenantId);
    expect(aiUsageService.limitMessage(result)).toMatch(/used all 500 AI actions for this month\. They reset on 1 /);
    expect(result.resetsOn).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('switches autopilot off for the month once used up, without spending an action to check', async () => {
    const t = await createTenant({ planId: 'SOLO' });
    const chat = { id: 'chat-allowance', ai_enabled: true, needs_human: false, opted_out: false };
    await setUsed(t.tenantId, 499);
    expect((await aiPolicy.canAiReply(t.tenantId, chat, {})).allowed).toBe(true);
    expect((await aiUsageService.getUsage(t.tenantId)).used).toBe(499); // checking is free

    await setUsed(t.tenantId, 500);
    const verdict = await aiPolicy.canAiReply(t.tenantId, chat, {});
    expect(verdict).toEqual({ allowed: false, reason: 'monthly AI allowance used up' });
  });

  describe('on AI routes', () => {
    function appWith(tenantId, handler) {
      const a = express();
      a.use((req, res, next) => { req.user = { tenantId }; next(); });
      a.post('/ai', requireAiAllowance('test'), handler);
      return a;
    }

    it('answers 429 with the reset date once the allowance is gone', async () => {
      const t = await createTenant({ planId: 'SOLO' });
      await setUsed(t.tenantId, 500);
      const res = await request(appWith(t.tenantId, (req, r) => r.json({ ok: true }))).post('/ai');
      expect(res.status).toBe(429);
      expect(res.body).toMatchObject({ code: 'AI_LIMIT_REACHED', used: 500, limit: 500 });
    });

    it('gives the action back when the AI call fails on our side', async () => {
      const t = await createTenant({ planId: 'SOLO' });
      await setUsed(t.tenantId, 10);
      await request(appWith(t.tenantId, (req, r) => r.status(503).json({ message: 'model down' }))).post('/ai');
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect((await aiUsageService.getUsage(t.tenantId)).used).toBe(10);
    });

    it('keeps the action when the AI actually ran', async () => {
      const t = await createTenant({ planId: 'SOLO' });
      await setUsed(t.tenantId, 10);
      await request(appWith(t.tenantId, (req, r) => r.json({ ok: true }))).post('/ai');
      expect((await aiUsageService.getUsage(t.tenantId)).used).toBe(11);
    });
  });
});
