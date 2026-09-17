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

/** Suffix match, same convention as bookingRepository.existsByPhone - lets a
 * typed number without a country-code prefix still match a stored one that
 * has one (or vice versa). */
async function findByPhone(tenantId, phone) {
  const { rows } = await query(
    `SELECT * FROM customers WHERE tenant_id = $1 AND (phone = $2 OR phone LIKE $3) LIMIT 1`,
    [tenantId, phone, `%${phone}`]
  );
  return rows[0];
}

/**
 * The same upsert for a whole batch, for the spreadsheet lead import.
 *
 * Two rows of one file can carry the same phone with different spellings of
 * the name; Postgres rejects a multi-row upsert that hits the same conflict
 * target twice, so the batch is de-duplicated on phone first.
 *
 * @returns {Promise<Object>} phone (as supplied) -> customer id
 */
async function bulkUpsertByPhone(tenantId, contacts) {
  const byPhone = new Map();
  for (const c of contacts) {
    if (c.phone && !byPhone.has(c.phone)) byPhone.set(c.phone, c);
  }
  if (byPhone.size === 0) return {};

  const list = [...byPhone.values()];
  const values = [tenantId];
  const placeholders = list.map((c) => {
    values.push(c.customerName || c.name || '', c.email || '', c.phone);
    return `($1, $${values.length - 2}, $${values.length - 1}, $${values.length})`;
  });

  const { rows } = await query(
    `INSERT INTO customers (tenant_id, name, email, phone)
     VALUES ${placeholders.join(',')}
     ON CONFLICT (tenant_id, phone) DO UPDATE SET
       name = COALESCE(NULLIF(EXCLUDED.name, ''), customers.name),
       email = COALESCE(NULLIF(EXCLUDED.email, ''), customers.email),
       last_activity_at = now()
     RETURNING id, phone`,
    values
  );

  return Object.fromEntries(rows.map((r) => [r.phone, r.id]));
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

  if (search && search.trim()) {
    const tokens = search.trim().split(/\s+/).filter(Boolean);
    const searchTarget = "CONCAT_WS(' ', name, email, phone)";
    const searchConditions = tokens.map((token) => {
      values.push(`%${token}%`);
      return `${searchTarget} ILIKE $${paramIndex++}`;
    });
    whereSql += ` AND (${searchConditions.join(' AND ')})`;
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

/** Everything tied to one customer, for the unified profile view. `phone` is
 * needed separately because whatsapp_chats has no customer_id column - it
 * only carries the phone number, same natural key customers uses. */
async function getCustomerHistory(tenantId, customerId, phone) {
  const [bookings, quotations, leads, followUps, media] = await Promise.all([
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
    phone
      ? query(
          `SELECT m.id, m.message_type, m.media_url, m.message_timestamp
           FROM whatsapp_messages m
           JOIN whatsapp_chats c ON m.chat_id = c.id
           WHERE c.tenant_id = $1 AND c.phone = $2 AND m.media_url IS NOT NULL
           ORDER BY m.message_timestamp DESC
           LIMIT 50`,
          [tenantId, phone]
        )
      : Promise.resolve({ rows: [] }),
  ]);

  return {
    bookings: bookings.rows,
    quotations: quotations.rows,
    leads: leads.rows,
    followUps: followUps.rows,
    media: media.rows,
  };
}

module.exports = {
  upsertByPhone,
  findByPhone,
  bulkUpsertByPhone,
  getCustomerById,
  listCustomersPaged,
  getCustomerHistory,
};
