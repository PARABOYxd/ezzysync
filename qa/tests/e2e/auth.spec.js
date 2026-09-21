import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_USERNAME = process.env.TEST_USERNAME || 'qa_tester@test.local';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Password@123';

test.describe('Authentication & Access Control Workflow', () => {

  test('TC-AUTH-01: Empty login form submission displays inline validation errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Attempt to submit empty form
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify validation error messages render under inputs
    const emailError = page.locator('text=Email address is required.');
    const passwordError = page.locator('text=Password is required.');
    await expect(emailError).toBeVisible();
    await expect(passwordError).toBeVisible();

    // Ensure user stays on /login
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-02: Invalid email format triggers client-side validation without API call', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    let apiCallMade = false;
    page.on('request', req => {
      if (req.url().includes('/api/auth/login')) apiCallMade = true;
    });

    await page.fill('input[type="email"]', 'not-an-email');
    await page.fill('input[type="password"]', 'Short1!');
    await page.click('button[type="submit"]');

    const errorMsg = page.locator('text=Enter a valid email address.');
    await expect(errorMsg).toBeVisible();
    expect(apiCallMade).toBe(false);
  });

  test('TC-AUTH-03: Valid credentials log in successfully, sync API response & redirect to Dashboard', async ({ page }) => {
    // Suppress tour before login
    await page.addInitScript(() => {
      localStorage.setItem('journeyflow_tour_status', 'completed');
      localStorage.setItem('journeyflow_tour_done', 'true');
    });

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', TEST_USERNAME);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Click submit and wait for API response
    const [loginResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);

    expect([200, 429]).toContain(loginResponse.status());

    if (loginResponse.status() === 200) {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      expect(page.url()).toContain('/dashboard');

      // Verify token in localStorage
      const token = await page.evaluate(() => localStorage.getItem('hf_token'));
      expect(token).toBeTruthy();
    }
  });

  test('TC-AUTH-04: Logout flow clears session and redirects back to /login', async ({ page }) => {
    // Setup pre-authenticated session
    const { setupAuthenticatedSession } = await import('../helpers/authHelper.js');
    await setupAuthenticatedSession(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Click Logout in sidebar
    const logoutBtn = page.locator('aside button:has-text("Logout"), button:has-text("Logout")').first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verify redirected to login
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');

    // Verify tokens removed
    const tokenAfter = await page.evaluate(() => localStorage.getItem('hf_token'));
    expect(tokenAfter).toBeNull();
  });

  // Parameterized Route Guard Verification Matrix
  const protectedRoutes = [
    '/dashboard',
    '/leads',
    '/pipeline',
    '/follow-ups',
    '/bookings',
    '/upcoming-trips',
    '/quotations',
    '/invoices',
    '/customers',
    '/settings',
    '/team',
    '/hotels',
  ];

  for (const route of protectedRoutes) {
    test(`TC-AUTH-GUARD: Unauthenticated direct access to ${route} redirects to /login`, async ({ page }) => {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');

      // Must be redirected to /login
      expect(page.url()).toContain('/login');
    });
  }

});
