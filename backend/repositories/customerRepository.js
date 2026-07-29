const { query } = require('../config/db');

/**
 * Creates or refreshes the customer rollup row for a given phone number
 * within a tenant. (tenant_id, phone) is the natural key - phone is the
 * one field every booking/lead/quotation always has, unlike email/name.
 */
async function upsertByPhone(tenantId, { name, email, phone }) {
  const { rows } = await query(
    `INSERT INTO customers (tenant_id, name, email, phone)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id, phone) DO UPDATE SET
       name = COALESCE(NULLIF(EXCLUDED.name, ''), customers.name),
       email = COALESCE(NULLIF(EXCLUDED.email, ''), customers.email),
       last_activity_at = now()
     RETURNING *`,
    [tenantId, name || '', email || '', phone]
  );
  return rows[0];
}

async function getCustomerById(tenantId, customerId) {
  const { rows } = await query(
    `SELECT * FROM customers WHERE tenant_id = $1 AND id = $2`,
    [tenantId, customerId]
  );
  return rows[0];
}

async function listCustomersPaged({ tenantId, page = 1, limit = 10, search = '' }) {
  const values = [tenantId];
  let whereSql = 'tenant_id = $1';
  let paramIndex = 2;

  if (search) {
    whereSql += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`;
    values.push(`%${search}%`);
    paramIndex++;
  }

  const countRes = await query(`SELECT COUNT(*)::int as count FROM customers WHERE ${whereSql}`, values);
  const totalCount = countRes.rows[0]?.count || 0;

  const offset = Math.max((page - 1) * limit, 0);
  values.push(Number(limit));
  const limitIndex = paramIndex++;
  values.push(Number(offset));
  const offsetIndex = paramIndex++;

  const { rows } = await query(
    `SELECT * FROM customers WHERE ${whereSql} ORDER BY last_activity_at DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  return { customers: rows, totalCount };
}

/** Everything tied to one customer, for the unified profile view. */
async function getCustomerHistory(tenantId, customerId) {
  const [bookings, quotations, leads, followUps] = await Promise.all([
    query(`SELECT * FROM bookings WHERE tenant_id = $1 AND customer_id = $2 AND deleted = FALSE ORDER BY booking_timestamp DESC`, [tenantId, customerId]),
    query(`SELECT * FROM quotations WHERE tenant_id = $1 AND customer_id = $2 ORDER BY created_at DESC`, [tenantId, customerId]),
    query(`SELECT * FROM leads WHERE tenant_id = $1 AND customer_id = $2 AND deleted = FALSE ORDER BY created_at DESC`, [tenantId, customerId]),
    query(
      `SELECT f.* FROM follow_up_logs f
       LEFT JOIN bookings b ON f.booking_id = b.id
       LEFT JOIN leads l ON f.lead_id = l.id
       WHERE f.tenant_id = $1 AND (b.customer_id = $2 OR l.customer_id = $2)
       ORDER BY f.created_at DESC`,
      [tenantId, customerId]
    ),
  ]);

  return {
    bookings: bookings.rows,
    quotations: quotations.rows,
    leads: leads.rows,
    followUps: followUps.rows,
  };
}

module.exports = {
  upsertByPhone,
  getCustomerById,
  listCustomersPaged,
  getCustomerHistory,
};
