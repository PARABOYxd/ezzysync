import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const leadService = appRequire('../services/leadService');
const { createTenant, resetTenantData } = helpers;

describe('Duplicate enquiry guard', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  it('refuses a second open lead for the same number, naming the existing one', async () => {
    const first = await leadService.createLead(tenant.tenantId, { customerName: 'Asha', phone: '9876500101' }, 'agent');
    const err = await leadService.createLead(tenant.tenantId, { customerName: 'Asha 2', phone: '+91 98765 00101' }, 'agent').catch((e) => e);

    expect(err.status).toBe(409);
    expect(err.details.existingLead.leadId).toBe(first.leadId);
  });

  it('allows it when the agent explicitly chooses a parallel enquiry', async () => {
    await leadService.createLead(tenant.tenantId, { phone: '9876500102' }, 'agent');
    const second = await leadService.createLead(tenant.tenantId, { phone: '9876500102', bypassDuplicateCheck: true }, 'agent');
    expect(second.leadId).toBeTruthy();
  });

  it('allows a new enquiry once the previous one is closed (Lost)', async () => {
    const first = await leadService.createLead(tenant.tenantId, { phone: '9876500103' }, 'agent');
    await leadService.updateLead(tenant.tenantId, first.leadId, { stage: 'Lost' }, 'agent');
    const second = await leadService.createLead(tenant.tenantId, { phone: '9876500103' }, 'agent');
    expect(second.leadId).not.toBe(first.leadId);
  });

  it('does not match another tenant\'s lead', async () => {
    const other = await createTenant();
    await leadService.createLead(other.tenantId, { phone: '9876500104' }, 'agent');
    const mine = await leadService.createLead(tenant.tenantId, { phone: '9876500104' }, 'agent');
    expect(mine.leadId).toBeTruthy();
  });
});
