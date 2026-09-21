import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  timeout: process.env.SLOWMO ? 60000 : 30000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: !process.env.SLOWMO,
  retries: 0,
  workers: process.env.WORKERS ? parseInt(process.env.WORKERS, 10) : (process.env.SLOWMO ? 1 : 4),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/e2e-html', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    headless: process.env.HEADLESS === 'true' ? true : (process.env.HEADLESS === 'false' ? false : undefined),
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO, 10) : 0,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
