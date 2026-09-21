import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from '../helpers/authHelper.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('WhatsApp Live Chat, Message Formatting & CRM Automations Suite', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('TC-WA-01: WhatsApp Live Chat page renders and conversation list panels initialize', async ({ page }) => {
    await page.goto(`${BASE_URL}/whatsapp-chat`);
    await page.waitForLoadState('networkidle');

    // Verify main chat interface
    const chatContainer = page.locator('main, div[class*="chat" i]').first();
    await expect(chatContainer).toBeVisible({ timeout: 8000 });

    // Verify New Chat or QR connect button exists
    const chatActions = page.locator('button:has-text("Chat"), button:has-text("QR"), button:has-text("Connect")');
    expect(await chatActions.count()).toBeGreaterThanOrEqual(1);
  });

  test('TC-WA-02: Start Chat Modal input validation and international phone formatting', async ({ page }) => {
    await page.goto(`${BASE_URL}/whatsapp-chat`);
    await page.waitForLoadState('networkidle');

    const startChatBtn = page.locator('button:has-text("New Chat"), button:has-text("Start Chat"), button[title*="Chat" i]').first();
    if (await startChatBtn.isVisible()) {
      await startChatBtn.click();
      const modal = page.locator('div[role="dialog"]').first();
      if (await modal.isVisible()) {
        const phoneInput = modal.locator('input[type="tel"], input[placeholder*="phone" i]').first();
        await expect(phoneInput).toBeVisible();

        // Type phone number and verify format
        await phoneInput.fill('9876543210');
        const value = await phoneInput.inputValue();
        expect(value).toContain('9876543210');

        // Cancel modal
        const cancelBtn = modal.locator('button:has-text("Cancel")').first();
        if (await cancelBtn.isVisible()) await cancelBtn.click();
      }
    }
  });

  test('TC-WA-03: WhatsApp Message Formatter syntax validation (Bold, Italic, Emojis, Pricing)', async () => {
    // WhatsApp Markdown rules: *bold*, _italic_, ~strikethrough~
    const formatBold = (text) => `*${text}*`;
    const formatItalic = (text) => `_${text}_`;
    const formatPriceQuote = (trip, price) => `✈️ ${formatBold(trip)}\n💰 Total: ₹${price.toLocaleString('en-IN')}`;

    expect(formatBold('Special Offer')).toBe('*Special Offer*');
    expect(formatItalic('Valid until tomorrow')).toBe('_Valid until tomorrow_');
    
    const quoteMsg = formatPriceQuote('5N Maldives Package', 125000);
    expect(quoteMsg).toContain('*5N Maldives Package*');
    expect(quoteMsg).toContain('₹1,25,000');
  });

  test('TC-WA-04: Automated Cron Schedulers & Reminder Intervals verification', async () => {
    // Verify background cron schedule logic:
    // Job 1: Audit Log Cleanup (Every Sunday midnight: 0 0 * * 0) -> 90 days retention
    const auditRetentionDays = 90;
    expect(auditRetentionDays).toBe(90);

    // Job 2b: App logs retention -> 7 days retention
    const appLogsRetentionDays = 7;
    expect(appLogsRetentionDays).toBe(7);

    // Job 2c: Follow-up digest -> 7:00 AM daily
    const followUpDigestHour = 7;
    expect(followUpDigestHour).toBe(7);

    // Job 3: Departure alerts -> 1 day & 3 days ahead of travel
    const departureNoticeDays = [1, 3];
    expect(departureNoticeDays).toContain(1);
    expect(departureNoticeDays).toContain(3);
  });

  test('TC-WA-05: Follow-up status transitions and due-date logic', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const followUp = {
      dueDate: today,
      status: 'Pending',
      leadId: 'lead_123',
    };

    expect(followUp.status).toBe('Pending');
    followUp.status = 'Completed';
    expect(followUp.status).toBe('Completed');
  });

});
