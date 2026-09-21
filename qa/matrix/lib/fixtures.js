/**
 * The world every generated case runs against.
 *
 * Two tenants, not one. Half of what this suite is for is proving that tenant
 * A cannot see, edit or delete anything belonging to tenant B, and that needs
 * a real B with real rows in it - a fabricated id would only ever prove that
 * the app 404s on ids that do not exist.
 *
 * Resources are created through the API rather than with INSERTs, for two
 * reasons: the seed then doubles as a happy-path check on every create
 * endpoint (a failure here is reported, not swallowed), and the ids handed
 * back are the ones the routes actually accept - several tables key on a
 * business id (lead_id, quotation_id, batch_id) rather than the primary key,
 * and a seed that guessed wrong would make every :id case meaningless.
 */
import { backendRequire } from './require.js';

const jwt = backendRequire('jsonwebtoken');
const supertest = backendRequire('supertest');

let seq = 0;
const uniq = (p) => `${p}_${process.pid}_${(seq += 1)}`;
const newPhone = () => `9${String(100000000 + (seq += 1)).slice(0, 9)}`;

function tokenFor({ userId, tenantId, role, email }) {
  const env = backendRequire('./config/env');
  return jwt.sign({ userId, tenantId, role, email }, env.jwtSecret, { expiresIn: '2h' });
}

