import { apiJson, uniquePhone, unique, daysFromNow } from './fixtures.js';

export async function createBooking(api, overrides = {}) {
  const body = {
    customerName: unique('QA Customer'),
    phone: uniquePhone(),
    trip: unique('QA Trip'),
    departure: daysFromNow(20),
    members: 2,
    pricePerPerson: 10000,
    paid: 0,
    travelStatus: 'Confirming',
    ...overrides,
  };
  const res = await api.post('bookings', { data: body });
  const { booking } = await apiJson(res, 201);
  return booking;
}

export async function cancelBooking(api, bookingId) {
  const res = await api.put(`bookings/${bookingId}`, { data: { travelStatus: 'Cancelled' } });
  return apiJson(res, 200);
}

export async function getDashboard(api) {
  return apiJson(await api.get('dashboard'), 200);
}

export async function getBilling(api, params = {}) {
  return apiJson(await api.get('dashboard/analytics', { params }), 200);
}

/**
 * A WhatsApp conversation, written straight to the database the way an
 * incoming message would leave it. There is no API to create one - chats only
 * ever come from a customer messaging in - and a QA tenant has no WhatsApp
 * connected, so nothing here can reach a real phone.
 *
 * `messages` alternate inbound/outbound, oldest first, one minute apart and
 * ending ten minutes ago, with the last one's direction set by `lastFrom`.
 */
export async function createWhatsAppChat(sql, tenantId, { phone, name, count = 4, lastFrom = 'customer', text = (i) => `QA msg ${String(i).padStart(2, '0')}`, unread = 0 }) {
  const e164 = phone.length === 10 ? `91${phone}` : phone;
  const end = Date.now() - 10 * 60 * 1000;
  const { rows } = await sql(
    `INSERT INTO whatsapp_chats (tenant_id, phone, customer_name, last_message, last_message_timestamp, unread_count, transport, last_inbound_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'web', $5) RETURNING id`,
    [tenantId, e164, name, text(count), new Date(end), unread]
  );
  const chatId = rows[0].id;
  for (let i = 1; i <= count; i += 1) {
    const fromCustomer = (count - i) % 2 === 0 ? lastFrom === 'customer' : lastFrom !== 'customer';
    await sql(
      `INSERT INTO whatsapp_messages (tenant_id, chat_id, direction, message_text, message_id, status, message_timestamp, message_type)
       VALUES ($1, $2, $3, $4, $5, 'read', $6, 'text')`,
      [tenantId, chatId, fromCustomer ? 'inbound' : 'outbound', text(i), `qa_${chatId}_${i}`, new Date(end - (count - i) * 60000)]
    );
  }
  return { chatId, phone: e164 };
}

export async function createLead(api, overrides = {}) {
  const res = await api.post('leads', {
    data: { customerName: unique('QA Lead'), phone: uniquePhone(), source: 'Website', stage: 'New', ...overrides },
  });
  const { lead } = await apiJson(res, 201);
  return lead;
}
