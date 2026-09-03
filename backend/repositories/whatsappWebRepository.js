const { query } = require('../config/db');

/**
 * Every database statement for the WhatsApp Web (Baileys) feature.
 *
 * The service layer above this owns the socket lifecycle and the AI decisions;
 * it should not also be writing SQL. Keeping the statements here means a
 * schema change has one place to land, and the service reads as the flow it
 * actually is rather than a wall of embedded queries.
 *
 * Every function takes tenantId first and scopes on it, matching the tenant
 * isolation rule described in config/db.js.
 */

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

async function getSession(tenantId) {
  const { rows } = await query(
    `SELECT status, qr_code_data, phone_number, connected_at, ai_autopilot_enabled
     FROM whatsapp_sessions WHERE tenant_id = $1`,
    [tenantId]
  );
  return rows[0] || null;
}

async function getAutopilotDefault(tenantId) {
  const { rows } = await query(
    `SELECT ai_autopilot_enabled FROM whatsapp_sessions WHERE tenant_id = $1`,
    [tenantId]
  );
  return rows[0]?.ai_autopilot_enabled === true;
}

async function saveQrCode(tenantId, qrCodeData) {
  await query(
    `INSERT INTO whatsapp_sessions (tenant_id, status, qr_code_data, updated_at)
     VALUES ($1, 'qrcode', $2, now())
     ON CONFLICT (tenant_id) DO UPDATE
     SET status = 'qrcode', qr_code_data = $2, updated_at = now()`,
    [tenantId, qrCodeData]
  );
}

async function markConnected(tenantId, phoneNumber) {
  await query(
    `INSERT INTO whatsapp_sessions (tenant_id, status, qr_code_data, phone_number, connected_at, updated_at)
     VALUES ($1, 'connected', NULL, $2, now(), now())
     ON CONFLICT (tenant_id) DO UPDATE
     SET status = 'connected', qr_code_data = NULL, phone_number = $2, connected_at = now(), updated_at = now()`,
    [tenantId, phoneNumber]
  );
}

/** Used for a clean logout: the number is cleared along with the status. */
async function markLoggedOut(tenantId) {
  await query(
    `UPDATE whatsapp_sessions
     SET status = 'disconnected', qr_code_data = NULL, phone_number = '', updated_at = now()
     WHERE tenant_id = $1`,
    [tenantId]
  );
}

/** Used for a dropped socket, where the pairing itself may still be valid. */
async function setSessionStatus(tenantId, status) {
  await query(
    `UPDATE whatsapp_sessions SET status = $2, qr_code_data = NULL, updated_at = now() WHERE tenant_id = $1`,
    [tenantId, status]
  );
}

async function setAutopilotDefault(tenantId, enabled) {
  await query(
    `UPDATE whatsapp_sessions SET ai_autopilot_enabled = $1, updated_at = now() WHERE tenant_id = $2`,
    [Boolean(enabled), tenantId]
  );
}

/**
 * Sessions worth resuming on boot. 'connecting' is included so a session
 * caught mid-restart by a server restart is not stranded.
 */
async function listResumableTenantIds() {
  const { rows } = await query(
    `SELECT tenant_id FROM whatsapp_sessions WHERE status IN ('connected', 'connecting')`
  );
  return rows.map((r) => r.tenant_id);
}

/* ------------------------------------------------------------------ *
 * Chats
 * ------------------------------------------------------------------ */

async function findChatByPhone(tenantId, phone) {
  const { rows } = await query(
    `SELECT * FROM whatsapp_chats WHERE tenant_id = $1 AND phone = $2`,
    [tenantId, phone]
  );
  return rows[0] || null;
}

async function findChatById(tenantId, chatId) {
  const { rows } = await query(
    `SELECT * FROM whatsapp_chats WHERE id = $1 AND tenant_id = $2`,
    [chatId, tenantId]
  );
  return rows[0] || null;
}

async function createChat(tenantId, { phone, jid, customerName, leadId, lastMessage, aiEnabled }) {
  const { rows } = await query(
    `INSERT INTO whatsapp_chats
       (tenant_id, phone, jid, customer_name, lead_id, last_message, last_message_timestamp, unread_count, ai_enabled, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now(), 1, $7, now(), now())
     RETURNING *`,
    [tenantId, phone, jid, customerName, leadId, lastMessage, aiEnabled]
  );
  return rows[0];
}

