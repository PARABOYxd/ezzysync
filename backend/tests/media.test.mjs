import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { db, appRequire, helpers } from './app.mjs';

const { query } = db;
const r2 = appRequire('../services/r2Service');
const repo = appRequire('../repositories/whatsappWebRepository');
const sendService = appRequire('../services/whatsappSendService');
const windowService = appRequire('../services/whatsappWindowService');
const { createTenant, resetTenantData } = helpers;

/** Pulls key/exp/sig back out of a link the way the /media route receives them. */
function parts(link) {
  const url = new URL(link);
  return {
    key: decodeURIComponent(url.pathname.replace(/^\/media\//, '')),
    exp: url.searchParams.get('exp'),
    sig: url.searchParams.get('sig'),
  };
}

async function readAll(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/**
 * Customer documents - passports, tickets, vouchers - used to be stored at
 * permanent public URLs. Anyone a link reached could open it, forever.
 */
describe('private customer documents', () => {
  afterEach(() => vi.useRealTimers());

  it('stores a reference, not a public URL', async () => {
    const ref = await r2.uploadPrivateFile(Buffer.from('%PDF-1.4 test'), 'Voucher.pdf', 'application/pdf', 'tests/private');
    expect(ref.startsWith(r2.PRIVATE_PREFIX)).toBe(true);
    expect(ref).not.toMatch(/^https?:/);
  });

  it('serves the file through a signed link', async () => {
    const body = Buffer.from('%PDF-1.4 signed');
    const ref = await r2.uploadPrivateFile(body, 'Voucher.pdf', 'application/pdf', 'tests/private');
    const { key, exp, sig } = parts(r2.resolveMediaUrl(ref));

    expect(r2.verifyMediaLink(key, exp, sig)).toBe(true);
    const file = await r2.openPrivateFile(key);
    expect(file.contentType).toBe('application/pdf');
    expect((await readAll(file.stream)).equals(body)).toBe(true);
  });

  it('keeps the same link for the hour, so the polling inbox does not reload images', async () => {
    const ref = await r2.uploadPrivateFile(Buffer.from('x'), 'a.pdf', 'application/pdf', 'tests/private');
    expect(r2.resolveMediaUrl(ref)).toBe(r2.resolveMediaUrl(ref));
  });

  it('refuses a tampered signature, a swapped file, and an expired link', async () => {
    const ref = await r2.uploadPrivateFile(Buffer.from('x'), 'a.pdf', 'application/pdf', 'tests/private');
    const { key, exp, sig } = parts(r2.resolveMediaUrl(ref));

    expect(r2.verifyMediaLink(key, exp, `${sig.slice(0, -1)}A`)).toBe(false);
    expect(r2.verifyMediaLink('tests/private/someone-elses.pdf', exp, sig)).toBe(false);
    expect(r2.verifyMediaLink(key, String(Number(exp) + 3600000), sig)).toBe(false);

    vi.useFakeTimers();
    vi.setSystemTime(Number(exp) + 1);
    expect(r2.verifyMediaLink(key, exp, sig)).toBe(false);
  });

  it('cannot be pointed outside the storage folder', async () => {
    expect(r2.resolveMediaUrl(`${r2.PRIVATE_PREFIX}../.env`)).toBeNull();
    expect(await r2.openPrivateFile('../config/env.js')).toBeNull();
  });

  it('leaves older public links alone', () => {
    const old = 'https://cdn.example.com/whatsapp/inbound/images/abc.jpg';
    expect(r2.resolveMediaUrl(old)).toBe(old);
    expect(r2.resolveMediaUrl(null)).toBeNull();
  });
});

describe('chats the business starts', () => {
  let tenant;

  beforeEach(async () => {
    await resetTenantData();
    tenant = await createTenant();
  });

  it('adds the country code to a bare 10-digit number', () => {
    expect(sendService.toWhatsAppNumber('98765 43210')).toBe('919876543210');
    expect(sendService.toWhatsAppNumber('09876543210')).toBe('919876543210');
    expect(sendService.toWhatsAppNumber('+91 98765 43210')).toBe('919876543210');
  });

  it('does not pretend the customer wrote in', async () => {
    // A chat we opened has no 24-hour window. Marking it open let a Meta send
    // through the check, and Meta then refused it.
    const chat = await repo.createChat(tenant.tenantId, {
      phone: '919876511111', jid: '919876511111@s.whatsapp.net', customerName: 'Voucher',
      leadId: null, lastMessage: '', aiEnabled: false, transport: 'cloud_api', openedByUs: true,
    });

    expect(chat.last_inbound_at).toBeNull();
    expect(chat.unread_count).toBe(0);
    expect(windowService.getWindowState(chat).isOpen).toBe(false);
  });

  it('does not close a window the customer already opened', async () => {
    await repo.createChat(tenant.tenantId, {
      phone: '919876522222', jid: 'x@s.whatsapp.net', customerName: 'Real',
      leadId: null, lastMessage: 'hi', aiEnabled: false, transport: 'cloud_api',
    });
    const again = await repo.createChat(tenant.tenantId, {
      phone: '919876522222', jid: 'x@s.whatsapp.net', customerName: 'Real',
      leadId: null, lastMessage: '', aiEnabled: false, transport: 'cloud_api', openedByUs: true,
    });

    expect(again.last_inbound_at).not.toBeNull();
    expect(windowService.getWindowState(again).isOpen).toBe(true);
  });

  it('uses Meta for a tenant that only has Meta connected', async () => {
    await query(
      `INSERT INTO settings (tenant_id, whatsapp_phone_number_id) VALUES ($1, '123456')
       ON CONFLICT (tenant_id) DO UPDATE SET whatsapp_phone_number_id = '123456'`,
      [tenant.tenantId]
    );

    const chat = await sendService.findOrStartChat(tenant.tenantId, { phone: '9876533333' });
    expect(chat.transport).toBe('cloud_api');
    expect(chat.phone).toBe('919876533333');
  });

  it('uses the QR link when it is connected', async () => {
    await query(
      `INSERT INTO whatsapp_sessions (tenant_id, status) VALUES ($1, 'connected')
       ON CONFLICT (tenant_id) DO UPDATE SET status = 'connected'`,
      [tenant.tenantId]
    );

    expect(await sendService.chooseTransportForNewChat(tenant.tenantId)).toBe('web');
  });
});
