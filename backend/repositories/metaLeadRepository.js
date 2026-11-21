const { query } = require('../config/db');
const { encrypt, decrypt } = require('../utils/encryption');

/** What the service works with. The token stays encrypted until `withToken` asks for it. */
function rowToPage(r, { withToken = false } = {}) {
  const page = {
    id: r.id,
    tenantId: r.tenant_id,
    pageId: r.page_id,
    pageName: r.page_name,
    status: r.status,
    tripName: r.trip_name,
    formTrips: r.form_trips || {},
    assignMode: r.assign_mode,
    assignedTo: r.assigned_to,
    defaultStage: r.default_stage,
    sourceLabel: r.source_label,
    paused: r.paused,
    totalLeads: r.total_leads,
    rrCursor: r.rr_cursor,
    lastLeadAt: r.last_lead_at,
    lastError: r.last_error,
    createdAt: r.created_at,
  };
  if (withToken) page.token = decrypt(r.page_token);
  return page;
}

async function listByTenant(tenantId) {
  const { rows } = await query(
    `SELECT * FROM meta_lead_pages WHERE tenant_id = $1 ORDER BY (status = 'active') DESC, page_name`,
    [tenantId]
  );
  return rows.map((r) => rowToPage(r));
}

async function findById(tenantId, id, opts) {
  const { rows } = await query(`SELECT * FROM meta_lead_pages WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
  return rows[0] ? rowToPage(rows[0], opts) : null;
}

/** The webhook knows the page, not the agency. */
async function findActiveByPageId(pageId, opts) {
  const { rows } = await query(
    `SELECT * FROM meta_lead_pages WHERE page_id = $1 AND status = 'active' AND paused = FALSE`,
    [pageId]
  );
  return rows[0] ? rowToPage(rows[0], opts) : null;
}

/**
 * Remembers the pages a Facebook login can manage. A page already held by
 * another agency is left alone and reported, never taken over. A page this
 * agency already has keeps its settings and just gets the fresh token.
 *
 * @returns {Promise<{saved: number, taken: string[]}>}
 */
async function upsertAvailable(tenantId, pages) {
  let saved = 0;
  const taken = [];
  for (const p of pages) {
    const { rows } = await query(
      `INSERT INTO meta_lead_pages (tenant_id, page_id, page_name, page_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (page_id) DO UPDATE
         SET page_name = EXCLUDED.page_name, page_token = EXCLUDED.page_token, last_error = '', updated_at = now()
         WHERE meta_lead_pages.tenant_id = EXCLUDED.tenant_id
       RETURNING id`,
      [tenantId, p.id, String(p.name || '').slice(0, 200), encrypt(p.token)]
    );
    if (rows.length) saved += 1;
    else taken.push(p.name || p.id);
  }
  return { saved, taken };
}

async function activate(tenantId, id, config) {
  const { rows } = await query(
    `UPDATE meta_lead_pages SET
       status = 'active', paused = FALSE,
       trip_name = $3, form_trips = $4::jsonb, assign_mode = $5, assigned_to = $6,
       default_stage = $7, source_label = $8, last_error = '', updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, id, config.tripName, JSON.stringify(config.formTrips || {}), config.assignMode,
      config.assignedTo, config.defaultStage, config.sourceLabel]
  );
  return rows[0] ? rowToPage(rows[0]) : null;
}

async function setPaused(tenantId, id, paused) {
  const { rows } = await query(
    `UPDATE meta_lead_pages SET paused = $3, updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    [tenantId, id, Boolean(paused)]
  );
  return rows[0] ? rowToPage(rows[0]) : null;
}

/** Back to 'available': the page stays listed but stops receiving leads. */
async function deactivate(tenantId, id) {
  const { rows } = await query(
    `UPDATE meta_lead_pages SET status = 'available', paused = FALSE, updated_at = now()
     WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    [tenantId, id]
  );
  return rows[0] ? rowToPage(rows[0]) : null;
}

async function remove(tenantId, id) {
  const { rowCount } = await query(`DELETE FROM meta_lead_pages WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
  return rowCount > 0;
}

async function recordLead(id, { imported, rrCursor }) {
  await query(
    `UPDATE meta_lead_pages SET
       total_leads = total_leads + $2, rr_cursor = $3, last_error = '',
       last_lead_at = CASE WHEN $2 > 0 THEN now() ELSE last_lead_at END
     WHERE id = $1`,
    [id, imported, rrCursor]
  );
}

async function recordError(id, message) {
  await query(`UPDATE meta_lead_pages SET last_error = $2 WHERE id = $1`, [id, String(message).slice(0, 500)]);
}

/* ---------------------------------------------------------------- events */

/** True the first time Meta tells us about this lead, false for every repeat. */
async function registerEvent({ leadgenId, tenantId, pageId, formId }) {
  const { rowCount } = await query(
    `INSERT INTO meta_lead_events (leadgen_id, tenant_id, page_id, form_id)
     VALUES ($1, $2, $3, $4) ON CONFLICT (leadgen_id) DO NOTHING`,
    [leadgenId, tenantId, pageId, formId || '']
  );
  return rowCount > 0;
}

async function getEvent(leadgenId) {
  const { rows } = await query(`SELECT * FROM meta_lead_events WHERE leadgen_id = $1`, [leadgenId]);
  return rows[0] || null;
}

async function finishEvent(leadgenId, { status, error = '' }) {
  await query(
    `UPDATE meta_lead_events SET status = $2, last_error = $3, attempts = attempts + 1, updated_at = now()
     WHERE leadgen_id = $1`,
    [leadgenId, status, String(error).slice(0, 500)]
  );
}

/** Fetches that failed and are worth another go: not too many tries, not too old. */
async function listRetryable({ minutes = 5, maxAttempts = 5, maxAgeHours = 24 } = {}) {
  const { rows } = await query(
    `SELECT leadgen_id FROM meta_lead_events
     WHERE status = 'pending' AND attempts < $2
       AND updated_at < now() - ($1::int * interval '1 minute')
       AND created_at > now() - ($3::int * interval '1 hour')
     ORDER BY updated_at LIMIT 50`,
    [minutes, maxAttempts, maxAgeHours]
  );
  return rows.map((r) => r.leadgen_id);
}

module.exports = {
  listByTenant,
  findById,
  findActiveByPageId,
  upsertAvailable,
  activate,
  setPaused,
  deactivate,
  remove,
  recordLead,
  recordError,
  registerEvent,
  getEvent,
  finishEvent,
  listRetryable,
};
