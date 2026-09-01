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

async function createTemplate(tenantId, { type, name, body, languageCode, category, metaStatus, wabaTemplateId, variablesMap }) {
  const { rows } = await query(
    `INSERT INTO whatsapp_templates (tenant_id, type, name, body, language_code, category, meta_status, waba_template_id, variables_map)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      tenantId, 
      type || 'text', 
      name, 
      body, 
      languageCode || 'en', 
      category || 'UTILITY', 
      metaStatus || (type === 'template' ? 'PENDING' : 'APPROVED'), 
      wabaTemplateId || null, 
      JSON.stringify(variablesMap || {})
    ]
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

async function getTemplateById(tenantId, id) {
  const { rows } = await query(
    `SELECT * FROM whatsapp_templates 
     WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id]
  );
  return rows[0];
}

async function updateMetaStatus(tenantId, id, { metaStatus, wabaTemplateId }) {
  const { rows } = await query(
    `UPDATE whatsapp_templates 
     SET meta_status = $1, waba_template_id = $2, updated_at = now() 
     WHERE tenant_id = $3 AND id = $4 
     RETURNING *`,
    [metaStatus, wabaTemplateId, tenantId, id]
  );
  return rows[0];
}

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateMetaStatus,
  deleteTemplate,
};
