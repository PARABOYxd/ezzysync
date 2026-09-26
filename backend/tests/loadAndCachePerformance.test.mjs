import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, db, helpers } from './app.mjs';

const leadRepository = appRequire('../repositories/leadRepository');
const bookingRepository = appRequire('../repositories/bookingRepository');
const { createTenant, resetTenantData, unique } = helpers;

describe('Performance, Load & Pagination QA Tests', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant({ planId: 'PRO' });
  });

  it('handles 100-200 concurrent lead queries with paginated limit=10 cleanly', async () => {
    const now = new Date().toISOString();
    for (let i = 0; i < 15; i++) {
      await leadRepository.insertLead(
        tenant.tenantId,
        `LEAD-${i}`,
        { customerName: `Customer ${i}`, phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, `${i}`) },
        now,
        'test',
        null
      );
    }

    const totalRequests = 150;
    const startTime = Date.now();

    const promises = Array.from({ length: totalRequests }).map((_, idx) => {
      const page = (idx % 3) + 1;
      return leadRepository.listLeadsPaged({ tenantId: tenant.tenantId, page, limit: 10 });
    });

    const results = await Promise.all(promises);
    const durationMs = Date.now() - startTime;

    results.forEach((res) => {
      expect(res).toHaveProperty('leads');
      expect(res).toHaveProperty('totalCount');
      expect(res.leads.length).toBeLessThanOrEqual(10);
    });

    // 150 concurrent requests handled in < 2000ms
    expect(durationMs).toBeLessThan(2000);
  });

  it('verifies paginated bounds (limit=30 does not dump 500 items)', async () => {
    const res = await leadRepository.listLeadsPaged({ tenantId: tenant.tenantId, page: 1, limit: 30 });
    expect(res).toHaveProperty('leads');
    expect(res).toHaveProperty('totalCount');
    expect(res.leads.length).toBeLessThanOrEqual(30);
  });

  it('verifies booking query pagination under high frequency load', async () => {
    const promises = Array.from({ length: 50 }).map(() =>
      bookingRepository.listBookingsPaged({ tenantId: tenant.tenantId, page: 1, limit: 10 })
    );
    const results = await Promise.all(promises);
    results.forEach((res) => {
      expect(res).toHaveProperty('bookings');
      expect(res).toHaveProperty('totalCount');
      expect(res.bookings.length).toBeLessThanOrEqual(10);
    });
  });
});
