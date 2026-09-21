// Deep Regression Test for BUG-003: Financial Logic Flaw: Negative payment allowed (paid: -2500), inflating customer debt to 12500
import { test, expect } from '@playwright/test';

test.describe('Deep Defect: BUG-003', () => {
  test('Financial Logic Flaw: Negative payment allowed (paid: -2500), inflating customer debt to 12500', async ({ page, request }) => {
    // Target: http://localhost:5001/api/bookings
    // Expected: Backend validation rejects negative payments with 400 Bad Request.
    // Actual: Booking was created with paid: -2500 and remaining balance inflated to: 12500.
  });
});
