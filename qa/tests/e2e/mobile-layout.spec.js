import path from 'path';
import { test, expect, unique, uniquePhone, apiJson, daysFromNow } from '../support/fixtures.js';
import { createLead, createBooking, createWhatsAppChat } from '../support/seed.js';
import { sql } from '../support/tenant.js';

/**
 * Every app page at iPhone width. Most agents use EzzySync on a phone, and
 * the breakages they hit were all layout: a header row pushing its last
 * button off-screen, a date field wider than its drawer, a page that kept
 * the old scroll position. Nothing here checks behaviour - only that each
 * page fits the screen and scrolls like a page should.
 *
 * Screenshots land in reports/mobile-layout (or $MOBILE_SHOTS) for a look.
 */
test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

const SHOTS = process.env.MOBILE_SHOTS || path.resolve('reports/mobile-layout');

const PAGES = [
  '/dashboard', '/leads', '/pipeline', '/follow-ups', '/bookings', '/upcoming-trips',
  '/customers', '/tour-batches', '/invoices', '/quotations', '/hotels', '/expenses',
  '/billing', '/team', '/settings', '/profile', '/guide',
];

/** Elements poking past the right edge, ignoring ones inside a sideways scroller. */
async function overflowReport(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const main = document.querySelector('main');
    const bad = [];
    for (const el of document.querySelectorAll('main *, header *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.right <= vw + 1) continue;
      let p = el.parentElement;
      let clipped = false;
      while (p && p !== document.body) {
        const s = getComputedStyle(p);
        if (['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX) && p !== main) { clipped = true; break; }
        p = p.parentElement;
      }
      if (clipped) continue;
      const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      bad.push(`${el.tagName.toLowerCase()} "${label}" right=${Math.round(r.right)}`);
    }
    return {
      pageScroll: document.documentElement.scrollWidth - vw,
      mainScroll: main ? main.scrollWidth - main.clientWidth : 0,
      offenders: bad.slice(0, 6),
    };
  });
}

test.describe('Mobile layout (390px)', () => {
  test.beforeAll(async ({ api }) => {
    // Enough rows for a second page of customers and leads, like a real agency.
    for (let i = 0; i < 22; i++) {
      await createBooking(api, { customerName: unique(`QA Mobile Customer ${i}`), departure: daysFromNow(10 + i) });
    }
    for (let i = 0; i < 12; i++) {
      const lead = await createLead(api, { customerName: unique(`QA Mobile Lead ${i}`), interest: 'Chopta Tungnath' });
      if (i < 3) {
        await apiJson(await api.post(`leads/${lead.leadId}/follow-ups`, {
          data: { note: unique('QA call back'), activityType: 'call', nextFollowUpDate: daysFromNow(i) },
        }), 201);
      }
    }
  });

  for (const route of PAGES) {
    test(`${route} fits the screen`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);
      const name = route.slice(1).replace(/\//g, '-');
      await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });

      const report = await overflowReport(page);
      expect.soft(report.pageScroll, `${route} page scrolls sideways`).toBeLessThanOrEqual(1);
      expect.soft(report.mainScroll, `${route} content scrolls sideways`).toBeLessThanOrEqual(1);
      expect.soft(report.offenders, `${route} elements past the right edge`).toEqual([]);

      // And the bottom of the page, where pagination and footers live.
      await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = m.scrollHeight; });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(SHOTS, `${name}-bottom.png`) });
    });
  }

  test('the page title in the top bar names the page', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.locator('header').getByText('Customers', { exact: true })).toBeVisible();
  });

  test('opening another page starts it at the top', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    const main = page.locator('main');
    await main.evaluate((m) => { m.scrollTop = m.scrollHeight; });
    await expect.poll(() => main.evaluate((m) => m.scrollTop)).toBeGreaterThan(100);

    // Next page of the same list: the new rows should be read from the top.
    await page.getByTitle('Next page').click();
    await expect.poll(() => main.evaluate((m) => m.scrollTop)).toBeLessThan(5);

    await main.evaluate((m) => { m.scrollTop = m.scrollHeight; });
    await page.goto('/customers'); // full load resets anyway - now go via the menu
    await main.evaluate((m) => { m.scrollTop = m.scrollHeight; });
    await page.getByRole('button', { name: /menu/i }).first().click();
    await page.getByRole('link', { name: 'Bookings' }).first().click();
    await expect(page).toHaveURL(/\/bookings$/);
    await expect.poll(() => main.evaluate((m) => m.scrollTop)).toBeLessThan(5);
  });

  test('the app shell is exactly the visible screen, so only the content scrolls', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    const bodyScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(bodyScroll).toBeLessThanOrEqual(1);
  });

  test('follow-up date field stays inside the chat drawer', async ({ page, api, account }) => {
    // Opens the form and looks at it - nothing is saved and nothing is sent.
    const name = unique('QA Drawer');
    const phone = uniquePhone();
    const lead = await createLead(api, { customerName: name, phone });
    const { chatId } = await createWhatsAppChat(sql, account.tenantId, { phone, name, count: 3 });
    await sql(
      `UPDATE whatsapp_chats SET lead_id = (SELECT id FROM leads WHERE tenant_id = $1 AND lead_id = $2) WHERE id = $3`,
      [account.tenantId, lead.leadId, chatId]
    );
    await page.goto('/whatsapp-chat');
    await page.locator('button:has(h4)', { has: page.locator(`h4:text-is("${name}")`) }).click();
    await page.getByRole('button', { name: 'Customer 360' }).click();
    await page.getByRole('tablist', { name: 'Customer details' }).getByRole('tab', { name: /^Tasks/ }).click();
    await page.locator('#ws-panel').getByRole('button', { name: 'Follow-up' }).click();
    const input = page.locator('#ws-panel input[type="datetime-local"]');
    await expect(input).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, 'chat-follow-up-form.png') });
    const box = await input.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });
});
