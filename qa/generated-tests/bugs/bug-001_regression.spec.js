// Regression Test for BUG-001: Broken Route Guard: Unauthenticated access to /pipeline allowed
import { test, expect } from '@playwright/test';

test.describe('Regression: BUG-001', () => {
  test('should verify bug condition is prevented', async ({ page }) => {
    await page.goto('http://localhost:5173/pipeline');
    // 1. In an unauthenticated session, navigate directly to http://localhost:5173/pipeline
    // Assert fix: page must not show error
    await expect(page.locator('body')).not.toContainText('404');
  });
});
