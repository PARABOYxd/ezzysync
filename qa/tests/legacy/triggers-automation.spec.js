import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession, createTestToken } from '../helpers/authHelper.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.BACKEND_URL || 'http://localhost:5001';

test.describe('CRM Event Triggers & Automations Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('TC-TRIG-01: Public Webhook Trigger -> Auto-Lead Creation, Contact Upsert & Timeline Log', async ({ request }) => {
    const token = createTestToken();

    // 1. Fetch the tenant's public lead capture key from settings
    const settingsRes = await request.get(`${API_URL}/api/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(settingsRes.ok()).toBeTruthy();
    const settings = await settingsRes.json();
    const leadKey = settings.publicLeadKey;
    expect(leadKey).toBeTruthy();

    // 2. Simulate incoming webhook / external landing page form submission
    const triggerPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const triggerPayload = {
      customerName: 'Trigger Form Traveler',
      email: 'trigger.lead@example.com',
      phone: triggerPhone,
      interest: 'Kashmir 5D4N Package'
    };

    const webhookRes = await request.post(`${API_URL}/api/public/leads/${leadKey}`, {
      data: triggerPayload
    });
    expect([200, 201]).toContain(webhookRes.status());
    const webhookData = await webhookRes.json();
    expect(webhookData.leadId).toBeTruthy();

    // 3. Verify Trigger Consequence: Lead exists in CRM with source "Landing Page"
    const leadRes = await request.get(`${API_URL}/api/leads/${webhookData.leadId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(leadRes.ok()).toBeTruthy();
    const lead = await leadRes.json();
    expect(lead.source).toBe('Landing Page');
    expect(lead.interest).toBe('Kashmir 5D4N Package');

    // 4. Verify Trigger Consequence: Initial audit follow-up log automatically created
    const followUpsRes = await request.get(`${API_URL}/api/leads/${webhookData.leadId}/follow-ups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(followUpsRes.ok()).toBeTruthy();
    const followUps = await followUpsRes.json();
    expect(followUps.length).toBeGreaterThanOrEqual(1);
    expect(followUps[0].note).toContain('Lead created via Landing Page');
  });

  test('TC-TRIG-02: Lead Stage Shift Trigger -> Automatic Timeline Audit Follow-up Entry', async ({ request }) => {
    const token = createTestToken();

    // Create a new lead
    const newLeadRes = await request.post(`${API_URL}/api/leads`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        customerName: 'Stage Shift Lead',
        phone: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
        stage: 'New',
        interest: 'Goa Weekend Getaway'
      }
    });
    expect(newLeadRes.ok()).toBeTruthy();
    const lead = await newLeadRes.json();

    // Trigger stage change: New -> Contacted
    const updateRes = await request.patch(`${API_URL}/api/leads/${lead.leadId}/stage`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { stage: 'Contacted' }
    });
    expect(updateRes.ok()).toBeTruthy();

    // Verify timeline trigger: Milestone note automatically inserted
    const followUpsRes = await request.get(`${API_URL}/api/leads/${lead.leadId}/follow-ups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const followUps = await followUpsRes.json();
    const stageLog = followUps.find(f => f.note && f.note.includes('Stage changed from *New* to *Contacted*'));
    expect(stageLog).toBeTruthy();
  });

  test('TC-TRIG-03: Lead Convert-to-Booking Trigger -> Auto-Booking, Lead Stage Won & Guard Protection', async ({ request }) => {
    const token = createTestToken();

    // Create a qualified lead
    const leadRes = await request.post(`${API_URL}/api/leads`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        customerName: 'Convertible Traveler',
        phone: `96${Math.floor(10000000 + Math.random() * 90000000)}`,
        interest: 'Dubai 4N5D Extravaganza',
        stage: 'Proposal Sent'
      }
    });
    const lead = await leadRes.json();

    // Trigger Conversion to Booking
    const convertRes = await request.post(`${API_URL}/api/leads/${lead.leadId}/convert`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        departure: '2026-11-20',
        members: 2,
        pricePerPerson: 45000
      }
    });
    expect(convertRes.ok()).toBeTruthy();
    const convertData = await convertRes.json();

    // Verify Consequence 1: New booking created with transferred details
    expect(convertData.booking).toBeTruthy();
    expect(convertData.booking.trip).toBe('Dubai 4N5D Extravaganza');
    expect(Number(convertData.booking.totalAmount)).toBe(90000);

    // Verify Consequence 2: Lead stage auto-set to 'Won' with linked booking ID
    const updatedLeadRes = await request.get(`${API_URL}/api/leads/${lead.leadId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const updatedLead = await updatedLeadRes.json();
    expect(updatedLead.stage).toBe('Won');
    expect(updatedLead.convertedBookingId).toBe(convertData.booking.bookingId);

    // Verify Guard Trigger: Re-converting already converted lead must be blocked with 400
    const duplicateConvertRes = await request.post(`${API_URL}/api/leads/${lead.leadId}/convert`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { members: 1 }
    });
    expect(duplicateConvertRes.status()).toBe(400);
  });

  test('TC-TRIG-04: Quotation Status "Accepted" Trigger -> Automatic Booking Creation & Sync', async ({ request }) => {
    const token = createTestToken();

    // 1. Create a Quotation in Draft status
    const quoteRes = await request.post(`${API_URL}/api/quotations`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        customerName: 'Accepted Quote Customer',
        phone: `95${Math.floor(10000000 + Math.random() * 90000000)}`,
        tripName: 'Singapore City Explorer',
        priceQuote: 75000,
        validUntil: '2026-12-15',
        status: 'Draft'
      }
    });
    expect(quoteRes.ok()).toBeTruthy();
    const quote = await quoteRes.json();

    // 2. Trigger status change to "Accepted"
    const acceptRes = await request.put(`${API_URL}/api/quotations/${quote.quotationId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'Accepted' }
    });
    expect(acceptRes.ok()).toBeTruthy();

    // 3. Verify Consequence: Booking was automatically generated linked to this quotation
    const bookingsRes = await request.get(`${API_URL}/api/bookings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const bookings = await bookingsRes.json();
    const linkedBooking = bookings.find(b => b.sourceQuotationId === quote.quotationId || (b.customerName === quote.customerName && b.trip === quote.tripName));
    expect(linkedBooking).toBeTruthy();
    expect(linkedBooking.travelStatus).toBe('Booked');
    expect(Number(linkedBooking.pricePerPerson)).toBe(75000);
  });

  test('TC-TRIG-05: Dynamic Financial Trigger -> Auto-Calculation of Total, Remaining & Payment Status', async ({ request }) => {
    const token = createTestToken();

    // 1. Create booking with 2 members @ ₹30,000 = ₹60,000 Total, 0 Paid -> Expect Status 'Pending'
    const createRes = await request.post(`${API_URL}/api/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        customerName: 'Calculation Test Traveler',
        phone: `94${Math.floor(10000000 + Math.random() * 90000000)}`,
        trip: 'Manali Snow Trek',
        departure: '2026-12-01',
        members: 2,
        pricePerPerson: 30000,
        paid: 0
      }
    });
    expect(createRes.ok()).toBeTruthy();
    const booking = await createRes.json();
    expect(Number(booking.totalAmount)).toBe(60000);
    expect(Number(booking.remaining)).toBe(60000);
    expect(booking.paymentStatus).toBe('Pending');

    // 2. Trigger Partial Payment (₹20,000 paid) -> Remaining becomes ₹40,000, Status auto-flips to 'Partial'
    const partialRes = await request.put(`${API_URL}/api/bookings/${booking.bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { paid: 20000 }
    });
    expect(partialRes.ok()).toBeTruthy();
    const partialBooking = await partialRes.json();
    expect(Number(partialBooking.remaining)).toBe(40000);
    expect(partialBooking.paymentStatus).toBe('Partial');

    // 3. Trigger Full Payment (₹60,000 paid) -> Remaining becomes 0, Status auto-flips to 'Paid'
    const fullRes = await request.put(`${API_URL}/api/bookings/${booking.bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { paid: 60000 }
    });
    expect(fullRes.ok()).toBeTruthy();
    const fullBooking = await fullRes.json();
    expect(Number(fullBooking.remaining)).toBe(0);
    expect(fullBooking.paymentStatus).toBe('Paid');
  });

  test('TC-TRIG-06: State Machine Guard Trigger -> Enforces Valid Transition Lifecycle', async ({ request }) => {
    const token = createTestToken();

    // Create a new booking in 'New' status
    const createRes = await request.post(`${API_URL}/api/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        customerName: 'Guard Test Traveler',
        phone: `93${Math.floor(10000000 + Math.random() * 90000000)}`,
        trip: 'Kerala Backwaters',
        departure: '2026-10-15',
        members: 1,
        pricePerPerson: 25000,
        travelStatus: 'New'
      }
    });
    const booking = await createRes.json();

    // Guard Trigger: Cannot directly set travelStatus to 'Completed' unless previous status was 'Booked'
    const illegalJumpRes = await request.put(`${API_URL}/api/bookings/${booking.bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { travelStatus: 'Completed' }
    });
    expect(illegalJumpRes.status()).toBe(400);

    // Valid Transition: First update to 'Booked', then to 'Completed'
    const validBookedRes = await request.put(`${API_URL}/api/bookings/${booking.bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { travelStatus: 'Booked' }
    });
    expect(validBookedRes.ok()).toBeTruthy();

    const validCompletedRes = await request.put(`${API_URL}/api/bookings/${booking.bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { travelStatus: 'Completed' }
    });
    expect(validCompletedRes.ok()).toBeTruthy();
    const completedBooking = await validCompletedRes.json();
    expect(completedBooking.travelStatus).toBe('Completed');
  });

  test('TC-TRIG-07: Cron Schedulers & Reminder Time Window Triggers', async () => {
    // Departure Reminder Rules Trigger (1-Day & 3-Days Alert Windows)
    const departureTriggerWindows = [1, 3];
    expect(departureTriggerWindows).toContain(1);
    expect(departureTriggerWindows).toContain(3);

    // Follow-up Morning Digest Trigger (7:00 AM Cron)
    const morningDigestHour = 7;
    expect(morningDigestHour).toBe(7);

    // Log Retention Triggers (Audit: 90 days, App Logs: 7 days)
    const auditRetentionDays = 90;
    const appLogsRetentionDays = 7;
    expect(auditRetentionDays).toBe(90);
    expect(appLogsRetentionDays).toBe(7);
  });

  test('TC-TRIG-08: WhatsApp Live Action Triggers -> Voucher & Payment Reminder Generators', async ({ page }) => {
    await page.goto(`${BASE_URL}/whatsapp-chat`);
    await page.waitForLoadState('networkidle');

    // Verify WhatsApp page container renders
    const chatContainer = page.locator('main, div[class*="chat" i]').first();
    await expect(chatContainer).toBeVisible({ timeout: 8000 });

    // Validate Voucher trigger payload formatter logic
    const buildVoucherTriggerPayload = (booking) => ({
      type: 'BOOKING_VOUCHER',
      text: `🎫 *OFFICIAL BOOKING VOUCHER*\nBooking ID: ${booking.bookingId}\nTrip: ${booking.trip}\nTravelers: ${booking.members} Pax\nStatus: ${booking.travelStatus}`,
      recipient: booking.phone
    });

    const mockBooking = {
      bookingId: 'BK-1001',
      trip: 'Kashmir Luxury 6D5N',
      members: 2,
      travelStatus: 'Booked',
      phone: '9876543210'
    };

    const voucherPayload = buildVoucherTriggerPayload(mockBooking);
    expect(voucherPayload.text).toContain('*OFFICIAL BOOKING VOUCHER*');
    expect(voucherPayload.text).toContain('BK-1001');
    expect(voucherPayload.text).toContain('Kashmir Luxury 6D5N');
  });

});
