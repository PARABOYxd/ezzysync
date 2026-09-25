import { describe, it, expect, beforeEach } from 'vitest';
import { db, appRequire, helpers } from './app.mjs';

const { query } = db;
const webRepo = appRequire('../repositories/whatsappWebRepository');
const cloudRepo = appRequire('../repositories/whatsappRepository');
const { createTenant, resetTenantData } = helpers;

/**
 * A chat's transport decides which connection replies leave on. It used to be
 * set once, when the chat row was first created, and never corrected - so a
 * chat opened while only Cloud API credentials existed kept posting replies
 * to Meta long after the customer had moved to the QR-linked number. Every
 * send failed with "WhatsApp is not connected or permissions expired" while
 * the inbox header showed that number connected.
 *
 * The channel a message actually arrived on is the authority.
 */
describe('WhatsApp chat transport follows the customer', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  const transportOf = async (chatId) => {
    const { rows } = await query('SELECT transport FROM whatsapp_chats WHERE id = $1', [chatId]);
    return rows[0].transport;
  };

  it('moves a cloud_api chat to web when the customer writes in over the QR socket', async () => {
    const chat = await webRepo.createChat(tenant.tenantId, {
      phone: '918104665986', jid: null, customerName: 'Asha', leadId: null,
      lastMessage: 'hi', aiEnabled: false, transport: 'cloud_api',
    });
    expect(await transportOf(chat.id)).toBe('cloud_api');

    await webRepo.recordInboundOnChat(chat.id, {
      lastMessage: 'Helo', pushName: 'Asha', jid: '271902232817736@lid',
    });

    expect(await transportOf(chat.id)).toBe('web');
  });

  it('moves a web chat to cloud_api when a message arrives from Meta', async () => {
    const chat = await webRepo.createChat(tenant.tenantId, {
      phone: '919812345678', jid: '919812345678@s.whatsapp.net', customerName: 'Rahul',
      leadId: null, lastMessage: 'hi', aiEnabled: false, transport: 'web',
    });

    const { chat: saved } = await cloudRepo.saveMessage(
      tenant.tenantId, '919812345678', 'inbound', 'Hello from Meta', 'Rahul', 1, `wamid_${Date.now()}`
    );

    expect(saved.id).toBe(chat.id);
    expect(await transportOf(chat.id)).toBe('cloud_api');
  });

  it('our own outbound reply never changes which connection the chat is on', async () => {
    const chat = await webRepo.createChat(tenant.tenantId, {
      phone: '919812345679', jid: '919812345679@s.whatsapp.net', customerName: 'Meera',
      leadId: null, lastMessage: 'hi', aiEnabled: false, transport: 'web',
    });

    await cloudRepo.saveMessage(
      tenant.tenantId, '919812345679', 'outbound', 'Reply from agent', 'Meera', 0, `out_${Date.now()}`
    );

    expect(await transportOf(chat.id)).toBe('web');
  });

  it('a brand-new Cloud API conversation starts on cloud_api', async () => {
    const { chat } = await cloudRepo.saveMessage(
      tenant.tenantId, '919812345670', 'inbound', 'First contact', 'New Person', 1, `wamid_new_${Date.now()}`
    );
    expect(chat.transport).toBe('cloud_api');
  });
});

const webService = appRequire('../services/whatsappWebService');

/**
 * Handing one chat to the AI mid-conversation used to need the QR socket, so
 * on a Cloud API chat it silently did nothing at all - the agent flipped the
 * switch and no reply ever came.
 */
describe('AI takeover on a single chat', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  it('does not refuse a Cloud API chat for want of a QR socket', async () => {
    const chat = await webRepo.createChat(tenant.tenantId, {
      phone: '919812345671', jid: null, customerName: 'Cloud Person', leadId: null,
      lastMessage: '', aiEnabled: false, transport: 'cloud_api',
    });

    const result = await webService.sendAiCatchUpMessage(tenant.tenantId, chat.id);
    // No messages yet, so there is nothing to answer - but the reason must be
    // about the conversation, never the missing socket.
    expect(result.reason).toBe('no_messages');
  });

  it('still refuses a QR chat when no socket is live', async () => {
    const chat = await webRepo.createChat(tenant.tenantId, {
      phone: '919812345672', jid: '919812345672@s.whatsapp.net', customerName: 'QR Person',
      leadId: null, lastMessage: '', aiEnabled: false, transport: 'web',
    });

    const result = await webService.sendAiCatchUpMessage(tenant.tenantId, chat.id);
    expect(result.reason).toBe('not_connected');
  });
});
