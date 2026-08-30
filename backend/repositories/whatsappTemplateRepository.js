const { query } = require('../config/db');

async function getTemplates(tenantId) {
  const { rows } = await query(
    `SELECT * FROM whatsapp_templates 
     WHERE tenant_id = $1 
     ORDER BY created_at DESC`,
    [tenantId]
  );
  return rows;
}

async function createTemplate(tenantId, { type, name, body, languageCode }) {
  const { rows } = await query(
    `INSERT INTO whatsapp_templates (tenant_id, type, name, body, language_code)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [tenantId, type || 'text', name, body, languageCode || 'en']
  );
  return rows[0];
}

async function deleteTemplate(tenantId, id) {
  const { rows } = await query(
    `DELETE FROM whatsapp_templates 
     WHERE tenant_id = $1 AND id = $2 
     RETURNING *`,
    [tenantId, id]
  );
  return rows[0];
}

module.exports = {
  getTemplates,
  createTemplate,
  deleteTemplate,
};
