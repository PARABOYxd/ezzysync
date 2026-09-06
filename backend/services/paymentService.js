const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('../config/env');
const planRepository = require('../repositories/planRepository');
const userRepository = require('../repositories/userRepository');
const paymentRepository = require('../repositories/paymentRepository');
const tokenService = require('./tokenService');
const { getPlanPricePaise, getPurchasablePlanIds } = require('../config/planCatalog');

function getRazorpayInstance() {
  return new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret,
  });
}

/**
 * Opens a Razorpay order for one of the plans in the catalog.
 *
 * The plan id has to name a real plan. It used to be coerced with
 * `planId === 'SOLO' ? 'SOLO' : 'PRO'`, so anything unrecognised - including
 * nothing at all - quietly became the most expensive plan. That is how a
 * button reading "Upgrade for ₹999" ended up opening a ₹2,499 checkout: the
 * caller sent no planId and this line picked one for it. Now an unusable
 * planId is refused, loudly, before any money is involved.
 *
 * The amount is never taken from the caller either. It is read from the
 * catalog, which is the same table Razorpay is charged from and the frontend
 * prints its prices from, so the number on the button and the number on the
 * card cannot disagree.
 */
async function createSubscriptionOrder(tenantId, userId, planId) {
  const finalPlan = typeof planId === 'string' ? planId.trim().toUpperCase() : '';
  const amount = getPlanPricePaise(finalPlan);

  if (amount === null) {
    const err = new Error(
      `Choose a plan to continue. Available plans: ${getPurchasablePlanIds().join(', ')}.`
    );
    err.status = 400;
    throw err;
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
 * Moves the tenant onto the plan they actually paid for, marks the payment
 * captured, and mints a fresh token carrying the new plan.
 *
 * The plan is read back from the order row rather than trusted from the
 * request. Both are sent by the browser at this point, and they do not have to
 * agree: a caller could open a ₹999 SOLO order, pay it, and then verify with
 * `planId: 'PRO'` to land on the ₹2,499 plan. Taking the plan from the order
 * that Razorpay actually charged closes that. The request's planId is only a
 * fallback for older order rows that predate the column being populated.
 */
async function completePaymentAndUpgrade({ tenantId, userId, orderId, paymentId, signature, planId = null, rawResponse = null }) {
  const paidOrder = orderId ? await paymentRepository.findPaymentByOrderId(orderId) : null;
  const finalPlan = paidOrder?.plan_id || planId;

  if (!finalPlan || getPlanPricePaise(finalPlan) === null) {
    const err = new Error('That payment could not be matched to a plan. Please contact support.');
    err.status = 400;
    throw err;
  }

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
