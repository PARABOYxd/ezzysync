// Pure-function tests for landing/src/lib. Run: npm run test:landing:unit
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDemoForm } from '../../../landing/src/lib/validation.js';
import { getCrmUrl, getTrialUrl, getLoginUrl } from '../../../landing/src/lib/crmUrl.js';
import { waLink, WHATSAPP_NUMBER } from '../../../landing/src/lib/contact.js';
import { rateLimit, clientIp } from '../../../landing/src/lib/rateLimit.js';

const ok = { name: 'Asha', agency: 'Apex', email: 'a@b.co', phone: '' };

test('validateDemoForm: valid form has no errors', () => {
  assert.deepEqual(validateDemoForm(ok), {});
});

test('validateDemoForm: required fields, whitespace counts as empty', () => {
  const e = validateDemoForm({ name: ' ', agency: '\t', email: '  ', phone: '' });
  assert.deepEqual(Object.keys(e).sort(), ['agency', 'email', 'name']);
});

test('validateDemoForm: emails', () => {
  for (const bad of ['x', 'a@b', '@b.co', 'a b@c.co', 'a@@b.co']) {
    assert.ok(validateDemoForm({ ...ok, email: bad }).email, bad);
  }
  for (const good of ['a@b.co', 'first.last+tag@sub.domain.in']) {
    assert.equal(validateDemoForm({ ...ok, email: good }).email, undefined, good);
  }
});

test('validateDemoForm: phone counts digits, not punctuation', () => {
  for (const good of ['9876543210', '+91 98765 43210', '+91-98765-43210', '+91 (98765) 43210', '(022) 2345 6789']) {
    assert.equal(validateDemoForm({ ...ok, phone: good }).phone, undefined, good);
  }
  for (const bad of ['123', '123456', '1234567890123456', 'abcdefgh', '98765x43210']) {
    assert.ok(validateDemoForm({ ...ok, phone: bad }).phone, bad);
  }
});

test('crmUrl: always has a protocol, trial/login paths', () => {
  const prev = process.env.NEXT_PUBLIC_CRM_URL;
  process.env.NEXT_PUBLIC_CRM_URL = 'app.ezzysync.com';
  assert.equal(getCrmUrl(), 'https://app.ezzysync.com');
  assert.equal(getTrialUrl(), 'https://app.ezzysync.com/register');
  assert.equal(getLoginUrl(), 'https://app.ezzysync.com/login');
  process.env.NEXT_PUBLIC_CRM_URL = 'http://localhost:5173';
  assert.equal(getCrmUrl(), 'http://localhost:5173');
  if (prev === undefined) delete process.env.NEXT_PUBLIC_CRM_URL; else process.env.NEXT_PUBLIC_CRM_URL = prev;
});

test('waLink: encodes the message, bare link without one', () => {
  assert.equal(waLink(), `https://wa.me/${WHATSAPP_NUMBER}`);
  const u = new URL(waLink('Hi & bye #1\nline2 🌴'));
  assert.equal(u.searchParams.get('text'), 'Hi & bye #1\nline2 🌴');
});

test('rateLimit: allows `limit` calls, then blocks with a retry time, per key', () => {
  const key = `t-${Math.random()}`;
  const opt = { limit: 3, windowMs: 60_000 };
  for (let i = 0; i < 3; i++) assert.equal(rateLimit(key, opt).ok, true);
  const blocked = rateLimit(key, opt);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter >= 1 && blocked.retryAfter <= 60);
  assert.equal(rateLimit(`other-${key}`, opt).ok, true);
});

test('rateLimit: window expires', async () => {
  const key = `t-${Math.random()}`;
  const opt = { limit: 1, windowMs: 50 };
  assert.equal(rateLimit(key, opt).ok, true);
  assert.equal(rateLimit(key, opt).ok, false);
  await new Promise((r) => setTimeout(r, 70));
  assert.equal(rateLimit(key, opt).ok, true);
});

test('clientIp: first hop of x-forwarded-for, else x-real-ip', () => {
  const h = (o) => ({ headers: { get: (k) => o[k] ?? null } });
  assert.equal(clientIp(h({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })), '1.2.3.4');
  assert.equal(clientIp(h({ 'x-real-ip': '9.9.9.9' })), '9.9.9.9');
  assert.equal(clientIp(h({})), 'unknown');
});
