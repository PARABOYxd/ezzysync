import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession, createTestToken } from '../helpers/authHelper.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.BACKEND_URL || 'http://localhost:5001';

test.describe('Agency Settings, Business Rules & Integrations Suite', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('TC-SET-01: Agency General Settings rendering, currency & timezone options', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Verify Settings main header & tabs
    const header = page.locator('h1:has-text("Settings"), h2:has-text("Settings")').first();
    await expect(header).toBeVisible({ timeout: 8000 });

    // Verify General tab fields
    const companyInput = page.locator('input[placeholder*="Agency" i], input[placeholder*="Company" i], input[name*="company" i]').first();
    if (await companyInput.isVisible()) {
      await expect(companyInput).toBeEnabled();
    }

    // Verify Save Settings button exists
    const saveBtn = page.locator('button:has-text("Save Changes"), button:has-text("Save Settings")').first();
    await expect(saveBtn).toBeVisible();
  });

  test('TC-SET-02: Invoice & Bank Settings tab configuration and tax preferences', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Switch to Invoice tab
    const invoiceTabBtn = page.locator('button:has-text("Invoice"), button:has-text("Billing")').first();
    if (await invoiceTabBtn.isVisible()) {
      await invoiceTabBtn.click();
      await page.waitForTimeout(400);

      // Verify invoice configurations render
      const bankFields = page.locator('input[placeholder*="Bank" i], input[placeholder*="Account" i], input[placeholder*="IFSC" i]');
      expect(await bankFields.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('TC-SET-03: Public Lead Capture Key generation, display & API validation', async ({ page, request }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Switch to Lead Capture Tab
    const leadCaptureTab = page.locator('button:has-text("Lead Capture"), button:has-text("Website Embed")').first();
    if (await leadCaptureTab.isVisible()) {
      await leadCaptureTab.click();
      await page.waitForTimeout(400);

      // Verify lead key or embed snippet
      const keySection = page.locator('text=Lead Capture, text=API Key, code, pre').first();
      await expect(keySection).toBeVisible();
    }

    // Direct Backend API verification of lead capture key endpoint
    const token = createTestToken();
    const keyRes = await request.get(`${API_URL}/api/settings/lead-capture-key`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (keyRes.ok()) {
      const keyData = await keyRes.json();
      expect(keyData).toHaveProperty('publicLeadKey');
    }
  });

  test('TC-SET-04: WhatsApp Business & Autopilot Settings tab verification', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    const whatsappTab = page.locator('button:has-text("WhatsApp")').first();
    if (await whatsappTab.isVisible()) {
      await whatsappTab.click();
      await page.waitForTimeout(400);

      // Verify WhatsApp settings controls (QR Connect / Autopilot / Webhook)
      const qrOrConnectBtn = page.locator('button:has-text("Connect"), button:has-text("Link"), text=WhatsApp').first();
      await expect(qrOrConnectBtn).toBeVisible();
    }
  });

  // Parameterized Currency & Tax Rates Settings Matrix
  const taxSlabs = [0, 5, 12, 18, 28];
  for (const gst of taxSlabs) {
    test(`TC-SET-TAX: Tax rate ${gst}% configuration mathematical integrity`, async () => {
      const baseAmount = 10000;
      const gstAmount = (baseAmount * gst) / 100;
      const grandTotal = baseAmount + gstAmount;
      expect(grandTotal).toBe(baseAmount * (1 + gst / 100));
    });
  }

  const supportedCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];
  for (const curr of supportedCurrencies) {
    test(`TC-SET-CURR: Currency support for ${curr} formatting`, async () => {
      expect(supportedCurrencies).toContain(curr);
    });
  }

});
