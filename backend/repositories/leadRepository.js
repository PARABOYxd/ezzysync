const { query } = require('../config/db');

async function getLeadById(tenantId, leadId) {
  const { rows } = await query(
    `SELECT * FROM leads WHERE tenant_id = $1 AND lead_id = $2`,
    [tenantId, leadId]
  );
  return rows[0];
}

async function insertLead(tenantId, leadId, data, now, createdBy, customerId) {
  const { rows } = await query(
    `INSERT INTO leads (
       tenant_id, lead_id, customer_id, customer_name, email, phone, interest, source, stage,
       assigned_to, notes, next_follow_up_date, created_by, created_at, updated_at, deleted,
       departure_date, travelers
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,FALSE,$16,$17)
     RETURNING *`,
    [
      tenantId, leadId, customerId || null, data.customerName, data.email || '', data.phone,
      data.interest || '', data.source || 'Manual', data.stage || 'New',
      data.assignedTo || '', data.notes || '', data.nextFollowUpDate || null,
      createdBy || '', now, now,
      data.departureDate || '', data.travelers ? Number(data.travelers) : null,
    ]
  );
  return rows[0];
}

async function updateLead(tenantId, leadId, merged, updatedAt, customerId) {
  const { rows } = await query(
    `UPDATE leads SET
       customer_name = $1, email = $2, phone = $3, interest = $4, source = $5, stage = $6,
       assigned_to = $7, notes = $8, next_follow_up_date = $9, updated_at = $10, deleted = $11,
       converted_booking_id = $12, customer_id = COALESCE($13, customer_id),
       departure_date = $14, travelers = $15
     WHERE tenant_id = $16 AND lead_id = $17
     RETURNING *`,
    [
      merged.customerName, merged.email || '', merged.phone, merged.interest || '', merged.source || 'Manual',
      merged.stage || 'New', merged.assignedTo || '', merged.notes || '', merged.nextFollowUpDate || null,
      updatedAt, !!merged.deleted, merged.convertedBookingId || null, customerId,
      merged.departureDate || '', merged.travelers ? Number(merged.travelers) : null,
      tenantId, leadId,
    ]
  );
  return rows[0];
}

