const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('../config/env');
const planRepository = require('../repositories/planRepository');
const userRepository = require('../repositories/userRepository');
const paymentRepository = require('../repositories/paymentRepository');
const tokenService = require('./tokenService');
const logger = require('../utils/logger').child({ module: 'payments' });
const { getPlanPricePaise, getPurchasablePlanIds, getPlanRank } = require('../config/planCatalog');
const planService = require('./planService');
const { ValidationError, ConflictError } = require('../errors/AppError');

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
    throw new ValidationError(
      `Choose a plan to continue. Available plans: ${getPurchasablePlanIds().join(', ')}.`
    );
  }

  // A cheaper plan must not quietly replace a better one that is still
  // running. Upgrade and downgrade used to be the same code path, so a
  // mis-click on the Solo card took the money and stripped an active Pro
  // tenant down to one login - which is exactly what happened to this
  // project's own account.
  //
  // Refused before the order exists, so nothing is charged for a change we
  // are not going to make. An expired plan is not blocked: at that point the
  // tenant is genuinely choosing again, and picking the cheaper plan is a
  // decision rather than an accident.
  const current = await planService.getTenantPlanLimits(tenantId);
  if (!current.isExpired && getPlanRank(current.id) > getPlanRank(finalPlan)) {
    throw new ConflictError(
      `You're already on ${current.name}, which includes more than this plan. ` +
        `Switching down would remove features you are currently using, so we don't do it automatically — ` +
        `email support@ezzysync.com and we'll move you across at the end of your paid month.`
    );
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
  // Constant-time, so the comparison does not leak how many leading
  // characters of a forged signature were right.
  const a = Buffer.from(expectedSignature);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
    throw new ValidationError('That payment could not be matched to a plan. Please contact support.');
  }

  // The same downgrade guard as at order creation, applied again here because
  // the two steps are separated by a trip through Razorpay - a tenant can
  // upgrade in another tab while a cheaper order sits open. The payment is
  // still recorded; the better plan simply stays, and this logs loudly so the
  // difference can be refunded or credited by hand.
  const existing = await planService.getTenantPlanLimits(tenantId);
  if (!existing.isExpired && getPlanRank(existing.id) > getPlanRank(finalPlan)) {
    logger.error(
      { tenantId, paidPlan: finalPlan, currentPlan: existing.id, orderId, paymentId },
      'Payment for a lower plan arrived while a better plan was active - plan left unchanged, needs manual resolution'
    );
    return {
      unchanged: true,
      message:
        `Payment received. You are still on ${existing.name}, which is the better plan — ` +
        `we have not moved you down. Email support@ezzysync.com and we'll sort out the difference.`,
    };
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

/**
 * Turns whatever shape the Razorpay SDK/API threw into the {status, message,
 * code} the controller responds with. Moved out of the controller verbatim -
 * an unrecognised-plan/downgrade error from createSubscriptionOrder above
 * already carries its own `.status < 500`, and is returned as-is (`code:
 * null`) rather than run through this Razorpay-specific parsing.
 */
function describeOrderCreationError(err) {
  if (err.status && err.status < 500) {
    return { status: err.status, message: err.message, code: null };
  }

  const errDesc = err.error?.description || err.response?.data?.error?.description || err.message;

  // 502, not 401: this is our Razorpay key being refused, not the user's
  // session, and the frontend treats any 401 as "session expired" - it would
  // refresh the token, retry, and eventually sign the user out.
  if (err.statusCode === 401 || err.response?.status === 401 || errDesc === 'Authentication failed') {
    return {
      status: 502,
      message: 'Razorpay Authentication Failed: Please check your Key ID and Key Secret in Razorpay Dashboard (Settings > API Keys).',
      code: 'RAZORPAY_AUTH_FAILED',
    };
  }

  // Razorpay itself was unreachable or refused the order. The caller logs the
  // detail; the browser gets a message that does not echo the provider's
  // (or the network stack's) raw error text.
  return { status: 502, message: 'Could not reach the payment provider. Please try again in a moment.', code: null };
}

/**
 * Routes one Razorpay webhook event to the right repository/upgrade action.
 * Moved out of the controller verbatim - signature verification stays in the
 * controller since it needs the raw request (headers/rawBody) this function
 * has no business seeing once the event is trusted.
 */
async function processWebhookEvent({ event, payload, rawResponse }) {
  if (event === 'order.paid' || event === 'payment.captured') {
    const paymentEntity = payload?.payment?.entity;
    const orderEntity = payload?.order?.entity;
    const orderId = orderEntity?.id || paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (orderId) {
      const existing = await paymentRepository.findPaymentByOrderId(orderId);
      if (existing) {
        await completePaymentAndUpgrade({
          tenantId: existing.tenant_id,
          userId: existing.user_id,
          orderId,
          paymentId,
          planId: existing.plan_id,
          rawResponse,
        });
        return { orderId, tenantId: existing.tenant_id, upgraded: true };
      }
    }
    return { orderId, upgraded: false };
  }

  if (event === 'payment.failed') {
    const paymentEntity = payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    if (orderId) {
      await paymentRepository.updatePaymentFailed({
        orderId,
        paymentId: paymentEntity?.id,
        rawResponse,
      });
    }
    return { orderId };
  }

  if (event === 'refund.processed' || event === 'refund.created') {
    const refundEntity = payload?.refund?.entity;
    const paymentId = refundEntity?.payment_id;
    if (paymentId) {
      await paymentRepository.updatePaymentStatusByPaymentId(paymentId, 'refunded', rawResponse);
    }
    return { paymentId };
  }

  return null;
}

module.exports = {
  createSubscriptionOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  completePaymentAndUpgrade,
  describeOrderCreationError,
  processWebhookEvent,
  upgradeTenantPlan: (tId, uId, pId) => completePaymentAndUpgrade({ tenantId: tId, userId: uId, planId: pId }),
};
