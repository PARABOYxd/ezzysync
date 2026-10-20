import { test, expect } from '@playwright/test';
import { horizontalOverflow } from './helpers.js';

// /free-itinerary-builder. The AI endpoint is mocked to fail so the built-in
// offline engine answers - that keeps the tests fast, free and deterministic.

const isPhone = (page) => page.viewportSize().width < 1024;

async function open(page, { aiDown = true } = {}) {
  if (aiDown) {
    await page.route('**/api/generate-itinerary', (r) => r.fulfill({ status: 500, json: { success: false } }));
    await page.route('**/api/public/generate-free-itinerary', (r) => r.fulfill({ status: 500, json: {} }));
  }
  await page.goto('/free-itinerary-builder');
  await page.locator('#itin-destination').scrollIntoViewIfNeeded();
}

const generate = (page) => page.getByRole('button', { name: /generate \/ update with ai/i });
const previewTab = (page) => page.getByRole('button', { name: /preview/i }).first();
// a visible label (span), never the <option> in the duration dropdown
const durationLabel = (page, text) => page.locator('span', { hasText: new RegExp(`^\\s*${text}\\s*$`) }).first();

async function generateTrip(page, { dest = 'Goa', days = '3', agency = 'Apex Travels' } = {}) {
  await page.locator('#itin-destination').fill(dest);
  await page.locator('#itin-days').selectOption(days);
  await page.locator('#itin-agency').fill(agency);
  await generate(page).click();
  if (isPhone(page)) await expect(previewTab(page)).toBeVisible();
  await expect(page.locator('#itin-title')).toBeVisible({ timeout: 15_000 });
}

