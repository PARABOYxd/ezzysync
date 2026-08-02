const { query } = require('../config/db');

/**
 * Cross-cutting follow-up/task queries spanning both bookings and leads
 * (a follow_up_logs row belongs to exactly one of the two - see
 * bookingRepository.listFollowUps/insertFollowUp and leadRepository's
 * equivalents for the per-entity timeline views this doesn't replace).
 * Used for the task list, notification bell, and the daily email digest.
 */
async function listDueFollowUps(tenantId, { overdue, dueToday, assignedTo, limit = 200 } = {}) {
  const values = [tenantId];
  let paramIndex = 2;
  const whereClauses = [
    'f.tenant_id = $1',
    "f.status = 'pending'",
    'f.next_follow_up_date IS NOT NULL',
  ];

  if (overdue && dueToday) {
    whereClauses.push(`f.next_follow_up_date < (CURRENT_DATE + INTERVAL '1 day')`);
  } else if (overdue) {
    whereClauses.push('f.next_follow_up_date < CURRENT_DATE');
  } else if (dueToday) {
    whereClauses.push('f.next_follow_up_date >= CURRENT_DATE');
    whereClauses.push(`f.next_follow_up_date < (CURRENT_DATE + INTERVAL '1 day')`);
  }

  if (assignedTo) {
    whereClauses.push(`COALESCE(b.team_member, l.assigned_to) ILIKE $${paramIndex++}`);
    values.push(`%${assignedTo}%`);
  }

  values.push(limit);
  const limitIndex = paramIndex++;

  const { rows } = await query(
    `SELECT
       f.id, f.note, f.activity_type, f.next_follow_up_date, f.created_by, f.created_at, f.status,
       f.lead_id as lead_uuid, f.booking_id as booking_uuid,
       CASE WHEN f.booking_id IS NOT NULL THEN 'booking' ELSE 'lead' END as source_type,
       COALESCE(b.booking_id, l.lead_id) as source_id,
       COALESCE(b.customer_name, l.customer_name) as customer_name,
       COALESCE(b.phone, l.phone) as customer_phone,
       COALESCE(b.email, l.email) as customer_email,
       COALESCE(b.team_member, l.assigned_to) as assigned_to
     FROM follow_up_logs f
     LEFT JOIN bookings b ON f.booking_id = b.id
     LEFT JOIN leads l ON f.lead_id = l.id
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY f.next_follow_up_date ASC
     LIMIT $${limitIndex}`,
    values
  );
  return rows;
}

/** Completed follow-up activity (status = 'done'), for the Follow-ups page's "All" tab. */
async function listCompletedFollowUps(tenantId, { assignedTo, limit = 200 } = {}) {
  const values = [tenantId];
  let paramIndex = 2;
  const whereClauses = ['f.tenant_id = $1', "f.status = 'done'"];

  if (assignedTo) {
    whereClauses.push(`COALESCE(b.team_member, l.assigned_to) ILIKE $${paramIndex++}`);
    values.push(`%${assignedTo}%`);
  }

  values.push(limit);
  const limitIndex = paramIndex++;

  const { rows } = await query(
    `SELECT
       f.id, f.note, f.activity_type, f.next_follow_up_date, f.created_by, f.created_at, f.status,
       f.lead_id as lead_uuid, f.booking_id as booking_uuid,
       CASE WHEN f.booking_id IS NOT NULL THEN 'booking' ELSE 'lead' END as source_type,
       COALESCE(b.booking_id, l.lead_id) as source_id,
       COALESCE(b.customer_name, l.customer_name) as customer_name,
       COALESCE(b.phone, l.phone) as customer_phone,
       COALESCE(b.email, l.email) as customer_email,
       COALESCE(b.team_member, l.assigned_to) as assigned_to
     FROM follow_up_logs f
     LEFT JOIN bookings b ON f.booking_id = b.id
     LEFT JOIN leads l ON f.lead_id = l.id
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY f.created_at DESC
     LIMIT $${limitIndex}`,
    values
  );
  return rows;
}

async function markDone(tenantId, id, outcomeNote) {
  let queryText = `UPDATE follow_up_logs SET status = 'done' WHERE tenant_id = $1 AND id = $2 RETURNING *`;
  const params = [tenantId, id];
  if (outcomeNote) {
    queryText = `UPDATE follow_up_logs SET status = 'done', note = CONCAT(note, E'\n\nOutcome Summary:\n', $3::text) WHERE tenant_id = $1 AND id = $2 RETURNING *`;
    params.push(outcomeNote);
  }
  const { rows } = await query(queryText, params);
  return rows[0];
}

/** All tenants with at least one pending due-today/overdue follow-up, for the daily digest cron. */
async function listTenantsWithDueFollowUps() {
  const { rows } = await query(
    `SELECT DISTINCT f.tenant_id
     FROM follow_up_logs f
     WHERE f.status = 'pending'
       AND f.next_follow_up_date IS NOT NULL
       AND f.next_follow_up_date < (CURRENT_DATE + INTERVAL '1 day')`
  );
  return rows.map((r) => r.tenant_id);
}

module.exports = { listDueFollowUps, listCompletedFollowUps, markDone, listTenantsWithDueFollowUps };
