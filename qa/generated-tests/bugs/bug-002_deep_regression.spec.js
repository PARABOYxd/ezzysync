// Deep Regression Test for BUG-002: Search / State Disconnect: Newly created lead "QA_StateDiff_1789924699934" not discoverable in UI table search
import { test, expect } from '@playwright/test';

test.describe('Deep Defect: BUG-002', () => {
  test('Search / State Disconnect: Newly created lead "QA_StateDiff_1789924699934" not discoverable in UI table search', async ({ page, request }) => {
    // Target: http://localhost:5173/leads
    // Expected: Row containing "QA_StateDiff_1789924699934" rendered in table
    // Actual: Row was not rendered in table search results
  });
});
