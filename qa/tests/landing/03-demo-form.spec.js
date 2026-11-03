import { test, expect } from '@playwright/test';

// The "Book your walkthrough" form on /contact. The CRM backend is never
// called: /api/walkthrough and the direct backend fallback are both mocked.

const BACKEND = '**/api/public/walkthrough';

async function openForm(page) {
  await page.goto('/contact');
  const form = page.locator('#demo form');
  await form.scrollIntoViewIfNeeded();
  return form;
}

const fill = async (form, v = {}) => {
  const d = { name: 'Asha Rao', agency: 'Apex Travels', email: 'asha@apex.in', phone: '', ...v };
  await form.locator('#demo-name').fill(d.name);
  await form.locator('#demo-agency').fill(d.agency);
  await form.locator('#demo-email').fill(d.email);
  await form.locator('#demo-phone').fill(d.phone);
};

const submit = (form) => form.getByRole('button', { name: /request free access|submitting/i });

test.describe('validation', () => {
  test('empty submit shows all required errors and sends nothing', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/walkthrough', (r) => { calls++; r.fulfill({ status: 200, json: { success: true } }); });
    const form = await openForm(page);
    await submit(form).click();
    await expect(form.getByText('Name is required.', { exact: true })).toBeVisible();
    await expect(form.getByText('Agency name is required.', { exact: true })).toBeVisible();
    await expect(form.getByText('Email is required.', { exact: true })).toBeVisible();
    expect(calls).toBe(0);
  });

  test('whitespace-only fields count as empty', async ({ page }) => {
    const form = await openForm(page);
    await fill(form, { name: '   ', agency: '   ', email: '   ' });
    await submit(form).click();
    await expect(form.getByText('Name is required.', { exact: true })).toBeVisible();
    await expect(form.getByText('Agency name is required.', { exact: true })).toBeVisible();
    await expect(form.getByText('Email is required.', { exact: true })).toBeVisible();
  });

  for (const bad of ['plainaddress', 'a@b', '@x.com', 'a b@x.com', 'a@@x.com']) {
    test(`rejects email "${bad}"`, async ({ page }) => {
      const form = await openForm(page);
      await fill(form, { email: bad });
      await submit(form).click();
      await expect(form.getByText('Enter a valid email address.')).toBeVisible();
    });
  }

  test('rejects a phone number that is too short', async ({ page }) => {
    const form = await openForm(page);
    await fill(form, { phone: '123' });
    await submit(form).click();
    await expect(form.getByText(/valid phone number/i)).toBeVisible();
  });

  test('phone is optional', async ({ page }) => {
    await page.route('**/api/walkthrough', (r) => r.fulfill({ status: 200, json: { success: true } }));
    const form = await openForm(page);
    await fill(form, { phone: '' });
    await submit(form).click();
    await expect(page.getByText('Demo request submitted!')).toBeVisible();
  });

  test('letters are stripped from the phone field as you type', async ({ page }) => {
    const form = await openForm(page);
    await form.locator('#demo-phone').pressSequentially('abc+91 98765-43210xyz');
    await expect(form.locator('#demo-phone')).toHaveValue('+91 98765-43210');
  });

  test('a normal Indian number with +91 and spaces is accepted', async ({ page }) => {
    await page.route('**/api/walkthrough', (r) => r.fulfill({ status: 200, json: { success: true } }));
    const form = await openForm(page);
    await fill(form, { phone: '+91 98765 43210' });
    await submit(form).click();
    await expect(page.getByText('Demo request submitted!')).toBeVisible();
  });

  test('error clears as soon as the field is edited', async ({ page }) => {
    const form = await openForm(page);
    await submit(form).click();
    await expect(form.getByText('Name is required.', { exact: true })).toBeVisible();
    await form.locator('#demo-name').fill('A');
    await expect(form.getByText('Name is required.', { exact: true })).toHaveCount(0);
  });

  test('errors are announced to assistive tech and tied to their field', async ({ page }) => {
    const form = await openForm(page);
    await submit(form).click();
    await expect(form.locator('#demo-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('#demo-email')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('[role="alert"]').first()).toBeVisible();
  });

  test('first invalid field gets focus after a failed submit', async ({ page }) => {
    const form = await openForm(page);
    await submit(form).click();
    await expect(form.locator('#demo-name')).toBeFocused();
  });
});

test.describe('submit', () => {
  test('sends the right payload, trimmed, and shows the thank-you card', async ({ page }) => {
    let body;
    await page.route('**/api/walkthrough', (r) => { body = r.request().postDataJSON(); r.fulfill({ status: 200, json: { success: true } }); });
    const form = await openForm(page);
    await fill(form, { name: '  Asha Rao  ', agency: ' Apex Travels ', email: '  asha@apex.in ', phone: '+91 98765 43210' });
    await submit(form).click();
    await expect(page.getByText('Demo request submitted!')).toBeVisible();
    expect(body).toEqual({ name: 'Asha Rao', agencyName: 'Apex Travels', email: 'asha@apex.in', phone: '+91 98765 43210' });
    await expect(page.locator('#demo form')).toHaveCount(0);
  });

  test('button is disabled while sending, so a double click sends once', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/walkthrough', async (r) => {
      calls++;
      await new Promise((res) => setTimeout(res, 800));
      r.fulfill({ status: 200, json: { success: true } });
    });
    const form = await openForm(page);
    await fill(form);
    await submit(form).dblclick();
    await expect(submit(form)).toBeDisabled();
    await expect(page.getByText('Demo request submitted!')).toBeVisible();
    expect(calls).toBe(1);
  });

  test('server validation message is shown and what the user typed is kept', async ({ page }) => {
    await page.route('**/api/walkthrough', (r) => r.fulfill({ status: 400, json: { message: 'This email is already registered.' } }));
    const form = await openForm(page);
    await fill(form, { name: 'Keep Me' });
    await submit(form).click();
    await expect(form.getByText('This email is already registered.')).toBeVisible();
    await expect(form.locator('#demo-name')).toHaveValue('Keep Me');
    await expect(submit(form)).toBeEnabled();
  });

  test('server down: friendly message, form stays usable', async ({ page }) => {
    await page.route('**/api/walkthrough', (r) => r.fulfill({ status: 500, json: { message: 'Unable to reach the server. Please try again shortly.' } }));
    const form = await openForm(page);
    await fill(form);
    await submit(form).click();
    await expect(form.getByText(/unable to reach the server/i)).toBeVisible();
    await expect(submit(form)).toBeEnabled();
  });

  test('network drop on our route falls back to the backend directly', async ({ page }) => {
    await page.route('**/api/walkthrough', (r) => r.abort('connectionreset'));
    await page.route(BACKEND, (r) => r.fulfill({ status: 200, json: { success: true } }));
    const form = await openForm(page);
    await fill(form);
    await submit(form).click();
    await expect(page.getByText('Demo request submitted!')).toBeVisible();
  });

  test('both routes down: shows an error, never a raw browser message', async ({ page }) => {
    await page.route('**/api/walkthrough', (r) => r.abort('connectionreset'));
    await page.route(BACKEND, (r) => r.abort('connectionreset'));
    const form = await openForm(page);
    await fill(form);
    await submit(form).click();
    const msg = form.locator('p.text-red-500').last();
    await expect(msg).toBeVisible();
    await expect(msg).not.toHaveText(/failed to fetch|load failed|networkerror/i);
  });

  test('a second request can be made after a failed one', async ({ page }) => {
    let n = 0;
    await page.route('**/api/walkthrough', (r) => {
      n++;
      r.fulfill(n === 1 ? { status: 500, json: { message: 'Try later' } } : { status: 200, json: { success: true } });
    });
    const form = await openForm(page);
    await fill(form);
    await submit(form).click();
    await expect(form.getByText('Try later')).toBeVisible();
    await submit(form).click();
    await expect(page.getByText('Demo request submitted!')).toBeVisible();
  });
});

