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
async function saveMessage(tenantId, phone, direction, text, customerName = '', incrementUnread = 0, messageId = null, status = 'sent', timestamp = null, messageType = 'text', mediaUrl = null) {
  const cleanPhone = normalizePhone(phone);
  
  // Try to find the chat header first
  let chatRows = await query(
    `SELECT * FROM whatsapp_chats WHERE tenant_id = $1 AND phone = $2`,
    [tenantId, cleanPhone]
  );

  let chat;
  const nameToUse = customerName || (chatRows.rows[0]?.customer_name) || cleanPhone;
  const msgTimestamp = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();

  if (chatRows.rows.length === 0) {
    // Create new chat header
    const insertRes = await query(
      `INSERT INTO whatsapp_chats (tenant_id, phone, customer_name, last_message, last_message_timestamp, unread_count, managed_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'ai')
       RETURNING *`,
      [tenantId, cleanPhone, nameToUse, text, msgTimestamp, incrementUnread]
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

  // Insert the message
  const msgRes = await query(
    `INSERT INTO whatsapp_messages (tenant_id, chat_id, direction, message_text, message_id, status, message_timestamp, message_type, media_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [tenantId, chat.id, direction, text, messageId, status, msgTimestamp, messageType, mediaUrl]
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
