import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const adReferral = appRequire('../services/whatsappAdReferral');
const service = appRequire('../services/whatsappWebService');
const repo = appRequire('../repositories/whatsappWebRepository');
const { query } = appRequire('../config/db');
const { createTenant, resetTenantData } = helpers;

const inbound = (tenantId, overrides = {}) => service.processInboundMessage(tenantId, {
  senderJid: '919876501111@s.whatsapp.net',
  senderPhone: '919876501111',
  pushName: 'Sneha',
  messageText: 'Hi, is this trip available?',
  messageId: `m_${Math.random().toString(36).slice(2)}`,
  sock: null,
  allowAiReply: false,
  ...overrides,
});

const leadsOf = async (tenantId) => (await query('SELECT * FROM leads WHERE tenant_id = $1', [tenantId])).rows;
const chatsOf = async (tenantId) => (await query('SELECT * FROM whatsapp_chats WHERE tenant_id = $1', [tenantId])).rows;

const AD = { headline: 'Chopta Tungnath Trek', body: '3N/4D from Delhi', url: 'https://fb.me/abc', sourceId: '123', clickId: 'clk', kind: 'ad' };

describe('recognising a Meta ad click', () => {
  it('reads the ad off a Baileys message of any type', () => {
    const ad = (extra) => ({ contextInfo: { externalAdReply: { title: 'Spiti Valley', body: 'Book now', sourceType: 'ad', sourceUrl: 'https://fb.me/x', ...extra } } });

    expect(adReferral.fromBaileys({ extendedTextMessage: { text: 'hi', ...ad() } })).toMatchObject({ headline: 'Spiti Valley', kind: 'ad' });
    expect(adReferral.fromBaileys({ imageMessage: { caption: 'x', ...ad() } })).toMatchObject({ headline: 'Spiti Valley' });
    expect(adReferral.fromBaileys({ conversation: 'hi', extendedTextMessage: { ...ad({ sourceType: 'post' }) } })).toMatchObject({ kind: 'post' });
  });

  it('accepts a click id as proof even without a source type', () => {
    const raw = { extendedTextMessage: { contextInfo: { externalAdReply: { title: 'Goa', ctwaClid: 'abc123' } } } };
    expect(adReferral.fromBaileys(raw)).toMatchObject({ headline: 'Goa', clickId: 'abc123' });
  });

  it('does not mistake an ordinary link preview for an ad', () => {
    const raw = { extendedTextMessage: { text: 'look', contextInfo: { externalAdReply: { title: 'A blog post', sourceType: 'link', sourceUrl: 'https://blog.example' } } } };
    expect(adReferral.fromBaileys(raw)).toBeNull();
    expect(adReferral.fromBaileys({ conversation: 'hi' })).toBeNull();
    expect(adReferral.fromBaileys(null)).toBeNull();
  });

  it('reads the Cloud API referral', () => {
    expect(adReferral.fromCloud({ headline: 'Kerala Backwaters', body: 'Offer', source_url: 'https://fb.me/k', source_type: 'ad', source_id: '9', ctwa_clid: 'c' }))
      .toMatchObject({ headline: 'Kerala Backwaters', url: 'https://fb.me/k', clickId: 'c' });
    expect(adReferral.fromCloud(undefined)).toBeNull();
  });
});