test.describe('layout', () => {
  test('form fields fit the screen and are big enough to tap', async ({ page }) => {
    const form = await openForm(page);
    const vw = page.viewportSize().width;
    for (const id of ['#demo-name', '#demo-agency', '#demo-email', '#demo-phone']) {
      const b = await form.locator(id).boundingBox();
      expect(b.x, id).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, `${id} runs off screen`).toBeLessThanOrEqual(vw);
      expect(b.height, `${id} is only ${Math.round(b.height)}px tall`).toBeGreaterThanOrEqual(40);
    }
  });

  test('inputs are 16px+ so iOS does not zoom the page on focus', async ({ page }) => {
    const form = await openForm(page);
    for (const id of ['#demo-name', '#demo-email', '#demo-phone']) {
      const size = await form.locator(id).evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
      expect(size, `${id} font-size`).toBeGreaterThanOrEqual(16);
    }
  });

  test('every field has a visible label', async ({ page }) => {
    const form = await openForm(page);
    for (const label of [/your name/i, /agency name/i, /work email/i, /phone number/i]) {
      await expect(form.getByLabel(label)).toBeVisible();
    }
  });

  test('autofill hints are set', async ({ page }) => {
    const form = await openForm(page);
    await expect(form.locator('#demo-name')).toHaveAttribute('autocomplete', 'name');
    await expect(form.locator('#demo-email')).toHaveAttribute('autocomplete', 'email');
    await expect(form.locator('#demo-phone')).toHaveAttribute('autocomplete', 'tel');
  });
});
