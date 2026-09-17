import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, db, helpers } from './app.mjs';

const leadService = appRequire('../services/leadService');
const leadRepository = appRequire('../repositories/leadRepository');
const { createTenant, resetTenantData, unique } = helpers;
const { query } = db;

function isoDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('Lead priority recompute', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  it('marks a lead departing within 7 days as Hot', async () => {
    const lead = await leadService.createLead(tenant.tenantId, {
      customerName: 'Soon Traveler',
      phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1'),
      departureDate: isoDaysFromNow(3),
    }, 'test');

    await leadRepository.recomputeAllPriorities();
    const refreshed = await leadService.getLeadById(tenant.tenantId, lead.leadId);
    expect(refreshed.priority).toBe('Hot');
  });

  it('marks a lead departing 8-30 days out as Warm', async () => {
    const lead = await leadService.createLead(tenant.tenantId, {
      customerName: 'Later Traveler',
      phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '2'),
      departureDate: isoDaysFromNow(20),
    }, 'test');

    await leadRepository.recomputeAllPriorities();
    const refreshed = await leadService.getLeadById(tenant.tenantId, lead.leadId);
    expect(refreshed.priority).toBe('Warm');
  });

  it('marks a lead with no departure date but recent activity as Warm', async () => {
    const lead = await leadService.createLead(tenant.tenantId, {
      customerName: 'Fresh Inquiry',
      phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '3'),
    }, 'test');

    await leadRepository.recomputeAllPriorities();
    const refreshed = await leadService.getLeadById(tenant.tenantId, lead.leadId);
    expect(refreshed.priority).toBe('Warm');
  });

  it('marks a lead with no departure date and no recent activity as Cold', async () => {
    const lead = await leadService.createLead(tenant.tenantId, {
      customerName: 'Gone Quiet',
      phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '4'),
    }, 'test');

    // Backdate updated_at directly - a freshly created lead is always
    // "recently active" by construction, so the Cold path needs a lead that
    // genuinely looks stale.
    await query(`UPDATE leads SET updated_at = now() - interval '10 days' WHERE lead_id = $1`, [lead.leadId]);

    await leadRepository.recomputeAllPriorities();
    const refreshed = await leadService.getLeadById(tenant.tenantId, lead.leadId);
    expect(refreshed.priority).toBe('Cold');
  });

  it('does not touch a garbage departure_date value - falls through instead of throwing', async () => {
    const lead = await leadService.createLead(tenant.tenantId, {
      customerName: 'Bad Date Entry',
      phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '5'),
    }, 'test');
    await query(`UPDATE leads SET departure_date = 'next weekend maybe' WHERE lead_id = $1`, [lead.leadId]);

    await expect(leadRepository.recomputeAllPriorities()).resolves.not.toThrow();
    const refreshed = await leadService.getLeadById(tenant.tenantId, lead.leadId);
    // Recently created, so falls into the "no valid date + recent activity" Warm branch.
    expect(refreshed.priority).toBe('Warm');
  });

  it('leaves a Won lead alone even with an imminent departure', async () => {
    const lead = await leadService.createLead(tenant.tenantId, {
      customerName: 'Already Booked',
      phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '6'),
      departureDate: isoDaysFromNow(2),
    }, 'test');
    await leadService.updateStage(tenant.tenantId, lead.leadId, 'Won', 'test');

    await leadRepository.recomputeAllPriorities();
    const refreshed = await leadService.getLeadById(tenant.tenantId, lead.leadId);
    // Never recomputed once Won/Lost, so it keeps the column's own default.
    expect(refreshed.priority).toBe('Cold');
  });
});