describe('WhatsApp leads from ads and personal contacts', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  describe('a message that came from a Meta ad', () => {
    it('becomes a Meta Ads lead on the advertised trip, with the ad on its timeline', async () => {
      await inbound(tenant.tenantId, { ad: AD });

      const [lead] = await leadsOf(tenant.tenantId);
      expect(lead).toMatchObject({ source: 'Meta Ads', interest: 'Chopta Tungnath Trek', customer_name: 'Sneha' });
      expect(lead.notes).toContain('Ad: Chopta Tungnath Trek');

      const { rows } = await query('SELECT note FROM follow_up_logs WHERE lead_id = $1', [lead.id]);
      expect(rows[0].note).toBe('Started this chat from a Meta ad: "Chopta Tungnath Trek"');
    });

    it('is an ordinary WhatsApp lead when there is no ad', async () => {
      await inbound(tenant.tenantId);
      expect((await leadsOf(tenant.tenantId))[0]).toMatchObject({ source: 'WhatsApp Inbound', interest: '' });
    });

    it('notes the ad on a customer who already has a lead, and leaves the lead alone', async () => {
      await inbound(tenant.tenantId); // first contact, no ad
      await query('DELETE FROM whatsapp_chats WHERE tenant_id = $1', [tenant.tenantId]);

      await inbound(tenant.tenantId, { ad: AD });

      const leads = await leadsOf(tenant.tenantId);
      expect(leads).toHaveLength(1);
      expect(leads[0].source).toBe('WhatsApp Inbound');
      const { rows } = await query('SELECT note FROM follow_up_logs WHERE lead_id = $1', [leads[0].id]);
      expect(rows.map((r) => r.note)).toContain('Started this chat from a Meta ad: "Chopta Tungnath Trek"');
    });
  });

  describe('numbers saved in the agent\'s phone', () => {
    const remember = (...contacts) => service.rememberAddressBook({}, tenant.tenantId, contacts);

    it('remembers a contact the agent named, and ignores one that only named itself', async () => {
      await remember(
        { id: '919876502222@s.whatsapp.net', name: 'Mom' },
        { id: '919876503333@s.whatsapp.net', notify: 'Rohit' },
      );

      expect(await repo.isSavedContact(tenant.tenantId, '919876502222')).toBe(true);
      expect(await repo.isSavedContact(tenant.tenantId, '9876502222')).toBe(true); // however the number is written
      expect(await repo.isSavedContact(tenant.tenantId, '919876503333')).toBe(false);
    });

    it('reads the number from phoneNumber for a @lid contact and skips an unmapped one', async () => {
      await remember(
        { id: '152076403384350@lid', phoneNumber: '919876504444@s.whatsapp.net', name: 'Dad' },
        { id: '999999999999999@lid', name: 'Unknown' },
      );
      expect(await repo.isSavedContact(tenant.tenantId, '919876504444')).toBe(true);
      expect(await repo.countSavedContacts(tenant.tenantId)).toBe(1);
    });

    it('ignores groups and broadcast lists', async () => {
      await remember({ id: '120363000000@g.us', name: 'Family' }, { id: 'status@broadcast', name: 'Status' });
      expect(await repo.countSavedContacts(tenant.tenantId)).toBe(0);
    });

    it('still makes a lead for a saved contact until the agency turns the setting on', async () => {
      await remember({ id: '919876501111@s.whatsapp.net', name: 'Sneha (saved)' });

      await inbound(tenant.tenantId);

      expect(await leadsOf(tenant.tenantId)).toHaveLength(1);
      expect(await chatsOf(tenant.tenantId)).toHaveLength(1);
    });

    it('makes no lead and no chat for a saved contact once the setting is on', async () => {
      await remember({ id: '919876501111@s.whatsapp.net', name: 'Mom' });
      await repo.setIgnoreSavedContacts(tenant.tenantId, true);

      await inbound(tenant.tenantId);

      expect(await leadsOf(tenant.tenantId)).toHaveLength(0);
      expect(await chatsOf(tenant.tenantId)).toHaveLength(0);
    });

    it('still makes a lead for a number that is not saved', async () => {
      await remember({ id: '919876502222@s.whatsapp.net', name: 'Mom' });
      await repo.setIgnoreSavedContacts(tenant.tenantId, true);

      await inbound(tenant.tenantId); // 919876501111 is not in the address book

      expect(await leadsOf(tenant.tenantId)).toHaveLength(1);
    });

    it('never drops a customer the CRM already knows, even if the agent saved their number', async () => {
      await inbound(tenant.tenantId); // already a lead and a chat
      await remember({ id: '919876501111@s.whatsapp.net', name: 'Sneha Goa' });
      await repo.setIgnoreSavedContacts(tenant.tenantId, true);

      await inbound(tenant.tenantId, { messageText: 'Any update?' });

      const { rows } = await query(
        `SELECT m.message_text FROM whatsapp_messages m JOIN whatsapp_chats c ON c.id = m.chat_id WHERE c.tenant_id = $1`,
        [tenant.tenantId]
      );
      expect(rows.map((r) => r.message_text)).toContain('Any update?');
      expect(await leadsOf(tenant.tenantId)).toHaveLength(1);
    });

    it('lets an ad click through even from a saved contact', async () => {
      await remember({ id: '919876501111@s.whatsapp.net', name: 'Cousin' });
      await repo.setIgnoreSavedContacts(tenant.tenantId, true);

      await inbound(tenant.tenantId, { ad: AD });

      expect((await leadsOf(tenant.tenantId))[0].source).toBe('Meta Ads');
    });

    it('keeps one agency\'s address book away from another\'s', async () => {
      const other = await createTenant();
      await remember({ id: '919876501111@s.whatsapp.net', name: 'Mom' });
      expect(await repo.isSavedContact(other.tenantId, '919876501111')).toBe(false);
    });

    it('reports the setting and the count on the overview', async () => {
      await remember({ id: '919876502222@s.whatsapp.net', name: 'Mom' });
      await repo.setIgnoreSavedContacts(tenant.tenantId, true);

      const overview = await service.getConnectionOverview(tenant.tenantId);
      expect(overview.leads).toEqual({ ignoreSavedContacts: true, savedContacts: 1 });
    });
  });
});
