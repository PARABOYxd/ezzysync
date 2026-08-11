const paymentService = require('../services/paymentService');

async function createSubscriptionOrder(req, res, next) {
  try {
    const order = await paymentService.createSubscriptionOrder(req.user.tenantId);
    res.json(order);
  } catch (err) {
    req.log.error({ err, apiResponse: err.response?.data }, 'Error creating subscription order');
    res.status(500).json({ message: 'Failed to initiate subscription payment.' });
  }
}

async function verifySubscription(req, res, next) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id) {
      return res.status(400).json({ message: 'Invalid payment verification parameters.' });
    }

    const verified = paymentService.verifyPaymentSignature({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    });

    if (!verified) {
      req.log.warn({ razorpay_order_id, razorpay_payment_id }, 'Payment signature verification failed');
      return res.status(400).json({ message: 'Payment signature verification failed.' });
    }

    const upgrade = await paymentService.upgradeTenantToPro(req.user.tenantId, req.user.userId);
    if (!upgrade) {
      return res.status(404).json({ message: 'User not found after upgrade.' });
    }

    req.log.info({ razorpay_order_id, razorpay_payment_id }, 'Tenant upgraded to Pro plan');
    res.json({
      success: true,
      message: 'Plan upgraded to Pro successfully!',
      token: upgrade.token,
      user: upgrade.user,
    });
  } catch (err) {
    req.log.error({ err }, 'Error verifying subscription payment');
    res.status(500).json({ message: 'Failed to verify payment subscription.' });
  }
}

module.exports = { createSubscriptionOrder, verifySubscription };