/** An inbound message: bumps unread and refreshes the routable jid. */
async function recordInboundOnChat(chatId, { lastMessage, pushName, jid }) {
  await query(
    `UPDATE whatsapp_chats
     SET last_message = $1,
         last_message_timestamp = now(),
         unread_count = unread_count + 1,
         customer_name = COALESCE(NULLIF(customer_name, ''), $2),
         jid = $4,
         updated_at = now()
     WHERE id = $3`,
    [lastMessage, pushName, chatId, jid]
  );
}

/** An AI reply: the chat's own AI flag is untouched. */
async function recordAiReplyOnChat(chatId, lastMessage) {
  await query(
    `UPDATE whatsapp_chats SET last_message = $1, last_message_timestamp = now(), updated_at = now() WHERE id = $2`,
    [lastMessage, chatId]
  );
}

/**
 * A human replying - from the app or from the linked phone - is a takeover:
 * autopilot stands down and any escalation is considered handled.
 */
async function recordHumanReplyOnChat(chatId, lastMessage) {
  await query(
    `UPDATE whatsapp_chats
     SET last_message = $1, last_message_timestamp = now(), unread_count = 0,
         ai_enabled = FALSE, needs_human = FALSE, handoff_reason = NULL, updated_at = now()
     WHERE id = $2`,
    [lastMessage, chatId]
  );
}

async function flagChatForHuman(chatId, reason) {
  await query(
    `UPDATE whatsapp_chats
     SET ai_enabled = FALSE, needs_human = TRUE, handoff_reason = $2, updated_at = now()
     WHERE id = $1`,
    [chatId, reason]
  );
}

async function setChatAiEnabled(tenantId, chatId, enabled) {
  await query(
    `UPDATE whatsapp_chats SET ai_enabled = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
    [Boolean(enabled), chatId, tenantId]
  );
}

async function clearUnread(tenantId, chatId) {
  await query(
    `UPDATE whatsapp_chats SET unread_count = 0, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
    [chatId, tenantId]
  );
}

/** Chat list for the inbox, enriched with the linked lead and booking. */
async function listChats(tenantId, search) {
  let sql = `
    SELECT c.*,
           l.lead_id AS formatted_lead_id, l.stage AS lead_stage, l.interest AS lead_interest,
           b.trip AS booking_trip, b.travel_status AS booking_travel_status, b.payment_status AS booking_payment_status
    FROM whatsapp_chats c
    LEFT JOIN leads l ON l.id = c.lead_id
    LEFT JOIN bookings b ON b.id = c.booking_id
    WHERE c.tenant_id = $1
  `;
  const params = [tenantId];

  if (search && search.trim()) {
    sql += ` AND (c.customer_name ILIKE $2 OR c.phone ILIKE $2 OR c.last_message ILIKE $2)`;
    params.push(`%${search.trim()}%`);
  }

  sql += ` ORDER BY c.last_message_timestamp DESC LIMIT 100`;

  const { rows } = await query(sql, params);
  return rows;
}

/** The single chat behind an open thread, with its CRM context. */
async function getChatWithContext(tenantId, chatId) {
  const { rows } = await query(
    `SELECT c.*,
            l.id AS lead_uuid, l.lead_id AS formatted_lead_id, l.customer_name AS lead_name,
            l.stage AS lead_stage, l.interest AS lead_interest, l.notes AS lead_notes,
            b.id AS booking_uuid, b.booking_id AS formatted_booking_id, b.trip AS booking_trip,
            b.total_amount, b.paid, b.remaining, b.travel_status, b.payment_status
     FROM whatsapp_chats c
     LEFT JOIN leads l ON l.id = c.lead_id
     LEFT JOIN bookings b ON b.id = c.booking_id
     WHERE c.id = $1 AND c.tenant_id = $2`,
    [chatId, tenantId]
  );
  return rows[0] || null;
}

/* ------------------------------------------------------------------ *
 * Messages
 * ------------------------------------------------------------------ */

async function insertMessage(
  tenantId,
  { chatId, messageId, direction, sender, messageText, status, messageType = 'text', mediaUrl = null }
) {
  const { rows, rowCount } = await query(
    `INSERT INTO whatsapp_messages
       (tenant_id, chat_id, message_id, direction, sender, message_text, status, message_type, media_url, message_timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (message_id) DO NOTHING
     RETURNING id`,
    [tenantId, chatId, messageId, direction, sender, messageText, status, messageType, mediaUrl]
  );
  // rowCount 0 means this id is already stored - the echo of a message this
  // server sent, which WhatsApp also delivers back over the socket.
  return { inserted: rowCount > 0, id: rows[0]?.id || null };
}

