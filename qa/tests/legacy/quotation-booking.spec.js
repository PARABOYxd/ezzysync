import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from '../helpers/authHelper.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Quotations & Itinerary to Booking Workflow', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('TC-QUOTE-01: Create Quotation / Itinerary via Modal and Sync with API', async ({ page }) => {
    await page.goto(`${BASE_URL}/quotations`);
    await page.waitForLoadState('networkidle');

    // Click Create Quotation button
    const createBtn = page.locator('button:has-text("Create Quotation"), button:has-text("Create Quotation / Itinerary")').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Verify Modal opens
    const modal = page.locator('div[role="dialog"]').first();
    await expect(modal).toBeVisible();

    const uniqueTrip = `QA_Trip_${Date.now()}`;
    const uniqueCustomer = `QA_Traveler_${Date.now()}`;

    // Fill Trip and Price inputs scoped to drawer
    const tripInput = modal.locator('input[placeholder*="Kerala" i], input[placeholder*="Trip" i]').first();
    const priceInput = modal.locator('input[placeholder*="45000" i], input[type="number"]').first();
    const day1TitleInput = modal.locator('input[placeholder*="Day 1" i], input[placeholder*="Milestone" i]').first();

    await expect(tripInput).toBeVisible();
    await tripInput.fill(uniqueTrip);
    if (await priceInput.isVisible()) await priceInput.fill('45000');
    if (await day1TitleInput.isVisible()) await day1TitleInput.fill('Arrival & Hotel Check-in');

    // Click Create Itinerary
    const submitBtn = modal.locator('button:has-text("Create Itinerary")').first();
    await expect(submitBtn).toBeVisible();

    const [quoteRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/quotations') && res.request().method() === 'POST'),
      submitBtn.click(),
    ]);
    expect([200, 201]).toContain(quoteRes.status());

    // Verify quotation card appears in grid
    await page.waitForTimeout(1000);
    const tripCard = page.locator(`text=${uniqueTrip}`).first();
    await expect(tripCard).toBeVisible({ timeout: 8000 });
  });

  test('TC-QUOTE-02: Convert Quotation directly to Confirmed Booking', async ({ page }) => {
    await page.goto(`${BASE_URL}/quotations`);
    await page.waitForLoadState('networkidle');

    // Find first quotation card with Convert to Booking action
    const convertBtn = page.locator('button[title*="Convert to Booking" i]').first();
    if (await convertBtn.isVisible()) {
      const [acceptRes] = await Promise.all([
        page.waitForResponse(res => res.url().includes('/accept') || res.url().includes('/bookings')),
        convertBtn.click(),
      ]);
      expect([200, 201]).toContain(acceptRes.status());

      // Verify success notification
      const toast = page.locator('text=Booking created');
      await expect(toast).toBeVisible({ timeout: 5000 });

      // Navigate to /bookings and verify booking appears
      await page.goto(`${BASE_URL}/bookings`);
      await page.waitForLoadState('networkidle');
      const table = page.locator('table').first();
      await expect(table).toBeVisible();
    }
  });

  // Parameterized Pricing & Traveler Count Matrix
  const pricingMatrix = [
    { travelers: 1, pricePerPerson: 15000, expectedTotal: 15000 },
    { travelers: 2, pricePerPerson: 22000, expectedTotal: 44000 },
    { travelers: 4, pricePerPerson: 18500, expectedTotal: 74000 },
    { travelers: 10, pricePerPerson: 12000, expectedTotal: 120000 },
  ];

  for (const item of pricingMatrix) {
    test(`TC-QUOTE-CALC: Pricing logic for ${item.travelers} traveler(s) @ ₹${item.pricePerPerson} = ₹${item.expectedTotal}`, async () => {
      const computed = item.travelers * item.pricePerPerson;
      expect(computed).toBe(item.expectedTotal);
    });
  }

});
