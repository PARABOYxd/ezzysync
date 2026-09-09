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

async function findChatByPhone(tenantId, phone, jid = null) {
  const rawDigits = String(phone || '').replace(/[^\d]/g, '');
  const last10 = rawDigits.slice(-10);
  const cleanJid = String(jid || '').trim();

  const { rows } = await query(
    `SELECT * FROM whatsapp_chats
     WHERE tenant_id = $1
       AND (
         ($2 <> '' AND jid = $2)
         OR phone = $3
         OR ($4 <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = $4)
         OR ($5 <> '' AND RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = $5)
       )
     ORDER BY COALESCE(last_message_timestamp, updated_at) DESC
     LIMIT 1`,
    [tenantId, cleanJid, phone, rawDigits, last10]
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

/**
 * The chat for this person, creating it only if it does not exist yet.
 *
 * An upsert, not a plain insert, because the caller reaches here after a
 * separate "is there a chat?" lookup - and two messages arriving together both
 * pass that check and both try to create one. That check-then-insert is how
 * the duplicate chats were being produced in the first place; merging them
 * afterwards was treating the symptom.
 *
 * The conflict target is phone_key (the last ten digits, or the handle for
 * Instagram), so "9664029765" and "919664029765" land on the same row instead
 * of becoming two.
 *
 * On conflict nothing already known is overwritten: an existing name or linked
 * lead is kept, and a blank jid is filled in rather than replaced. The loser of
 * the race gets the winner's row back and carries on.
 */
async function createChat(tenantId, { phone, jid, customerName, leadId, lastMessage, aiEnabled }) {
  const { rows } = await query(
    `INSERT INTO whatsapp_chats
       (tenant_id, phone, jid, customer_name, lead_id, last_message, last_message_timestamp, unread_count, ai_enabled, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now(), 1, $7, now(), now())
     ON CONFLICT (tenant_id, phone_key) DO UPDATE SET
       last_message = EXCLUDED.last_message,
       last_message_timestamp = now(),
       updated_at = now(),
       customer_name = COALESCE(NULLIF(whatsapp_chats.customer_name, ''), EXCLUDED.customer_name),
       lead_id = COALESCE(whatsapp_chats.lead_id, EXCLUDED.lead_id),
       jid = COALESCE(NULLIF(whatsapp_chats.jid, ''), EXCLUDED.jid)
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

/**
 * Chat list for the inbox, enriched with the linked lead and booking.
 *
 * Read-only, deliberately. This used to merge duplicate chats first - moving
 * their messages and DELETING the losing rows - on every single call. The
 * inbox polls it every three seconds per open tab, so an agent reading a chat
 * could have that very row deleted underneath them: the next poll asked for
 * messages by an id that no longer existed and the thread went blank, then
 * came back when they reopened it from the list. Which row won was decided by
 * `last_message_timestamp DESC`, so it flipped as new messages arrived and the
 * thread emptied again and again.
 *
 * Worse, `whatsapp_messages.chat_id` cascades on delete, and the move and the
 * delete were two separate statements. Any message that arrived in the losing
 * chat between them was cascade-deleted for good.
 *
 * Merging duplicates is a migration, and it runs once at boot in
 * ensureSchema(), inside a transaction.
 */
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
  { chatId, messageId, direction, sender, messageText, status, messageType = 'text', mediaUrl = null, sentAt = null, userId = null }
) {
  const safeMessageId = (messageId && String(messageId).trim())
    ? String(messageId).trim()
    : `${direction || 'msg'}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // When WhatsApp sent it, not when we read it. This was hardcoded to now(),
  // which is wrong for the case offline sync exists to handle: messages that
  // queued while the server was down all arrive at once on reconnect, and
  // stamping them with the moment of reconnection put a 9pm message below an
  // 11pm one. Threads are ordered by this column.
  const timestamp = Number(sentAt) > 0 ? new Date(Number(sentAt) * 1000) : null;

  const { rows, rowCount } = await query(
    `INSERT INTO whatsapp_messages
       (tenant_id, chat_id, message_id, direction, sender, message_text, status, message_type, media_url, message_timestamp, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, now()), $11)
     ON CONFLICT (message_id) DO NOTHING
     RETURNING id`,
    [tenantId, chatId, safeMessageId, direction, sender, messageText, status, messageType, mediaUrl, timestamp, userId]
  );
  // rowCount 0 means this id is already stored - the echo of a message this
  // server sent, which WhatsApp also delivers back over the socket.
  return { inserted: rowCount > 0, id: rows[0]?.id || null };
}

async function listMessages(tenantId, chatId) {
  // One chat, one thread. A previous version also pulled in messages from any
  // other chat sharing the last ten digits, which made the thread disagree
  // with the chat list beside it and hid the fact that duplicates existed at
  // all. Duplicates are merged once at boot instead, and findChatByPhone()
  // already matches on the ten-digit suffix so new ones are not created.
  const { rows } = await query(
    `SELECT m.*, u.name AS agent_name
       FROM whatsapp_messages m
       LEFT JOIN users u ON u.id = m.user_id
      WHERE m.chat_id = $1 AND m.tenant_id = $2
      ORDER BY m.message_timestamp ASC
      LIMIT 300`,
    [chatId, tenantId]
  );
  return rows;
}

/**
 * Records that this customer asked to stop being messaged.
 *
 * Honouring "STOP" is not politeness. A customer who cannot make the messages
 * end blocks and reports the number instead, and block rate is the strongest
 * single signal behind a WhatsApp ban. Switching the AI off at the same time
 * means nothing automated can answer them again by accident.
 */
async function setChatOptedOut(tenantId, chatId, optedOut) {
  await query(
    `UPDATE whatsapp_chats
        SET opted_out = $3,
            opted_out_at = CASE WHEN $3 THEN now() ELSE NULL END,
            ai_enabled = CASE WHEN $3 THEN FALSE ELSE ai_enabled END,
            updated_at = now()
      WHERE tenant_id = $1 AND id = $2`,
    [tenantId, chatId, optedOut]
  );
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

/**
 * Advances a message's delivery state, never rewinds it.
 *
 * Baileys emits `messages.update` out of order, so a read receipt can land
 * before the delivery one. A plain `SET status` therefore turned a blue tick
 * back into a single tick. Scoped to the tenant too: message ids come from
 * WhatsApp, not from us, and nothing should be able to touch another tenant's
 * rows by guessing one.
 */
const STATUS_RANK = { pending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

async function updateMessageStatus(tenantId, messageId, status) {
  if (!(status in STATUS_RANK)) return;

  await query(
    `UPDATE whatsapp_messages
        SET status = $1
      WHERE message_id = $2
        AND tenant_id = $3
        AND COALESCE(
              CASE status
                WHEN 'pending' THEN 0 WHEN 'sent' THEN 1 WHEN 'delivered' THEN 2
                WHEN 'read' THEN 3 WHEN 'failed' THEN 4
              END, -1) < $4`,
    [status, messageId, tenantId, STATUS_RANK[status]]
  );
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
  setChatOptedOut,
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