async function listMessages(tenantId, chatId) {
  const { rows } = await query(
    `SELECT * FROM whatsapp_messages
     WHERE chat_id = $1 AND tenant_id = $2
     ORDER BY message_timestamp ASC
     LIMIT 300`,
    [chatId, tenantId]
  );
  return rows;
}

async function getLastMessage(tenantId, chatId) {
  const { rows } = await query(
    `SELECT direction, sender, message_text FROM whatsapp_messages
     WHERE tenant_id = $1 AND chat_id = $2
     ORDER BY message_timestamp DESC LIMIT 1`,
    [tenantId, chatId]
  );
  return rows[0] || null;
}

async function getLastInboundMessage(tenantId, chatId) {
  const { rows } = await query(
    `SELECT message_text FROM whatsapp_messages
     WHERE tenant_id = $1 AND chat_id = $2 AND direction = 'inbound'
     ORDER BY message_timestamp DESC LIMIT 1`,
    [tenantId, chatId]
  );
  return rows[0]?.message_text || '';
}

/** Recent turns for AI context, oldest first. */
async function getRecentHistory(tenantId, phone, limit = 10) {
  const { rows } = await query(
    `SELECT direction, sender, message_text, message_timestamp
     FROM whatsapp_messages
     WHERE tenant_id = $1 AND chat_id = (
       SELECT id FROM whatsapp_chats WHERE tenant_id = $1 AND phone = $2 LIMIT 1
     )
     ORDER BY message_timestamp DESC
     LIMIT $3`,
    [tenantId, phone, limit]
  );
  return rows.reverse();
}

async function updateMessageStatus(messageId, status) {
  await query(`UPDATE whatsapp_messages SET status = $1 WHERE message_id = $2`, [status, messageId]);
}

/* ------------------------------------------------------------------ *
 * Lead linking
 * ------------------------------------------------------------------ */

/** Suffix match, since the stored number and WhatsApp may disagree on the country code. */
async function findLeadIdByPhone(tenantId, phone) {
  const { rows } = await query(
    `SELECT id FROM leads
     WHERE tenant_id = $1 AND (phone LIKE '%' || $2 OR $2 LIKE '%' || phone) AND deleted = FALSE
     LIMIT 1`,
    [tenantId, phone]
  );
  return rows[0]?.id || null;
}

async function createLeadFromWhatsapp(tenantId, { customerName, phone }) {
  const seq = await query(`SELECT nextval('leads_seq') AS num`);
  const leadCode = `LEAD-${seq.rows[0].num}`;

  const { rows } = await query(
    `INSERT INTO leads (tenant_id, lead_id, customer_name, phone, source, stage, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'WhatsApp Inbound', 'New', 'Auto-created from WhatsApp chat', now(), now())
     RETURNING id`,
    [tenantId, leadCode, customerName, phone]
  );
  return { id: rows[0]?.id || null, leadCode };
}

/* ------------------------------------------------------------------ *
 * Quick replies
 * ------------------------------------------------------------------ */

/**
 * Canned replies for the composer's "/" picker.
 *
 * Read from whatsapp_templates, which is what the Settings screen writes to.
 * A separate whatsapp_quick_replies table briefly existed for this and meant
 * a shortcut saved in Settings never appeared in the chat - two stores for
 * one idea. Settings owns creating and editing them; this is read-only.
 *
 * Only type = 'text' entries qualify: 'template' rows are Meta-approved
 * WABA templates, which cannot be sent as free text.
 */
async function listQuickReplies(tenantId) {
  const { rows } = await query(
    `SELECT id, name, body FROM whatsapp_templates
     WHERE tenant_id = $1 AND type = 'text'
     ORDER BY name ASC`,
    [tenantId]
  );

  // The Settings form lets people type the shortcut with or without the
  // leading slash, so it is normalised here rather than at every call site.
  return rows.map((r) => ({
    id: r.id,
    shortcut: String(r.name || '').replace(/^\//, '').toLowerCase(),
    message: r.body,
  }));
}

module.exports = {
  getSession,
  getAutopilotDefault,
  saveQrCode,
  markConnected,
  markLoggedOut,
  setSessionStatus,
  setAutopilotDefault,
  listResumableTenantIds,
  findChatByPhone,
  findChatById,
  createChat,
  recordInboundOnChat,
  recordAiReplyOnChat,
  recordHumanReplyOnChat,
  flagChatForHuman,
  setChatAiEnabled,
  clearUnread,
  listChats,
  getChatWithContext,
  insertMessage,
  listMessages,
  getLastMessage,
  getLastInboundMessage,
  getRecentHistory,
  updateMessageStatus,
  findLeadIdByPhone,
  createLeadFromWhatsapp,
  listQuickReplies,
};
