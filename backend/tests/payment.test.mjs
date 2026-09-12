import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { db, appRequire, helpers } from './app.mjs';

const { query } = db;
const paymentService = appRequire('../services/paymentService');
const paymentController = appRequire('../controllers/paymentController');
const paymentRepository = appRequire('../repositories/paymentRepository');
const env = appRequire('../config/env');
const { createTenant, resetTenantData, unique } = helpers;

/**
 * Money moving without a client-visible mistake is the whole job here.
 *
 * Every test below either reproduces an incident this project already had
 * (a cheap plan silently replacing an active expensive one, the amount
 * coming from the browser instead of the price list) or documents a gap
 * that is still open (the webhook route accepting an unsigned payload) so
 * it cannot be tightened without a test noticing.
 */

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

function signRazorpay(orderId, paymentId, secret = env.razorpayKeySecret) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

describe('Payments', () => {
  beforeEach(async () => {
    await resetTenantData();
  });

  describe('signature verification', () => {
    it('accepts a signature computed with the real secret', () => {
      const orderId = 'order_1';
      const paymentId = 'pay_1';
      const signature = signRazorpay(orderId, paymentId);
      expect(
        paymentService.verifyPaymentSignature({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        })
      ).toBe(true);
    });

    it('rejects a tampered signature', () => {
      expect(
        paymentService.verifyPaymentSignature({
          razorpay_order_id: 'order_1',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: 'not-the-real-one',
        })
      ).toBe(false);
    });

    it('rejects when a field is missing rather than treating it as unsigned-but-ok', () => {
      expect(paymentService.verifyPaymentSignature({ razorpay_order_id: 'order_1' })).toBe(false);
    });

    it('verifies a webhook body the same way, and rejects a tampered one', () => {
      const rawBody = JSON.stringify({ event: 'payment.captured' });
      const signature = crypto.createHmac('sha256', env.razorpayKeySecret).update(rawBody).digest('hex');
      expect(paymentService.verifyWebhookSignature(rawBody, signature, env.razorpayKeySecret)).toBe(true);
      expect(paymentService.verifyWebhookSignature(rawBody, 'wrong', env.razorpayKeySecret)).toBe(false);
    });
  });

  describe('opening a subscription order', () => {
    it('refuses an unrecognised plan before any charge is created', async () => {
      const tenant = await createTenant({ planId: 'FREE' });
      await expect(
        paymentService.createSubscriptionOrder(tenant.tenantId, tenant.userId, 'NOT_A_PLAN')
      ).rejects.toMatchObject({ status: 400 });
    });

    it('refuses to open a cheaper order while a better plan is still active', async () => {
      // createTenant() defaults to an active PRO plan (rank 2). SOLO (rank 1)
      // must be refused - this is the exact incident that put the guard here:
      // a SOLO payment once replaced an active PRO plan outright.
      const tenant = await createTenant();
      await expect(
        paymentService.createSubscriptionOrder(tenant.tenantId, tenant.userId, 'SOLO')
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('completing a payment', () => {
    it('upgrades the tenant and returns a fresh token', async () => {
      const tenant = await createTenant({ planId: 'FREE' });
      const orderId = unique('order');
      await paymentRepository.createPaymentRecord({
        tenantId: tenant.tenantId, userId: tenant.userId, orderId, planId: 'PRO', amount: 249900,
      });

      const result = await paymentService.completePaymentAndUpgrade({
        tenantId: tenant.tenantId,
        userId: tenant.userId,
        orderId,
        paymentId: unique('pay'),
        signature: 'sig',
      });

      expect(result.token).toBeTruthy();
      expect(result.user.planId).toBe('PRO');

      const { rows } = await query('SELECT plan_id FROM tenants WHERE id = $1', [tenant.tenantId]);
      expect(rows[0].plan_id).toBe('PRO');

      const paid = await query('SELECT status, payment_id FROM payments WHERE order_id = $1', [orderId]);
      expect(paid.rows[0].status).toBe('captured');
      expect(paid.rows[0].payment_id).toBeTruthy();
    });

    it('records the payment but leaves a better active plan unchanged', async () => {
      const tenant = await createTenant(); // active PRO
      const orderId = unique('order');
      await paymentRepository.createPaymentRecord({
        tenantId: tenant.tenantId, userId: tenant.userId, orderId, planId: 'SOLO', amount: 99900,
      });

      const result = await paymentService.completePaymentAndUpgrade({
        tenantId: tenant.tenantId,
        userId: tenant.userId,
        orderId,
        paymentId: unique('pay'),
      });

      expect(result.unchanged).toBe(true);
      expect(result.token).toBeUndefined();

      const { rows } = await query('SELECT plan_id FROM tenants WHERE id = $1', [tenant.tenantId]);
      expect(rows[0].plan_id).toBe('PRO');
    });

    it('trusts the order\'s own plan over a different one the caller supplies', async () => {
      // A caller could open a SOLO order, pay it, then call verify with
      // planId: 'PRO'. The order row is what gets charged, so it - not the
      // request - decides which plan is granted.
      const tenant = await createTenant({ planId: 'FREE' });
      const orderId = unique('order');
      await paymentRepository.createPaymentRecord({
        tenantId: tenant.tenantId, userId: tenant.userId, orderId, planId: 'SOLO', amount: 99900,
      });

      const result = await paymentService.completePaymentAndUpgrade({
        tenantId: tenant.tenantId,
        userId: tenant.userId,
        orderId,
        paymentId: unique('pay'),
        planId: 'PRO', // bait-and-switch attempt
      });

      expect(result.user.planId).toBe('SOLO');
    });

    it('throws when the payment cannot be matched to any real plan', async () => {
      const tenant = await createTenant({ planId: 'FREE' });
      await expect(
        paymentService.completePaymentAndUpgrade({
          tenantId: tenant.tenantId,
          userId: tenant.userId,
          orderId: 'never-existed',
          paymentId: 'x',
          planId: 'GARBAGE',
        })
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('verifySubscription (the /verify route)', () => {
    it('rejects when required fields are missing', async () => {
      const tenant = await createTenant({ planId: 'FREE' });
      const req = { body: {}, user: { tenantId: tenant.tenantId, userId: tenant.userId } };
      const res = mockRes();
      await paymentController.verifySubscription(req, res, () => {});
      expect(res.statusCode).toBe(400);
    });

    it('rejects a bad signature and marks the payment failed', async () => {
      const tenant = await createTenant({ planId: 'FREE' });
      const orderId = unique('order');
      await paymentRepository.createPaymentRecord({
        tenantId: tenant.tenantId, userId: tenant.userId, orderId, planId: 'PRO', amount: 249900,
      });

      const req = {
        body: { razorpay_order_id: orderId, razorpay_payment_id: 'pay_x', razorpay_signature: 'wrong', planId: 'PRO' },
        user: { tenantId: tenant.tenantId, userId: tenant.userId },
      };
      const res = mockRes();
      await paymentController.verifySubscription(req, res, () => {});

      expect(res.statusCode).toBe(400);
      const { rows } = await query('SELECT status FROM payments WHERE order_id = $1', [orderId]);
      expect(rows[0].status).toBe('failed');
    });

    it('upgrades on a correctly signed payment and returns a token', async () => {
      const tenant = await createTenant({ planId: 'FREE' });
      const orderId = unique('order');
      await paymentRepository.createPaymentRecord({
        tenantId: tenant.tenantId, userId: tenant.userId, orderId, planId: 'PRO', amount: 249900,
      });
      const paymentId = unique('pay');
      const signature = signRazorpay(orderId, paymentId);

      const req = {
        body: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, planId: 'PRO' },
        user: { tenantId: tenant.tenantId, userId: tenant.userId },
      };
      const res = mockRes();
      await paymentController.verifySubscription(req, res, () => {});

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.planChanged).not.toBe(false);
    });
  });

  describe('the Razorpay webhook', () => {
    it('upgrades the tenant for a known order on order.paid', async () => {
      const tenant = await createTenant({ planId: 'FREE' });
      const orderId = unique('order');
      await paymentRepository.createPaymentRecord({
        tenantId: tenant.tenantId, userId: tenant.userId, orderId, planId: 'PRO', amount: 249900,
      });

      const req = {
        headers: { 'x-razorpay-signature': 'irrelevant-see-next-test' },
        rawBody: undefined,
        body: {
          event: 'order.paid',
          payload: { order: { entity: { id: orderId } }, payment: { entity: { id: unique('pay') } } },
        },
      };
      const res = mockRes();
      await paymentController.handleRazorpayWebhook(req, res);

      expect(res.statusCode).toBe(200);
      const { rows } = await query('SELECT plan_id FROM tenants WHERE id = $1', [tenant.tenantId]);
      expect(rows[0].plan_id).toBe('PRO');
    });

    it('marks a payment failed on payment.failed', async () => {
      const tenant = await createTenant({ planId: 'FREE' });
      const orderId = unique('order');
      await paymentRepository.createPaymentRecord({
        tenantId: tenant.tenantId, userId: tenant.userId, orderId, planId: 'SOLO', amount: 99900,
      });

      const req = {
        headers: {},
        rawBody: undefined,
        body: { event: 'payment.failed', payload: { payment: { entity: { order_id: orderId, id: unique('pay') } } } },
      };
      const res = mockRes();
      await paymentController.handleRazorpayWebhook(req, res);

      expect(res.statusCode).toBe(200);
      const { rows } = await query('SELECT status FROM payments WHERE order_id = $1', [orderId]);
      expect(rows[0].status).toBe('failed');
    });

    it('KNOWN GAP: a webhook with no signature header is processed instead of refused', async () => {
      // handleRazorpayWebhook only verifies when `signature && req.rawBody`
      // are both present; neither is set here, and verification is skipped
      // rather than the request being rejected. If this guard is tightened to
      // refuse an unsigned webhook, this test's expectation of a plan change
      // should flip to expecting a 400 - that is the point of writing it down.
      const tenant = await createTenant({ planId: 'FREE' });
      const orderId = unique('order');
      await paymentRepository.createPaymentRecord({
        tenantId: tenant.tenantId, userId: tenant.userId, orderId, planId: 'SOLO', amount: 99900,
      });

      const req = {
        headers: {}, // no x-razorpay-signature
        rawBody: undefined, // no captured raw body
        body: {
          event: 'order.paid',
          payload: { order: { entity: { id: orderId } }, payment: { entity: { id: unique('pay') } } },
        },
      };
      const res = mockRes();
      await paymentController.handleRazorpayWebhook(req, res);

      expect(res.statusCode).toBe(200);
      const { rows } = await query('SELECT plan_id FROM tenants WHERE id = $1', [tenant.tenantId]);
      expect(rows[0].plan_id).toBe('SOLO');
    });

    it('ignores an event for an order it has never seen', async () => {
      const req = {
        headers: {},
        rawBody: undefined,
        body: { event: 'order.paid', payload: { order: { entity: { id: 'no-such-order' } }, payment: { entity: { id: 'x' } } } },
      };
      const res = mockRes();
      await paymentController.handleRazorpayWebhook(req, res);
      expect(res.statusCode).toBe(200); // Razorpay still gets a 200 so it stops retrying
    });
  });
});
