const { query } = require('../config/db');

async function ensureRow(tenantId) {
  await query(
    `INSERT INTO settings (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantId]
  );
}

async function getSettings(tenantId) {
  const { rows } = await query(`SELECT * FROM settings WHERE tenant_id = $1`, [tenantId]);
  return rows[0];
}

async function updateSettings(tenantId, fieldsSql, values, indexPlaceholder) {
  // values has fields parameters. indexPlaceholder will be the index of tenantId
  values.push(tenantId);
  const { rows } = await query(
    `UPDATE settings SET ${fieldsSql} WHERE tenant_id = $${indexPlaceholder} RETURNING *`,
    values
  );
  return rows[0];
}

/** public_lead_key lives on tenants, not settings - it's the tenant's public
 * identity for the landing-page lead capture widget (see routes/publicRoutes.js),
 * deliberately separate from the internal tenant UUID so it can be rotated. */
async function getPublicLeadKey(tenantId) {
  const { rows } = await query(`SELECT public_lead_key FROM tenants WHERE id = $1`, [tenantId]);
  return rows[0]?.public_lead_key;
}

async function regeneratePublicLeadKey(tenantId) {
  const { rows } = await query(
    `UPDATE tenants SET public_lead_key = encode(gen_random_bytes(12), 'hex') WHERE id = $1 RETURNING public_lead_key`,
    [tenantId]
  );
  return rows[0]?.public_lead_key;
}

async function getTenantIdByPublicLeadKey(publicLeadKey) {
  const { rows } = await query(`SELECT id FROM tenants WHERE public_lead_key = $1`, [publicLeadKey]);
  return rows[0]?.id;
}

async function insertWhatsappSetupRequest(tenantId, phone, companyName) {
  await query(
    `INSERT INTO whatsapp_setup_requests (tenant_id, phone, company_name) VALUES ($1, $2, $3)`,
    [tenantId, phone, companyName]
  );
}

async function upsertInstagramCredentials(tenantId, { accessToken, accountId, username }) {
  await query(
    `INSERT INTO settings (tenant_id, instagram_access_token, instagram_account_id, instagram_username)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id) DO UPDATE SET
       instagram_access_token = EXCLUDED.instagram_access_token,
       instagram_account_id   = EXCLUDED.instagram_account_id,
       instagram_username     = EXCLUDED.instagram_username`,
    [tenantId, accessToken, accountId, username]
  );
}

async function clearInstagramCredentials(tenantId) {
  await query(
    `UPDATE settings SET instagram_access_token='', instagram_account_id='', instagram_username='' WHERE tenant_id=$1`,
    [tenantId]
  );
}

async function getTenantIdByInstagramAccountId(instagramAccountId) {
  const { rows } = await query(
    `SELECT tenant_id FROM settings WHERE instagram_account_id=$1 LIMIT 1`,
    [instagramAccountId]
  );
  return rows[0]?.tenant_id;
}

module.exports = {
  ensureRow,
  insertWhatsappSetupRequest,
  upsertInstagramCredentials,
  clearInstagramCredentials,
  getTenantIdByInstagramAccountId,
  getSettings,
  updateSettings,
  getPublicLeadKey,
  regeneratePublicLeadKey,
  getTenantIdByPublicLeadKey,
};
