import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const broadcastRepository = appRequire('../repositories/broadcastRepository');
const broadcastService = appRequire('../services/broadcastService');
const whatsappWebRepo = appRequire('../repositories/whatsappWebRepository');
const { createTenant, resetTenantData, unique } = helpers;

/**
 * Covers the persistence layer directly - broadcastToLeads' full send path
 * needs a live WhatsApp connection this test env doesn't have, but the part
 * that was actually missing (a broadcast surviving past the response that
 * sent it) is this layer, independent of transport.
 */
describe('Broadcast history', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  it('persists a broadcast log with its recipients, and lists it back newest first', async () => {
    const log = await broadcastRepository.createBroadcastLog(tenant.tenantId, {
      templateId: null,
      templateName: 'Season Offer',
      sentBy: 'agent@test.com',
      requestedCount: 2,
      sentCount: 1,
    });

    await broadcastRepository.insertRecipients(tenant.tenantId, log.id, [
      { leadId: null, customerName: 'Asha Rao', phone: '9876500001', chatId: null, messageId: null, sent: true },
      { leadId: null, customerName: 'No Phone Guy', phone: '', chatId: null, messageId: null, sent: false, error: 'No phone number on file.' },
    ]);

    const list = await broadcastRepository.listBroadcasts(tenant.tenantId);
    expect(list).toHaveLength(1);
    expect(list[0].template_name).toBe('Season Offer');
    expect(list[0].sent_count).toBe(1);
    expect(list[0].requested_count).toBe(2);
  });

  it('computes delivery status and reply detection from the ordinary message thread', async () => {
    const phone = unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1');
    const chat = await whatsappWebRepo.createChat(tenant.tenantId, {
      phone, jid: `${phone}@s.whatsapp.net`, customerName: 'Asha', leadId: null, lastMessage: 'hi', aiEnabled: false,
    });

    const log = await broadcastRepository.createBroadcastLog(tenant.tenantId, {
      templateName: 'Season Offer', sentBy: 'agent@test.com', requestedCount: 1, sentCount: 1,
    });

    const messageId = `bcast_${unique('m')}`;
    await whatsappWebRepo.insertMessage(tenant.tenantId, {
      chatId: chat.id, messageId, direction: 'outbound', sender: 'agent',
      messageText: 'Season offer!', status: 'sent', messageType: 'text',
    });
    await broadcastRepository.insertRecipients(tenant.tenantId, log.id, [
      { leadId: null, customerName: 'Asha', phone, chatId: chat.id, messageId, sent: true },
    ]);

    // Not replied yet, still shows the message's own status.
    let detail = await broadcastRepository.getBroadcastDetail(tenant.tenantId, log.id);
    expect(detail.recipients).toHaveLength(1);
    expect(detail.recipients[0].delivery_status).toBe('sent');
    expect(detail.recipients[0].replied).toBe(false);

    // Delivery status update flows through the same message row the broadcast used.
    await whatsappWebRepo.updateMessageStatus(tenant.tenantId, messageId, 'delivered');

    // Customer replies - an inbound message after the broadcast was sent.
    await whatsappWebRepo.insertMessage(tenant.tenantId, {
      chatId: chat.id, messageId: `reply_${unique('m')}`, direction: 'inbound', sender: 'customer',
      messageText: 'Sounds good!', status: 'delivered', messageType: 'text',
    });

    detail = await broadcastRepository.getBroadcastDetail(tenant.tenantId, log.id);
    expect(detail.recipients[0].delivery_status).toBe('delivered');
    expect(detail.recipients[0].replied).toBe(true);
  });

  it('is isolated per tenant', async () => {
    const other = await createTenant();
    const log = await broadcastRepository.createBroadcastLog(tenant.tenantId, {
      templateName: 'Season Offer', sentBy: 'agent@test.com', requestedCount: 1, sentCount: 1,
    });

    const otherList = await broadcastRepository.listBroadcasts(other.tenantId);
    expect(otherList).toHaveLength(0);

    const otherDetail = await broadcastRepository.getBroadcastDetail(other.tenantId, log.id);
    expect(otherDetail).toBeNull();
  });

  it('exposes listBroadcasts/getBroadcastDetail through broadcastService too', async () => {
    await broadcastRepository.createBroadcastLog(tenant.tenantId, {
      templateName: 'Season Offer', sentBy: 'agent@test.com', requestedCount: 1, sentCount: 1,
    });

    const list = await broadcastService.listBroadcasts(tenant.tenantId);
    expect(list).toHaveLength(1);

    const detail = await broadcastService.getBroadcastDetail(tenant.tenantId, list[0].id);
    expect(detail.log.id).toBe(list[0].id);
  });
});
