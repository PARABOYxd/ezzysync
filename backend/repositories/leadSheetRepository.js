const { query } = require('../config/db');

/** What the screen and the sync service work with: no tenant id, no internal lock column. */
function rowToSheet(r) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    sheetId: r.sheet_id,
    gid: r.gid,
    tripMode: r.trip_mode,
    tripName: r.trip_name,
    tripColumn: r.trip_column,
    assignMode: r.assign_mode,
    assignedTo: r.assigned_to,
    defaultStage: r.default_stage,
    sourceLabel: r.source_label,
    columnMapping: r.column_mapping || {},
    skipExisting: r.skip_existing,
    paused: r.paused,
    lastRowCount: r.last_row_count,
    totalSynced: r.total_synced,
    rrCursor: r.rr_cursor,
    lastSyncedAt: r.last_synced_at,
    lastStatus: r.last_status,
    lastError: r.last_error,
    syncing: Boolean(r.syncing_at),
    createdAt: r.created_at,
  };
}

/** A sync that died mid-way (server restart) must not hold the sheet forever. */
const STALE_LOCK = `interval '10 minutes'`;

async function listByTenant(tenantId) {
  const { rows } = await query(
    `SELECT * FROM lead_sheets WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );
  return rows.map(rowToSheet);
}

async function countByTenant(tenantId) {
  const { rows } = await query(`SELECT COUNT(*)::int AS n FROM lead_sheets WHERE tenant_id = $1`, [tenantId]);
  return rows[0].n;
}

async function findById(tenantId, id) {
  const { rows } = await query(
    `SELECT * FROM lead_sheets WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id]
  );
  return rows[0] ? rowToSheet(rows[0]) : null;
}

async function insert(tenantId, sheet, createdBy) {
  const { rows } = await query(
    `INSERT INTO lead_sheets (
       tenant_id, name, sheet_id, gid, trip_mode, trip_name, trip_column,
       assign_mode, assigned_to, default_stage, source_label, column_mapping, skip_existing, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)
     RETURNING *`,
    [
      tenantId, sheet.name, sheet.sheetId, sheet.gid, sheet.tripMode, sheet.tripName, sheet.tripColumn,
      sheet.assignMode, sheet.assignedTo, sheet.defaultStage, sheet.sourceLabel,
      JSON.stringify(sheet.columnMapping || {}), Boolean(sheet.skipExisting), createdBy || '',
    ]
  );
  return rowToSheet(rows[0]);
}

/**
 * Changing which sheet a row points at restarts the read position: row 40 of
 * the old tab says nothing about the new one.
 */
async function update(tenantId, id, sheet) {
  const { rows } = await query(
    `UPDATE lead_sheets SET
       name = $3, sheet_id = $4, gid = $5, trip_mode = $6, trip_name = $7, trip_column = $8,
       assign_mode = $9, assigned_to = $10, default_stage = $11, source_label = $12,
       column_mapping = $13::jsonb,
       last_row_count = CASE WHEN sheet_id = $4 AND gid = $5 THEN last_row_count ELSE 0 END,
       updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [
      tenantId, id, sheet.name, sheet.sheetId, sheet.gid, sheet.tripMode, sheet.tripName, sheet.tripColumn,
      sheet.assignMode, sheet.assignedTo, sheet.defaultStage, sheet.sourceLabel,
      JSON.stringify(sheet.columnMapping || {}),
    ]
  );
  return rows[0] ? rowToSheet(rows[0]) : null;
}

async function setPaused(tenantId, id, paused) {
  const { rows } = await query(
    `UPDATE lead_sheets SET paused = $3, updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    [tenantId, id, Boolean(paused)]
  );
  return rows[0] ? rowToSheet(rows[0]) : null;
}

async function remove(tenantId, id) {
  const { rowCount } = await query(`DELETE FROM lead_sheets WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
  return rowCount > 0;
}

/**
 * Takes the sheet for one sync, or returns null if another sync has it.
 * One statement, so the schedule and a manual "Sync Now" cannot both win.
 */
async function claim(id) {
  const { rows } = await query(
    `UPDATE lead_sheets SET syncing_at = now()
     WHERE id = $1 AND (syncing_at IS NULL OR syncing_at < now() - ${STALE_LOCK})
     RETURNING *`,
    [id]
  );
  return rows[0] ? rowToSheet(rows[0]) : null;
}

/** Releases the sheet and records how the sync went. */
async function finish(id, { lastRowCount, imported = 0, rrCursor, status, error = '' }) {
  await query(
    `UPDATE lead_sheets SET
       syncing_at = NULL,
       last_synced_at = now(),
       last_status = $2,
       last_error = $3,
       last_row_count = COALESCE($4, last_row_count),
       total_synced = total_synced + $5,
       rr_cursor = COALESCE($6, rr_cursor)
     WHERE id = $1`,
    [id, status, String(error).slice(0, 500), lastRowCount ?? null, imported, rrCursor ?? null]
  );
}

/** Active sheets nobody has read in the last `minutes`, across every tenant. */
async function listDue(minutes) {
  const { rows } = await query(
    `SELECT id, tenant_id FROM lead_sheets
     WHERE paused = FALSE
       AND (last_synced_at IS NULL OR last_synced_at < now() - ($1::int * interval '1 minute'))
       AND (syncing_at IS NULL OR syncing_at < now() - ${STALE_LOCK})
     ORDER BY last_synced_at NULLS FIRST
     LIMIT 50`,
    [minutes]
  );
  return rows.map((r) => ({ id: r.id, tenantId: r.tenant_id }));
}

/** Trip names the agency already sells, so the form can suggest them. */
async function listTripNames(tenantId) {
  const { rows } = await query(
    `SELECT DISTINCT trip_name FROM tour_batches
     WHERE tenant_id = $1 AND deleted = FALSE AND trip_name <> ''
     ORDER BY trip_name LIMIT 100`,
    [tenantId]
  );
  return rows.map((r) => r.trip_name);
}

module.exports = {
  listByTenant,
  countByTenant,
  findById,
  insert,
  update,
  setPaused,
  remove,
  claim,
  finish,
  listDue,
  listTripNames,
};
