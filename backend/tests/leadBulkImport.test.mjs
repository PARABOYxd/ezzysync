import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const leadService = appRequire('../services/leadService');
const { createTenant, resetTenantData, unique } = helpers;

describe('Bulk lead import', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  it('creates a lead for each new phone number', async () => {
    const rows = [
      { customerName: 'Asha Rao', phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1'), interest: 'Goa' },
      { customerName: 'Bala Iyer', phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '2'), interest: 'Manali' },
    ];

    const result = await leadService.bulkImportLeads(tenant.tenantId, rows, 'test');
    expect(result.created).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);

    const { leads } = await leadService.listLeadsPaged(tenant.tenantId, { page: 1, limit: 10 });
    expect(leads).toHaveLength(2);
  });

  it('skips a row whose phone already belongs to an existing lead', async () => {
    const phone = unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '3');
    await leadService.createLead(tenant.tenantId, { customerName: 'Existing Lead', phone }, 'test');

    const result = await leadService.bulkImportLeads(tenant.tenantId, [
      { customerName: 'Duplicate Row', phone },
    ], 'test');

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);

    const { leads } = await leadService.listLeadsPaged(tenant.tenantId, { page: 1, limit: 10 });
    expect(leads).toHaveLength(1);
  });

  it('reports a row with no usable phone number as failed, without stopping the rest of the batch', async () => {
    const goodPhone = unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '4');
    const result = await leadService.bulkImportLeads(tenant.tenantId, [
      { customerName: 'No Phone Here', phone: '' },
      { customerName: 'Has A Phone', phone: goodPhone },
    ], 'test');

    expect(result.failed).toBe(1);
    expect(result.created).toBe(1);
    expect(result.errors[0]).toMatchObject({ row: 1 });
  });
});
