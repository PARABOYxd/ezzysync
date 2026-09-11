import { describe, it, expect, beforeEach } from 'vitest';
import { db, appRequire, helpers } from './app.mjs';

const { query } = db;
const repo = appRequire('../repositories/whatsappWebRepository');
const rateLimiter = appRequire('../services/whatsappRateLimiter');
const aiPolicy = appRequire('../services/whatsappAiPolicy');
const windowService = appRequire('../services/whatsappWindowService');
const { createTenant, createUser, resetTenantData } = helpers;

/**
 * The inbox rules a shared WhatsApp account depends on.
 *
 * These all cover behaviour that was once wrong in a way nobody could see: a
 * chat deleted while an agent was reading it, a redelivered message answered
 * twice, a backlog message stamped with the wrong time, a customer's "STOP"
 * ignored.
 */
describe('WhatsApp inbox', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  describe('one chat per person', () => {
    it('does not create a second chat for the same number written differently', async () => {
      const a = await repo.createChat(tenant.tenantId, {
        phone: '9876500001', jid: 'a@s.whatsapp.net', customerName: 'Asha',
        leadId: null, lastMessage: 'hi', aiEnabled: false,
      });
      const b = await repo.createChat(tenant.tenantId, {
        phone: '919876500001', jid: 'b@s.whatsapp.net', customerName: 'Asha again',
        leadId: null, lastMessage: 'hi again', aiEnabled: false,
      });

      expect(b.id).toBe(a.id);
      const { rows } = await query(
        `SELECT count(*)::int c FROM whatsapp_chats WHERE phone_key = '9876500001'`
      );
      expect(rows[0].c).toBe(1);
    });

    it('survives six messages arriving at the same instant', async () => {
      // Check-then-insert is what produced duplicate chats; the upsert has to
      // hold under genuine concurrency, not just in sequence.
      await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          repo.createChat(tenant.tenantId, {
            phone: '9876500002', jid: `c${i}@s.whatsapp.net`, customerName: `Race ${i}`,
            leadId: null, lastMessage: `m${i}`, aiEnabled: false,
          })
        )
      );

      const { rows } = await query(
        `SELECT count(*)::int c FROM whatsapp_chats WHERE phone_key = '9876500002'`
      );
      expect(rows[0].c).toBe(1);
    });

    it('keeps the name it already had', async () => {
      const first = await repo.createChat(tenant.tenantId, {
        phone: '9876500003', jid: 'd@s.whatsapp.net', customerName: 'Real Name',
        leadId: null, lastMessage: 'hi', aiEnabled: false,
      });
      await repo.createChat(tenant.tenantId, {
        phone: '9876500003', jid: 'd@s.whatsapp.net', customerName: 'WhatsApp Contact',
        leadId: null, lastMessage: 'hi', aiEnabled: false,
      });

      const chat = await repo.findChatById(tenant.tenantId, first.id);
      expect(chat.customer_name).toBe('Real Name');
    });
  });

  describe('reading a chat', () => {
    it('does not delete chats when the inbox is listed', async () => {
      // The inbox polls every three seconds. A merge that ran on read deleted
      // the row an agent had open, and their thread went blank.
      const chat = await repo.createChat(tenant.tenantId, {
        phone: '9876500004', jid: 'e@s.whatsapp.net', customerName: 'Stable',
        leadId: null, lastMessage: 'hi', aiEnabled: false,
      });

      for (let i = 0; i < 5; i += 1) await repo.listChats(tenant.tenantId);

      expect(await repo.findChatById(tenant.tenantId, chat.id)).toBeTruthy();
    });

    it('shows only this chat, not every chat sharing the number', async () => {
      const chat = await repo.createChat(tenant.tenantId, {
        phone: '9876500005', jid: 'f@s.whatsapp.net', customerName: 'Solo',
        leadId: null, lastMessage: 'hi', aiEnabled: false,
      });
      await repo.insertMessage(tenant.tenantId, {
        chatId: chat.id, messageId: 'M1', direction: 'inbound',
        sender: 'customer', messageText: 'only mine', status: 'delivered',
      });

      const messages = await repo.listMessages(tenant.tenantId, chat.id);
      expect(messages).toHaveLength(1);
    });
  });

  describe('messages', () => {
    it('stores a redelivered message once', async () => {
      const chat = await repo.createChat(tenant.tenantId, {
        phone: '9876500006', jid: 'g@s.whatsapp.net', customerName: 'Dupe',
        leadId: null, lastMessage: 'hi', aiEnabled: false,
      });

      const first = await repo.insertMessage(tenant.tenantId, {
        chatId: chat.id, messageId: 'SAME_ID', direction: 'inbound',
        sender: 'customer', messageText: 'hello', status: 'delivered',
      });
      const second = await repo.insertMessage(tenant.tenantId, {
        chatId: chat.id, messageId: 'SAME_ID', direction: 'inbound',
        sender: 'customer', messageText: 'hello', status: 'delivered',
      });

      expect(first.inserted).toBe(true);
      // The caller uses this to decide whether to run the AI; a redelivery
      // that reported `true` answered the customer a second time.
      expect(second.inserted).toBe(false);
    });

    it('keeps the time WhatsApp sent it, not the time we read it', async () => {
      const chat = await repo.createChat(tenant.tenantId, {
        phone: '9876500007', jid: 'h@s.whatsapp.net', customerName: 'Backlog',
        leadId: null, lastMessage: 'hi', aiEnabled: false,
      });

      const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
      await repo.insertMessage(tenant.tenantId, {
        chatId: chat.id, messageId: 'OLD', direction: 'inbound',
        sender: 'customer', messageText: 'sent two hours ago',
        status: 'delivered', sentAt: twoHoursAgo,
      });
      await repo.insertMessage(tenant.tenantId, {
        chatId: chat.id, messageId: 'NEW', direction: 'inbound',
        sender: 'customer', messageText: 'just now', status: 'delivered',
      });

      const messages = await repo.listMessages(tenant.tenantId, chat.id);
      expect(messages.map((m) => m.message_id)).toEqual(['OLD', 'NEW']);

      const drift = Math.abs(
        new Date(messages[0].message_timestamp).getTime() / 1000 - twoHoursAgo
      );
      expect(drift).toBeLessThan(5);
    });

    it('records which team member replied', async () => {
      const agent = await createUser(tenant.tenantId, { name: 'Priya Sharma' });
      const chat = await repo.createChat(tenant.tenantId, {
        phone: '9876500008', jid: 'i@s.whatsapp.net', customerName: 'Team',
        leadId: null, lastMessage: 'hi', aiEnabled: false,
      });

      await repo.insertMessage(tenant.tenantId, {
        chatId: chat.id, messageId: 'BY_AGENT', direction: 'outbound',
        sender: 'agent', messageText: 'on it', status: 'sent', userId: agent.id,
      });
      await repo.insertMessage(tenant.tenantId, {
        chatId: chat.id, messageId: 'BY_AI', direction: 'outbound',
        sender: 'ai_bot', messageText: 'automated', status: 'sent',
      });

      const messages = await repo.listMessages(tenant.tenantId, chat.id);
      expect(messages.find((m) => m.message_id === 'BY_AGENT').agent_name).toBe('Priya Sharma');
      expect(messages.find((m) => m.message_id === 'BY_AI').agent_name).toBeNull();
    });

    it('never moves a delivery status backwards', async () => {
      const chat = await repo.createChat(tenant.tenantId, {
        phone: '9876500009', jid: 'j@s.whatsapp.net', customerName: 'Ticks',
        leadId: null, lastMessage: 'hi', aiEnabled: false,
      });
      await repo.insertMessage(tenant.tenantId, {
        chatId: chat.id, messageId: 'TICKS', direction: 'outbound',
        sender: 'agent', messageText: 'hi', status: 'sent',
      });

      const statusOf = async () =>
        (await query(`SELECT status FROM whatsapp_messages WHERE message_id = 'TICKS'`)).rows[0].status;

      await repo.updateMessageStatus(tenant.tenantId, 'TICKS', 'read');
      expect(await statusOf()).toBe('read');

      // Out-of-order delivery receipts are normal; a blue tick must not revert.
      await repo.updateMessageStatus(tenant.tenantId, 'TICKS', 'delivered');
      expect(await statusOf()).toBe('read');
    });
  });

  describe('opting out', () => {
    it('recognises a request to stop, but not a sentence containing it', () => {
      expect(aiPolicy.isOptOutRequest('STOP')).toBe(true);
      expect(aiPolicy.isOptOutRequest('band karo')).toBe(true);
      expect(aiPolicy.isOptOutRequest('stop sending goa, send kerala')).toBe(false);
    });

    it('switches the AI off for that chat', async () => {
      const chat = await repo.createChat(tenant.tenantId, {
        phone: '9876500010', jid: 'k@s.whatsapp.net', customerName: 'Quiet',
        leadId: null, lastMessage: 'hi', aiEnabled: true,
      });

      await repo.setChatOptedOut(tenant.tenantId, chat.id, true);

      const after = await repo.findChatById(tenant.tenantId, chat.id);
      expect(after.opted_out).toBe(true);
      expect(after.ai_enabled).toBe(false);
      expect(after.opted_out_at).toBeTruthy();
    });
  });

  describe('when the AI may answer', () => {
    const chatFor = (overrides) => ({
      id: 'chat-1', ai_enabled: true, needs_human: false, opted_out: false, ...overrides,
    });

    it('answers a normal chat on a plan that includes AI', async () => {
      const verdict = await aiPolicy.canAiReply(tenant.tenantId, chatFor({}), {});
      expect(verdict.allowed).toBe(true);
    });

    it('stays silent once a human has been asked for', async () => {
      const verdict = await aiPolicy.canAiReply(tenant.tenantId, chatFor({ needs_human: true }), {});
      expect(verdict.allowed).toBe(false);
    });

    it('stays silent for a customer who opted out', async () => {
      const verdict = await aiPolicy.canAiReply(tenant.tenantId, chatFor({ opted_out: true }), {});
      expect(verdict.allowed).toBe(false);
    });

    it('does not answer a message that queued while the server was down', async () => {
      const verdict = await aiPolicy.canAiReply(tenant.tenantId, chatFor({}), {
        messageAgeSeconds: 7200, isBacklog: true,
      });
      expect(verdict.allowed).toBe(false);
    });

    it('refuses when the plan no longer includes AI', async () => {
      // A tenant is on the 30-day trial - which includes AI - until the
      // account is older than that, so the age is what has to be aged, not
      // just the plan. Getting this wrong is how the first version of this
      // test passed against a tenant that was still on trial.
      const lapsed = await createTenant({ planId: 'FREE' });
      await query(
        `UPDATE tenants SET created_at = now() - interval '60 days' WHERE id = $1`,
        [lapsed.tenantId]
      );

      const verdict = await aiPolicy.canAiReply(lapsed.tenantId, chatFor({}), {});
      expect(verdict.allowed).toBe(false);
      expect(verdict.reason).toMatch(/plan/i);
    });

    it('still answers while the tenant is on the free trial', async () => {
      // The trial deliberately includes AI; a test that only checked the
      // lapsed case would not notice if that stopped working.
      const trial = await createTenant({ planId: 'FREE' });
      const verdict = await aiPolicy.canAiReply(trial.tenantId, chatFor({}), {});
      expect(verdict.allowed).toBe(true);
    });

    it('lets only one reply be written at a time', () => {
      expect(aiPolicy.claim('chat-lock')).toBe(true);
      expect(aiPolicy.claim('chat-lock')).toBe(false);
      aiPolicy.release('chat-lock');
      expect(aiPolicy.claim('chat-lock')).toBe(true);
      aiPolicy.release('chat-lock');
    });
  });

  describe('pacing outbound messages', () => {
    it('lets a burst through, then paces', async () => {
      const id = `pace-${Date.now()}`;
      const start = Date.now();
      for (let i = 0; i < rateLimiter.BURST; i += 1) await rateLimiter.acquire(id);

      expect(Date.now() - start).toBeLessThan(500);
      expect(rateLimiter.wouldThrottle(id)).toBe(true);

      rateLimiter.forget(id);
      expect(rateLimiter.wouldThrottle(id)).toBe(false);
    });
  });

  describe('the 24-hour window', () => {
    it('does not apply to a QR-linked chat', async () => {
      const chat = { transport: 'web', last_inbound_at: new Date() };
      expect(windowService.getWindowState(chat).applies).toBe(false);
    });

    it('is open while the customer has written recently', () => {
      const chat = { transport: 'cloud_api', last_inbound_at: new Date() };
      const state = windowService.getWindowState(chat);
      expect(state.applies).toBe(true);
      expect(state.isOpen).toBe(true);
    });

    it('closes 24 hours after their last message', () => {
      const chat = {
        transport: 'cloud_api',
        last_inbound_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
      };
      expect(windowService.getWindowState(chat).isOpen).toBe(false);
    });

    it('refuses a free-form send once closed', () => {
      const chat = {
        transport: 'cloud_api',
        last_inbound_at: new Date(Date.now() - 30 * 60 * 60 * 1000),
      };
      expect(() => windowService.assertCanSendFreeform(chat)).toThrowError(/template/i);
    });
  });
});
