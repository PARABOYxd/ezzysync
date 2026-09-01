const axios = require('axios');
const env = require('../config/env');
const { query } = require('../config/db');

async function getWabaDetails(settings) {
  const accessToken = settings?.whatsappAccessToken || env.whatsapp?.accessToken;
  const wabaId = settings?.whatsappBusinessAccountId || settings?.whatsappAccountId || env.whatsapp?.businessAccountId;
  const phoneNumberId = settings?.whatsappPhoneNumberId || env.whatsapp?.phoneNumberId;

  if (!accessToken) {
    const err = new Error('WhatsApp Access Token is missing. Please configure it in WhatsApp Settings.');
    err.status = 400;
    throw err;
  }

  return { accessToken, wabaId, phoneNumberId };
}

async function createMetaTemplate(settings, templateData) {
  const { accessToken, wabaId } = await getWabaDetails(settings);

  if (!wabaId) {
    const err = new Error('WhatsApp Business Account ID (WABA ID) is not configured. Please set your WABA ID in WhatsApp Configuration Settings.');
    err.status = 400;
    throw err;
  }

  let cleanName = (templateData.name || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (cleanName.startsWith('/')) cleanName = cleanName.slice(1);

  const url = `https://graph.facebook.com/${env.whatsapp?.apiVersion || 'v18.0'}/${wabaId}/message_templates`;

  const payload = {
    name: cleanName,
    category: (templateData.category || 'UTILITY').toUpperCase(),
    allow_category_change: true,
    language: templateData.language_code || 'en_US',
    components: [
      {
        type: 'BODY',
        text: templateData.body
      }
    ]
  };

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      wabaTemplateId: res.data?.id,
      status: res.data?.status || 'PENDING',
      cleanName
    };
  } catch (err) {
    if (err.response) {
      const errorMsg = err.response.data?.error?.message || err.message;
      const metaErr = new Error(`Meta Template API Error: ${errorMsg}`);
      metaErr.status = err.response.status || 400;
      throw metaErr;
    }
    throw err;
  }
}

async function syncMetaTemplates(settings, tenantId) {
  const { accessToken, wabaId } = await getWabaDetails(settings);

  if (!wabaId) {
    return { syncedCount: 0, message: 'WABA ID missing; skipped live sync.' };
  }

  const url = `https://graph.facebook.com/${env.whatsapp?.apiVersion || 'v18.0'}/${wabaId}/message_templates?limit=100`;

  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const metaTemplates = res.data?.data || [];
    let syncedCount = 0;

    for (const t of metaTemplates) {
      const metaName = t.name;
      const metaStatus = t.status; // e.g. APPROVED, PENDING, REJECTED
      const wabaId = t.id;

      const updateRes = await query(
        `UPDATE whatsapp_templates 
         SET meta_status = $1, waba_template_id = $2, updated_at = now() 
         WHERE tenant_id = $3 AND (name = $4 OR name = $5 OR name = $6)`,
        [metaStatus, wabaId, tenantId, metaName, `/${metaName}`, metaName.toLowerCase()]
      );

      if (updateRes.rowCount > 0) {
        syncedCount += updateRes.rowCount;
      }
    }

    return { syncedCount, metaTemplatesCount: metaTemplates.length };
  } catch (err) {
    if (err.response) {
      const errorMsg = err.response.data?.error?.message || err.message;
      const metaErr = new Error(`Meta Template Sync Error: ${errorMsg}`);
      metaErr.status = err.response.status || 400;
      throw metaErr;
    }
    throw err;
  }
}

module.exports = {
  createMetaTemplate,
  syncMetaTemplates
};
