const crypto = require('crypto');
const axios = require('axios');
const env = require('../config/env');
const planRepository = require('../repositories/planRepository');
const userRepository = require('../repositories/userRepository');
const tokenService = require('./tokenService');

const SUBSCRIPTION_AMOUNT_PAISE = 99900; // ₹999.00 in paise

/** Mock credentials only exist in local/dev setups with no real Razorpay
 * account. Both the order call and the signature check branch on this. */
function isMockRazorpay() {
  return env.razorpayKeyId.startsWith('rzp_test_mockKeyId');
}

async function createSubscriptionOrder(tenantId) {
  const amount = SUBSCRIPTION_AMOUNT_PAISE;
  const receipt = `sub_${tenantId}_${Date.now()}`;

  // If using mock credentials, simulate order response to avoid network call failure
  if (isMockRazorpay()) {
    return {
      id: `order_mock_${Date.now()}`,
      amount,
      currency: 'INR',
      receipt,
      key_id: env.razorpayKeyId,
      mock: true,
    };
  }

  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64');
  const response = await axios.post(
    'https://api.razorpay.com/v1/orders',
    {
      amount,
      currency: 'INR',
      receipt,
    },
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    ...response.data,
    key_id: env.razorpayKeyId,
  };
}

/**
 * Never treat a missing signature as verified outside of a mock setup, or
 * anyone could upgrade to Pro for free by just omitting razorpay_signature
 * from the request.
 */
function verifyPaymentSignature({ razorpay_payment_id, razorpay_order_id, razorpay_signature }) {
  if (isMockRazorpay()) return true;
  if (!razorpay_signature) return false;

  const generatedSignature = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  return generatedSignature === razorpay_signature;
}

/**
 * Moves the tenant onto the Pro plan and mints a fresh access token carrying
 * the new planId. Returns null when the user row has disappeared, which the
 * caller surfaces as a 404.
 */
async function upgradeTenantToPro(tenantId, userId) {
  await planRepository.setTenantPlan(tenantId, 'PRO');

  const userRow = await userRepository.findUserWithTenantById(userId);
  if (!userRow) return null;

  const user = {
    userId: userRow.id,
    tenantId: userRow.tenant_id,
    email: userRow.email,
    name: userRow.name,
    role: userRow.role,
    permissions: userRow.permissions || null,
    companyName: userRow.company_name || '',
    planId: userRow.plan_id || 'FREE',
  };

  return { user, token: tokenService.signAccessToken(user) };
}

module.exports = {
  createSubscriptionOrder,
  verifyPaymentSignature,
  upgradeTenantToPro,
};
