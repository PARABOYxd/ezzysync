const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('../config/env');
const planRepository = require('../repositories/planRepository');
const userRepository = require('../repositories/userRepository');
const paymentRepository = require('../repositories/paymentRepository');
const tokenService = require('./tokenService');

const PLAN_PRICES_PAISE = {
  SOLO: 99900,   // ₹999.00 in paise
  PRO: 249900,   // ₹2,499.00 in paise
};

function getRazorpayInstance() {
  return new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret,
  });
}

async function createSubscriptionOrder(tenantId, userId, planId = 'PRO', customAmount = null) {
  const finalPlan = planId === 'SOLO' ? 'SOLO' : 'PRO';
  const amount = customAmount ? Math.round(Number(customAmount) * 100) : (PLAN_PRICES_PAISE[finalPlan] || 249900);
  if (amount < 100) {
    throw new Error('Minimum order amount must be at least 100 paise.');
  }

  const receipt = `sub_${finalPlan.toLowerCase()}_${tenantId.substring(0, 8)}_${Date.now()}`;

  const razorpay = getRazorpayInstance();
  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt,
    notes: {
      tenantId,
      userId: userId || '',
      planId: finalPlan,
    },
  });

  // Record order in payments table
  await paymentRepository.createPaymentRecord({
    tenantId,
    userId,
    orderId: order.id,
    planId: finalPlan,
    amount,
    currency: 'INR',
  });

  return {
    ...order,
    key_id: env.razorpayKeyId,
    planId: finalPlan,
  };
}

/**
 * Validates HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET) matches razorpay_signature.
 */
function verifyPaymentSignature({ razorpay_payment_id, razorpay_order_id, razorpay_signature }) {
  if (!razorpay_signature || !razorpay_order_id || !razorpay_payment_id) return false;

  const generatedSignature = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  return generatedSignature === razorpay_signature;
}

/**
 * Validates Webhook Signature from Razorpay header
 */
function verifyWebhookSignature(rawBody, signature, webhookSecret) {
  if (!signature || !rawBody) return false;
  const secret = webhookSecret || env.razorpayKeySecret;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return expectedSignature === signature;
}

/**
 * Moves the tenant onto the chosen plan (SOLO or PRO), marks payment captured, and mints a fresh token.
 */
async function completePaymentAndUpgrade({ tenantId, userId, orderId, paymentId, signature, planId = 'PRO', rawResponse = null }) {
  const finalPlan = planId === 'SOLO' ? 'SOLO' : 'PRO';

  // 1. Update payments table
  if (orderId) {
    await paymentRepository.updatePaymentSuccess({
      orderId,
      paymentId,
      signature,
      rawResponse,
    });
  }

  // 2. Set tenant plan in DB
  await planRepository.setTenantPlan(tenantId, finalPlan);

  // 3. Fetch fresh user & mint updated token
  const userRow = userId ? await userRepository.findUserWithTenantById(userId) : await userRepository.findUserById(tenantId);
  if (!userRow) return null;

  const user = {
    userId: userRow.id,
    tenantId: userRow.tenant_id,
    email: userRow.email,
    name: userRow.name,
    role: userRow.role,
    permissions: userRow.permissions || null,
    companyName: userRow.company_name || '',
    planId: userRow.plan_id || finalPlan,
  };

  return { user, token: tokenService.signAccessToken(user) };
}

module.exports = {
  createSubscriptionOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  completePaymentAndUpgrade,
  upgradeTenantPlan: (tId, uId, pId) => completePaymentAndUpgrade({ tenantId: tId, userId: uId, planId: pId }),
};
