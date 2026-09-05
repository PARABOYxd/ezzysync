/**
 * Builds the schema on a genuinely empty database and exercises the write
 * paths against it.
 *
 * This exists because every schema bug in this project has looked identical:
 * fine on a developer machine whose database still carries columns from an
 * older definition, broken the moment a fresh database is created. Reading
 * db.js cannot catch that. Creating a real database can.
 *
 * Skipped automatically when no Postgres is reachable, so CI without a
 * database service still passes the rest of the suite.
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TEST_DB = 'ezzysync_ci_test';
const baseUrl = process.env.DATABASE_URL || '';
const adminUrl = baseUrl.replace(/\/[^/]+$/, '/postgres');
const testUrl = baseUrl.replace(/\/[^/]+$/, `/${TEST_DB}`);

let db;
let repo;
let waRepo;
let skip = false;

test.before(async () => {
  if (!baseUrl) {
    skip = true;
    return;
  }

  const { Pool } = require('pg');
  let admin;
  try {
    admin = new Pool({ connectionString: adminUrl, ssl: false, connectionTimeoutMillis: 4000 });
    await admin.query('SELECT 1');
  } catch {
    skip = true;
    if (admin) await admin.end().catch(() => {});
    return;
  }

  await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB}'`);
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  // The modules read DATABASE_URL at require time, so point them at the test
  // database before anything under config/ is loaded.
  process.env.DATABASE_URL = testUrl;
  db = require('../config/db');
  repo = require('../repositories/whatsappWebRepository');
  waRepo = require('../repositories/whatsappRepository');

  await db.ensureSchema();
});

test.after(async () => {
  if (skip) return;
  if (db) await db.pool?.end?.().catch(() => {});
  const { Pool } = require('pg');
  const admin = new Pool({ connectionString: adminUrl, ssl: false });
  await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB}'`);
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await admin.end();
});

const maybe = (name, fn) =>
  test(name, { skip: skip ? 'no Postgres reachable' : false }, fn);

maybe('every table the code queries is created', async () => {
  const { rows } = await db.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  const have = new Set(rows.map((r) => r.tablename));

  // Dropped once already by a rewrite of db.js; each one breaks a whole
  // feature on a fresh deploy, and refresh_tokens breaks every login.
  for (const t of [
    'tenants', 'users', 'refresh_tokens', 'bookings', 'leads', 'quotations',
    'settings', 'payments', 'hotels', 'expenses', 'tour_batches',
    'trip_cost_templates', 'whatsapp_chats', 'whatsapp_messages',
    'whatsapp_sessions', 'whatsapp_templates', 'whatsapp_setup_requests',
    'customers', 'audit_logs',
  ]) {
    assert.ok(have.has(t), `missing table: ${t}`);
  }
});

maybe('ON CONFLICT targets have matching unique constraints', async () => {
  // Postgres rejects ON CONFLICT without one, so a missing constraint turns
  // every insert on that table into a runtime error.
  const { rows } = await db.query(`
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'whatsapp_messages'
      AND indexdef LIKE '%UNIQUE%' AND indexdef LIKE '%(message_id)%'
  `);
  assert.equal(rows.length, 1, 'whatsapp_messages.message_id needs a unique index');
});

maybe('settings columns the code writes all exist', async () => {
  const { rows } = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'settings'`
  );
  const have = new Set(rows.map((r) => r.column_name));
  for (const col of ['whatsapp_ai_auto_reply', 'whatsapp_default_chat_mode']) {
    assert.ok(have.has(col), `settings.${col} is missing`);
  }
});

maybe('a WhatsApp conversation can be recorded end to end', async () => {
  const tenant = (
    await db.query(
      `INSERT INTO tenants (email, name, company_name) VALUES ('t@test.local','T','TCo') RETURNING id`
    )
  ).rows[0].id;

  await repo.markConnected(tenant, '919999999999');
  assert.equal((await repo.getSession(tenant)).status, 'connected');

  const chat = await repo.createChat(tenant, {
    phone: '919888888888',
    jid: '919888888888@s.whatsapp.net',
    customerName: 'Test',
    leadId: null,
    lastMessage: 'hi',
    aiEnabled: false,
  });

  await repo.insertMessage(tenant, {
    chatId: chat.id, messageId: 'in1', direction: 'inbound',
    sender: 'customer', messageText: 'hi', status: 'delivered',
  });

  // A photo with no caption is a normal message.
  await repo.insertMessage(tenant, {
    chatId: chat.id, messageId: 'out1', direction: 'outbound',
    sender: 'agent', messageText: '', status: 'sent',
    messageType: 'image', mediaUrl: 'http://example/p.jpg',
  });

  assert.equal((await repo.listMessages(tenant, chat.id)).length, 2);
  assert.ok(await repo.getChatWithContext(tenant, chat.id));
  assert.equal((await repo.getRecentHistory(tenant, '919888888888')).length, 2);
});

maybe('the echo of our own message is ignored', async () => {
  const tenant = (
    await db.query(
      `INSERT INTO tenants (email, name, company_name) VALUES ('e@test.local','E','ECo') RETURNING id`
    )
  ).rows[0].id;
  const chat = await repo.createChat(tenant, {
    phone: '919000000001', jid: null, customerName: 'E', leadId: null,
    lastMessage: 'x', aiEnabled: false,
  });

  const first = await repo.insertMessage(tenant, {
    chatId: chat.id, messageId: 'echo1', direction: 'outbound',
    sender: 'agent', messageText: 'hello', status: 'sent',
  });
  const second = await repo.insertMessage(tenant, {
    chatId: chat.id, messageId: 'echo1', direction: 'outbound',
    sender: 'agent', messageText: 'hello', status: 'sent',
  });

  assert.equal(first.inserted, true);
  assert.equal(second.inserted, false, 'WhatsApp echoes back our own sends');
});

maybe('a redelivered webhook does not double-count', async () => {
  const tenant = (
    await db.query(
      `INSERT INTO tenants (email, name, company_name) VALUES ('w@test.local','W','WCo') RETURNING id`
    )
  ).rows[0].id;

  const a = await waRepo.saveMessage(tenant, '919111111111', 'inbound', 'hi', 'W', 1, 'hook1');
  const b = await waRepo.saveMessage(tenant, '919111111111', 'inbound', 'hi', 'W', 1, 'hook1');

  assert.equal(b.duplicate, true, 'Meta delivers webhooks at least once');
  assert.equal(b.chat.unread_count, a.chat.unread_count, 'unread must not move on a duplicate');
});

maybe('a message with no provider id still saves', async () => {
  const tenant = (
    await db.query(
      `INSERT INTO tenants (email, name, company_name) VALUES ('n@test.local','N','NCo') RETURNING id`
    )
  ).rows[0].id;

  // The AI handoff notice has no provider id; this used to violate NOT NULL
  // and get swallowed by the caller's try/catch.
  const saved = await waRepo.saveMessage(tenant, '919222222222', 'outbound', 'handed to a human', 'N', 0, null);
  assert.ok(saved.message?.id);
});

maybe('Instagram chats stay separate from each other', async () => {
  const tenant = (
    await db.query(
      `INSERT INTO tenants (email, name, company_name) VALUES ('i@test.local','I','ICo') RETURNING id`
    )
  ).rows[0].id;

  // "IG_<handle>" shares the phone column. Stripping non-digits from it once
  // collapsed every Instagram conversation into a single row keyed on ''.
  const a = await waRepo.saveMessage(tenant, 'IG_rahul', 'inbound', 'hi', 'Rahul', 1, 'ig_a');
  const b = await waRepo.saveMessage(tenant, 'IG_priya', 'inbound', 'hi', 'Priya', 1, 'ig_b');

  assert.equal(a.chat.phone, 'IG_rahul');
  assert.equal(b.chat.phone, 'IG_priya');
  assert.notEqual(a.chat.id, b.chat.id);
});

maybe('a plain number is still normalised to E.164-ish digits', async () => {
  const tenant = (
    await db.query(
      `INSERT INTO tenants (email, name, company_name) VALUES ('p@test.local','P','PCo') RETURNING id`
    )
  ).rows[0].id;

  const saved = await waRepo.saveMessage(tenant, '+91 98765 43210', 'inbound', 'hi', 'P', 1, 'fmt1');
  assert.equal(saved.chat.phone, '919876543210');
});

maybe('quick replies come from the templates the Settings screen writes', async () => {
  const tenant = (
    await db.query(
      `INSERT INTO tenants (email, name, company_name) VALUES ('q@test.local','Q','QCo') RETURNING id`
    )
  ).rows[0].id;

  await db.query(
    `INSERT INTO whatsapp_templates (tenant_id, type, name, body) VALUES ($1,'text','/hello','Hi there')`,
    [tenant]
  );
  // A Meta-approved template is not free text and must not appear in the picker.
  await db.query(
    `INSERT INTO whatsapp_templates (tenant_id, type, name, body) VALUES ($1,'template','promo','...')`,
    [tenant]
  );

  const list = await repo.listQuickReplies(tenant);
  assert.equal(list.length, 1);
  assert.equal(list[0].shortcut, 'hello', 'the leading slash is normalised away');
});

maybe('tenant data cannot leak across tenants', async () => {
  const a = (await db.query(`INSERT INTO tenants (email,name,company_name) VALUES ('a1@test.local','A','A') RETURNING id`)).rows[0].id;
  const b = (await db.query(`INSERT INTO tenants (email,name,company_name) VALUES ('b1@test.local','B','B') RETURNING id`)).rows[0].id;

  const chat = await repo.createChat(a, {
    phone: '919333333333', jid: null, customerName: 'A', leadId: null,
    lastMessage: 'secret', aiEnabled: false,
  });

  assert.equal(await repo.getChatWithContext(b, chat.id), null, 'tenant B must not read tenant A');
  assert.equal((await repo.listChats(b)).length, 0);
});
