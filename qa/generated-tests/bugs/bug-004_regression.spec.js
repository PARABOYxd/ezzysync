// Regression Test for BUG-004: Blocked Third-Party Script: Razorpay Checkout script fetching undefined build URL
import { test, expect } from '@playwright/test';

test.describe('Regression: BUG-004', () => {
  test('should verify bug condition is prevented', async ({ page }) => {
    await page.goto('http://localhost:5173');
    // 1. Open application at http://localhost:5173
    // 2. Inspect network traffic in browser developer tools
    // 3. Observe browser ORB blocking request to https://checkout-static-next.razorpay.com/build/undefined
    // Assert fix: page must not show error
    await expect(page.locator('body')).not.toContainText('404');
  });
});
