import { describe, it, expect, beforeEach } from 'vitest';
import { appRequire, helpers } from './app.mjs';

const customerService = appRequire('../services/customerService');
const whatsappWebRepo = appRequire('../repositories/whatsappWebRepository');
const { createTenant, resetTenantData, unique } = helpers;

describe('Customers', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  describe('findByPhone', () => {
    it('finds an upserted customer by exact phone', async () => {
      const phone = unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1');
      await customerService.upsertFromContact(tenant.tenantId, { name: 'Asha Rao', email: 'asha@example.com', phone });

      const found = await customerService.findByPhone(tenant.tenantId, phone);
      expect(found).toBeTruthy();
      expect(found.name).toBe('Asha Rao');
      expect(found.email).toBe('asha@example.com');
    });

    it('matches a typed number without a country code against a stored one that has it - same convention as booking phone search', async () => {
      const local = unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1');
      await customerService.upsertFromContact(tenant.tenantId, { name: 'Rahul Kumar', email: '', phone: `91${local}` });

      const found = await customerService.findByPhone(tenant.tenantId, local);
      expect(found).toBeTruthy();
      expect(found.name).toBe('Rahul Kumar');
    });

    it('returns null for a phone nobody has', async () => {
      const found = await customerService.findByPhone(tenant.tenantId, '9999999999');
      expect(found).toBeNull();
    });

    it('returns null for an empty phone rather than matching everything', async () => {
      const found = await customerService.findByPhone(tenant.tenantId, '');
      expect(found).toBeNull();
    });

    it('is isolated per tenant', async () => {
      const other = await createTenant();
      const phone = unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1');
      await customerService.upsertFromContact(tenant.tenantId, { name: 'Asha Rao', email: '', phone });

      const found = await customerService.findByPhone(other.tenantId, phone);
      expect(found).toBeNull();
    });
  });

  describe('getProfile documents & media', () => {
    it('pulls WhatsApp media shared on this phone into the profile, with a resolved link', async () => {
      const phone = unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1');
      const customerId = await customerService.upsertFromContact(tenant.tenantId, { name: 'Asha Rao', email: '', phone });

      const chat = await whatsappWebRepo.createChat(tenant.tenantId, {
        phone, jid: `${phone}@s.whatsapp.net`, customerName: 'Asha', leadId: null, lastMessage: 'hi', aiEnabled: false,
      });
      await whatsappWebRepo.insertMessage(tenant.tenantId, {
        chatId: chat.id, messageId: `img_${unique('m')}`, direction: 'inbound', sender: 'customer',
        messageText: '', status: 'delivered', messageType: 'image', mediaUrl: 'private:whatsapp/some-image.jpg',
      });
      await whatsappWebRepo.insertMessage(tenant.tenantId, {
        chatId: chat.id, messageId: `txt_${unique('m')}`, direction: 'inbound', sender: 'customer',
        messageText: 'hello', status: 'delivered', messageType: 'text',
      });

      const profile = await customerService.getProfile(tenant.tenantId, customerId);
      expect(profile.media).toHaveLength(1);
      expect(profile.media[0].message_type).toBe('image');
      expect(profile.media[0].media_url).toBeTruthy();
      expect(profile.media[0].media_url).not.toBe('private:whatsapp/some-image.jpg');
    });

    it('returns an empty media list for a customer with no WhatsApp chat', async () => {
      const phone = unique('9').replace(/\D/g, '').slice(0, 10).padEnd(10, '1');
      const customerId = await customerService.upsertFromContact(tenant.tenantId, { name: 'No Chat', email: '', phone });

      const profile = await customerService.getProfile(tenant.tenantId, customerId);
      expect(profile.media).toEqual([]);
    });
  });
});
