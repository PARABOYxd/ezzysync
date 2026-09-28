import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, appRequire, helpers } from './app.mjs';

const { query } = db;
const whatsappService = appRequire('../services/whatsappService');
const whatsappWebService = appRequire('../services/whatsappWebService');
const settingsRepository = appRequire('../repositories/settingsRepository');
const { createTenant } = helpers;

/**
 * The inbox polls the connection overview, and each overview used to ask
 * Meta whether the Cloud API credentials work. That answer is now reused for
 * a short while - but never across tenants, and never after the credentials
 * change.
 */
describe('connection overview: Cloud API health is not re-checked on every poll', () => {
  let health;

  beforeEach(() => {
    health = vi.spyOn(whatsappService, 'checkCloudApiHealth')
      .mockResolvedValue({ configured: true, healthy: true, error: null });
  });
  afterEach(() => {
    health.mockRestore();
    vi.useRealTimers();
  });

  async function tenantWithCloudApi(token) {
    const t = await createTenant();
    await settingsRepository.ensureRow(t.tenantId);
    await query(
      `UPDATE settings SET whatsapp_phone_number_id = '1234567890', whatsapp_access_token = $2 WHERE tenant_id = $1`,
      [t.tenantId, token]
    );
    return t;
  }

  it('asks Meta once for back-to-back polls', async () => {
    const t = await tenantWithCloudApi('token-a');
    await whatsappWebService.getConnectionOverview(t.tenantId);
    await whatsappWebService.getConnectionOverview(t.tenantId);
    await whatsappWebService.getConnectionOverview(t.tenantId);
    expect(health).toHaveBeenCalledTimes(1);
  });

  it('asks again as soon as the credentials change', async () => {
    const t = await tenantWithCloudApi('token-a');
    await whatsappWebService.getConnectionOverview(t.tenantId);
    await query(`UPDATE settings SET whatsapp_access_token = 'token-b' WHERE tenant_id = $1`, [t.tenantId]);
    await whatsappWebService.getConnectionOverview(t.tenantId);
    expect(health).toHaveBeenCalledTimes(2);
  });

  it('keeps each tenant separate', async () => {
    const a = await tenantWithCloudApi('same-token');
    const b = await tenantWithCloudApi('same-token');
    await whatsappWebService.getConnectionOverview(a.tenantId);
    await whatsappWebService.getConnectionOverview(b.tenantId);
    expect(health).toHaveBeenCalledTimes(2);
  });

  it('re-checks a failing token sooner than a healthy one', async () => {
    health.mockResolvedValue({ configured: true, healthy: false, error: 'expired' });
    const t = await tenantWithCloudApi('token-bad');
    const start = Date.now();
    vi.useFakeTimers({ toFake: ['Date'], now: start });

    await whatsappWebService.getConnectionOverview(t.tenantId);
    vi.setSystemTime(start + 10_000);
    await whatsappWebService.getConnectionOverview(t.tenantId);
    expect(health).toHaveBeenCalledTimes(1);

    vi.setSystemTime(start + 16_000);
    await whatsappWebService.getConnectionOverview(t.tenantId);
    expect(health).toHaveBeenCalledTimes(2);
  });
});