test.describe('form', () => {
  test('every field has a label you can click (label is tied to the input)', async ({ page }) => {
    await open(page);
    for (const [label, id] of [
      [/ai itinerary command/i, '#itin-prompt'],
      [/destination name/i, '#itin-destination'],
      [/trip duration/i, '#itin-days'],
      [/agency name/i, '#itin-agency'],
      [/whatsapp \/ mobile/i, '#itin-phone'],
      [/email address/i, '#itin-email'],
    ]) {
      await expect(page.getByLabel(label), `${label} has no associated input`).toHaveCount(1);
      await expect(page.locator(id)).toBeVisible();
    }
  });

  test('inputs are 16px+ so iOS does not zoom on focus', async ({ page }) => {
    await open(page);
    for (const id of ['#itin-prompt', '#itin-destination', '#itin-agency', '#itin-phone', '#itin-email', '#itin-days']) {
      const px = await page.locator(id).evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
      expect(px, id).toBeGreaterThanOrEqual(16);
    }
  });

  test('Generate is disabled until there is a destination or a prompt', async ({ page }) => {
    await open(page);
    await page.locator('#itin-destination').fill('');
    await page.locator('#itin-prompt').fill('');
    await expect(generate(page)).toBeDisabled();
    await page.locator('#itin-destination').fill('Goa');
    await expect(generate(page)).toBeEnabled();
  });

  test('a prompt alone is enough: destination is worked out from it', async ({ page }) => {
    await open(page);
    await page.locator('#itin-destination').fill('');
    await page.locator('#itin-prompt').fill('Create a 3 day Goa itinerary with beaches and cafes');
    await generate(page).click();
    await expect(page.locator('#itin-title')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#itin-destination')).toHaveValue(/goa/i);
  });

  test('page fits the screen before and after generating', async ({ page }) => {
    await open(page);
    expect(await horizontalOverflow(page)).toBe(0);
    await generateTrip(page);
    expect(await horizontalOverflow(page)).toBe(0);
  });
});

test.describe('generating', () => {
  test('works with the AI offline (built-in engine answers)', async ({ page }) => {
    await open(page);
    await generateTrip(page, { dest: 'Goa', days: '3' });
    await expect(page.locator('input[value^="Day 1"]').first()).toBeVisible();
    await expect(page.getByText(/day-by-day schedule \(3 days\)/i)).toBeVisible();
  });

  for (const days of ['1', '2', '7', '14']) {
    test(`${days}-day trip has ${days} day cards`, async ({ page }) => {
      await open(page);
      await generateTrip(page, { dest: 'Manali', days });
      await expect(page.getByText(new RegExp(`day-by-day schedule \\(${days} days?\\)`, 'i'))).toBeVisible();
    });
  }

  test('duration label reads correctly (1 Day Trip, 2 Days / 1 Night)', async ({ page }) => {
    await open(page);
    await generateTrip(page, { dest: 'Rishikesh', days: '1' });
    await expect(durationLabel(page, '1 Day Trip')).toBeVisible();
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll('span, p, h1, h2, h3')].filter((e) => !e.children.length && /\b1 Days\b|\b1 Nights\b/.test(e.textContent)).length);
    expect(bad, '"1 Days" / "1 Nights" shown').toBe(0);
    // on phones/tablets the form is on its own tab once a result is showing
    if (isPhone(page)) await page.getByRole('button', { name: /ai tool & details/i }).click();
    await page.locator('#itin-days').selectOption('2');
    await generate(page).click();
    await expect(durationLabel(page, '2 Days / 1 Night')).toBeVisible();
  });

  test('pressing Enter twice quickly sends one request', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/generate-itinerary', async (r) => {
      calls++;
      await new Promise((res) => setTimeout(res, 700));
      r.fulfill({ status: 500, json: {} });
    });
    await page.route('**/api/public/generate-free-itinerary', (r) => r.fulfill({ status: 500, json: {} }));
    await page.goto('/free-itinerary-builder');
    await page.locator('#itin-destination').fill('Goa');
    await page.locator('#itin-destination').press('Enter');
    await page.locator('#itin-destination').press('Enter');
    await expect(page.locator('#itin-title')).toBeVisible({ timeout: 15_000 });
    expect(calls).toBe(1);
  });

  test('uses the AI answer when the server returns one', async ({ page }) => {
    await page.route('**/api/generate-itinerary', (r) =>
      r.fulfill({
        status: 200,
        json: {
          success: true,
          structured: {
            title: 'Test Goa Trip', destination: 'Goa', agencyName: 'Apex Travels', phone: '', email: '',
            days: [{ dayNumber: 1, title: 'Day 1: Arrival', points: ['Morning: Beach'] }, { dayNumber: 2, title: 'Day 2: Old Goa', points: ['Morning: Churches'] }],
            inclusions: ['Hotel'], exclusions: ['Flights'], tips: ['Carry sunscreen'],
          },
        },
      }));
    await page.goto('/free-itinerary-builder');
    await page.locator('#itin-destination').fill('Goa');
    await generate(page).click();
    await expect(page.locator('#itin-title')).toHaveValue('Test Goa Trip');
    await expect(durationLabel(page, '2 Days / 1 Night')).toBeVisible();
  });

  test('rate limited (429): still produces an itinerary from the built-in engine', async ({ page }) => {
    await page.route('**/api/generate-itinerary', (r) => r.fulfill({ status: 429, json: { success: false, message: 'Too many requests' } }));
    await page.route('**/api/public/generate-free-itinerary', (r) => r.fulfill({ status: 429, json: {} }));
    await page.goto('/free-itinerary-builder');
    await page.locator('#itin-destination').fill('Kashmir');
    await generate(page).click();
    await expect(page.locator('#itin-title')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('editing', () => {
  test('edit title, add and remove a day, add and remove a point', async ({ page }) => {
    await open(page);
    await generateTrip(page, { dest: 'Goa', days: '3' });
    await page.locator('#itin-title').fill('My Custom Title');
    await expect(page.locator('#itin-title')).toHaveValue('My Custom Title');

    await page.getByRole('button', { name: /add day/i }).click();
    await expect(page.getByText(/day-by-day schedule \(4 days\)/i)).toBeVisible();
    await page.getByRole('button', { name: 'Remove this day' }).last().click();
    await expect(page.getByText(/day-by-day schedule \(3 days\)/i)).toBeVisible();

    const day1Points = page.getByRole('button', { name: /remove point \d+ from day 1$/i });
    const before = await day1Points.count();
    await page.getByRole('button', { name: /remove point 1 from day 1$/i }).click();
    await expect(day1Points).toHaveCount(before - 1);
  });

  test('last remaining day cannot be removed', async ({ page }) => {
    await open(page);
    await generateTrip(page, { dest: 'Goa', days: '1' });
    await expect(page.getByRole('button', { name: 'Remove this day' })).toHaveCount(0);
  });

  test('add inclusion ignores blank, accepts text', async ({ page }) => {
    await open(page);
    await generateTrip(page);
    const input = page.getByPlaceholder('Add custom inclusion...');
    await input.scrollIntoViewIfNeeded();
    await input.fill('   ');
    await input.press('Enter');
    await input.fill('Airport pickup');
    await input.press('Enter');
    await expect(page.getByText('Airport pickup').first()).toBeVisible();
    await expect(input).toHaveValue('');
  });

  test('hostile text in fields is shown as text, never run', async ({ page }) => {
    await open(page);
    let dialog = false;
    page.on('dialog', (d) => { dialog = true; d.dismiss(); });
    await generateTrip(page);
    await page.locator('#itin-title').fill('<img src=x onerror=alert(1)>');
    await page.getByRole('button', { name: /generate final itinerary/i }).first().click();
    await page.waitForTimeout(500);
    expect(dialog).toBe(false);
    await expect(page.locator('#printable-itinerary img[src="x"]')).toHaveCount(0);
  });
});

test.describe('final voucher', () => {
  const finalize = (page) => page.getByRole('button', { name: /generate final itinerary/i }).first().click();

  test('open voucher, go back to studio, edits survive', async ({ page }) => {
    await open(page);
    await generateTrip(page, { dest: 'Goa', days: '3', agency: 'Apex Travels' });
    await page.locator('#itin-title').fill('Edited Title');
    await finalize(page);
    await expect(page.locator('#printable-itinerary')).toBeVisible();
    await expect(page.locator('#printable-itinerary')).toContainText('Apex Travels');
    await page.getByRole('button', { name: /edit in studio/i }).click();
    await expect(page.locator('#itin-title')).toHaveValue('Edited Title');
  });

  test('copy for WhatsApp: says Copied only when it worked', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await open(page);
    await generateTrip(page);
    await finalize(page);
    await page.getByRole('button', { name: /copy whatsapp text/i }).click();
    await expect(page.getByRole('button', { name: /copied!/i })).toBeVisible();
  });

  test('copy does not crash when the browser blocks the clipboard', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
    });
    await open(page);
    await generateTrip(page);
    await finalize(page);
    await page.getByRole('button', { name: /copy whatsapp text/i }).click();
    await page.waitForTimeout(400);
    expect(errors.filter((e) => /denied/.test(e)), 'unhandled clipboard error').toEqual([]);
  });

  test('"New" clears everything and returns to the empty form', async ({ page }) => {
    await open(page);
    await generateTrip(page);
    await finalize(page);
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await expect(page.locator('#itin-destination')).toHaveValue('');
    await expect(page.locator('#itin-title')).toHaveCount(0);
  });

  test('voucher fits the screen', async ({ page }) => {
    await open(page);
    await generateTrip(page);
    await finalize(page);
    await expect(page.locator('#printable-itinerary')).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);
  });
});

