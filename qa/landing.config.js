import { defineConfig, devices } from '@playwright/test';

/**
 * Landing site (landing/, Next.js) tests. Separate from playwright.config.js:
 * the marketing site needs no backend, tenant or login - just a running
 * `next start` (or dev server). Default port 3100; override with LANDING_URL.
 *
 *   npm run test:landing
 */
const BASE_URL = process.env.LANDING_URL || 'http://localhost:3100';

export default defineConfig({
  testDir: './tests/landing',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.WORKERS ? parseInt(process.env.WORKERS, 10) : 4,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { outputFolder: 'reports/landing-html', open: 'never' }]],
  outputDir: 'test-results/landing',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'small-phone', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 } } },
  ],
});
