/**
 * WhatsApp webhook audit: 36 checks against the real routes and database.
 *
 * Meta is never contacted - every scenario is driven by posting payloads at
 * the webhook exactly as Meta would, signed with the configured app secret.
 * Everything it writes is prefixed AUDIT_ and removed at the end.
 *
 * Run from the backend directory, against a development database:
 *
 *   cd backend && node ../scripts/whatsapp-webhook-audit.js
 *
 * Covers: GET verification, signature forgery and tampering, malformed and
 * batched payloads, unknown tenants, duplicate delivery, message types,
 * unicode, status ordering, cross-tenant status writes, and concurrent
 * first-message races.
 */
/**
 * Exercises the real WhatsApp webhook end to end against the real database.
 * Meta is never called: every scenario is driven by posting payloads at the
 * route exactly as Meta would.
 */
process.env.FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'test_app_secret';
process.env.WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'test_verify_token';

const path = require('path');
const crypto = require('crypto');

// This script lives outside backend/, so its dependencies and modules are
// resolved from there explicitly rather than by directory walking.
const backendRequire = require('module').createRequire(
  path.join(__dirname, '..', 'backend', 'package.json')
);
const express = backendRequire('express');
const { query } = backendRequire('./config/db');

const whatsappRoutes = backendRequire('./routes/whatsappRoutes');
const { errorHandler } = backendRequire('./middleware/errorHandler');

const SECRET = process.env.FACEBOOK_APP_SECRET;
const PHONE_ID = 'TEST_PHONE_ID_9999';
const OTHER_PHONE_ID = 'UNKNOWN_PHONE_ID_0000';

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

function sign(raw) {
  return 'sha256=' + crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
}

function messagePayload(messages, phoneId = PHONE_ID) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WABA_1',
        changes: [
          {
            field: 'messages',
            value: {
              metadata: { phone_number_id: phoneId },
              contacts: [{ profile: { name: 'Audit Customer' }, wa_id: '919812000111' }],
              messages,
            },
          },
        ],
      },
    ],
  };
}

function statusPayload(statuses, phoneId = PHONE_ID) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      { id: 'WABA_1', changes: [{ field: 'messages', value: { metadata: { phone_number_id: phoneId }, statuses } }] },
    ],
  };
}

function textMessage(id, body, from = '919812000111') {
  return { id, from, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body } };
}

