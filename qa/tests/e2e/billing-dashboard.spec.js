import { test, expect, inr, today } from '../support/fixtures.js';
import { createBooking, cancelBooking, getDashboard, getBilling } from '../support/seed.js';

/**
 * The numbers an agency owner actually reads. Dashboard and Billing are two
 * views of the same bookings, so they must agree - and every date range
 * has to include what was booked inside it.
 *
 * Regressions this pins: every Billing date range showed ₹0 (it filtered on
 * a column bookings don't have); the Team Member filter showed ₹0 (the field
 * it matched on was never sent); "All Time" silently meant "departing this
 * year"; the 30-day card said "+100%" regardless of the data.
 */

// The big number inside a Billing stat card, matched exactly.
const stat = (page, label) =>
  page.locator('div.card', { has: page.getByText(label, { exact: false }) }).first().locator('p.text-2xl');
const yearSelect = (page) => page.locator('select').filter({ has: page.locator('option', { hasText: 'All Years' }) });

async function setBookedOn(api, booking, day) {
  // No API sets the creation date, so date-range tests stamp it directly.
  const { sql } = await import('../support/tenant.js');
  await sql(`UPDATE bookings SET booking_timestamp = $1 WHERE booking_id = $2`, [`${day}T09:00:00.000Z`, booking.bookingId]);
}

test.describe.configure({ mode: 'serial' });

test.describe('Billing & Dashboard numbers', () => {
  let seeded;

  test.beforeAll(async ({ api }) => {
    const before = await getDashboard(api);
    const a = await createBooking(api, { members: 2, pricePerPerson: 15000, teamMember: 'QA Agent A' }); // 30,000
    const b = await createBooking(api, { members: 1, pricePerPerson: 12000, teamMember: 'QA Agent B', departure: '2027-03-10' }); // 12,000, next year
    const c = await createBooking(api, { members: 1, pricePerPerson: 50000 }); // cancelled below
    await cancelBooking(api, c.bookingId);
    seeded = { before: before.stats, a, b, c, activeRevenue: 42000 };
  });

  test('API: dashboard and billing agree on revenue and active booking count', async ({ api }) => {
    const { stats } = await getDashboard(api);
    const billing = await getBilling(api);

    expect(stats.totalRevenue - seeded.before.totalRevenue).toBe(seeded.activeRevenue);
    expect(stats.cancelledTrips - seeded.before.cancelledTrips).toBe(1);
    const billingRevenue = billing.bookings.reduce((s, b) => s + b.totalAmount, 0);
    expect(billingRevenue).toBe(stats.totalRevenue);
    expect(billing.bookings).toHaveLength(stats.totalBookings - stats.cancelledTrips);
    expect(billing.bookings.find((b) => b.bookingId === seeded.c.bookingId)).toBeUndefined();
  });

  test('UI: dashboard cards show the stored totals, with cancelled called out', async ({ page, api }) => {
    const { stats } = await getDashboard(api);
    await page.goto('/dashboard');

    const totalRevenueCard = page.getByText('Total Revenue', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    await expect(totalRevenueCard).toContainText(inr(stats.totalRevenue));
    const bookedCard = page.getByText('Total Booked', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    await expect(bookedCard).toContainText(String(stats.totalBookings));
    await expect(bookedCard).toContainText(`${stats.cancelledTrips} cancelled`);

    // The fixed "+100%" is gone; with nothing in the previous 30 days there
    // is no percentage to show at all.
    await expect(page.getByText('+100%')).toHaveCount(0);
  });

  test('UI: Billing "All Time" equals the dashboard, including next year\'s departures', async ({ page, api }) => {
    const { stats } = await getDashboard(api);
    await page.goto('/billing');

    await expect(yearSelect(page)).toHaveValue('all');
    await expect(stat(page, 'Gross Revenue')).toHaveText(inr(stats.totalRevenue));
    await expect(stat(page, 'Active Bookings')).toHaveText(String(stats.totalBookings - stats.cancelledTrips));
    await expect(page.getByRole('link', { name: seeded.b.trip })).toBeVisible();
  });

  test('UI: Custom Range covering today includes today\'s bookings (was ₹0)', async ({ page, api }) => {
    const { stats } = await getDashboard(api);
    await page.goto('/billing');
    await page.locator('select').first().selectOption('custom');

    const response = page.waitForResponse((r) => r.url().includes('/dashboard/analytics') && r.url().includes('endDate'));
    const dates = page.locator('input[type="date"]');
    await dates.nth(0).fill('2020-01-01');
    await dates.nth(1).fill(today());
    const body = await (await response).json();

    expect(body.bookings.length).toBeGreaterThanOrEqual(2);
    await expect(stat(page, 'Gross Revenue')).toHaveText(inr(stats.totalRevenue));
    await expect(stat(page, 'Gross Revenue')).not.toHaveText('₹0');
  });

  test('UI: a range with no bookings shows zero, and the end date is inclusive', async ({ page, api }) => {
    await setBookedOn(api, seeded.a, '2025-06-15');

    await page.goto('/billing');
    await page.locator('select').first().selectOption('custom');
    const dates = page.locator('input[type="date"]');

    await dates.nth(0).fill('2019-01-01');
    await dates.nth(1).fill('2019-12-31');
    await expect(stat(page, 'Gross Revenue')).toHaveText('₹0');
    await expect(page.getByText('No trip data available.')).toBeVisible();

    // Booked on 15 Jun 2025 - a range ending that very day must include it.
    await dates.nth(0).fill('2025-06-01');
    await dates.nth(1).fill('2025-06-15');
    await expect(stat(page, 'Gross Revenue')).toHaveText(inr(30000));
    await expect(stat(page, 'Active Bookings')).toHaveText('1');

    await setBookedOn(api, seeded.a, today());
  });

  test('UI: start after end is refused with a message instead of silently empty', async ({ page }) => {
    await page.goto('/billing');
    await page.locator('select').first().selectOption('custom');
    const dates = page.locator('input[type="date"]');
    await dates.nth(0).fill('2026-09-30');
    await dates.nth(1).fill('2026-01-01');
    await expect(page.getByText('Start date must be on or before the end date.')).toBeVisible();
  });

  test('UI: Last 30 Days includes a booking made today', async ({ page }) => {
    await page.goto('/billing');
    const response = page.waitForResponse((r) => r.url().includes('/dashboard/analytics') && r.url().includes('startDate'));
    await page.locator('select').first().selectOption('last30');
    const body = await (await response).json();
    expect(body.bookings.map((b) => b.bookingId)).toContain(seeded.b.bookingId);
    await expect(stat(page, 'Gross Revenue')).not.toHaveText('₹0');
  });

  test('UI: Team Member filter shows only that member\'s revenue (was ₹0)', async ({ page }) => {
    await page.goto('/billing');
    const memberSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'All Team Members' }) });
    await memberSelect.selectOption('QA Agent A');
    await expect(stat(page, 'Gross Revenue')).toHaveText(inr(30000));
    await expect(stat(page, 'Active Bookings')).toHaveText('1');

    await memberSelect.selectOption('QA Agent B');
    await expect(stat(page, 'Gross Revenue')).toHaveText(inr(12000));
  });

  test('UI: Departure Year filter narrows to trips departing that year', async ({ page }) => {
    await page.goto('/billing');
    await yearSelect(page).selectOption('2027');
    await expect(stat(page, 'Gross Revenue')).toHaveText(inr(12000));
    await expect(page.getByRole('link', { name: seeded.b.trip })).toBeVisible();
    await expect(page.getByRole('link', { name: seeded.a.trip })).toHaveCount(0);
  });
});