async function listLeadsPaged(params) {
  const {
    tenantId, page = 1, limit = 10, search = '', stage = '', priority = '', assignedTo = '', sort = 'newest', includeDeleted = false,
    createdFrom = '', createdTo = '',
  } = params;

  const values = [tenantId];
  let paramIndex = 2;
  let whereClauses = ['tenant_id = $1'];

  if (!includeDeleted) whereClauses.push('deleted = FALSE');

  if (stage) {
    whereClauses.push(`stage = $${paramIndex++}`);
    values.push(stage);
  }
  if (priority) {
    whereClauses.push(`priority = $${paramIndex++}`);
    values.push(priority);
  }
  if (assignedTo) {
    whereClauses.push(`assigned_to ILIKE $${paramIndex++}`);
    values.push(`%${assignedTo}%`);
  }
  if (createdFrom) {
    whereClauses.push(`created_at::date >= $${paramIndex++}::date`);
    values.push(createdFrom);
  }
  if (createdTo) {
    whereClauses.push(`created_at::date <= $${paramIndex++}::date`);
    values.push(createdTo);
  }
  if (search && search.trim()) {
    const tokens = search.trim().split(/\s+/).filter(Boolean);
    const searchTarget = "CONCAT_WS(' ', customer_name, lead_id, email, phone, interest, notes, assigned_to)";
    const searchConditions = tokens.map((token) => {
      values.push(`%${token}%`);
      return `${searchTarget} ILIKE $${paramIndex++}`;
    });
    whereClauses.push(`(${searchConditions.join(' AND ')})`);
  }

  const whereSql = whereClauses.join(' AND ');
  const orderSql = sort === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';

  const countRes = await query(`SELECT COUNT(*)::int as count FROM leads WHERE ${whereSql}`, values);
  const totalCount = countRes.rows[0]?.count || 0;

  const offset = Math.max((page - 1) * limit, 0);
  values.push(Number(limit));
  const limitIndex = paramIndex++;
  values.push(Number(offset));
  const offsetIndex = paramIndex++;

  const { rows } = await query(
    `SELECT * FROM leads WHERE ${whereSql} ${orderSql} LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  return { leads: rows, totalCount };
}

/** All non-deleted leads grouped by stage, for the Kanban pipeline (Phase 3). */
async function listLeadsForPipeline(tenantId, assignedTo) {
  let queryStr = `SELECT * FROM leads WHERE tenant_id = $1 AND deleted = FALSE`;
  const params = [tenantId];
  if (assignedTo) {
    queryStr += ` AND assigned_to ILIKE $2`;
    params.push(`%${assignedTo}%`);
  }
  queryStr += ` ORDER BY created_at DESC`;
  const { rows } = await query(queryStr, params);
  return rows;
}

async function updateStage(tenantId, leadId, stage) {
  const { rows } = await query(
    `UPDATE leads SET stage = $1, updated_at = now() WHERE tenant_id = $2 AND lead_id = $3 RETURNING *`,
    [stage, tenantId, leadId]
  );
  return rows[0];
}

async function listFollowUps(tenantId, leadIdText) {
  const { rows } = await query(
    `SELECT f.*
     FROM follow_up_logs f
     JOIN leads l ON f.lead_id = l.id
     WHERE f.tenant_id = $1 AND l.lead_id = $2
     ORDER BY f.created_at DESC`,
    [tenantId, leadIdText]
  );
  return rows;
}

async function insertFollowUp(tenantId, leadIdText, note, activityType, nextFollowUpDate, createdBy) {
  const { rows: lRows } = await query(
    `SELECT id FROM leads WHERE tenant_id = $1 AND lead_id = $2`,
    [tenantId, leadIdText]
  );
  if (lRows.length === 0) {
    throw new Error('Lead not found.');
  }
  const leadUuid = lRows[0].id;

  const { rows: fRows } = await query(
    `INSERT INTO follow_up_logs (tenant_id, lead_id, note, activity_type, next_follow_up_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [tenantId, leadUuid, note, activityType, nextFollowUpDate || null, createdBy || '']
  );

  if (nextFollowUpDate) {
    await query(`UPDATE leads SET next_follow_up_date = $1 WHERE id = $2`, [nextFollowUpDate, leadUuid]);
  }

  return fRows[0];
}

async function listPool(tenantId) {
  const { rows } = await query(
    `SELECT * FROM leads WHERE tenant_id = $1 AND (assigned_to = '' OR assigned_to IS NULL) AND deleted = FALSE ORDER BY created_at DESC`,
    [tenantId]
  );
  return rows;
}

async function claimLead(tenantId, leadIdText, username) {
  const { rows } = await query(
    `UPDATE leads
     SET assigned_to = $1, updated_at = now()
     WHERE tenant_id = $2 AND lead_id = $3 AND (assigned_to = '' OR assigned_to IS NULL)
     RETURNING *`,
    [username, tenantId, leadIdText]
  );
  return rows[0]; // returns undefined if someone else already claimed it
}

/** Lead counts grouped by assignee, for the team-performance section of the
 * billing analytics report. startDate/endDate filter on created_at and are
 * both optional. */
async function countLeadsByAssignee(tenantId, { startDate, endDate } = {}) {
  let sql = `SELECT assigned_to, COUNT(*) as lead_count FROM leads WHERE tenant_id = $1 AND deleted = FALSE`;
  const params = [tenantId];
  let paramIndex = 2;
  if (startDate) {
    sql += ` AND created_at >= $${paramIndex++}`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND created_at <= $${paramIndex++}`;
    params.push(endDate);
  }
  sql += ` GROUP BY assigned_to`;
  const { rows } = await query(sql, params);
  return rows;
}

async function nextLeadSeq() {
  const { rows } = await query(`SELECT nextval('leads_seq') AS seq`);
  return rows[0].seq;
}

async function getLeadByInstagramSenderId(tenantId, igSenderId) {
  const { rows } = await query(
    `SELECT id FROM leads WHERE tenant_id=$1 AND instagram_sender_id=$2 LIMIT 1`,
    [tenantId, igSenderId]
  );
  return rows[0];
}

async function insertInstagramLead(tenantId, leadId, customerName, phone, notes, igSenderId) {
  await query(
    `INSERT INTO leads (tenant_id, lead_id, customer_name, phone, source, stage, notes, instagram_sender_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,'Instagram DM','New',$5,$6,NOW(),NOW())`,
    [tenantId, leadId, customerName, phone, notes, igSenderId]
  );
}

/** Whether any (non-deleted) lead already exists for this phone - used to
 * guard auto-creating a duplicate lead from an inbound WhatsApp message. */
async function existsByPhone(tenantId, phone) {
  const { rows } = await query(
    `SELECT lead_id FROM leads WHERE tenant_id = $1 AND (phone = $2 OR phone LIKE $3) AND deleted = FALSE LIMIT 1`,
    [tenantId, phone, `%${phone}`]
  );
  return rows.length > 0;
}

/** The most recently active lead for this phone, full row - used to fill in
 * details an AI conversation confidently extracted. Same match rule as
 * existsByPhone, so it finds the same record that guard already found. */
async function findByPhone(tenantId, phone) {
  const { rows } = await query(
    `SELECT * FROM leads WHERE tenant_id = $1 AND (phone = $2 OR phone LIKE $3) AND deleted = FALSE ORDER BY created_at DESC LIMIT 1`,
    [tenantId, phone, `%${phone}`]
  );
  return rows[0] || null;
}

/**
 * Recomputes every active lead's Hot/Warm/Cold priority across all tenants
 * in one statement - run periodically by a cron job rather than derived on
 * every read, since nothing in this codebase caches a derived value.
 *
 * Hot: departing within the next 7 days.
 * Warm: departing 8-30 days out, OR no known/past departure but the lead has
 *   had some update (stage change, AI auto-fill, edit) in the last 2 days.
 * Cold: everything else - including every Won/Lost lead, which this
 *   deliberately leaves untouched rather than recomputing (a closed lead's
 *   priority no longer means anything operationally).
 *
 * `departure_date` is stored as free text, not a real DATE column, so the
 * regex guards every cast - a garbage value falls through to the Cold/Warm
 * branches instead of throwing and failing the whole batch.
 */
async function recomputeAllPriorities() {
  const { rowCount } = await query(`
    UPDATE leads
    SET priority = CASE
      WHEN departure_date ~ '^\\d{4}-\\d{2}-\\d{2}$'
        AND departure_date::date >= CURRENT_DATE
        AND departure_date::date <= CURRENT_DATE + INTERVAL '7 days'
        THEN 'Hot'
      WHEN departure_date ~ '^\\d{4}-\\d{2}-\\d{2}$'
        AND departure_date::date > CURRENT_DATE + INTERVAL '7 days'
        AND departure_date::date <= CURRENT_DATE + INTERVAL '30 days'
        THEN 'Warm'
      WHEN NOT (departure_date ~ '^\\d{4}-\\d{2}-\\d{2}$' AND departure_date::date >= CURRENT_DATE)
        AND updated_at >= NOW() - INTERVAL '2 days'
        THEN 'Warm'
      ELSE 'Cold'
    END
    WHERE deleted = FALSE AND stage NOT IN ('Won', 'Lost')
  `);
  return rowCount;
}

/**
 * Every phone already on file, reduced to the last 10 digits.
 *
 * The spreadsheet import needs to recognise a customer it already has, and
 * one query beats asking per row - a 2000-row file would otherwise be 2000
 * round trips. Deleted leads count: re-importing someone the agency
 * deliberately removed would quietly undo that.
 */
async function listPhoneKeys(tenantId) {
  const { rows } = await query(
    `SELECT RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10) AS key
     FROM leads
     WHERE tenant_id = $1 AND phone IS NOT NULL AND phone <> ''`,
    [tenantId]
  );
  return rows.map((r) => r.key).filter(Boolean);
}

/**
 * Inserts a batch of imported leads in one statement.
 *
 * `created_at` is per-lead rather than now(): an enquiry from last year
 * should not surface as today's newest lead. Rows whose lead_id somehow
 * collides are ignored instead of failing the whole batch.
 */
async function bulkInsertLeads(tenantId, leads, createdBy) {
  if (leads.length === 0) return [];

  const values = [tenantId, createdBy || ''];
  const placeholders = leads.map((lead) => {
    // created_at is reused for updated_at, so the row's own enquiry date is
    // the only timestamp the imported lead carries.
    const cells = [
      lead.leadId, lead.customerId || null, lead.customerName, lead.email || '', lead.phone,
      lead.interest || '', lead.source || 'Excel Import', lead.stage || 'New', lead.assignedTo || '',
      lead.notes || '', lead.createdAt || new Date().toISOString(), lead.departureDate || '',
      lead.travelers !== null && lead.travelers !== undefined ? Number(lead.travelers) : null,
    ];
    const first = values.length + 1;
    values.push(...cells);
    const p = (offset) => `$${first + offset}`;
    return `($1,${p(0)},${p(1)},${p(2)},${p(3)},${p(4)},${p(5)},${p(6)},${p(7)},${p(8)},${p(9)},$2,`
      + `${p(10)}::timestamptz,${p(10)}::timestamptz,FALSE,${p(11)},${p(12)})`;
  });

  const { rows } = await query(
    `INSERT INTO leads (
       tenant_id, lead_id, customer_id, customer_name, email, phone, interest, source, stage,
       assigned_to, notes, created_by, created_at, updated_at, deleted, departure_date, travelers
     ) VALUES ${placeholders.join(',')}
     ON CONFLICT (tenant_id, lead_id) DO NOTHING
     RETURNING *`,
    values
  );
  return rows;
}

/** One timeline entry per imported lead, so an imported lead has a history like any other. */
async function bulkInsertFollowUps(tenantId, entries) {
  if (entries.length === 0) return;

  const placeholders = entries
    .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, 'note', $${i * 3 + 4})`)
    .join(',');

  await query(
    `INSERT INTO follow_up_logs (tenant_id, lead_id, note, activity_type, created_by)
     VALUES ${placeholders}`,
    [tenantId, ...entries.flatMap((e) => [e.leadUuid, e.note, e.createdBy || ''])]
  );
}

module.exports = {
  countLeadsByAssignee,
  listPhoneKeys,
  bulkInsertLeads,
  bulkInsertFollowUps,
  nextLeadSeq,
  getLeadByInstagramSenderId,
  insertInstagramLead,
  getLeadById,
  insertLead,
  updateLead,
  listLeadsPaged,
  listLeadsForPipeline,
  updateStage,
  listFollowUps,
  insertFollowUp,
  listPool,
  claimLead,
  existsByPhone,
  findByPhone,
  recomputeAllPriorities,
};
