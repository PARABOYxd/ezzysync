import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const userService = appRequire('../services/userService');
const expenseRepository = appRequire('../repositories/expenseRepository');
const bookingService = appRequire('../services/bookingService');
const { createTenant, createUser, resetTenantData, unique } = helpers;

/**
 * Two real cross-tenant leaks found by reading the code, not by running the
 * app: an ADMIN could read another tenant's user by id through the team
 * member update endpoint, and an expense could be linked to a booking or
 * batch it does not own, disclosing that tenant's customer name through the
 * join in listExpenses. Both are fixed at the repository layer; these tests
 * exist so neither regresses silently.
 */

function bookingData(overrides = {}) {
  return {
    customerName: 'Cross Tenant Test',
    email: `${unique('cross')}@example.com`,
    phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '2'),
    trip: 'Kerala Backwaters',
    departure: '2026-11-01',
    members: 1,
    pricePerPerson: 3000,
    paid: 0,
    ...overrides,
  };
}

describe('Cross-tenant isolation', () => {
  beforeEach(async () => {
    await resetTenantData();
  });

  describe('team member lookup by id', () => {
    it('will not hand back another tenant\'s user through an empty update body', async () => {
      const tenantA = await createTenant();
      const tenantB = await createTenant();
      const memberOfA = await createUser(tenantA.tenantId, { name: 'Belongs To A' });

      // An empty (or all-falsy) body used to fall through to a global,
      // tenant-blind lookup - tenant B's admin could read tenant A's user
      // this way even though nothing was actually being updated.
      await expect(
        userService.updateTeamMember(tenantB.tenantId, memberOfA.id, {})
      ).rejects.toMatchObject({ status: 404 });
    });

    it('still returns the user for an empty update within the same tenant', async () => {
      const tenant = await createTenant();
      const member = await createUser(tenant.tenantId, { name: 'Same Tenant' });

      const result = await userService.updateTeamMember(tenant.tenantId, member.id, {});
      expect(result.email).toBe(member.email);
      expect(result.passwordHash).toBeUndefined();
    });

    it('404s a real update aimed at another tenant\'s user, rather than applying it', async () => {
      const tenantA = await createTenant();
      const tenantB = await createTenant();
      const memberOfA = await createUser(tenantA.tenantId, { name: 'Belongs To A' });

      await expect(
        userService.updateTeamMember(tenantB.tenantId, memberOfA.id, { name: 'Hijacked' })
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('expense linking', () => {
    it('refuses to link an expense to another tenant\'s booking', async () => {
      const tenantA = await createTenant();
      const tenantB = await createTenant();
      const booking = await bookingService.createBooking(tenantA.tenantId, bookingData(), 'agent@test.com');

      await expect(
        expenseRepository.createExpense(tenantB.tenantId, {
          title: 'Hotel', amount: 500, link_type: 'booking', booking_id: booking.id, created_by: 'attacker',
        })
      ).rejects.toMatchObject({ status: 400 });
    });

    it('allows linking an expense to a booking the tenant actually owns', async () => {
      const tenant = await createTenant();
      const booking = await bookingService.createBooking(tenant.tenantId, bookingData(), 'agent@test.com');

      const expense = await expenseRepository.createExpense(tenant.tenantId, {
        title: 'Hotel', amount: 500, link_type: 'booking', booking_id: booking.id, created_by: 'agent',
      });
      expect(expense.booking_id).toBe(booking.id);
    });

    it('does not disclose another tenant\'s booking customer name through the expense list join', async () => {
      const tenantA = await createTenant();
      const tenantB = await createTenant();
      const booking = await bookingService.createBooking(tenantA.tenantId, bookingData({ customerName: 'Secret Customer' }), 'agent@test.com');

      // Even if a row like this existed under tenant B (e.g. from data created
      // before this guard existed), the up-front check on create/update now
      // prevents it from being written at all.
      await expect(
        expenseRepository.updateExpense(tenantB.tenantId, 'does-not-matter', {
          title: 'Hotel', amount: 500, link_type: 'booking', booking_id: booking.id,
        })
      ).rejects.toMatchObject({ status: 400 });

      const tenantBExpenses = await expenseRepository.listExpenses(tenantB.tenantId);
      expect(tenantBExpenses.find((e) => e.booking_customer === 'Secret Customer')).toBeUndefined();
    });

    it('refuses to link an expense to another tenant\'s batch', async () => {
      const tenantA = await createTenant();
      const tenantB = await createTenant();
      const batchRepository = appRequire('../repositories/batchRepository');
      const batch = await batchRepository.insertBatch(tenantA.tenantId, unique('BATCH'), {
        name: 'Goa Group', tripName: 'Goa', departureDate: '2026-12-01', totalCapacity: 10, pricePerPerson: 4000,
      }, 'agent');

      await expect(
        expenseRepository.createExpense(tenantB.tenantId, {
          title: 'Bus', amount: 200, link_type: 'batch', batch_id: batch.id, created_by: 'attacker',
        })
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
