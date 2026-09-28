import { test, expect, expectToast, drawer, unique, uniquePhone, apiJson, inr } from '../support/fixtures.js';
import { createLead, createBooking, createWhatsAppChat } from '../support/seed.js';
import { sql } from '../support/tenant.js';

/**
 * The WhatsApp page as a workspace: everything an agent does from a chat -
 * stage, owner, details, follow-ups, notes, payments, quotes - must land in
 * the same records the Leads, Bookings, Follow-ups and Quotations pages read.
 * Each test drives the real UI, then checks the API for what was stored.
 *
 * Nothing in this file may message a customer. Every test fails if the page
 * called a send endpoint, and the QA tenant has no WhatsApp connected anyway.
 */
test.describe.configure({ mode: 'serial' });

const SEND_ENDPOINT = /\/(send|send-template|send-itinerary-pdf|send-voucher|voucher-whatsapp|reminder)(\b|\/|\?|$)/;

let sends = [];
test.beforeEach(async ({ page }) => {
  sends = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && SEND_ENDPOINT.test(new URL(r.url()).pathname)) sends.push(r.url());
  });
});
test.afterEach(() => {
  expect(sends, 'the workspace sent a WhatsApp message').toEqual([]);
});

const chatItem = (page, name) => page.locator('button:has(h4)', { has: page.locator(`h4:text-is("${name}")`) });
const filterTab = (page, label) => page.getByRole('tablist', { name: 'Chat filters' }).getByRole('tab', { name: new RegExp(`^${label}`) });
const wsTab = (page, label) => page.getByRole('tablist', { name: 'Customer details' }).getByRole('tab', { name: new RegExp(`^${label}`) });
const panel = (page) => page.locator('#ws-panel');
const headerStage = (page) => page.locator('select[title="Lead stage"]:visible');
const headerOwner = (page) => page.locator('select[title="Who owns this lead"]:visible');

async function openChat(page, name) {
  await page.goto('/whatsapp-chat');
  await chatItem(page, name).click();
  await expect(page.getByRole('heading', { name, exact: false }).first()).toBeVisible();
}

