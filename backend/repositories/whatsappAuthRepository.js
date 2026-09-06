const { query } = require('../config/db');

/**
 * Storage for Baileys' login keys.
 *
 * Reads happen once, at session start; everything after that is served from
 * memory by the auth-state adapter. Writes are batched by the caller, so these
 * functions are built to take many rows at a time rather than one per call -
 * a busy WhatsApp session touches Signal keys constantly, and a round trip per
 * key would be slower than the disk storage this replaces.
 */

async function loadAll(tenantId) {
  const { rows } = await query(
    `SELECT category, key_id, value FROM whatsapp_auth_state WHERE tenant_id = $1`,
    [tenantId]
  );
  return rows;
}

/**
 * Writes many entries in one statement.
 *
 * UNNEST turns three arrays into rows, so a hundred keys cost one round trip
 * instead of a hundred. ON CONFLICT makes it an upsert, which is what every
 * key write is - Baileys re-saves an entry far more often than it adds one.
 */
async function upsertMany(tenantId, entries) {
  if (!entries.length) return;

  await query(
    `INSERT INTO whatsapp_auth_state (tenant_id, category, key_id, value, updated_at)
     SELECT $1, c, k, v, now()
       FROM UNNEST($2::text[], $3::text[], $4::text[]) AS t(c, k, v)
     ON CONFLICT (tenant_id, category, key_id)
     DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [
      tenantId,
      entries.map((e) => e.category),
      entries.map((e) => e.keyId),
      entries.map((e) => e.value),
    ]
  );
}

async function deleteMany(tenantId, entries) {
  if (!entries.length) return;

  await query(
    `DELETE FROM whatsapp_auth_state
      WHERE tenant_id = $1
        AND (category, key_id) IN (
          SELECT c, k FROM UNNEST($2::text[], $3::text[]) AS t(c, k)
        )`,
    [tenantId, entries.map((e) => e.category), entries.map((e) => e.keyId)]
  );
}

/** Forgets the whole login. Used when the tenant disconnects or WhatsApp logs us out. */
async function deleteAll(tenantId) {
  await query(`DELETE FROM whatsapp_auth_state WHERE tenant_id = $1`, [tenantId]);
}

/**
 * Just the credentials row.
 *
 * Separate from loadAll because "is this pairing usable?" is asked before a
 * session starts, and answering it by loading every Signal key - nine thousand
 * rows on an active account - to read one field would be wasteful.
 */
async function loadCreds(tenantId) {
  const { rows } = await query(
    `SELECT value FROM whatsapp_auth_state WHERE tenant_id = $1 AND category = 'creds' LIMIT 1`,
    [tenantId]
  );
  return rows[0]?.value || null;
}

/** Whether this tenant has stored credentials - i.e. a link worth resuming. */
async function hasCreds(tenantId) {
  const { rows } = await query(
    `SELECT 1 FROM whatsapp_auth_state WHERE tenant_id = $1 AND category = 'creds' LIMIT 1`,
    [tenantId]
  );
  return rows.length > 0;
}

module.exports = {
  loadAll,
  loadCreds,
  upsertMany,
  deleteMany,
  deleteAll,
  hasCreds,
};
