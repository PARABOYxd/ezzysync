import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { appRequire, helpers } from './app.mjs';

const express = appRequire('express');
const request = appRequire('supertest');
const env = appRequire('../config/env');
const service = appRequire('../services/metaLeadService');
const repo = appRequire('../repositories/metaLeadRepository');
const { query } = appRequire('../config/db');
const { createTenant, createUser, authHeaderFor, resetTenantData } = helpers;

const PAGE = { id: '100200300400', name: 'Chopta Treks', token: 'EAAB-secret-page-token' };
const SECRET = 'test-app-secret';

/** A lead as Meta's Graph API returns it. */
function metaLead(n, { phone = `p:+9198765${String(10000 + n).slice(-5)}`, formId = '555000111', extra = [] } = {}) {
  return {
    created_time: '2026-10-30T10:12:00+0000',
    form_id: formId,
    ad_name: 'Chopta Reel Oct',
    campaign_name: 'Winter Treks',
    platform: 'ig',
    field_data: [
      { name: 'full_name', values: [`Customer ${n}`] },
      { name: 'phone_number', values: [phone] },
      { name: 'email', values: [`c${n}@example.com`] },
      { name: 'budget', values: ['25000'] },
      ...extra,
    ],
  };
}

const announce = (leadgenId, { pageId = PAGE.id, formId = '555000111' } = {}) => ({
  object: 'page',
  entry: [{ id: pageId, time: 1, changes: [{ field: 'leadgen', value: { leadgen_id: leadgenId, page_id: pageId, form_id: formId } }] }],
});

const leadsOf = async (tenantId) => (await query('SELECT * FROM leads WHERE tenant_id = $1 ORDER BY lead_id', [tenantId])).rows;
const eventOf = async (id) => (await query('SELECT * FROM meta_lead_events WHERE leadgen_id = $1', [id])).rows[0];