test.describe('WhatsApp workspace', () => {
  const name = unique('QA Chat');
  const phone = uniquePhone();
  const bareName = unique('QA NoLead');
  const barePhone = uniquePhone();
  const teamName = unique('QA Agent');
  let lead;
  let booking;

  test.beforeAll(async ({ api, account }) => {
    lead = await createLead(api, { customerName: name, phone, interest: 'Goa 4N/5D QA trip', travelers: 2 });
    // Confirming, not Booked: a Booked booking sends a WhatsApp confirmation.
    const { chatId } = await createWhatsAppChat(sql, account.tenantId, { phone, name, count: 60, lastFrom: 'customer', unread: 2 });
    // An incoming message from a known number is linked to its lead on arrival.
    await sql(
      `UPDATE whatsapp_chats SET lead_id = (SELECT id FROM leads WHERE tenant_id = $1 AND lead_id = $2) WHERE id = $3`,
      [account.tenantId, lead.leadId, chatId]
    );
    await createWhatsAppChat(sql, account.tenantId, { phone: barePhone, name: bareName, count: 3, lastFrom: 'agent' });
    booking = await createBooking(api, { customerName: name, phone, trip: 'Goa 4N/5D QA trip', members: 2, pricePerPerson: 10000 });

    // A task due today, late enough that it is "today" and not "overdue".
    const due = new Date();
    due.setHours(23, 0, 0, 0);
    await apiJson(await api.post(`leads/${lead.leadId}/follow-ups`, {
      data: { note: 'QA call about hotel', activityType: 'call', nextFollowUpDate: due.toISOString() },
    }), 201);

    await apiJson(await api.post('users', {
      data: { name: teamName, email: `${unique('qa.agent')}@ezzysync.test`, password: 'QaAgent#2026', role: 'TEAM_MEMBER' },
    }), 201);
  });

  test('the list shows each chat\'s CRM context and the work queues count it', async ({ page }) => {
    await page.goto('/whatsapp-chat');
    const item = chatItem(page, name);
    await expect(item).toContainText('New');
    await expect(item).toContainText('Due today');
    await expect(item).toContainText('Goa 4N/5D QA trip');

    await expect(filterTab(page, 'Due')).toContainText('1');
    await expect(filterTab(page, 'Unread')).toContainText('1');

    await filterTab(page, 'Due').click();
    await expect(chatItem(page, name)).toBeVisible();
    await expect(chatItem(page, bareName)).toHaveCount(0);

    // A queue with nothing in it says so, and offers the way back.
    await filterTab(page, 'Hot').click();
    await expect(page.getByText('Nothing in "Hot" right now.')).toBeVisible();
    await page.getByRole('button', { name: 'Show all chats' }).click();
    await expect(chatItem(page, bareName)).toBeVisible();
  });

  test('a long thread opens on the newest 50 and loads the rest on demand, without duplicates', async ({ page }) => {
    await openChat(page, name);
    await expect(page.getByText('QA msg 60', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('QA msg 11', { exact: true })).toBeVisible();
    await expect(page.getByText('QA msg 10', { exact: true })).toHaveCount(0);

    const earlier = page.waitForResponse((r) => r.url().includes('/messages') && r.url().includes('before='));
    await page.getByRole('button', { name: 'Load earlier messages' }).click();
    const body = await apiJson(await earlier, 200);
    expect(body.messages).toHaveLength(10);
    expect(body.hasMore).toBe(false);

    await expect(page.getByText('QA msg 01', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load earlier messages' })).toHaveCount(0);
    for (const n of ['01', '10', '11', '30']) {
      await expect(page.getByText(`QA msg ${n}`, { exact: true })).toHaveCount(1);
    }
  });

  test('opening the chat clears unread, and the panel says the customer is waiting', async ({ page, api }) => {
    await openChat(page, name);
    await wsTab(page, 'Lead').click();
    await expect(panel(page)).toContainText('Customer is waiting');
    await expect(panel(page)).toContainText('QA call about hotel');
    await expect(panel(page)).toContainText('Came via Website');

    const { chats } = await apiJson(await api.get('whatsapp-web/chats'), 200);
    expect(chats.find((c) => c.customer_name === name).unread_count).toBe(0);
  });

  test('stage and owner are only shown once, in the chat header', async ({ page }) => {
    await openChat(page, name);
    await wsTab(page, 'Lead').click();
    await expect(page.locator('select[title="Lead stage"]:visible')).toHaveCount(1);
    await expect(panel(page).locator('select[title="Lead stage"]')).toBeHidden();

    // A long customer name must stay readable next to the controls - they once
    // squeezed it to zero width.
    const title = page.getByRole('heading', { level: 3, name });
    await expect(title).toBeVisible();
    expect((await title.boundingBox()).width).toBeGreaterThan(80);
  });

  test('changing the stage from the header saves it, logs it, and the Leads page agrees', async ({ page, api }) => {
    await openChat(page, name);
    const saved = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes(`/leads/${lead.leadId}/stage`));
    await headerStage(page).selectOption('Contacted');
    await apiJson(await saved, 200);
    await expectToast(page, 'Moved to Contacted.');
    await expect(chatItem(page, name)).toContainText('Contacted');

    const { lead: stored } = await apiJson(await api.get(`leads/${lead.leadId}`), 200);
    expect(stored.stage).toBe('Contacted');
    const { followUps } = await apiJson(await api.get(`leads/${lead.leadId}/follow-ups`), 200);
    expect(followUps.some((f) => f.note.includes('Stage changed from *New* to *Contacted*'))).toBe(true);

    await page.goto(`/leads?search=${encodeURIComponent(name)}`);
    await expect(page.locator('tbody tr', { hasText: name })).toContainText('Contacted');
  });

  test('assigning an owner from the header is stored on the lead', async ({ page, api }) => {
    await openChat(page, name);
    await headerOwner(page).selectOption(teamName);
    await expectToast(page, `Assigned to ${teamName}.`);
    const { lead: stored } = await apiJson(await api.get(`leads/${lead.leadId}`), 200);
    expect(stored.assignedTo).toBe(teamName);
    await expect(chatItem(page, name)).toContainText(teamName.split(' ')[0]);

    // And back, so a later assertion does not depend on this one.
    await headerOwner(page).selectOption('');
    await expectToast(page, 'Unassigned.');
    const { lead: after } = await apiJson(await api.get(`leads/${lead.leadId}`), 200);
    expect(after.assignedTo).toBe('');
  });

  test('editing trip details from the chat updates the lead and keeps other fields', async ({ page, api }) => {
    await openChat(page, name);
    await wsTab(page, 'Lead').click();
    await panel(page).getByRole('button', { name: 'Edit' }).click();
    await panel(page).getByLabel('Travellers').fill('5');
    await panel(page).getByLabel('Notes').fill('Needs a pool villa');
    await panel(page).getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Lead details saved.');

    const { lead: stored } = await apiJson(await api.get(`leads/${lead.leadId}`), 200);
    expect(Number(stored.travelers)).toBe(5);
    expect(stored.notes).toBe('Needs a pool villa');
    // Untouched fields survive the partial update.
    expect(stored.customerName).toBe(name);
    expect(stored.stage).toBe('Contacted');
    expect(stored.interest).toBe('Goa 4N/5D QA trip');
  });

  test('a follow-up scheduled from the chat reaches the Follow-ups list, and Done clears it everywhere', async ({ page, api }) => {
    const note = unique('QA send revised quote');
    await openChat(page, name);
    await wsTab(page, 'Tasks').click();
    await panel(page).getByRole('button', { name: 'Follow-up' }).click();
    await panel(page).getByLabel('Type').selectOption('whatsapp');
    await panel(page).locator('textarea').fill(note);
    await panel(page).getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Follow-up scheduled.');
    await expect(panel(page)).toContainText(note);

    let { followUps } = await apiJson(await api.get('follow-ups'), 200);
    expect(followUps.some((f) => f.note === note)).toBe(true);

    // Done on today's task: gone from the due list, and the chat is no longer "Due today".
    const task = panel(page).locator('li', { hasText: 'QA call about hotel' });
    await task.getByRole('button', { name: 'Done' }).click();
    await expectToast(page, 'Marked done.');
    await expect(panel(page).locator('li', { hasText: 'QA call about hotel' }).getByRole('button', { name: 'Done' })).toHaveCount(0);

    ({ followUps } = await apiJson(await api.get('follow-ups', { params: { dueToday: 'true', overdue: 'true' } }), 200));
    expect(followUps.some((f) => f.note === 'QA call about hotel')).toBe(false);
    const done = await apiJson(await api.get('follow-ups/completed'), 200);
    expect(done.followUps.some((f) => f.note.startsWith('QA call about hotel'))).toBe(true);

    await expect(chatItem(page, name)).not.toContainText('Due today');
  });

  test('an internal note is history for the team, never a task', async ({ page, api }) => {
    const note = unique('QA prefers evening calls');
    await openChat(page, name);
    await wsTab(page, 'Tasks').click();
    await panel(page).getByRole('button', { name: 'Internal note' }).click();
    await panel(page).locator('textarea').fill(note);
    await panel(page).getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Note saved.');

    const { followUps } = await apiJson(await api.get(`leads/${lead.leadId}/follow-ups`), 200);
    const entry = followUps.find((f) => f.note === note);
    expect(entry.activity_type).toBe('note');
    expect(entry.next_follow_up_date).toBeNull();
    const due = await apiJson(await api.get('follow-ups'), 200);
    expect(due.followUps.some((f) => f.note === note)).toBe(false);
  });

  test('an empty follow-up or note is refused without calling the API', async ({ page }) => {
    let posts = 0;
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/follow-ups')) posts += 1; });
    await openChat(page, name);
    await wsTab(page, 'Tasks').click();
    await panel(page).getByRole('button', { name: 'Internal note' }).click();
    await panel(page).locator('textarea').fill('   ');
    await panel(page).getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Write the note first.');
    expect(posts).toBe(0);
  });

  test('a payment recorded in the chat updates the booking the Bookings page reads', async ({ page, api }) => {
    await openChat(page, name);
    await wsTab(page, 'Money').click();
    await expect(panel(page)).toContainText(inr(20000));

    await panel(page).getByRole('button', { name: 'Record payment' }).click();
    await panel(page).getByLabel('Amount (₹)').fill('5000');
    await panel(page).getByLabel('Method').selectOption('UPI');
    await panel(page).getByLabel('Reference').fill('QA-UTR-1');
    const saved = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(`/bookings/${booking.bookingId}/payments`));
    await panel(page).getByRole('button', { name: 'Save payment' }).click();
    await apiJson(await saved, 201);
    await expectToast(page, `${inr(5000)} recorded.`);

    const { booking: stored } = await apiJson(await api.get(`bookings/${booking.bookingId}`), 200);
    expect(Number(stored.paid)).toBe(5000);
    expect(Number(stored.remaining)).toBe(15000);
    expect(stored.paymentStatus).toBe('Partial');

    // The panel re-reads the booking rather than trusting its own arithmetic.
    await expect(panel(page)).toContainText(inr(15000));
    await expect(panel(page)).toContainText('QA-UTR-1');
  });

  test('paying more than is due asks first, and cancelling records nothing', async ({ page, api }) => {
    const before = (await apiJson(await api.get(`bookings/${booking.bookingId}/payments`), 200)).payments.length;
    await openChat(page, name);
    await wsTab(page, 'Money').click();
    await panel(page).getByRole('button', { name: 'Record payment' }).click();
    await panel(page).getByLabel('Amount (₹)').fill('999999');
    page.once('dialog', (d) => d.dismiss());
    await panel(page).getByRole('button', { name: 'Save payment' }).click();
    await page.waitForTimeout(500);
    const after = (await apiJson(await api.get(`bookings/${booking.bookingId}/payments`), 200)).payments.length;
    expect(after).toBe(before);
  });

  test('the due reminder is only a preview until Send is pressed', async ({ page }) => {
    await openChat(page, name);
    await wsTab(page, 'Money').click();
    await panel(page).getByRole('button', { name: 'Due reminder' }).click();
    await expect(panel(page)).toContainText(`This will be sent to ${name}`);
    await expect(panel(page)).toContainText('₹15,000');
    await panel(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(panel(page)).not.toContainText('This will be sent to');
    // afterEach proves nothing was sent.
  });

  test('a quote started from the chat is addressed to this customer, not a duplicate of them', async ({ page, api, account }) => {
    await openChat(page, name);
    await wsTab(page, 'Trip').click();
    await panel(page).getByRole('button', { name: 'New quote' }).click();
    const form = drawer(page, 'Create Itinerary');
    await expect(form.getByLabel('Trip / Itinerary Name')).toHaveValue('Goa 4N/5D QA trip');
    await form.getByRole('button', { name: 'Create Itinerary' }).click();
    await expectToast(page, 'Itinerary created successfully.');

    await expect(panel(page)).toContainText('Goa 4N/5D QA trip');
    await expect(panel(page).getByRole('button', { name: 'Send link in chat' })).toBeVisible();

    // One customer for this number - the quote joined the lead's record.
    const { rows } = await sql(
      `SELECT id FROM customers WHERE tenant_id = $1 AND right(regexp_replace(phone, '\\D', '', 'g'), 10) = $2`,
      [account.tenantId, phone]
    );
    expect(rows).toHaveLength(1);
    const { customer } = await apiJson(await api.get(`customers/${rows[0].id}`), 200);
    expect(customer.quotations.some((q) => q.trip_name === 'Goa 4N/5D QA trip')).toBe(true);
    expect(customer.leads.some((l) => l.lead_id === lead.leadId)).toBe(true);
    expect(customer.bookings.some((b) => b.booking_id === booking.bookingId)).toBe(true);
  });

  test('a chat with no lead offers to create one, and the rest of the panel explains why it is empty', async ({ page, api }) => {
    await openChat(page, bareName);
    await wsTab(page, 'Lead').click();
    await expect(panel(page)).toContainText('You replied last');
    await wsTab(page, 'Money').click();
    await expect(panel(page)).toContainText('No booking yet');
    await wsTab(page, 'Tasks').click();
    await expect(panel(page)).toContainText('Create a lead from the Lead tab');
    await expect(page.locator('select[title="Lead stage"]:visible')).toHaveCount(0);

    await wsTab(page, 'Lead').click();
    const created = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/create-lead'));
    const clickedAt = Date.now();
    await panel(page).getByRole('button', { name: 'Create lead from this chat' }).click();
    await apiJson(await created, 200);
    // The AI pre-fill runs after the reply; the agent is not kept waiting on it.
    expect(Date.now() - clickedAt).toBeLessThan(5000);
    await expectToast(page, 'CRM Lead created and linked successfully!');
    await expect(headerStage(page)).toHaveValue('New');

    const { leads } = await apiJson(await api.get('leads', { params: { search: barePhone } }), 200);
    expect(leads).toHaveLength(1);
    expect(leads[0].customerName).toBe(bareName);
  });
});
