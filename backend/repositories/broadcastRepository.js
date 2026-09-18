const { query } = require('../config/db');

async function createBroadcastLog(tenantId, { templateId, templateName, sentBy, requestedCount, sentCount }) {
  const { rows } = await query(
    `INSERT INTO broadcast_logs (tenant_id, template_id, template_name, sent_by, requested_count, sent_count)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [tenantId, templateId || null, templateName || '', sentBy || '', requestedCount || 0, sentCount || 0]
  );
  return rows[0];
}

/** One INSERT for the whole batch rather than one per recipient - a
 * broadcast can be up to MAX_RECIPIENTS (200) rows. */
async function insertRecipients(tenantId, broadcastId, recipients) {
  if (!recipients.length) return;

  const cols = ['broadcast_id', 'tenant_id', 'lead_id', 'customer_name', 'phone', 'chat_id', 'message_id', 'sent', 'error'];
  const flatValues = [];
  const rows = recipients.map((r, i) => {
    const rowValues = [
      broadcastId, tenantId, r.leadId || null, r.customerName || '',
      r.phone || '', r.chatId || null, r.messageId || null, r.sent, r.error || null,
    ];
    flatValues.push(...rowValues);
    const base = i * cols.length;
    return `(${cols.map((_, j) => `$${base + j + 1}`).join(', ')})`;
  }).join(', ');

  await query(
    `INSERT INTO broadcast_recipients (${cols.join(', ')}) VALUES ${rows}`,
    flatValues
  );
}

async function listBroadcasts(tenantId, limit = 30) {
  const { rows } = await query(
    `SELECT * FROM broadcast_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [tenantId, limit]
  );
  return rows;
}

/** Per-recipient delivery/reply status, computed by joining back to the
 * ordinary message thread rather than tracked separately - a broadcast
 * message becomes a normal outbound message the instant it is sent, so its
 * status updates (delivered/read) and any reply already flow through the
 * existing webhook/status pipeline. */
async function getBroadcastDetail(tenantId, broadcastId) {
  const { rows: logRows } = await query(
    `SELECT * FROM broadcast_logs WHERE tenant_id = $1 AND id = $2`,
    [tenantId, broadcastId]
  );
  const log = logRows[0];
  if (!log) return null;

  const { rows: recipients } = await query(
    `SELECT
       br.id, br.customer_name, br.phone, br.sent, br.error, br.chat_id,
       m.status AS delivery_status,
       EXISTS (
         SELECT 1 FROM whatsapp_messages rm
         WHERE rm.chat_id = br.chat_id AND rm.direction = 'inbound' AND rm.message_timestamp > br.created_at
       ) AS replied
     FROM broadcast_recipients br
     LEFT JOIN whatsapp_messages m ON m.message_id = br.message_id AND br.message_id IS NOT NULL
     WHERE br.broadcast_id = $1 AND br.tenant_id = $2
     ORDER BY br.created_at`,
    [broadcastId, tenantId]
  );

  return { log, recipients };
}

module.exports = {
  createBroadcastLog,
  insertRecipients,
  listBroadcasts,
  getBroadcastDetail,
};
