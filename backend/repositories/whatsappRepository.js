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
  
  // Try to find the chat header first
  let chatRows = await query(
    `SELECT * FROM whatsapp_chats WHERE tenant_id = $1 AND phone = $2`,
    [tenantId, cleanPhone]
  );

  let chat;
  const nameToUse = customerName || (chatRows.rows[0]?.customer_name) || cleanPhone;
  const msgTimestamp = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();

  if (chatRows.rows.length === 0) {
    // Create new chat header using the admin-configured default mode
    // managed_by was dropped from whatsapp_chats; ai_enabled is the flag now.
    // Writing to the old column made every insert here fail, which is why
    // Instagram DMs never reached the inbox at all. New chats start human -
    // an agent opts into AI per chat.
    const insertRes = await query(
      `INSERT INTO whatsapp_chats (tenant_id, phone, customer_name, last_message, last_message_timestamp, unread_count, ai_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [tenantId, cleanPhone, nameToUse, text, msgTimestamp, incrementUnread, aiEnabled]
    );
    chat = insertRes.rows[0];
  } else {
    // Update existing chat header
    const updateRes = await query(
      `UPDATE whatsapp_chats 
       SET last_message = $1, 
           last_message_timestamp = $2, 
           unread_count = unread_count + $3, 
           customer_name = $4,
           updated_at = now()
       WHERE tenant_id = $5 AND phone = $6
       RETURNING *`,
      [text, msgTimestamp, incrementUnread, nameToUse, tenantId, cleanPhone]
    );
    chat = updateRes.rows[0];
  }

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
 * Update message delivery/read status by Meta's message ID.
 */
async function updateMessageStatus(messageId, status) {
  const { rows } = await query(
    `UPDATE whatsapp_messages 
     SET status = $1 
     WHERE message_id = $2 
     RETURNING *`,
    [status, messageId]
  );
  return rows[0];
}

module.exports = {
  getChats,
  getChatMessages,
  resetUnreadCount,
  saveMessage,
  updateMessageStatus,
};
