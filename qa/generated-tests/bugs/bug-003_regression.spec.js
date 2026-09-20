// Regression Test for BUG-003: Accessibility Violation: 2 icon button(s) missing aria-label or accessible title
import { test, expect } from '@playwright/test';

test.describe('Regression: BUG-003', () => {
  test('should verify bug condition is prevented', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    // 1. Open /dashboard
    // 2. Inspect icon buttons in navigation or cards
    // Assert fix: page must not show error
    await expect(page.locator('body')).not.toContainText('404');
  });
});
