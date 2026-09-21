import { test, expect, loginThroughUi, expectToast } from '../support/fixtures.js';

// Every test here starts logged out, in its own fresh browser context.
async function loggedOutPage(browser, testInfo) {
  // storageState must be emptied explicitly - otherwise newContext() inherits
  // the worker's logged-in session from the config.
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    storageState: { cookies: [], origins: [] },
  });
  await context.addInitScript(() => {
    localStorage.setItem('journeyflow_tour_status', 'completed');
    localStorage.setItem('journeyflow_tour_done', 'true');
  });
  return context.newPage();
}

test.describe('Authentication', () => {
  test('empty submit shows field errors and never calls the API', async ({ browser }, testInfo) => {
    const page = await loggedOutPage(browser, testInfo);
    let loginCalls = 0;
    page.on('request', (r) => { if (r.url().endsWith('/auth/login')) loginCalls += 1; });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await expect(page.getByText('Email address is required.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
    expect(loginCalls).toBe(0);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('malformed email is rejected client-side', async ({ browser }, testInfo) => {
    const page = await loggedOutPage(browser, testInfo);
    await page.goto('/login');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('whatever123');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  });

  test('wrong password is rejected by the server with a readable message', async ({ browser, account }, testInfo) => {
    const page = await loggedOutPage(browser, testInfo);
    await page.goto('/login');
    await page.getByLabel('Email').fill(account.email);
    await page.getByLabel('Password').fill(`${account.password}-wrong`);
    const res = page.waitForResponse((r) => r.url().endsWith('/auth/login'));
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    expect((await res).status()).toBe(401);
    await expectToast(page, 'Invalid email or password.');
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('hf_token'))).toBeNull();
  });

  test('unknown account gets the same message - no account enumeration', async ({ browser }, testInfo) => {
    const page = await loggedOutPage(browser, testInfo);
    await page.goto('/login');
    await page.getByLabel('Email').fill(`nobody-${Date.now()}@ezzysync.test`);
    await page.getByLabel('Password').fill('SomePassword1!');
    const res = page.waitForResponse((r) => r.url().endsWith('/auth/login'));
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    expect((await res).status()).toBe(401);
    await expectToast(page, 'Invalid email or password.');
  });

  test('protected pages redirect to login when signed out', async ({ browser }, testInfo) => {
    const page = await loggedOutPage(browser, testInfo);
    for (const route of ['/dashboard', '/bookings', '/billing', '/leads']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('valid login lands on the dashboard as this tenant, then logout ends the session', async ({ browser, account }, testInfo) => {
    const page = await loggedOutPage(browser, testInfo);
    await loginThroughUi(page, account);
    await expectToast(page, 'Welcome back!');
    await expect(page.getByText(account.companyName).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('hf_token'))).toBeTruthy();

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('hf_token'))).toBeNull();

    // The old session must not come back on navigation.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });
});