async function insertTenant(query, { planId = 'PRO' } = {}) {
  const company = uniq('QA Agency');
  const { rows } = await query(
    `INSERT INTO tenants (name, email, company_name, plan_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [company, `${uniq('owner')}@qa.invalid`, company, planId]
  );
  const tenantId = rows[0].id;
  await query(`UPDATE tenants SET plan_expires_at = now() + interval '30 days' WHERE id = $1`, [tenantId]);
  return { tenantId, company };
}

async function insertUser(query, tenantId, { role = 'TEAM_MEMBER', permissions = null, name = null } = {}) {
  const email = `${uniq('user')}@qa.invalid`;
  const { rows } = await query(
    `INSERT INTO users (tenant_id, email, name, role, password_hash, permissions)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, email, name, role`,
    [tenantId, email, name || uniq('QA Agent'), role, '$2b$10$notarealhashatall', permissions]
  );
  const user = rows[0];
  return { ...user, tenantId, token: tokenFor({ userId: user.id, tenantId, role, email }) };
}

/** Every module/action switched off, so "denied" is unambiguous. */
function deniedPermissions() {
  const { MODULES } = backendRequire('./config/permissions');
  const perms = {};
  for (const [mod, actions] of Object.entries(MODULES)) {
    perms[mod] = {};
    for (const a of actions) perms[mod][a] = false;
  }
  return perms;
}

/** Every module/action switched on, for a TEAM_MEMBER who should get through. */
function grantedPermissions() {
  const { MODULES } = backendRequire('./config/permissions');
  const perms = {};
  for (const [mod, actions] of Object.entries(MODULES)) {
    perms[mod] = {};
    for (const a of actions) perms[mod][a] = true;
  }
  return perms;
}

function pickId(body, keys) {
  const candidates = [
    body, body?.data, body?.lead, body?.booking, body?.quotation, body?.hotel,
    body?.batch, body?.expense, body?.followUp, body?.template, body?.user, body?.customer,
  ];
  for (const obj of candidates) {
    if (!obj || typeof obj !== 'object') continue;
    for (const k of keys) {
      if (obj[k] != null && obj[k] !== '') return String(obj[k]);
    }
  }
  return null;
}

export async function seedWorld(app, { query }) {
  const supertestFor = () => supertest(app);
  const seedFailures = [];

  const call = async (token, method, path, body) => {
    let req = supertestFor()[method](path)
      .set('Authorization', `Bearer ${token}`)
      // A fresh source address per seed call, so seeding never eats into the
      // rate-limit buckets the rate-limit rules later depend on.
      .set('X-Forwarded-For', `10.99.${(seq % 250) + 1}.${(seq % 200) + 1}`);
    const res = body ? await req.send(body) : await req;
    if (res.status >= 400) {
      seedFailures.push({ method, path, status: res.status, body: res.body });
    }
    return res;
  };

  const a = await insertTenant(query);
  const b = await insertTenant(query);

  const adminA = await insertUser(query, a.tenantId, { role: 'ADMIN' });
  const memberA = await insertUser(query, a.tenantId, { role: 'TEAM_MEMBER', permissions: grantedPermissions() });
  const deniedA = await insertUser(query, a.tenantId, { role: 'TEAM_MEMBER', permissions: deniedPermissions() });
  const adminB = await insertUser(query, b.tenantId, { role: 'ADMIN' });

  const seedFor = async (token) => {
    const out = {};

    const leadRes = await call(token, 'post', '/api/leads', {
      customerName: 'QA Seed Customer', phone: newPhone(), email: 'qa.seed@qa.invalid',
      interest: 'Goa 4N', source: 'Manual', stage: 'New', travelers: 2,
    });
    out.lead = pickId(leadRes.body, ['leadId', 'lead_id', 'id']);

    const bookingRes = await call(token, 'post', '/api/bookings', {
      customerName: 'QA Seed Traveller', phone: newPhone(), email: 'qa.booking@qa.invalid',
      trip: 'QA Goa Package', departure: '2026-12-01', members: 2, pricePerPerson: 15000,
      travelStatus: 'Booked', pickup: 'Airport',
    });
    out.booking = pickId(bookingRes.body, ['bookingId', 'booking_id', 'id']);

    const quoteRes = await call(token, 'post', '/api/quotations', {
      customerName: 'QA Seed Quote', tripName: 'QA Kerala 5N', phone: newPhone(),
      email: 'qa.quote@qa.invalid', priceQuote: 42000, status: 'Draft',
    });
    out.quotation = pickId(quoteRes.body, ['quotationId', 'quotation_id', 'id']);
    // The public share link is keyed on the row's primary key, not on the
    // human-facing QT- reference (see quotationRepository.getQuotationByUuid).
    out.quotationUuid = pickId(quoteRes.body, ['id']);

    const hotelRes = await call(token, 'post', '/api/hotels', {
      name: 'QA Grand Hotel', city: 'Goa', rating: '4 Star', address: 'QA Road',
      contactPerson: 'QA Manager', contactPhone: newPhone(),
    });
    out.hotel = pickId(hotelRes.body, ['id', 'hotel_id']);

    const batchRes = await call(token, 'post', '/api/batches', {
      name: 'QA Batch Dec', tripName: 'QA Goa Package', departureDate: '2026-12-10',
      totalCapacity: 20, pricePerPerson: 15000,
    });
    out.batch = pickId(batchRes.body, ['batchId', 'batch_id', 'id']);

    const expenseRes = await call(token, 'post', '/api/expenses', {
      title: 'QA Hotel Advance', amount: 5000, category: 'Hotel', link_type: 'general',
      vendor_name: 'QA Vendor', status: 'Pending',
    });
    out.expense = pickId(expenseRes.body, ['id', 'expense_id']);

    return out;
  };

  const resA = await seedFor(adminA.token);
  const resB = await seedFor(adminB.token);

  // A chat has no plain create endpoint worth seeding through, so it goes in
  // directly.
  const insertChat = async (tenantId, name) => {
    const p = newPhone();
    const { rows } = await query(
      `INSERT INTO whatsapp_chats
         (tenant_id, phone, jid, customer_name, last_message, last_message_timestamp, last_inbound_at, unread_count, ai_enabled, transport)
       VALUES ($1,$2,$3,$4,'hello',now(),now(),0,false,'web') RETURNING id`,
      [tenantId, p, `${p}@s.whatsapp.net`, name]
    );
    return String(rows[0].id);
  };
  resA.chat = await insertChat(a.tenantId, 'QA Chat Customer A');
  resB.chat = await insertChat(b.tenantId, 'QA Chat Customer B');

  if (resA.booking) {
    const fu = await call(adminA.token, 'post', `/api/bookings/${resA.booking}/follow-ups`, {
      note: 'QA seed follow-up', followUpDate: '2026-11-20',
    });
    resA.followUp = pickId(fu.body, ['id', 'followUpId']);
  }

  const customersRes = await call(adminA.token, 'get', '/api/customers');
  const firstCustomer = Array.isArray(customersRes.body)
    ? customersRes.body[0]
    : customersRes.body?.customers?.[0] || customersRes.body?.data?.[0];
  resA.customer = pickId(firstCustomer, ['id', 'customer_id']);

  return {
    tenantA: a,
    tenantB: b,
    users: { adminA, memberA, deniedA, adminB },
    resources: { A: resA, B: resB },
    seedFailures,
    tokenFor,
    newPhone,
    uniq,
  };
}
