/**
 * The tenant every UI-matrix test runs inside, with three people in it.
 *
 * One worker, one throwaway tenant, provisioned through the backend's own
 * service layer and deleted afterwards - the same arrangement as the flow
 * tests in tests/e2e. What this adds is two team members beside the owner:
 * one holding every permission and one holding none. Most "the button does
 * nothing" and "the page is blank" bugs only happen for one of the three,
 * because the UI hides and shows things by role.
 *
 * Sessions are minted by calling the login API and writing the result into
 * localStorage exactly where useAuth reads it. Logging in through the form
 * three times per worker would cost a minute and test nothing new - the
 * login form has its own tests.
 *
 * The tenant is seeded with one of everything, so list pages have rows,
 * row buttons exist to be clicked and detail drawers have data to render.
 */
import { test as base, expect } from '@playwright/test';
import { provisionTenant, destroyTenant, closeBackend, sql } from '../../support/tenant.js';
import { createWhatsAppChat } from '../../support/seed.js';
import { API_URL, unique, uniquePhone, daysFromNow } from '../../support/fixtures.js';

const ALL_MODULES = {
  leads: ['create', 'read', 'update', 'delete', 'viewAll'],
  bookings: ['create', 'read', 'update', 'delete', 'editPhone', 'viewAll'],
  quotations: ['create', 'read', 'update', 'delete'],
  invoices: ['read', 'download', 'email'],
  expenses: ['create', 'read', 'update', 'delete'],
  hotels: ['create', 'read', 'update', 'delete'],
  tourBatches: ['create', 'read', 'update', 'delete'],
  followUps: ['create', 'read', 'update', 'viewAll'],
  customers: ['read'],
  aiTools: ['use'],
  billing: ['read'],
  whatsapp: ['reply', 'manage'],
};

function permissions(value) {
  const out = {};
  for (const [mod, actions] of Object.entries(ALL_MODULES)) {
    out[mod] = Object.fromEntries(actions.map((a) => [a, value]));
  }
  return out;
}

export const ROLES = ['admin', 'member', 'restricted'];

/**
 * Retries, because a backend that stalls for a minute under load would
 * otherwise fail this worker's setup, and Playwright restarts a worker after
 * every failure - one stall became ninety failed tests in the first full run.
 * The stall itself is still caught: the reporter watches /api/health for the
 * whole run and reports every period the backend stopped answering.
 */
async function login(request, email, password) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await request.post(`${API_URL}/auth/login`, { data: { email, password }, timeout: 60_000 });
      if (res.status() === 200) return res.json();
      lastError = new Error(`login for ${email} failed: ${res.status()} ${await res.text()}`);
      if (res.status() < 500 && res.status() !== 429) break;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function seed(api, tenantId) {
  const created = {};
  const post = async (path, data) => {
    const res = await api.post(path, { data });
    const body = await res.json().catch(() => ({}));
    return res.ok() ? body : null;
  };

  const leadPhone = uniquePhone();
  const lead = await post('leads', { customerName: unique('UI Lead'), phone: leadPhone, email: 'ui.lead@ezzysync.test', source: 'Website', stage: 'New', interest: 'Goa 4N' });
  created.leadId = lead?.lead?.leadId;

  const quote = await post('quotations', { customerName: unique('UI Quote'), tripName: 'UI Kerala 5N', phone: uniquePhone(), priceQuote: 42000 });
  created.quotationId = quote?.quotation?.quotationId;
  // The public share link is keyed on the row's primary key.
  created.quotationUuid = quote?.quotation?.id;

  const booking = await post('bookings', {
    customerName: unique('UI Traveller'), phone: uniquePhone(), email: 'ui.booking@ezzysync.test',
    trip: 'UI Goa Package', departure: daysFromNow(25), members: 2, pricePerPerson: 15000, travelStatus: 'Booked',
  });
  created.bookingId = booking?.booking?.bookingId;
  if (created.bookingId) {
    await post(`bookings/${created.bookingId}/payments`, { amount: 5000, method: 'UPI' });
    await post(`bookings/${created.bookingId}/follow-ups`, { note: 'UI matrix follow-up', nextFollowUpDate: daysFromNow(2) });
  }

  // A WhatsApp conversation, so the inbox renders a thread and its Customer
  // 360 panel (tabs, follow-ups, payments, quotes) and every control in it
  // gets pressed. Linked to the lead and the booking above. The tenant has no
  // WhatsApp connected, and send buttons are on DO_NOT_PRESS regardless.
  if (created.leadId) {
    const { chatId } = await createWhatsAppChat(sql, tenantId, { phone: leadPhone, name: 'UI Chat Customer', count: 6, unread: 1 });
    await sql(
      `UPDATE whatsapp_chats
          SET lead_id = (SELECT id FROM leads WHERE tenant_id = $1 AND lead_id = $2),
              booking_id = (SELECT id FROM bookings WHERE tenant_id = $1 AND booking_id = $3)
        WHERE id = $4`,
      [tenantId, created.leadId, created.bookingId || null, chatId]
    );
    await post(`leads/${created.leadId}/follow-ups`, { note: 'UI matrix lead follow-up', activityType: 'call', nextFollowUpDate: daysFromNow(1) });
  }

  await post('hotels', { name: unique('UI Hotel'), city: 'Goa', rating: '4 Star' });
  await post('batches', { name: unique('UI Batch'), tripName: 'UI Goa Package', departureDate: daysFromNow(40), totalCapacity: 20, pricePerPerson: 15000 });
  await post('expenses', { title: unique('UI Expense'), amount: 2500, category: 'Hotel', link_type: 'general', status: 'Pending' });

  const customers = await api.get('customers');
  const list = (await customers.json().catch(() => ({})))?.customers || [];
  created.customerId = list[0]?.id || list[0]?.customerId || null;
  return created;
}

