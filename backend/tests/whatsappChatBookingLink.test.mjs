import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const bookingService = appRequire('../services/bookingService');
const whatsappWebRepo = appRequire('../repositories/whatsappWebRepository');
const { createTenant, resetTenantData, unique } = helpers;

function bookingData(overrides = {}) {
  return {
    customerName: 'Asha Rao',
    email: '',
    phone: unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1'),
    trip: 'Goa Getaway',
    departure: '2026-12-01',
    members: 2,
    pricePerPerson: 5000,
    paid: 0,
    ...overrides,
  };
}

describe('Booking <-> WhatsApp chat linking', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  it('links a new booking into an existing chat for the same phone, exact match', async () => {
    const phone = unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1');
    const chat = await whatsappWebRepo.createChat(tenant.tenantId, {
      phone, jid: `${phone}@s.whatsapp.net`, customerName: 'Asha', leadId: null, lastMessage: 'hi', aiEnabled: false,
    });

    const booking = await bookingService.createBooking(tenant.tenantId, bookingData({ phone }), 'agent@test.com');

    const refreshed = await whatsappWebRepo.findChatById(tenant.tenantId, chat.id);
    expect(refreshed.booking_id).toBe(booking.id);
  });

  it('links even when the chat has a country-code prefix the booking phone lacks', async () => {
    const local = unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1');
    const chat = await whatsappWebRepo.createChat(tenant.tenantId, {
      phone: `91${local}`, jid: `91${local}@s.whatsapp.net`, customerName: 'Rahul', leadId: null, lastMessage: 'hi', aiEnabled: false,
    });

    const booking = await bookingService.createBooking(tenant.tenantId, bookingData({ phone: local }), 'agent@test.com');

    const refreshed = await whatsappWebRepo.findChatById(tenant.tenantId, chat.id);
    expect(refreshed.booking_id).toBe(booking.id);
  });

  it('never overwrites a chat that is already linked to a booking', async () => {
    const phone = unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1');
    const chat = await whatsappWebRepo.createChat(tenant.tenantId, {
      phone, jid: `${phone}@s.whatsapp.net`, customerName: 'Asha', leadId: null, lastMessage: 'hi', aiEnabled: false,
    });

    const first = await bookingService.createBooking(tenant.tenantId, bookingData({ phone }), 'agent@test.com');
    await bookingService.createBooking(tenant.tenantId, bookingData({ phone }), 'agent@test.com');

    const refreshed = await whatsappWebRepo.findChatById(tenant.tenantId, chat.id);
    expect(refreshed.booking_id).toBe(first.id);
  });

  it('does nothing when no chat exists for that phone', async () => {
    // Just asserting createBooking does not throw when there is nothing to link.
    const booking = await bookingService.createBooking(tenant.tenantId, bookingData(), 'agent@test.com');
    expect(booking.bookingId).toBeTruthy();
  });
});
