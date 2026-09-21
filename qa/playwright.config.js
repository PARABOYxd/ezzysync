import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e',
  // Old specs that forged an admin JWT into a real tenant - kept for
  // reference, never run by default. See README.
  testIgnore: ['**/legacy/**'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Each worker gets its own freshly provisioned tenant; tests inside one
  // file run in order so a workflow can build on the step before it.
  fullyParallel: false,
  workers: process.env.WORKERS ? parseInt(process.env.WORKERS, 10) : 3,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/e2e-html', open: 'never' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    headless: process.env.HEADLESS !== 'false',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    launchOptions: {
      slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO, 10) : 0,
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