test.describe('API routes', () => {
  test('generate-itinerary rejects an empty request and bad JSON', async ({ request }) => {
    const ip = { 'x-forwarded-for': '10.9.9.0' };
    const empty = await request.post('/api/generate-itinerary', { data: {}, headers: ip });
    expect(empty.status()).toBe(400);
    const bad = await request.post('/api/generate-itinerary', { headers: { ...ip, 'content-type': 'application/json' }, data: '{not json' });
    expect(bad.status()).toBe(400);
  });

  test('days is clamped, so a huge value cannot make a giant prompt', async ({ request }) => {
    test.setTimeout(120_000);
    const r = await request.post('/api/generate-itinerary', { data: { destination: 'Goa', days: 100000 }, headers: { 'x-forwarded-for': '10.9.9.1' } });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.structured.days.length).toBeLessThanOrEqual(30);
  });

  test('walkthrough route validates before forwarding', async ({ request }) => {
    const r = await request.post('/api/walkthrough', { data: { name: '', agencyName: '', email: '' }, headers: { 'x-forwarded-for': '10.9.9.2' } });
    expect(r.status()).toBe(400);
    expect((await r.json()).message).toMatch(/required/i);
  });

  test('walkthrough route is rate limited per caller', async ({ request }) => {
    const ip = { 'x-forwarded-for': `10.9.${Math.floor(Math.random() * 200)}.${Date.now() % 250}` };
    let limited = 0;
    for (let i = 0; i < 12; i++) {
      const r = await request.post('/api/walkthrough', { data: {}, headers: ip });
      if (r.status() === 429) limited++;
    }
    expect(limited, 'no 429 after 12 rapid calls from one IP').toBeGreaterThan(0);
  });
});
