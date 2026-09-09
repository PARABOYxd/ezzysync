const { query } = require('../config/db');

/**
 * Get all active chats for a tenant.
 */
async function getChats(tenantId) {
  const { rows } = await query(
    `SELECT * FROM whatsapp_chats 
     WHERE tenant_id = $1 
     ORDER BY last_message_timestamp DESC`,
    [tenantId]
  );
  return rows;
}

/**
 * Get all messages for a specific chat ID.
 */
async function getChatMessages(tenantId, chatId) {
  const { rows } = await query(
    `SELECT * FROM whatsapp_messages 
     WHERE tenant_id = $1 AND chat_id = $2 
     ORDER BY message_timestamp ASC`,
    [tenantId, chatId]
  );
  return rows;
}

/**
 * Mark all messages in a chat as read by resetting unread_count.
 */
async function resetUnreadCount(tenantId, chatId) {
  const { rows } = await query(
    `UPDATE whatsapp_chats 
     SET unread_count = 0, updated_at = now() 
     WHERE tenant_id = $1 AND id = $2 
     RETURNING *`,
    [tenantId, chatId]
  );
  return rows[0];
}

function normalizePhone(phone = '') {
  // Instagram conversations are keyed as "IG_<handle>" in this same column.
  // Stripping non-digits from those left an empty string, so every Instagram
  // chat for a tenant collapsed into one row keyed on '' - different people's
  // DMs landing in a single thread. Handles pass through untouched.
  if (String(phone).startsWith('IG_')) return String(phone).trim();

  let clean = phone.replace(/\D/g, '');
  // Remove leading zeros
  clean = clean.replace(/^0+/, '');
  // Prepend country code 91 if it is a 10 digit number
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
}

/**
 * Save an incoming or outgoing message.
 * Handles creating or updating the chat header in a single database transaction/block.
 */
async function saveMessage(tenantId, phone, direction, text, customerName = '', incrementUnread = 0, messageId = null, status = 'sent', timestamp = null, messageType = 'text', mediaUrl = null, aiEnabled = false) {
  const cleanPhone = normalizePhone(phone);

  // Meta delivers webhooks at least once, so the same message id genuinely
  // arrives more than once. Bail out before touching anything: re-running the
  // body would bump unread_count a second time and, now that message_id is
  // unique, the insert would throw and the caller would log a false failure.
  if (messageId) {
    const existing = await query(
      `SELECT m.*, c.id AS chat_pk FROM whatsapp_messages m
       JOIN whatsapp_chats c ON c.id = m.chat_id
       WHERE m.tenant_id = $1 AND m.message_id = $2`,
      [tenantId, messageId]
    );
    if (existing.rows.length) {
      const chatRow = await query(`SELECT * FROM whatsapp_chats WHERE id = $1`, [existing.rows[0].chat_pk]);
      return { chat: chatRow.rows[0], message: existing.rows[0], duplicate: true };
    }
  }
  
  // The chat header, found or created in one statement.
  //
  // This path and the WhatsApp Web path write to the same whatsapp_chats table
  // but normalise phone numbers differently - this one forces a 91 prefix,
  // Baileys stores whatever WhatsApp sends - so the same person can arrive as
  // "919812345678" here and "9812345678" there. A lookup on `phone = $2` did
  // not see the other spelling, so it fell through to a plain INSERT, which
  // now violates the unique index on (tenant_id, phone_key) and threw. The
  // webhook swallows exceptions, so the customer's message just vanished.
  //
  // Conflicting on phone_key - the last ten digits - makes both paths land on
  // the same row whichever spelling arrives first.
  const msgTimestamp = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();

  const existingChat = await query(
    `SELECT * FROM whatsapp_chats
      WHERE tenant_id = $1
        AND phone_key = CASE
              WHEN length(regexp_replace($2, '[^0-9]', '', 'g')) >= 10
                THEN right(regexp_replace($2, '[^0-9]', '', 'g'), 10)
              ELSE lower($2)
            END`,
    [tenantId, cleanPhone]
  );

  const nameToUse = customerName || existingChat.rows[0]?.customer_name || cleanPhone;

  const upsert = await query(
    `INSERT INTO whatsapp_chats
       (tenant_id, phone, customer_name, last_message, last_message_timestamp, unread_count, ai_enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tenant_id, phone_key) DO UPDATE SET
       last_message = EXCLUDED.last_message,
       last_message_timestamp = EXCLUDED.last_message_timestamp,
       unread_count = whatsapp_chats.unread_count + EXCLUDED.unread_count,
       customer_name = COALESCE(NULLIF(whatsapp_chats.customer_name, ''), EXCLUDED.customer_name),
       updated_at = now()
     RETURNING *`,
    [tenantId, cleanPhone, nameToUse, text, msgTimestamp, incrementUnread, aiEnabled]
  );
  const chat = upsert.rows[0];

  // Not every caller has a provider message id - an AI handoff notice and some
  // internal sends have none, and message_id is NOT NULL with a unique index
  // on it. Those inserts used to fail and get swallowed by the caller's
  // try/catch, so the message silently never appeared. A synthetic id keeps
  // the row valid and stays unique.
  const storedMessageId =
    messageId || `local_${direction}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // Insert the message
  const msgRes = await query(
    `INSERT INTO whatsapp_messages (tenant_id, chat_id, direction, message_text, message_id, status, message_timestamp, message_type, media_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [tenantId, chat.id, direction, text, storedMessageId, status, msgTimestamp, messageType, mediaUrl]
  );

  return { chat, message: msgRes.rows[0] };
}

/**
 * How far along a message is. Higher wins.
 *
 * Meta delivers status webhooks out of order - "read" routinely arrives before
 * "delivered" - and each one used to overwrite whatever was stored, so a
 * message the customer had already read could drop back to "delivered" and the
 * tick in the UI went backwards. `failed` ranks highest because it is terminal
 * information the agent must not lose.
 */
const STATUS_RANK = { pending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

/**
 * Update message delivery/read status by Meta's message ID.
 *
 * Scoped to the tenant. It used to match on message_id alone, so a status
 * event - which arrives on an unauthenticated webhook - could update a row
 * belonging to any tenant on the platform.
 *
 * A status that is not an advance is ignored, and an unknown status is
 * rejected outright rather than stored.
 */
async function updateMessageStatus(tenantId, messageId, status) {
  if (!(status in STATUS_RANK)) return null;

  const { rows } = await query(
    `UPDATE whatsapp_messages
        SET status = $1
      WHERE message_id = $2
        AND tenant_id = $3
        AND COALESCE(
              CASE status
                WHEN 'pending' THEN 0 WHEN 'sent' THEN 1 WHEN 'delivered' THEN 2
                WHEN 'read' THEN 3 WHEN 'failed' THEN 4
              END, -1) < $4
      RETURNING *`,
    [status, messageId, tenantId, STATUS_RANK[status]]
  );

  // No row means either the message is not ours, or it is already at or past
  // this status. Callers treat both as "nothing to do".
  return rows[0] || null;
}

module.exports = {
  getChats,
  getChatMessages,
  resetUnreadCount,
  saveMessage,
  updateMessageStatus,
};
