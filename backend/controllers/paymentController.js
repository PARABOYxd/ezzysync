const paymentService = require('../services/paymentService');
const paymentRepository = require('../repositories/paymentRepository');

async function createSubscriptionOrder(req, res, next) {
  try {
    const { planId, amount } = req.body;
    const order = await paymentService.createSubscriptionOrder(req.user.tenantId, req.user.userId, planId, amount);
    res.json(order);
  } catch (err) {
    const errDesc = err.error?.description || err.response?.data?.error?.description || err.message;
    req.log?.error({ err, apiResponse: err.response?.data || err.error }, 'Error creating subscription order');
    
    if (err.statusCode === 401 || err.response?.status === 401 || errDesc === 'Authentication failed') {
      return res.status(401).json({
        message: 'Razorpay Authentication Failed: Please check your Key ID and Key Secret in Razorpay Dashboard (Settings > API Keys).',
        code: 'RAZORPAY_AUTH_FAILED',
      });
    }

    res.status(500).json({ 
      message: errDesc || 'Failed to initiate payment order.' 
    });
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

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (signature && req.rawBody) {
      const isValid = paymentService.verifyWebhookSignature(req.rawBody, signature, webhookSecret);
      if (!isValid) {
        req.log?.warn('Razorpay webhook signature verification failed');
        return res.status(400).json({ message: 'Invalid webhook signature.' });
      }
    }

    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentEntity = payload?.payment?.entity;
      const orderEntity = payload?.order?.entity;
      const orderId = orderEntity?.id || paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const existing = await paymentRepository.findPaymentByOrderId(orderId);
        if (existing) {
          await paymentService.completePaymentAndUpgrade({
            tenantId: existing.tenant_id,
            userId: existing.user_id,
            orderId,
            paymentId,
            planId: existing.plan_id,
            rawResponse: req.body,
          });
          req.log?.info({ orderId, tenantId: existing.tenant_id }, 'Webhook successfully upgraded tenant plan');
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (orderId) {
        await paymentRepository.updatePaymentFailed({
          orderId,
          paymentId: paymentEntity?.id,
          rawResponse: req.body,
        });
      }
    } else if (event === 'refund.processed' || event === 'refund.created') {
      const refundEntity = payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      if (paymentId) {
        await paymentRepository.updatePaymentStatusByPaymentId(paymentId, 'refunded', req.body);
        req.log?.info({ paymentId }, 'Webhook marked payment as refunded');
      }
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
