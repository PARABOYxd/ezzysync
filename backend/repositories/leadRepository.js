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
       assigned_to, notes, next_follow_up_date, created_by, created_at, updated_at, deleted
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,FALSE)
     RETURNING *`,
    [
      tenantId, leadId, customerId || null, data.customerName, data.email || '', data.phone,
      data.interest || '', data.source || 'Manual', data.stage || 'New',
      data.assignedTo || '', data.notes || '', data.nextFollowUpDate || null,
      createdBy || '', now, now,
    ]
  );
  return rows[0];
}

async function updateLead(tenantId, leadId, merged, updatedAt, customerId) {
  const { rows } = await query(
    `UPDATE leads SET
       customer_name = $1, email = $2, phone = $3, interest = $4, source = $5, stage = $6,
       assigned_to = $7, notes = $8, next_follow_up_date = $9, updated_at = $10, deleted = $11,
       converted_booking_id = $12, customer_id = COALESCE($13, customer_id)
     WHERE tenant_id = $14 AND lead_id = $15
     RETURNING *`,
    [
      merged.customerName, merged.email || '', merged.phone, merged.interest || '', merged.source || 'Manual',
      merged.stage || 'New', merged.assignedTo || '', merged.notes || '', merged.nextFollowUpDate || null,
      updatedAt, !!merged.deleted, merged.convertedBookingId || null, customerId,
      tenantId, leadId,
    ]
  );
  return rows[0];
}

async function listLeadsPaged(params) {
  const {
    tenantId, page = 1, limit = 10, search = '', stage = '', assignedTo = '', sort = 'newest', includeDeleted = false,
  } = params;

  const values = [tenantId];
  let paramIndex = 2;
  let whereClauses = ['tenant_id = $1'];

  if (!includeDeleted) whereClauses.push('deleted = FALSE');

  if (stage) {
    whereClauses.push(`stage = $${paramIndex++}`);
    values.push(stage);
  }
  if (assignedTo) {
    whereClauses.push(`assigned_to ILIKE $${paramIndex++}`);
    values.push(`%${assignedTo}%`);
  }
  if (search) {
    whereClauses.push(`(customer_name ILIKE $${paramIndex} OR lead_id ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
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

module.exports = {
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
};
