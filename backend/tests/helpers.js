const { query } = require('../config/db');

/**
 * Builders for the rows a test needs, so each test says what it is about
 * rather than how to construct four tables first.
 */

let counter = 0;
const unique = (prefix) => `${prefix}_${process.pid}_${(counter += 1)}`;

/** A tenant with an owner, on a plan that includes everything. */
async function createTenant({ planId = 'PRO' } = {}) {
  const company = unique('Test Agency');

  const { rows } = await query(
    `INSERT INTO tenants (name, email, company_name, plan_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [company, `${unique('owner')}@example.com`, company, planId]
  );
  const tenantId = rows[0].id;

  // Paid plans expire; without this the tenant reads as lapsed and every
  // feature check fails for a reason that has nothing to do with the test.
  await query(
    `UPDATE tenants SET plan_expires_at = now() + interval '30 days' WHERE id = $1`,
    [tenantId]
  );

  const user = await createUser(tenantId, { role: 'ADMIN' });
  return { tenantId, userId: user.id, email: user.email, company };
}

async function createUser(tenantId, { role = 'TEAM_MEMBER', name = null, permissions = null } = {}) {
  const email = `${unique('user')}@example.com`;
  const { rows } = await query(
    `INSERT INTO users (tenant_id, email, name, role, password_hash, permissions)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, role`,
    [tenantId, email, name || unique('Agent'), role, '$2b$10$notarealhashatall', permissions]
  );
  return rows[0];
}

/** A signed token for this user, as authMiddleware will read it. */
function authHeaderFor({ tenantId, userId, role = 'ADMIN', permissions = null }) {
  const jwt = require('jsonwebtoken');
  const env = require('../config/env');
  const token = jwt.sign(
    { userId, tenantId, role, permissions, email: 'test@example.com' },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
  return `Bearer ${token}`;
}

async function createChat(tenantId, { phone, transport = 'web', aiEnabled = false, customerName = 'Test Customer' } = {}) {
  const { rows } = await query(
    `INSERT INTO whatsapp_chats
       (tenant_id, phone, jid, customer_name, last_message, last_message_timestamp, last_inbound_at, unread_count, ai_enabled, transport)
     VALUES ($1, $2, $3, $4, 'hello', now(), now(), 0, $5, $6)
     RETURNING *`,
    [tenantId, phone || unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '7'), `${phone}@s.whatsapp.net`, customerName, aiEnabled, transport]
  );
  return rows[0];
}

/** Removes everything a test made, in foreign-key order. */
async function resetTenantData() {
  await query('DELETE FROM whatsapp_messages');
  await query('DELETE FROM whatsapp_chats');
  await query('DELETE FROM whatsapp_templates');
  await query('DELETE FROM leads');
  await query('DELETE FROM users');
  await query('DELETE FROM settings');
  await query('DELETE FROM tenants');
}

module.exports = { createTenant, createUser, createChat, authHeaderFor, resetTenantData, unique };
