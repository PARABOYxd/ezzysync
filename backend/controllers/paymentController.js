const env = require('../config/env');
const paymentService = require('../services/paymentService');
const paymentRepository = require('../repositories/paymentRepository');

async function createSubscriptionOrder(req, res, next) {
  try {
    // Only the plan comes from the browser. The amount used to come with it,
    // which meant the customer chose what to pay - the service now prices the
    // order itself from the plan catalog.
    const { planId } = req.body;
    const order = await paymentService.createSubscriptionOrder(req.user.tenantId, req.user.userId, planId);
    res.json(order);
  } catch (err) {
    // A missing/unknown plan or downgrade refusal is the caller's mistake and
    // says so plainly; anything else is Razorpay-shaped and gets parsed by
    // the service, which knows what that SDK's errors look like.
    if (!(err.status && err.status < 500)) {
      req.log?.error({ err, apiResponse: err.response?.data || err.error }, 'Error creating subscription order');
    }
    const shaped = paymentService.describeOrderCreationError(err);
    res.status(shaped.status).json(shaped.code ? { message: shaped.message, code: shaped.code } : { message: shaped.message });
  }
}

async function verifySubscription(req, res, next) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing required payment verification parameters.' });
    }

    const verified = paymentService.verifyPaymentSignature({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    });

    if (!verified) {
      req.log?.warn({ razorpay_order_id, razorpay_payment_id }, 'Payment signature verification failed');
      await paymentRepository.updatePaymentFailed({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        rawResponse: { error: 'Signature mismatch' },
      });
      return res.status(400).json({ message: 'Invalid payment signature. Verification failed.' });
    }

    const targetPlan = planId === 'SOLO' ? 'SOLO' : 'PRO';
    const upgrade = await paymentService.completePaymentAndUpgrade({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      planId: targetPlan,
      rawResponse: req.body,
    });

    if (!upgrade) {
      return res.status(404).json({ message: 'User not found after upgrade.' });
    }

    // The service refused to move an active tenant onto a lower plan. The
    // payment is captured and recorded; nothing about their access changed,
    // so there is no new token to hand back.
    if (upgrade.unchanged) {
      req.log?.warn({ razorpay_order_id, plan: targetPlan }, 'Downgrade payment received; plan left unchanged');
      return res.json({ success: true, message: upgrade.message, planChanged: false });
    }

    req.log?.info({ razorpay_order_id, razorpay_payment_id, plan: targetPlan }, 'Tenant plan upgraded successfully');
    res.json({
      success: true,
      message: `Plan upgraded to ${targetPlan === 'SOLO' ? 'Solo Agent' : 'Agency Growth Pro'} successfully!`,
      token: upgrade.token,
      user: upgrade.user,
    });
  } catch (err) {
    req.log?.error({ err }, 'Error verifying subscription payment');
    res.status(500).json({ message: 'Failed to verify payment subscription.' });
  }
}

/**
 * Razorpay Webhook Handler (POST /api/payments/webhook)
 * Listens for payment.captured, order.paid, payment.failed from Razorpay server
 */
async function handleRazorpayWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const event = req.body.event;
    const payload = req.body.payload;

    req.log?.info({ event, orderId: payload?.order?.entity?.id }, 'Razorpay Webhook received');

    if (signature && req.rawBody) {
      const isValid = paymentService.verifyWebhookSignature(req.rawBody, signature, env.razorpayWebhookSecret);
      if (!isValid) {
        req.log?.warn('Razorpay webhook signature verification failed');
        return res.status(400).json({ message: 'Invalid webhook signature.' });
      }
    }

    const result = await paymentService.processWebhookEvent({ event, payload, rawResponse: req.body });
    if (result?.upgraded) {
      req.log?.info({ orderId: result.orderId, tenantId: result.tenantId }, 'Webhook successfully upgraded tenant plan');
    } else if (event === 'refund.processed' || event === 'refund.created') {
      req.log?.info({ paymentId: result?.paymentId }, 'Webhook marked payment as refunded');
    }

    res.json({ status: 'ok' });
  } catch (err) {
    req.log?.error({ err }, 'Error handling Razorpay webhook');
    res.status(500).json({ message: 'Webhook processing error' });
  }
}

module.exports = {
  createSubscriptionOrder,
  verifySubscription,
  handleRazorpayWebhook,
};
