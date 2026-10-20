import { test, expect } from '@playwright/test';

// "Book a demo" on the home page: no server, it opens WhatsApp (wa.me) with the
// details filled in. window.open is captured, so nothing really opens.

async function openForm(page) {
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = (...args) => { window.__opened.push(args); return null; };
  });
  await page.goto('/');
  const form = page.locator('#demo form');
  await form.scrollIntoViewIfNeeded();
  return form;
}
const opened = (page) => page.evaluate(() => window.__opened);
const submit = (form) => form.getByRole('button', { name: /continue on whatsapp/i });

test.describe('phone validation', () => {
  test('empty number: shows an error, opens nothing', async ({ page }) => {
    const form = await openForm(page);
    await submit(form).click();
    await expect(form.getByRole('alert')).toContainText(/valid 10-digit/i);
    expect(await opened(page)).toHaveLength(0);
  });

  for (const bad of ['12345', '5876543210', '98765 4321', '98765432101234', 'abcdefghij', '+1 202 555 0123']) {
    test(`rejects "${bad}"`, async ({ page }) => {
      const form = await openForm(page);
      await form.locator('#demo-phone').fill(bad);
      await submit(form).click();
      await expect(form.getByRole('alert')).toBeVisible();
      expect(await opened(page)).toHaveLength(0);
    });
  }

  for (const good of ['9876543210', '+91 98765 43210', '+919876543210', '919876543210', '09876543210', ' 98765 43210 ']) {
    test(`accepts "${good}" and normalises to +919876543210`, async ({ page }) => {
      const form = await openForm(page);
      await form.locator('#demo-phone').fill(good);
      await submit(form).click();
      const calls = await opened(page);
      expect(calls).toHaveLength(1);
      expect(decodeURIComponent(calls[0][0])).toContain('WhatsApp: +919876543210');
    });
  }

  test('error shows when leaving the field, clears on typing', async ({ page }) => {
    const form = await openForm(page);
    await form.locator('#demo-phone').fill('123');
    await form.locator('#demo-city').focus();
    await expect(form.getByRole('alert')).toBeVisible();
    await form.locator('#demo-phone').fill('1234');
    await expect(form.getByRole('alert')).toHaveCount(0);
  });

  test('field is marked invalid for screen readers', async ({ page }) => {
    const form = await openForm(page);
    await form.locator('#demo-phone').fill('123');
    await submit(form).click();
    await expect(form.locator('#demo-phone')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('#demo-phone')).toHaveAttribute('aria-describedby', 'phone-error');
  });
});

test.describe('message', () => {
  test('opens wa.me to the right number with every detail filled in', async ({ page }) => {
    const form = await openForm(page);
    await form.locator('#demo-agency').fill('Royal Escapes');
    await form.locator('#demo-phone').fill('9876543210');
    await form.locator('#demo-city').fill('Jaipur');
    await form.locator('#demo-time').selectOption({ label: 'Evening (4pm–8pm)' });
    await submit(form).click();
    const [[url, target, features]] = await opened(page);
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://wa.me/918104665986');
    const text = u.searchParams.get('text');
    expect(text).toContain('Agency: Royal Escapes');
    expect(text).toContain('City: Jaipur');
    expect(text).toContain('Preferred time: Evening (4pm–8pm)');
    expect(target).toBe('_blank');
    expect(features, 'new tab must not get access to this page (noopener)').toMatch(/noopener/);
  });

  test('blank agency and city become "-", time defaults to Any time', async ({ page }) => {
    const form = await openForm(page);
    await form.locator('#demo-phone').fill('9876543210');
    await submit(form).click();
    const text = new URL((await opened(page))[0][0]).searchParams.get('text');
    expect(text).toContain('Agency: -');
    expect(text).toContain('City: -');
    expect(text).toContain('Preferred time: Any time');
  });

  test('special characters survive the URL (&, #, emoji, newline)', async ({ page }) => {
    const form = await openForm(page);
    await form.locator('#demo-agency').fill('A&B #1 Tours 🌴');
    await form.locator('#demo-phone').fill('9876543210');
    await submit(form).click();
    const text = new URL((await opened(page))[0][0]).searchParams.get('text');
    expect(text).toContain('Agency: A&B #1 Tours 🌴');
    expect(text.split('\n').length).toBeGreaterThanOrEqual(5);
  });

  test('after sending: confirmation and a fallback link', async ({ page }) => {
    const form = await openForm(page);
    await form.locator('#demo-phone').fill('9876543210');
    await submit(form).click();
    await expect(page.getByText('WhatsApp should be open')).toBeVisible();
    await expect(page.getByRole('link', { name: /didn.t open/i })).toHaveAttribute('href', 'https://wa.me/918104665986');
  });
});

test.describe('layout', () => {
  test('fields fit the screen, are 16px+ and 40px+ tall', async ({ page }) => {
    const form = await openForm(page);
    const vw = page.viewportSize().width;
    for (const id of ['#demo-agency', '#demo-phone', '#demo-city', '#demo-time']) {
      const el = form.locator(id);
      const b = await el.boundingBox();
      expect(b.x + b.width, `${id} runs off screen`).toBeLessThanOrEqual(vw);
      expect(b.height, `${id} height`).toBeGreaterThanOrEqual(40);
      expect(await el.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)), `${id} font`).toBeGreaterThanOrEqual(16);
    }
  });

  test('"Start a free trial" fallback goes to sign-up', async ({ page }) => {
    const form = await openForm(page);
    await expect(form.getByRole('link', { name: /start a free trial/i })).toHaveAttribute('href', /\/register$/);
  });

  test('call link is a real tel: link with the support number', async ({ page }) => {
    await openForm(page);
    await expect(page.locator('#demo a[href^="tel:"]')).toHaveAttribute('href', 'tel:+91-8104665986');
  });
});
