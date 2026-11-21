import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const express = appRequire('express');
const request = appRequire('supertest');
const sheetService = appRequire('../services/leadSheetService');
const sheetRepo = appRequire('../repositories/leadSheetRepository');
const leadService = appRequire('../services/leadService');
const { query } = appRequire('../config/db');
const { createTenant, createUser, authHeaderFor, resetTenantData } = helpers;

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=0';

/** A Meta lead-ads export: ad columns, the customer, and the form's own questions. */
const HEADER = ['id', 'created_time', 'ad_name', 'platform', 'full_name', 'phone_number', 'email', 'when_are_you_planning_to_travel?', 'budget'];

function metaRow(n, { name = `Customer ${n}`, phone = `p:+9198765${String(10000 + n).slice(-5)}` } = {}) {
  return [`l:${n}`, '2026-10-30T10:12:00+05:30', 'Chopta Reel', 'ig', name, phone, `c${n}@example.com`, 'December', '25000'];
}

/** The sheet as Google would return it; `rows` can grow between syncs like a real sheet. */
function fakeSheet(initial = []) {
  const state = { rows: initial, fail: null };
  const fetchRows = async () => {
    if (state.fail) throw new Error(state.fail);
    return [HEADER, ...state.rows];
  };
  return { state, fetchRows };
}

async function connect(tenantId, overrides = {}) {
  return sheetService.createSheet(tenantId, {
    name: 'Chopta Trek October Leads',
    sheetUrl: SHEET_URL,
    tripMode: 'fixed',
    tripName: 'Chopta Tungnath',
    assignMode: 'round_robin',
    ...overrides,
  }, 'admin@test.com');
}

async function leadsOf(tenantId) {
  const { rows } = await query(`SELECT * FROM leads WHERE tenant_id = $1 ORDER BY created_at, lead_id`, [tenantId]);
  return rows;
}