async function main() {
  const app = express();
  app.use(express.json({ limit: '2mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
  app.use('/api/whatsapp', whatsappRoutes);
  app.use(errorHandler);

  const server = app.listen(0);
  const port = server.address().port;
  const url = (p) => `http://127.0.0.1:${port}/api/whatsapp${p}`;

  // Two tenants: one owns the phone id under test, the other must stay clean.
  const tenants = (await query('SELECT id FROM tenants ORDER BY created_at LIMIT 2')).rows;
  const tenantA = tenants[0].id;
  const tenantB = tenants[1]?.id;

  const cleanup = async () => {
    await query(`DELETE FROM whatsapp_messages WHERE message_id LIKE 'AUDIT_%'`);
    await query(`DELETE FROM whatsapp_chats WHERE phone_key = '9812000111'`);
    await query(`DELETE FROM leads WHERE phone LIKE '%9812000111%'`);
    await query(`UPDATE settings SET whatsapp_phone_number_id = '' WHERE tenant_id = $1`, [tenantA]);
  };
  await cleanup();

  await query(
    `INSERT INTO settings (tenant_id, whatsapp_phone_number_id) VALUES ($1, $2)
     ON CONFLICT (tenant_id) DO UPDATE SET whatsapp_phone_number_id = EXCLUDED.whatsapp_phone_number_id`,
    [tenantA, PHONE_ID]
  );


  const post = async (payload, { signature = 'valid', raw = null, headers = {} } = {}) => {
    const bodyRaw = raw !== null ? raw : JSON.stringify(payload);
    const h = { 'Content-Type': 'application/json', ...headers };
    if (signature === 'valid') h['X-Hub-Signature-256'] = sign(bodyRaw);
    else if (signature === 'bad') h['X-Hub-Signature-256'] = 'sha256=' + '0'.repeat(64);
    else if (typeof signature === 'string' && signature.startsWith('sha256=')) h['X-Hub-Signature-256'] = signature;
    const res = await fetch(url('/webhook'), { method: 'POST', headers: h, body: bodyRaw });
    return { status: res.status, text: await res.text() };
  };

  const countMessages = async (msgId) =>
    (await query(`SELECT count(*)::int c FROM whatsapp_messages WHERE message_id = $1`, [msgId])).rows[0].c;
  const countChats = async () =>
    (await query(`SELECT count(*)::int c FROM whatsapp_chats WHERE phone_key = '9812000111'`)).rows[0].c;

  // ---------- GET verification ----------
  let r = await fetch(url('/webhook?hub.mode=subscribe&hub.verify_token=' + process.env.WHATSAPP_VERIFY_TOKEN + '&hub.challenge=CH123'));
  check('GET verification with correct token returns challenge', r.status === 200 && (await r.text()) === 'CH123');

  r = await fetch(url('/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=CH123'));
  check('GET verification with wrong token is rejected', r.status === 403);

  r = await fetch(url('/webhook'));
  check('GET verification with no params is rejected', r.status === 403);

  // ---------- Signature ----------
  let res = await post(messagePayload([textMessage('AUDIT_SIG_1', 'forged')]), { signature: 'none' });
  check('POST without signature header is rejected', res.status === 401);
  check('  -> forged message was not stored', (await countMessages('AUDIT_SIG_1')) === 0);

  res = await post(messagePayload([textMessage('AUDIT_SIG_2', 'forged')]), { signature: 'bad' });
  check('POST with wrong signature is rejected', res.status === 401);
  check('  -> forged message was not stored', (await countMessages('AUDIT_SIG_2')) === 0);

  // Body tampered after signing.
  const original = JSON.stringify(messagePayload([textMessage('AUDIT_SIG_3', 'original')]));
  const tampered = JSON.stringify(messagePayload([textMessage('AUDIT_SIG_3', 'tampered')]));
  res = await post(null, { raw: tampered, signature: sign(original) });
  check('POST with body tampered after signing is rejected', res.status === 401);

  // ---------- Malformed input ----------
  res = await post(null, { raw: '{not json', signature: 'valid' });
  check('Malformed JSON does not crash the server', res.status === 400 || res.status === 401);

  res = await post({});
  check('Empty object is handled (404, not a crash)', res.status === 404);

  res = await post({ object: 'page', entry: [] });
  check('Unknown event object is rejected', res.status === 404);

  res = await post({ object: 'whatsapp_business_account' });
  check('Payload with no entry does not crash', res.status === 200);

  res = await post({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: null }] }] });
  check('Payload with null value does not crash', res.status === 200);

  // ---------- Unknown tenant ----------
  const beforeUnknown = await countChats();
  res = await post(messagePayload([textMessage('AUDIT_UNKNOWN_1', 'stranger')], OTHER_PHONE_ID));
  await new Promise((r2) => setTimeout(r2, 400));
  check('Unknown phone_number_id is accepted but ignored', res.status === 200);
  check('  -> no message written for an unowned number', (await countMessages('AUDIT_UNKNOWN_1')) === 0);
  check('  -> no chat leaked into another tenant', (await countChats()) === beforeUnknown);

  // ---------- Happy path ----------
  res = await post(messagePayload([textMessage('AUDIT_MSG_1', 'Hello, I want a Bali package')]));
  await new Promise((r2) => setTimeout(r2, 600));
  check('Valid signed message is accepted', res.status === 200);
  check('  -> message stored exactly once', (await countMessages('AUDIT_MSG_1')) === 1);
  check('  -> chat created', (await countChats()) === 1);

  const chatAfterFirst = (await query(`SELECT id, unread_count, tenant_id FROM whatsapp_chats WHERE phone_key='9812000111'`)).rows[0];
  check('  -> chat belongs to the owning tenant', chatAfterFirst?.tenant_id === tenantA);

  // ---------- Duplicate delivery (Meta retries) ----------
  for (let i = 0; i < 5; i++) await post(messagePayload([textMessage('AUDIT_MSG_1', 'Hello, I want a Bali package')]));
  await new Promise((r2) => setTimeout(r2, 600));
  check('Same webhook delivered 6 times stores one message', (await countMessages('AUDIT_MSG_1')) === 1);
  const unreadAfterDupes = (await query(`SELECT unread_count FROM whatsapp_chats WHERE phone_key='9812000111'`)).rows[0].unread_count;
  check('  -> unread count not inflated by retries', unreadAfterDupes === chatAfterFirst.unread_count,
    `expected ${chatAfterFirst.unread_count}, got ${unreadAfterDupes}`);
  check('  -> still one chat', (await countChats()) === 1);

  // ---------- Batched payload ----------
  res = await post(messagePayload([
    textMessage('AUDIT_BATCH_1', 'first'),
    textMessage('AUDIT_BATCH_2', 'second'),
    textMessage('AUDIT_BATCH_3', 'third'),
  ]));
  await new Promise((r2) => setTimeout(r2, 900));
  const batchStored = (await query(`SELECT count(*)::int c FROM whatsapp_messages WHERE message_id LIKE 'AUDIT_BATCH_%'`)).rows[0].c;
  check('All 3 messages in one webhook are stored', batchStored === 3, `stored ${batchStored}/3`);

  // ---------- Message types ----------
  const typed = [
    { id: 'AUDIT_TYPE_LOC', from: '919812000111', timestamp: '1', type: 'location', location: { latitude: 1, longitude: 2 } },
    { id: 'AUDIT_TYPE_CONTACT', from: '919812000111', timestamp: '1', type: 'contacts', contacts: [{ name: { formatted_name: 'X' } }] },
    { id: 'AUDIT_TYPE_BTN', from: '919812000111', timestamp: '1', type: 'button', button: { text: 'Yes' } },
    { id: 'AUDIT_TYPE_UNKNOWN', from: '919812000111', timestamp: '1', type: 'some_future_type' },
    { id: 'AUDIT_TYPE_EMPTY', from: '919812000111', timestamp: '1', type: 'text', text: { body: '' } },
    { id: 'AUDIT_TYPE_UNICODE', from: '919812000111', timestamp: '1', type: 'text', text: { body: 'नमस्ते 🙏 ₹50,000 "quoted" — dash' } },
    { id: 'AUDIT_TYPE_LONG', from: '919812000111', timestamp: '1', type: 'text', text: { body: 'x'.repeat(5000) } },
  ];
  await post(messagePayload(typed));
  await new Promise((r2) => setTimeout(r2, 900));
  const typedStored = (await query(`SELECT message_id, message_text FROM whatsapp_messages WHERE message_id LIKE 'AUDIT_TYPE_%' ORDER BY message_id`)).rows;
  check('Unsupported/unknown message types are stored, not dropped', typedStored.length === typed.length,
    `stored ${typedStored.length}/${typed.length}: ${typedStored.map((t) => t.message_id).join(',')}`);
  const uni = typedStored.find((t) => t.message_id === 'AUDIT_TYPE_UNICODE');
  check('Unicode/emoji/rupee survives the round trip', uni?.message_text?.includes('नमस्ते') && uni?.message_text?.includes('₹'));
  const long = typedStored.find((t) => t.message_id === 'AUDIT_TYPE_LONG');
  check('5000-character message is not truncated', long?.message_text?.length === 5000, `len=${long?.message_text?.length}`);

  // ---------- Status transitions ----------
  const outbound = await query(
    `INSERT INTO whatsapp_messages (tenant_id, chat_id, direction, message_text, message_id, status, message_timestamp)
     VALUES ($1, $2, 'outbound', 'status test', 'AUDIT_STATUS_MSG', 'sent', now()) RETURNING id`,
    [tenantA, chatAfterFirst.id]
  );
  const statusOf = async () =>
    (await query(`SELECT status FROM whatsapp_messages WHERE message_id='AUDIT_STATUS_MSG'`)).rows[0].status;

  await post(statusPayload([{ id: 'AUDIT_STATUS_MSG', status: 'delivered', timestamp: '1' }]));
  await new Promise((r2) => setTimeout(r2, 300));
  check('sent -> delivered applies', (await statusOf()) === 'delivered');

  await post(statusPayload([{ id: 'AUDIT_STATUS_MSG', status: 'read', timestamp: '2' }]));
  await new Promise((r2) => setTimeout(r2, 300));
  check('delivered -> read applies', (await statusOf()) === 'read');

  await post(statusPayload([{ id: 'AUDIT_STATUS_MSG', status: 'delivered', timestamp: '3' }]));
  await new Promise((r2) => setTimeout(r2, 300));
  check('read -> delivered is IGNORED (no backwards move)', (await statusOf()) === 'read', `status is ${await statusOf()}`);

  await post(statusPayload([{ id: 'AUDIT_STATUS_MSG', status: 'weird_new_status', timestamp: '4' }]));
  await new Promise((r2) => setTimeout(r2, 300));
  check('Unknown status is ignored, not stored', (await statusOf()) === 'read');

  res = await post(statusPayload([{ id: 'AUDIT_STATUS_NOT_THERE', status: 'read', timestamp: '1' }]));
  await new Promise((r2) => setTimeout(r2, 300));
  check('Status for an unknown message does not crash', res.status === 200);

  // ---------- Cross-tenant status write ----------
  if (tenantB) {
    const bChat = await query(
      `INSERT INTO whatsapp_chats (tenant_id, phone, customer_name, last_message, last_message_timestamp, unread_count, ai_enabled)
       VALUES ($1, '919700000222', 'Tenant B Customer', 'hi', now(), 0, false) RETURNING id`, [tenantB]);
    await query(
      `INSERT INTO whatsapp_messages (tenant_id, chat_id, direction, message_text, message_id, status, message_timestamp)
       VALUES ($1, $2, 'outbound', 'tenant B msg', 'AUDIT_TENANT_B_MSG', 'sent', now())`,
      [tenantB, bChat.rows[0].id]
    );
    // Tenant A's phone id sends a status event naming tenant B's message.
    await post(statusPayload([{ id: 'AUDIT_TENANT_B_MSG', status: 'read', timestamp: '1' }]));
    await new Promise((r2) => setTimeout(r2, 300));
    const bStatus = (await query(`SELECT status FROM whatsapp_messages WHERE message_id='AUDIT_TENANT_B_MSG'`)).rows[0].status;
    check("Status event cannot update another tenant's message", bStatus === 'sent', `tenant B status is ${bStatus}`);
    await query(`DELETE FROM whatsapp_messages WHERE message_id='AUDIT_TENANT_B_MSG'`);
    await query(`DELETE FROM whatsapp_chats WHERE id=$1`, [bChat.rows[0].id]);
  }

  // ---------- Concurrency ----------
  await query(`DELETE FROM whatsapp_messages WHERE message_id LIKE 'AUDIT_RACE_%'`);
  await query(`DELETE FROM whatsapp_chats WHERE phone_key = '9813000444'`);
  await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      post(messagePayload([textMessage('AUDIT_RACE_' + i, 'burst ' + i, '919813000444')]))
    )
  );
  await new Promise((r2) => setTimeout(r2, 1200));
  const raceChats = (await query(`SELECT count(*)::int c FROM whatsapp_chats WHERE phone_key='9813000444'`)).rows[0].c;
  const raceMsgs = (await query(`SELECT count(*)::int c FROM whatsapp_messages WHERE message_id LIKE 'AUDIT_RACE_%'`)).rows[0].c;
  check('6 simultaneous first-messages create exactly one chat', raceChats === 1, `chats=${raceChats}`);
  check('  -> all 6 messages stored', raceMsgs === 6, `messages=${raceMsgs}`);

  // Same message id delivered concurrently 5 times.
  await Promise.all(Array.from({ length: 5 }, () => post(messagePayload([textMessage('AUDIT_RACE_DUP', 'same', '919813000444')]))));
  await new Promise((r2) => setTimeout(r2, 800));
  const dupCount = await countMessages('AUDIT_RACE_DUP');
  check('Same message id delivered 5x concurrently stores one row', dupCount === 1, `rows=${dupCount}`);

  // ---------- Cleanup ----------
  await query(`DELETE FROM whatsapp_messages WHERE message_id LIKE 'AUDIT_%'`);
  await query(`DELETE FROM whatsapp_chats WHERE phone_key IN ('9812000111','9813000444')`);
  await query(`DELETE FROM leads WHERE phone LIKE '%9812000111%' OR phone LIKE '%9813000444%'`);
  await query(`UPDATE settings SET whatsapp_phone_number_id = '' WHERE tenant_id = $1`, [tenantA]);

  server.close();
  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) console.log('FAILED:\n' + failed.map((f) => '  - ' + f.name + (f.detail ? ' (' + f.detail + ')' : '')).join('\n'));
  process.exit(0);
}

main().catch((e) => {
  console.error('HARNESS ERROR', e);
  process.exit(1);
});
