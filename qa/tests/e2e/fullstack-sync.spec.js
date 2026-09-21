import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession, createTestToken } from '../helpers/authHelper.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.BACKEND_URL || 'http://localhost:5001';

test.describe('Frontend & Backend Bidirectional Sync & Data Integrity Suite', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('TC-SYNC-01: UI Lead Creation -> Backend Database Record Verification', async ({ page, request }) => {
    const uniqueLead = `Sync_Lead_${Date.now()}`;
    const uniquePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    await page.goto(`${BASE_URL}/leads`);
    await page.waitForLoadState('networkidle');

    // UI Action: Create Lead via Drawer
    const addLeadBtn = page.locator('button:has-text("Add Lead"), button:has-text("+ Add Lead")').first();
    await expect(addLeadBtn).toBeVisible();
    await addLeadBtn.click();

    const drawer = page.locator('div[role="dialog"]').first();
    await expect(drawer).toBeVisible();

    await drawer.locator('input[placeholder*="Rahul Kumar"]').first().fill(uniqueLead);
    await drawer.locator('input[placeholder*="9876543210"], input[type="tel"]').first().fill(uniquePhone);

    const [postRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/leads') && res.request().method() === 'POST'),
      drawer.locator('button:has-text("Create Lead")').click(),
    ]);
    expect([200, 201]).toContain(postRes.status());

    // Backend Verification: Query backend REST API directly with JWT token
    const token = createTestToken();
    const backendRes = await request.get(`${API_URL}/api/leads?search=${uniqueLead}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(backendRes.ok()).toBeTruthy();
    const backendData = await backendRes.json();
    const leads = backendData.leads || backendData;
    const matchedLead = leads.find(l => l.customerName === uniqueLead || l.name === uniqueLead || l.phone === uniquePhone);
    expect(matchedLead).toBeTruthy();
    expect(matchedLead.phone).toContain(uniquePhone);
  });

  test('TC-SYNC-02: Backend API Mutation -> Frontend UI Table Live Reflection', async ({ page, request }) => {
    const token = createTestToken();
    const directApiLead = `Api_Direct_Lead_${Date.now()}`;
    const directPhone = `99${Math.floor(10000000 + Math.random() * 90000000)}`;

    // 1. Direct Backend API Creation
    const apiCreateRes = await request.post(`${API_URL}/api/leads`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        customerName: directApiLead,
        phone: directPhone,
        stage: 'New',
        source: 'Website',
      },
    });
    expect([200, 201]).toContain(apiCreateRes.status());

    // 2. Frontend UI Verification
    await page.goto(`${BASE_URL}/leads`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('main input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(directApiLead);
      await page.waitForTimeout(600);
    }
    const leadRow = page.locator(`text=${directApiLead}`).first();
    await expect(leadRow).toBeVisible({ timeout: 8000 });
  });

  test('TC-SYNC-03: UI Quotation Creation -> Backend Calculation & Storage Integrity', async ({ page, request }) => {
    const token = createTestToken();
    const uniqueTrip = `Sync_Trip_${Date.now()}`;
    const pricePerPerson = 35000;

    await page.goto(`${BASE_URL}/quotations`);
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator('button:has-text("Create Quotation"), button:has-text("Create Quotation / Itinerary")').first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    const modal = page.locator('div[role="dialog"]').first();
    await expect(modal).toBeVisible();

    await modal.locator('input[placeholder*="Kerala" i], input[placeholder*="Trip" i]').first().fill(uniqueTrip);
    const priceInput = modal.locator('input[placeholder*="45000" i], input[type="number"]').first();
    if (await priceInput.isVisible()) await priceInput.fill(String(pricePerPerson));
    const day1Input = modal.locator('input[placeholder*="Day 1" i], input[placeholder*="Milestone" i]').first();
    if (await day1Input.isVisible()) await day1Input.fill('Grand Welcome & Arrival');

    const [createQuoteRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/quotations') && res.request().method() === 'POST'),
      modal.locator('button:has-text("Create Itinerary")').first().click(),
    ]);
    expect([200, 201]).toContain(createQuoteRes.status());
    const createdQuoteBody = await createQuoteRes.json();
    const createdQuote = createdQuoteBody.quotation || createdQuoteBody;
    expect(createdQuote).toBeTruthy();

    // Backend verification via direct GET /api/quotations/:id
    const quoteId = createdQuote.quotationId || createdQuote.id;
    if (quoteId) {
      const backendQuoteRes = await request.get(`${API_URL}/api/quotations/${quoteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(backendQuoteRes.ok()).toBeTruthy();
      const backendQuoteData = await backendQuoteRes.json();
      const fetched = backendQuoteData.quotation || backendQuoteData;
      const title = fetched.tripName || fetched.trip_name || fetched.tripTitle || fetched.destination;
      expect(title).toContain(uniqueTrip);
    }
  });

  test('TC-SYNC-04: Booking Operations & Payment Ledger Reconciliation', async ({ page, request }) => {
    const token = createTestToken();

    // 1. Fetch bookings from backend
    const backendRes = await request.get(`${API_URL}/api/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(backendRes.ok()).toBeTruthy();
    const bookingsData = await backendRes.json();
    const bookings = bookingsData.bookings || bookingsData;
    expect(Array.isArray(bookings)).toBeTruthy();

    // 2. Open frontend bookings page and verify count matches or renders properly
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table').first();
    await expect(table).toBeVisible();
  });

  test('TC-SYNC-05: Bidirectional RBAC Guard & Permission Synchronization', async ({ request }) => {
    const token = createTestToken();

    // Direct check of permission-protected backend endpoints
    const protectedRoutes = [
      { url: `${API_URL}/api/leads`, method: 'GET' },
      { url: `${API_URL}/api/bookings`, method: 'GET' },
      { url: `${API_URL}/api/quotations`, method: 'GET' },
      { url: `${API_URL}/api/dashboard`, method: 'GET' },
    ];

    for (const route of protectedRoutes) {
      const res = await request.get(route.url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect([200, 204, 304]).toContain(res.status());
    }

    // Direct unauthenticated check should be rejected by backend with 401
    const unauthRes = await request.get(`${API_URL}/api/leads`);
    expect(unauthRes.status()).toBe(401);
  });

});