describe('Meta Lead Ads', () => {
  let tenant;
  let page;
  const savedSecret = env.facebook.appSecret;
  const savedVerify = env.metaLeads.webhookVerifyToken;

  beforeEach(async () => {
    await resetTenantData();
    await query('DELETE FROM meta_lead_pages');
    tenant = await createTenant();
    env.facebook.appSecret = SECRET;
    env.metaLeads.webhookVerifyToken = 'verify-me';

    await repo.upsertAvailable(tenant.tenantId, [PAGE]);
    [page] = await repo.listByTenant(tenant.tenantId);
  });

  afterEach(() => {
    env.facebook.appSecret = savedSecret;
    env.metaLeads.webhookVerifyToken = savedVerify;
  });

  const activate = (config = {}) => service.connectPage(
    tenant.tenantId, page.id,
    { tripName: 'Chopta Tungnath', assignMode: 'round_robin', ...config },
    { subscribe: async () => {} }
  );

  describe('signing in with Facebook', () => {
    it('lists the pages and keeps the token encrypted', async () => {
      const { rows } = await query('SELECT page_token FROM meta_lead_pages WHERE page_id = $1', [PAGE.id]);
      expect(rows[0].page_token).not.toContain(PAGE.token);
      expect((await repo.findById(tenant.tenantId, page.id, { withToken: true })).token).toBe(PAGE.token);
      expect(page).toMatchObject({ pageName: 'Chopta Treks', status: 'available' });
    });

    it('never sends the token to the browser', async () => {
      const [listed] = await service.listPages(tenant.tenantId);
      expect(JSON.stringify(listed)).not.toContain(PAGE.token);
      expect(listed.token).toBeUndefined();
    });

    it('does not take a page that already belongs to another agency', async () => {
      const other = await createTenant();
      const result = await repo.upsertAvailable(other.tenantId, [{ ...PAGE, name: 'Hijack', token: 'other-token' }]);

      expect(result).toEqual({ saved: 0, taken: ['Hijack'] });
      expect(await repo.listByTenant(other.tenantId)).toHaveLength(0);
      expect((await repo.findById(tenant.tenantId, page.id, { withToken: true })).token).toBe(PAGE.token);
    });

    it('keeps a page\'s settings when the agent signs in again', async () => {
      await activate({ tripName: 'Kept' });
      await repo.upsertAvailable(tenant.tenantId, [{ ...PAGE, token: 'fresh-token' }]);

      const again = await repo.findById(tenant.tenantId, page.id, { withToken: true });
      expect(again).toMatchObject({ status: 'active', tripName: 'Kept', token: 'fresh-token' });
    });
  });

  describe('connecting a page', () => {
    it('subscribes the page to leads and saves the settings', async () => {
      const subscribed = [];
      const result = await service.connectPage(
        tenant.tenantId, page.id,
        { tripName: 'Spiti', formTrips: { 555000111: 'Chopta', bad: 'x' }, assignMode: 'round_robin', defaultStage: 'Contacted' },
        { subscribe: async (pageId, token) => { subscribed.push([pageId, token]); } }
      );

      expect(subscribed).toEqual([[PAGE.id, PAGE.token]]);
      expect(result).toMatchObject({ status: 'active', tripName: 'Spiti', defaultStage: 'Contacted', sourceLabel: 'Meta Ads' });
      expect(result.formTrips).toEqual({ 555000111: 'Chopta' }); // a non-numeric form id is dropped
    });

    it('stays unconnected, with Meta\'s reason, when Meta refuses', async () => {
      const subscribe = async () => { throw Object.assign(new Error('x'), { response: { data: { error: { message: 'Missing pages_manage_metadata permission' } } } }); };

      await expect(service.connectPage(tenant.tenantId, page.id, {}, { subscribe }))
        .rejects.toMatchObject({ status: 400, message: expect.stringContaining('pages_manage_metadata') });
      expect((await repo.findById(tenant.tenantId, page.id)).status).toBe('available');
    });

    it('refuses an agent who is not on the team', async () => {
      await expect(activate({ assignMode: 'agent', assignedTo: 'Nobody' })).rejects.toThrow(/not on your team/);
    });

    it('disconnects without needing Meta to answer', async () => {
      await activate();
      const result = await service.disconnectPage(tenant.tenantId, page.id, { unsubscribe: async () => { throw new Error('Meta is down'); } });
      expect(result.status).toBe('available');
    });

    it('cannot reach another agency\'s page', async () => {
      const other = await createTenant();
      expect(await service.connectPage(other.tenantId, page.id, {}, { subscribe: async () => {} })).toBeNull();
      expect(await service.disconnectPage(other.tenantId, page.id)).toBeNull();
      expect(await service.removePage(other.tenantId, page.id)).toBe(false);
    });
  });

  describe('a lead arriving', () => {
    it('becomes a Meta Ads lead on the page\'s trip, with the form answers and ad in the notes', async () => {
      await activate();

      const summary = await service.handleWebhook(announce('9001'), { fetch: async () => metaLead(1) });

      expect(summary).toMatchObject({ received: 1, imported: 1 });
      const [lead] = await leadsOf(tenant.tenantId);
      expect(lead).toMatchObject({
        customer_name: 'Customer 1', phone: '9876510001', email: 'c1@example.com',
        source: 'Meta Ads', interest: 'Chopta Tungnath', stage: 'New',
      });
      expect(lead.notes).toContain('budget: 25000');
      expect(lead.notes).toContain('ad_name: Chopta Reel Oct');

      const { rows } = await query('SELECT note FROM follow_up_logs WHERE lead_id = $1', [lead.id]);
      expect(rows[0].note).toContain('Lead automatically captured from Meta Lead Ad: Chopta Treks');
      expect((await repo.findById(tenant.tenantId, page.id))).toMatchObject({ totalLeads: 1, lastError: '' });
    });

    it('picks the trip by form, then the page default, then the ad\'s own name', async () => {
      await activate({ tripName: '', formTrips: { 555000111: 'Form Trip' } });
      await service.handleWebhook(announce('9001', { formId: '555000111' }), { fetch: async () => metaLead(1) });
      await service.handleWebhook(announce('9002', { formId: '777000222' }), { fetch: async () => metaLead(2, { formId: '777000222' }) });

      const interests = (await leadsOf(tenant.tenantId)).map((l) => l.interest);
      expect(interests).toEqual(['Form Trip', 'Chopta Reel Oct']);
    });

    it('is handled once however many times Meta sends it', async () => {
      await activate();
      const fetch = async () => metaLead(1);

      await service.handleWebhook(announce('9001'), { fetch });
      const again = await service.handleWebhook(announce('9001'), { fetch });

      expect(again.duplicates).toBe(1);
      expect(await leadsOf(tenant.tenantId)).toHaveLength(1);
    });

    it('skips a person who is already a lead', async () => {
      await activate();
      await service.handleWebhook(announce('9001'), { fetch: async () => metaLead(1) });
      await service.handleWebhook(announce('9002'), { fetch: async () => metaLead(1, { phone: '+91 98765 10001' }) });

      expect(await leadsOf(tenant.tenantId)).toHaveLength(1);
      expect((await eventOf('9002')).status).toBe('done');
    });

    it('hands leads to the team in turn across separate leads', async () => {
      const asha = await createUser(tenant.tenantId, { name: 'Asha' });
      await activate();
      const owner = (await query('SELECT name FROM users WHERE id = $1', [tenant.userId])).rows[0].name;

      for (const n of [1, 2, 3]) await service.handleWebhook(announce(`90${n}`), { fetch: async () => metaLead(n) });

      expect((await leadsOf(tenant.tenantId)).map((l) => l.assigned_to)).toEqual([owner, asha.name, owner]);
    });

    it('ignores pages that are paused, not connected, or unknown', async () => {
      const fetch = async () => { throw new Error('should not fetch'); };

      expect((await service.handleWebhook(announce('9001'), { fetch })).unknownPage).toBe(1); // still 'available'

      await activate();
      await repo.setPaused(tenant.tenantId, page.id, true);
      expect((await service.handleWebhook(announce('9002'), { fetch })).unknownPage).toBe(1);

      expect((await service.handleWebhook(announce('9003', { pageId: '999' }), { fetch })).unknownPage).toBe(1);
      expect(await leadsOf(tenant.tenantId)).toHaveLength(0);
    });

    it('ignores changes that are not leads', async () => {
      await activate();
      const summary = await service.handleWebhook({ entry: [{ changes: [{ field: 'feed', value: {} }] }] });
      expect(summary.received).toBe(0);
    });

    it('turns Meta\'s field list into a row the sheet pipeline reads', () => {
      const { columns, row } = service.leadToRow(metaLead(1, { extra: [{ name: 'trip_dates', values: ['Dec', 'Jan'] }] }));
      expect(columns).toEqual(['created_time', 'ad_name', 'campaign_name', 'platform', 'full_name', 'phone_number', 'email', 'budget', 'trip_dates']);
      expect(row[columns.indexOf('trip_dates')]).toBe('Dec, Jan');
    });
  });

  describe('when fetching the lead fails', () => {
    const boom = () => { throw new Error('Graph is down'); };

    it('keeps the lead queued and files it on the retry', async () => {
      await activate();
      const first = await service.handleWebhook(announce('9001'), { fetch: boom });
      expect(first.imported).toBe(0);
      expect(await eventOf('9001')).toMatchObject({ status: 'pending', attempts: 1, last_error: 'Graph is down' });

      // Not yet due: it was only just tried.
      expect((await service.retryPending({ fetch: async () => metaLead(1) })).retried).toBe(0);

      await query(`UPDATE meta_lead_events SET updated_at = now() - interval '10 minutes'`);
      const retry = await service.retryPending({ fetch: async () => metaLead(1) });

      expect(retry).toEqual({ retried: 1, imported: 1 });
      expect((await eventOf('9001')).status).toBe('done');
      expect(await leadsOf(tenant.tenantId)).toHaveLength(1);
    });

    it('gives up after five tries', async () => {
      await activate();
      await service.handleWebhook(announce('9001'), { fetch: boom });
      for (let i = 0; i < 4; i += 1) {
        await query(`UPDATE meta_lead_events SET updated_at = now() - interval '10 minutes'`);
        await service.retryPending({ fetch: boom });
      }
      expect(await eventOf('9001')).toMatchObject({ status: 'failed', attempts: 5 });
    });

    it('tells the agent to sign in again when Facebook access has expired, and stops retrying', async () => {
      await activate();
      const expired = () => { throw Object.assign(new Error('x'), { response: { data: { error: { code: 190, message: 'Session expired' } } } }); };

      await service.handleWebhook(announce('9001'), { fetch: expired });

      expect((await eventOf('9001')).status).toBe('failed');
      expect((await repo.findById(tenant.tenantId, page.id)).lastError).toMatch(/Connect with Facebook/);
    });
  });

  describe('the webhook endpoint', () => {
    function appWithWebhook() {
      const app = express();
      app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
      app.use('/webhook', appRequire('../routes/metaLeadWebhookRoutes'));
      return app;
    }
    const sign = (body, secret = SECRET) => `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
    const body = JSON.stringify(announce('9001', { pageId: '424242' })); // a page nobody connected

    it('answers Meta\'s handshake only with the right token', async () => {
      const app = appWithWebhook();
      const ok = await request(app).get('/webhook').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': 'abc123' });
      expect(ok.status).toBe(200);
      expect(ok.text).toBe('abc123');

      expect((await request(app).get('/webhook').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'x' })).status).toBe(403);
    });

    it('answers no handshake at all while no verify token is configured', async () => {
      env.metaLeads.webhookVerifyToken = '';
      const res = await request(appWithWebhook()).get('/webhook').query({ 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': 'x' });
      expect(res.status).toBe(403);
    });

    it('accepts a correctly signed delivery', async () => {
      const res = await request(appWithWebhook()).post('/webhook').set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(body)).send(body);
      expect(res.status).toBe(200);
    });

    it('rejects an unsigned or wrongly signed delivery', async () => {
      const app = appWithWebhook();
      expect((await request(app).post('/webhook').set('Content-Type', 'application/json').send(body)).status).toBe(401);
      expect((await request(app).post('/webhook').set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(body, 'someone-elses-secret')).send(body)).status).toBe(401);
    });

    it('is switched off, not open, when no app secret is configured', async () => {
      env.facebook.appSecret = '';
      const res = await request(appWithWebhook()).post('/webhook').set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(body)).send(body);
      expect(res.status).toBe(503);
    });
  });

  describe('the settings API', () => {
    function appWithApi() {
      const app = express();
      app.use(express.json());
      app.use('/api/meta-leads', appRequire('../routes/metaLeadRoutes'));
      // eslint-disable-next-line no-unused-vars
      app.use((err, req, res, next) => res.status(err.status || 500).json({ message: err.message }));
      return app;
    }
    const adminAuth = () => authHeaderFor({ tenantId: tenant.tenantId, userId: tenant.userId, role: 'ADMIN' });

    it('is for the admin only', async () => {
      const member = await createUser(tenant.tenantId);
      const res = await request(appWithApi()).get('/api/meta-leads')
        .set('Authorization', authHeaderFor({ tenantId: tenant.tenantId, userId: member.id, role: 'TEAM_MEMBER' }));
      expect(res.status).toBe(403);
    });

    it('lists the pages with the webhook address to give Meta, and no token', async () => {
      const res = await request(appWithApi()).get('/api/meta-leads').set('Authorization', adminAuth());

      expect(res.status).toBe(200);
      expect(res.body.webhookUrl).toMatch(/\/api\/webhooks\/meta-leads$/);
      expect(res.body.pages).toHaveLength(1);
      expect(JSON.stringify(res.body)).not.toContain(PAGE.token);
      expect(res.body.options.team.length).toBeGreaterThan(0);
    });

    it('pauses, then removes a page', async () => {
      await activate();
      const app = appWithApi();

      const paused = await request(app).patch(`/api/meta-leads/pages/${page.id}/paused`).set('Authorization', adminAuth()).send({ paused: true });
      expect(paused.body.page.paused).toBe(true);

      expect((await request(app).delete(`/api/meta-leads/pages/${page.id}`).set('Authorization', adminAuth())).status).toBe(200);
      expect((await request(app).delete(`/api/meta-leads/pages/${page.id}`).set('Authorization', adminAuth())).status).toBe(404);
    });
  });
});
