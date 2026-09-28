import { test, expect } from '@playwright/test';
import { API_URL, unique } from '../support/fixtures.js';
import { sql, closeBackend } from '../support/tenant.js';

/**
 * With ENABLE_SELF_SIGNUP off (the default), nobody can create their own
 * account: no "Continue with Google", no registration form. The team creates
 * accounts, and a visitor can only leave a request.
 *
 * Skipped automatically if the backend under test has the flag switched on.
 */
test.describe('Sign-up closed (ENABLE_SELF_SIGNUP off)', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.get(`${API_URL}/public/features`);
    const { features } = await res.json();
    test.skip(features?.selfSignup === true, 'self sign-up is switched on for this backend');
  });

  test.afterAll(async () => { await closeBackend(); });

  test('login page offers no Google sign-in and no self sign-up', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByText('Continue with Google')).toHaveCount(0);
    await expect(page.getByText('Create account')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Request access' })).toBeVisible();
  });

  test('the registration API refuses to create an account', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/register/send-otp`, { data: { email: `${unique('closed')}@ezzysync.test` } });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe('SIGNUP_DISABLED');
  });

  test('an old Google sign-in link lands back on login with an explanation', async ({ page }) => {
    await page.goto(`${API_URL}/auth/google`);
    await expect(page).toHaveURL(/\/login\?error=signup_disabled/);
    await expect(page.getByRole('status').filter({ hasText: 'Google sign-in is not available' }).first()).toBeVisible();
  });

  test('/register shows the request form, and a request is stored for the team', async ({ page }) => {
    const email = `${unique('request')}@ezzysync.test`;
    await page.goto('/login');
    await page.getByRole('link', { name: 'Request access' }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: /Request (agency )?access/i })).toBeVisible();

    // Required fields are checked before anything is sent.
    await page.getByRole('button', { name: 'Request access' }).click();
    await expect(page.getByText('Your name is required.')).toBeVisible();
    await expect(page.getByText('Agency name is required.')).toBeVisible();

    await page.getByLabel('Your name').fill('QA Visitor');
    await page.getByLabel('Agency / Company Name').fill('QA Travels');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Phone').fill('9876543210');
    const sent = page.waitForResponse((r) => r.url().endsWith('/public/walkthrough') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Request access' }).click();
    expect((await sent).status()).toBe(201);
    await expect(page.getByText('Request received')).toBeVisible();

    const { rows } = await sql('SELECT name, agency_name FROM walkthrough_requests WHERE email = $1', [email]);
    expect(rows).toHaveLength(1);
    expect(rows[0].agency_name).toBe('QA Travels');
    await sql('DELETE FROM walkthrough_requests WHERE email = $1', [email]);
  });
});
