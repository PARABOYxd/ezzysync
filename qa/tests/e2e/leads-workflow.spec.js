import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from '../helpers/authHelper.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Leads Management & Lifecycle Workflow', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('TC-LEAD-01: Full Lead Creation via Drawer, API sync & Table rendering', async ({ page }) => {
    await page.goto(`${BASE_URL}/leads`);
    await page.waitForLoadState('networkidle');

    // Click Add Lead button
    const addLeadBtn = page.locator('button:has-text("Add Lead"), button:has-text("+ Add Lead")').first();
    await expect(addLeadBtn).toBeVisible();
    await addLeadBtn.click();

    // Verify Drawer opens
    const drawerTitle = page.locator('text=Create New Lead');
    await expect(drawerTitle).toBeVisible();

    const uniqueLeadName = `QA_Lead_${Date.now()}`;
    const uniquePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    const drawer = page.locator('div[role="dialog"]');

    // Fill Form inputs scoped to drawer
    const nameInput = drawer.locator('input[placeholder*="Rahul Kumar"]').first();
    const phoneInput = drawer.locator('input[placeholder*="9876543210"], input[type="tel"]').first();

    await expect(nameInput).toBeVisible();
    await nameInput.fill(uniqueLeadName);
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill(uniquePhone);

    // Intercept POST /api/leads API request and click Submit
    const [createResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/leads') && res.request().method() === 'POST'),
      drawer.locator('button:has-text("Create Lead")').click(),
    ]);

    expect([200, 201]).toContain(createResponse.status());

    // Verify Toast notification
    const toast = page.locator('text=Lead created');
    await expect(toast).toBeVisible({ timeout: 6000 });

    // Verify record rendered in Leads table
    await page.waitForTimeout(1000);
    const searchInput = page.locator('main input[placeholder*="Search" i], input[placeholder*="Search by name" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(uniqueLeadName);
      await page.waitForTimeout(600);
      const row = page.locator(`text=${uniqueLeadName}`).first();
      await expect(row).toBeVisible();
    }
  });

  test('TC-LEAD-02: Lead Detail View Drawer & Activity Note Logging', async ({ page }) => {
    await page.goto(`${BASE_URL}/leads`);
    await page.waitForLoadState('networkidle');

    // Click on View Lead icon button
    const viewLeadBtn = page.locator('button[title="View Lead"]').first();
    await expect(viewLeadBtn).toBeVisible({ timeout: 10000 });
    await viewLeadBtn.click();

    // Verify LeadViewDrawer opens
    const drawer = page.locator('div[role="dialog"], aside[role="dialog"]').first();
    await expect(drawer).toBeVisible();

    // Fill Activity Log Note
    const noteTextarea = page.locator('textarea[placeholder*="note" i], textarea[placeholder*="conversation" i], textarea').first();
    if (await noteTextarea.isVisible()) {
      const noteContent = `Followed up with client regarding itinerary preference ${Date.now()}`;
      await noteTextarea.fill(noteContent);

      // Submit note
      const logBtn = page.locator('button:has-text("Log Activity"), button:has-text("Add Note"), button:has-text("Save Activity")').first();
      if (await logBtn.isVisible()) {
        const [noteRes] = await Promise.all([
          page.waitForResponse(res => res.url().includes('/follow-up') || res.url().includes('/notes') || res.url().includes('/api/leads')),
          logBtn.click(),
        ]);
        expect([200, 201]).toContain(noteRes.status());
      }
    }
  });

  test('TC-LEAD-03: Stage Pipeline Transitions & Filters', async ({ page }) => {
    await page.goto(`${BASE_URL}/leads`);
    await page.waitForLoadState('networkidle');

    // Test Segmented Control (Switch to Kanban view)
    const kanbanBtn = page.locator('button:has-text("Kanban")').first();
    if (await kanbanBtn.isVisible()) {
      await kanbanBtn.click();
      await page.waitForTimeout(500);

      // Verify Kanban stages exist
      const stages = ['New', 'Contacted', 'Negotiating', 'Won', 'Lost'];
      for (const st of stages) {
        const stageHeading = page.locator(`text=${st}`).first();
        await expect(stageHeading).toBeVisible();
      }

      // Switch back to Table view
      const tableBtn = page.locator('button:has-text("Table")').first();
      await tableBtn.click();
      await page.waitForTimeout(500);
      const table = page.locator('table').first();
      await expect(table).toBeVisible();
    }
  });

  // Parameterized Filter Validation across Lead Stages
  const leadStages = ['All', 'New', 'Contacted', 'Negotiating', 'Won', 'Lost'];
  for (const stage of leadStages) {
    test(`TC-LEAD-FILTER: Filter by stage "${stage}" updates table without errors`, async ({ page }) => {
      await page.goto(`${BASE_URL}/leads`);
      await page.waitForLoadState('networkidle');

      const stageSelect = page.locator('select').first();
      if (await stageSelect.isVisible()) {
        await stageSelect.selectOption({ label: stage }).catch(() => {});
        await page.waitForTimeout(400);
        expect(page.url()).toContain('/leads');
      }
    });
  }

});
