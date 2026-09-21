import { test as base, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { provisionTenant, destroyTenant, closeBackend } from './tenant.js';

export const API_URL = (process.env.API_URL || 'http://localhost:5001/api').replace(/\/$/, '');

/** Logs in through the real login form and waits for the dashboard. */
export async function loginThroughUi(page, { email, password }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loginResponse = page.waitForResponse((r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
}

export const test = base.extend({
  // One freshly created tenant per worker - never the developer's own account,
  // and removed again when the worker finishes.
  account: [async ({}, use, workerInfo) => {
    const account = await provisionTenant(`w${workerInfo.workerIndex}`);
    await use(account);
    await destroyTenant(account.tenantId);
    await closeBackend();
  }, { scope: 'worker' }],

  // Session produced by a real UI login once per worker, reused by every test.
  workerStorageState: [async ({ browser, account }, use, workerInfo) => {
    const file = path.join(workerInfo.project.outputDir, `.auth-${workerInfo.workerIndex}.json`);
    const page = await browser.newPage({ baseURL: workerInfo.project.use.baseURL });
    // The first-run product tour would otherwise sit over every page.
    await page.addInitScript(() => {
      localStorage.setItem('journeyflow_tour_status', 'completed');
      localStorage.setItem('journeyflow_tour_done', 'true');
    });
    await loginThroughUi(page, account);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.context().storageState({ path: file });
    await page.close();
    await use(file);
  }, { scope: 'worker' }],

  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  // Authenticated API client for seeding and for checking what the UI showed
  // against what the server actually stored.
  api: [async ({ playwright, workerStorageState }, use) => {
    const state = JSON.parse(fs.readFileSync(workerStorageState, 'utf8'));
    const token = state.origins.flatMap((o) => o.localStorage).find((e) => e.name === 'hf_token')?.value;
    const ctx = await playwright.request.newContext({
      baseURL: `${API_URL}/`,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    await use(ctx);
    await ctx.dispose();
  }, { scope: 'worker' }],
});

export { expect };

export const unique = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;

/** A 10-digit Indian mobile number that won't collide across tests. */
export const uniquePhone = () => `9${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 1e3)).padStart(3, '0')}`;

export const today = () => new Date().toISOString().slice(0, 10);
export const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Toasts render as role="status"; asserts one with this text appeared. */
export async function expectToast(page, text) {
  await expect(page.getByRole('status').filter({ hasText: text }).first()).toBeVisible();
}

export function drawer(page, title) {
  return page.getByRole('dialog', { name: title });
}

export async function apiJson(response, expectedStatus) {
  expect(response.status(), await response.text()).toBe(expectedStatus);
  return response.json();
}

export const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