export const test = base.extend({
  world: [async ({ playwright }, use, workerInfo) => {
    const owner = await provisionTenant(`ui${workerInfo.workerIndex}`);
    const request = await playwright.request.newContext();

    const ownerSession = await login(request, owner.email, owner.password);
    const api = await playwright.request.newContext({
      baseURL: `${API_URL}/`,
      extraHTTPHeaders: { Authorization: `Bearer ${ownerSession.token}` },
    });

    const makeMember = async (label, perms) => {
      const email = `${label}-${Date.now()}-${workerInfo.workerIndex}@ezzysync.test`;
      const password = 'UiMatrix!2345';
      const res = await api.post('users', { data: { name: `UI ${label}`, email, password, role: 'TEAM_MEMBER', permissions: perms } });
      if (!res.ok()) throw new Error(`could not create ${label}: ${res.status()} ${await res.text()}`);
      return login(request, email, password);
    };

    const sessions = {
      admin: ownerSession,
      member: await makeMember('member', permissions(true)),
      restricted: await makeMember('restricted', permissions(false)),
    };
    const data = await seed(api, owner.tenantId);

    await use({ owner, sessions, data, api });

    await api.dispose();
    await request.dispose();
    await destroyTenant(owner.tenantId);
    await closeBackend();
  }, { scope: 'worker', timeout: 300_000 }],
});

/**
 * A browser context signed in as `role`, with the product tour switched off
 * and every request to a host that is not this app refused - so no button
 * press can reach Razorpay, Google, Meta or a CDN script from the browser.
 */
export async function contextFor(browser, world, role, viewport, baseURL) {
  // role 'anon' has no session: a signed-out visitor.
  const session = world.sessions[role] || null;
  const context = await browser.newContext({ baseURL, viewport });
  await context.addInitScript(({ token, user }) => {
    try {
      if (token) {
        localStorage.setItem('hf_token', token);
        localStorage.setItem('hf_user', JSON.stringify(user));
      }
      localStorage.setItem('journeyflow_tour_status', 'completed');
      localStorage.setItem('journeyflow_tour_done', 'true');
    } catch { /* storage unavailable */ }
  }, { token: session?.token || null, user: session?.user || null });

  const allowed = new Set([new URL(baseURL).host, new URL(API_URL).host]);
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.protocol === 'data:' || url.protocol === 'blob:' || allowed.has(url.host) || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return route.continue();
    }
    return route.abort('blockedbyclient');
  });
  return context;
}

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

export { expect };
