const { query } = require('../config/db');

/**
 * The reads that ground an AI reply in the tenant's own data.
 *
 * These deliberately live apart from the feature repositories: aiService is
 * not "the bookings feature" or "the WhatsApp feature", it assembles a
 * read-only snapshot across several of them. Everything here is capped,
 * because the output is pasted into a prompt and paid for per token.
 */

/**
 * The booking and lead matching an inbound number.
 *
 * Matched on the last 10 digits in SQL rather than by loading every booking
 * and lead the tenant owns and filtering in Node - the stored number and the
 * WhatsApp sender often disagree about the country code, but not about the
 * subscriber number.
 */
async function findCustomerContext(tenantId, phone) {
  const digits = (phone || '').replace(/[^\d]/g, '');
  const suffix = `%${digits.slice(-10)}`;

  const [bookingRes, leadRes] = await Promise.all([
    query(
      `SELECT * FROM bookings
       WHERE tenant_id = $1 AND deleted = FALSE AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE $2
       ORDER BY updated_at DESC LIMIT 1`,
      [tenantId, suffix]
    ),
    query(
      `SELECT * FROM leads
       WHERE tenant_id = $1 AND deleted = FALSE AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE $2
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, suffix]
    ),
  ]);

  return { bookingRow: bookingRes.rows[0] || null, lead: leadRes.rows[0] || null };
}

/** Quotations the AI may quote from. Capped - the model writes two lines, not an itinerary. */
async function listQuotationsForPrompt(tenantId, limit = 8) {
  const { rows } = await query(
    `SELECT id, trip_name, price_quote, itinerary_days
     FROM quotations WHERE tenant_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [tenantId, limit]
  );
  return rows;
}

/** Upcoming group departures, soonest first. */
async function listTourBatchesForPrompt(tenantId, limit = 4) {
  const { rows } = await query(
    `SELECT name, trip_name, departure_date, price_per_person, itinerary_days
     FROM tour_batches WHERE tenant_id = $1 AND deleted = FALSE
     ORDER BY departure_date ASC LIMIT $2`,
    [tenantId, limit]
  );
  return rows;
}

/**
 * Recent turns of one conversation, oldest first.
 *
 * sender is selected alongside direction so the prompt can distinguish the
 * agent's own messages from the AI's - which is what lets AI pick up a chat a
 * human was handling without repeating what they already said.
 */
async function getChatHistoryByPhone(tenantId, phone, limit = 10) {
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

module.exports = {
  findCustomerContext,
  listQuotationsForPrompt,
  listTourBatchesForPrompt,
  getChatHistoryByPhone,
};
