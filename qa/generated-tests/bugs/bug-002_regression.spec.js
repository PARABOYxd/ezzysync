// Regression Test for BUG-002: Dead-End Sidebar Link: Route "/pipeline" (Pipeline) leads to 404 Page Not Found
import { test, expect } from '@playwright/test';

test.describe('Regression: BUG-002', () => {
  test('should verify bug condition is prevented', async ({ page }) => {
    await page.goto('http://localhost:5173/pipeline');
    // 1. Log in as an authenticated user
    // 2. Click on the "Pipeline" link in the sidebar (navigates to /pipeline)
    // 3. Observe the rendered page
    // Assert fix: page must not show error
    await expect(page.locator('body')).not.toContainText('404');
  });
});