describe('Google Sheet lead sync', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  describe('reading the pasted link', () => {
    it('takes the id and tab from a browser link', () => {
      expect(sheetService.parseSheetRef(SHEET_URL)).toEqual({ sheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789', gid: '0' });
      expect(sheetService.parseSheetRef(`${SHEET_URL.split('#')[0]}?gid=845#gid=845`).gid).toBe('845');
    });

    it('accepts the bare sheet id', () => {
      expect(sheetService.parseSheetRef('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789').sheetId).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789');
    });

    it('refuses things that are not a sheet, and a publish-to-web link', () => {
      expect(() => sheetService.parseSheetRef('')).toThrow(/Paste/);
      expect(() => sheetService.parseSheetRef('https://example.com/file')).toThrow(/does not look like/);
      expect(() => sheetService.parseSheetRef('https://docs.google.com/spreadsheets/d/e/2PACX-1vQabc/pubhtml')).toThrow(/Publish to web/);
    });
  });

  describe('phone numbers', () => {
    it('stores every Indian spelling as the same ten digits', () => {
      for (const raw of ['p:+919876543210', '+91 98765 43210', '098765-43210', '9876543210', '919876543210']) {
        expect(sheetService.cleanPhone(raw), raw).toBe('9876543210');
      }
    });

    it('keeps a foreign number whole', () => {
      expect(sheetService.cleanPhone('+1 415 555 0100')).toBe('+14155550100');
    });
  });

  describe('syncing', () => {
    it('turns each row into a lead on the chosen trip, with the form answers in the notes', async () => {
      const sheet = await connect(tenant.tenantId);
      const { fetchRows } = fakeSheet([metaRow(1), metaRow(2)]);

      const result = await sheetService.syncSheet(sheet.id, { fetchRows });
      expect(result).toMatchObject({ status: 'ok', imported: 2 });

      const leads = await leadsOf(tenant.tenantId);
      expect(leads).toHaveLength(2);
      expect(leads[0]).toMatchObject({
        customer_name: 'Customer 1',
        phone: '9876510001',
        email: 'c1@example.com',
        interest: 'Chopta Tungnath',
        source: 'Meta Ads',
        stage: 'New',
      });
      expect(leads[0].notes).toContain('budget: 25000');
      expect(leads[0].notes).toContain('ad_name: Chopta Reel');
      expect(leads[0].notes).not.toContain('id: l:1'); // an ad id says nothing about the customer
    });

    it('writes the sheet name on the lead timeline', async () => {
      const sheet = await connect(tenant.tenantId);
      await sheetService.syncSheet(sheet.id, { fetchRows: fakeSheet([metaRow(1)]).fetchRows });

      const [lead] = await leadsOf(tenant.tenantId);
      const { rows } = await query(`SELECT note FROM follow_up_logs WHERE lead_id = $1`, [lead.id]);
      expect(rows[0].note).toContain('Lead automatically captured from Google Sheet: Chopta Trek October Leads');
    });

    it('reads only the rows added since the last sync', async () => {
      const sheet = await connect(tenant.tenantId);
      const fake = fakeSheet([metaRow(1), metaRow(2)]);
      await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });

      fake.state.rows.push(metaRow(3));
      const second = await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });
      const third = await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });

      expect(second.imported).toBe(1);
      expect(third.imported).toBe(0);
      expect(await leadsOf(tenant.tenantId)).toHaveLength(3);

      const [row] = await sheetRepo.listByTenant(tenant.tenantId);
      expect(row).toMatchObject({ totalSynced: 3, lastRowCount: 3, lastStatus: 'ok' });
    });

    it('skips a phone that is already a lead, and the same person twice in the sheet', async () => {
      await leadService.createLead(tenant.tenantId, { customerName: 'Existing', phone: '+91 98765 10001' }, 'a@test.com');
      const sheet = await connect(tenant.tenantId);
      const fake = fakeSheet([metaRow(1), metaRow(2), metaRow(2, { name: 'Same person again' })]);

      const result = await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });

      expect(result.imported).toBe(1);
      expect(result.skippedDuplicates).toBe(2);
    });

    it('skips a phone that already has a booking', async () => {
      await query(
        `INSERT INTO bookings (tenant_id, booking_id, customer_name, email, phone, trip, departure, booking_timestamp, updated_at)
         VALUES ($1, 'BK-1', 'Past Customer', 'p@example.com', '+91 98765 10001', 'Goa', '2026-01-01', 'x', 'x')`,
        [tenant.tenantId]
      );
      const sheet = await connect(tenant.tenantId);

      const result = await sheetService.syncSheet(sheet.id, { fetchRows: fakeSheet([metaRow(1), metaRow(2)]).fetchRows });

      expect(result.imported).toBe(1);
      expect((await leadsOf(tenant.tenantId))[0].customer_name).toBe('Customer 2');
    });

    it('drops rows with no usable phone', async () => {
      const sheet = await connect(tenant.tenantId);
      const result = await sheetService.syncSheet(sheet.id, {
        fetchRows: fakeSheet([metaRow(1, { phone: '' }), metaRow(2, { phone: '12' }), metaRow(3)]).fetchRows,
      });

      expect(result.imported).toBe(1);
      expect(result.skippedInvalid).toBe(2);
    });

    it('does not import what was already in the sheet when only new leads were asked for', async () => {
      const sheet = await connect(tenant.tenantId, { skipExisting: true });
      const fake = fakeSheet([metaRow(1), metaRow(2)]);

      expect((await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows })).imported).toBe(0);

      fake.state.rows.push(metaRow(3));
      expect((await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows })).imported).toBe(1);
      expect((await leadsOf(tenant.tenantId))[0].customer_name).toBe('Customer 3');
    });

    it('follows a sheet whose rows were deleted instead of waiting for it to grow back', async () => {
      const sheet = await connect(tenant.tenantId);
      const fake = fakeSheet([metaRow(1), metaRow(2), metaRow(3)]);
      await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });

      fake.state.rows = [metaRow(1)];
      await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });
      fake.state.rows.push(metaRow(4));
      const result = await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });

      expect(result.imported).toBe(1);
    });
  });

  describe('trip', () => {
    it('reads the destination from a sheet column, falling back to the fixed name', async () => {
      const sheet = await connect(tenant.tenantId, { tripMode: 'column', tripColumn: 'when_are_you_planning_to_travel?', tripName: 'General' });
      const blank = metaRow(2);
      blank[7] = '';

      await sheetService.syncSheet(sheet.id, { fetchRows: fakeSheet([metaRow(1), blank]).fetchRows });

      const leads = await leadsOf(tenant.tenantId);
      expect(leads.map((l) => l.interest)).toEqual(['December', 'General']);
    });
  });

  describe('assignment', () => {
    it('hands leads to the team in turn, and carries on where it stopped', async () => {
      const a = await createUser(tenant.tenantId, { name: 'Asha' });
      const b = await createUser(tenant.tenantId, { name: 'Bilal' });
      const sheet = await connect(tenant.tenantId);
      const fake = fakeSheet([metaRow(1), metaRow(2), metaRow(3)]);

      await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });
      fake.state.rows.push(metaRow(4));
      await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });

      const owners = (await leadsOf(tenant.tenantId)).map((l) => l.assigned_to);
      // Team order is by when each member joined: the admin, Asha, Bilal.
      const team = [(await query('SELECT name FROM users WHERE id = $1', [tenant.userId])).rows[0].name, a.name, b.name];
      expect(owners).toEqual([team[0], team[1], team[2], team[0]]);
    });

    it('gives every lead to one named agent', async () => {
      const asha = await createUser(tenant.tenantId, { name: 'Asha' });
      const sheet = await connect(tenant.tenantId, { assignMode: 'agent', assignedTo: asha.name });

      await sheetService.syncSheet(sheet.id, { fetchRows: fakeSheet([metaRow(1), metaRow(2)]).fetchRows });

      expect((await leadsOf(tenant.tenantId)).map((l) => l.assigned_to)).toEqual(['Asha', 'Asha']);
    });

    it('refuses an agent who is not on the team', async () => {
      await expect(connect(tenant.tenantId, { assignMode: 'agent', assignedTo: 'Nobody' })).rejects.toThrow(/not on your team/);
    });

    it('leaves the lead in the shared pool when the named agent has since left', async () => {
      const asha = await createUser(tenant.tenantId, { name: 'Asha' });
      const sheet = await connect(tenant.tenantId, { assignMode: 'agent', assignedTo: asha.name });
      await query('DELETE FROM users WHERE id = $1', [asha.id]);

      await sheetService.syncSheet(sheet.id, { fetchRows: fakeSheet([metaRow(1)]).fetchRows });

      expect((await leadsOf(tenant.tenantId))[0].assigned_to).toBe('');
    });
  });

  describe('when the sheet cannot be read', () => {
    it('records the reason on the sheet instead of throwing, and recovers on the next try', async () => {
      const sheet = await connect(tenant.tenantId);
      const fake = fakeSheet([metaRow(1)]);
      fake.state.fail = 'The sheet is private. Open it, click Share and set "Anyone with the link" to Viewer.';

      const failed = await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });
      expect(failed.status).toBe('error');
      expect((await sheetRepo.listByTenant(tenant.tenantId))[0]).toMatchObject({ lastStatus: 'error', lastError: expect.stringMatching(/private/) });

      fake.state.fail = null;
      const ok = await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });
      expect(ok.imported).toBe(1);
      expect((await sheetRepo.listByTenant(tenant.tenantId))[0]).toMatchObject({ lastStatus: 'ok', lastError: '' });
    });

    it('leaves the rows unread when there is no phone column, so they import once it is fixed', async () => {
      const sheet = await connect(tenant.tenantId);
      const noPhone = async () => [['full_name', 'budget'], ['Rohit', '25000']];

      const result = await sheetService.syncSheet(sheet.id, { fetchRows: noPhone });

      expect(result.status).toBe('error');
      expect(result.error).toMatch(/No phone column/);
      expect((await sheetRepo.listByTenant(tenant.tenantId))[0].lastRowCount).toBe(0);
    });

    it('honours a column the agent chose over the detected one', async () => {
      const sheet = await connect(tenant.tenantId, { columnMapping: { phone: 'alt_number' } });
      const rows = async () => [['full_name', 'phone_number', 'alt_number'], ['Rohit', '1111111', '9876543210']];

      await sheetService.syncSheet(sheet.id, { fetchRows: rows });

      expect((await leadsOf(tenant.tenantId))[0].phone).toBe('9876543210');
    });
  });

  describe('running at the same time', () => {
    it('lets one sync take the sheet and turns the other away', async () => {
      const sheet = await connect(tenant.tenantId);
      const fake = fakeSheet([metaRow(1)]);
      let release;
      const slow = async () => { await new Promise((r) => { release = r; }); return fake.fetchRows(); };

      const first = sheetService.syncSheet(sheet.id, { fetchRows: slow });
      await new Promise((r) => setTimeout(r, 50));
      const second = await sheetService.syncSheet(sheet.id, { fetchRows: fake.fetchRows });
      release();
      await first;

      expect(second.status).toBe('busy');
      expect(await leadsOf(tenant.tenantId)).toHaveLength(1);
    });

    it('schedules active sheets that are due and leaves paused ones alone', async () => {
      const active = await connect(tenant.tenantId, { name: 'Active' });
      const paused = await connect(tenant.tenantId, { name: 'Paused' });
      await sheetRepo.setPaused(tenant.tenantId, paused.id, true);

      const due = await sheetRepo.listDue(9);
      expect(due.map((d) => d.id)).toEqual([active.id]);

      await sheetService.syncSheet(active.id, { fetchRows: fakeSheet().fetchRows });
      expect(await sheetRepo.listDue(9)).toEqual([]);
    });
  });

  describe('connecting and editing', () => {
    it('validates the form', async () => {
      await expect(connect(tenant.tenantId, { name: '  ' })).rejects.toThrow(/name/i);
      await expect(connect(tenant.tenantId, { tripMode: 'column', tripColumn: '' })).rejects.toThrow(/destination/i);
      await expect(connect(tenant.tenantId, { assignMode: 'agent', assignedTo: '' })).rejects.toThrow(/team member/i);
    });

    it('falls back to the New stage and the Meta Ads source', async () => {
      const sheet = await connect(tenant.tenantId, { defaultStage: 'Bogus', sourceLabel: '' });
      expect(sheet).toMatchObject({ defaultStage: 'New', sourceLabel: 'Meta Ads' });
    });

    it('restarts from the top when the sheet is changed to a different tab', async () => {
      const sheet = await connect(tenant.tenantId);
      await sheetService.syncSheet(sheet.id, { fetchRows: fakeSheet([metaRow(1)]).fetchRows });

      const same = await sheetService.updateSheet(tenant.tenantId, sheet.id, { name: 'Renamed', sheetUrl: SHEET_URL, tripName: 'X' });
      expect(same.lastRowCount).toBe(1);

      const other = await sheetService.updateSheet(tenant.tenantId, sheet.id, { name: 'Renamed', sheetUrl: `${SHEET_URL.split('#')[0]}#gid=77` });
      expect(other.lastRowCount).toBe(0);
    });

    it('caps how many sheets one agency connects', async () => {
      for (let i = 0; i < sheetService.MAX_SHEETS_PER_TENANT; i += 1) await connect(tenant.tenantId, { name: `Sheet ${i}` });
      await expect(connect(tenant.tenantId, { name: 'One too many' })).rejects.toThrow(/up to \d+ sheets/);
    });

    it('previews the columns and the mapping it would use, without saving anything', async () => {
      const preview = await sheetService.previewSheet(tenant.tenantId, SHEET_URL, { fetchRows: fakeSheet([metaRow(1)]).fetchRows });

      expect(preview.columns).toEqual(HEADER);
      expect(preview.mapping).toMatchObject({ customerName: 'full_name', phone: 'phone_number', email: 'email' });
      expect(preview.totalRows).toBe(1);
      expect(await sheetRepo.listByTenant(tenant.tenantId)).toHaveLength(0);
    });

    it('turns a private sheet into a message the form can show', async () => {
      const fetchRows = async () => { throw new Error('The sheet is private.'); };
      await expect(sheetService.previewSheet(tenant.tenantId, SHEET_URL, { fetchRows })).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('the API', () => {
    function appFor() {
      const app = express();
      app.use(express.json());
      app.use('/api/lead-sheets', appRequire('../routes/leadSheetRoutes'));
      // eslint-disable-next-line no-unused-vars
      app.use((err, req, res, next) => res.status(err.status || 500).json({ message: err.message }));
      return app;
    }

    it('is for the admin only', async () => {
      const member = await createUser(tenant.tenantId);
      const res = await request(appFor())
        .get('/api/lead-sheets')
        .set('Authorization', authHeaderFor({ tenantId: tenant.tenantId, userId: member.id, role: 'TEAM_MEMBER' }));
      expect(res.status).toBe(403);
    });

    it('connects, lists, pauses and deletes a sheet', async () => {
      const auth = authHeaderFor({ tenantId: tenant.tenantId, userId: tenant.userId, role: 'ADMIN' });
      const app = appFor();

      const created = await request(app).post('/api/lead-sheets').set('Authorization', auth)
        .send({ name: 'Spiti', sheetUrl: SHEET_URL, tripName: 'Spiti Valley' });
      expect(created.status).toBe(201);
      const { id } = created.body.sheet;

      const list = await request(app).get('/api/lead-sheets').set('Authorization', auth);
      expect(list.body.sheets).toHaveLength(1);
      expect(list.body.sheets[0].url).toContain('/spreadsheets/d/');
      expect(list.body.options.team.length).toBeGreaterThan(0);

      const paused = await request(app).patch(`/api/lead-sheets/${id}/paused`).set('Authorization', auth).send({ paused: true });
      expect(paused.body.sheet.paused).toBe(true);

      expect((await request(app).delete(`/api/lead-sheets/${id}`).set('Authorization', auth)).status).toBe(200);
      expect((await request(app).delete(`/api/lead-sheets/${id}`).set('Authorization', auth)).status).toBe(404);
    });

    it('never touches another agency\'s sheet', async () => {
      const mine = await connect(tenant.tenantId);
      const other = await createTenant();
      const res = await request(appFor())
        .post(`/api/lead-sheets/${mine.id}/sync`)
        .set('Authorization', authHeaderFor({ tenantId: other.tenantId, userId: other.userId, role: 'ADMIN' }));
      expect(res.status).toBe(404);
    });
  });
});
