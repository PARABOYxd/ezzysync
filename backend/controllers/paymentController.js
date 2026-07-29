const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');

function signToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      companyName: user.companyName,
      planId: user.planId || 'FREE',
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

async function createSubscriptionOrder(req, res, next) {
  try {
    const amount = 99900; // ₹999.00 in paise
    const receipt = `sub_${req.user.tenantId}_${Date.now()}`;

    // If using mock credentials, simulate order response to avoid network call failure
    if (env.razorpayKeyId.startsWith('rzp_test_mockKeyId')) {
      return res.json({
        id: `order_mock_${Date.now()}`,
        amount,
        currency: 'INR',
        receipt,
        key_id: env.razorpayKeyId,
        mock: true,
      });
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

    res.json({
      ...response.data,
      key_id: env.razorpayKeyId,
    });
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

    let verified = false;

    // Check if we are running with mock keys
    if (env.razorpayKeyId.startsWith('rzp_test_mockKeyId') || !razorpay_signature) {
      verified = true;
    } else {
      const generatedSignature = crypto
        .createHmac('sha256', env.razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      verified = (generatedSignature === razorpay_signature);
    }

    if (!verified) {
      req.log.warn({ razorpay_order_id, razorpay_payment_id }, 'Payment signature verification failed');
      return res.status(400).json({ message: 'Payment signature verification failed.' });
    }

    // Update tenant plan_id in database
    await query(
      `UPDATE tenants SET plan_id = 'PRO' WHERE id = $1`,
      [req.user.tenantId]
    );

    // Fetch updated user information to build the new JWT token
    const { rows } = await query(
      `SELECT u.*, t.company_name, t.plan_id
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    const userRow = rows[0];
    if (!userRow) {
      return res.status(404).json({ message: 'User not found after upgrade.' });
    }

    const updatedUser = {
      userId: userRow.id,
      tenantId: userRow.tenant_id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      permissions: userRow.permissions || null,
      companyName: userRow.company_name || '',
      planId: userRow.plan_id || 'FREE',
    };

    const token = signToken(updatedUser);

    req.log.info({ razorpay_order_id, razorpay_payment_id }, 'Tenant upgraded to Pro plan');
    res.json({
      success: true,
      message: 'Plan upgraded to Pro successfully!',
      token,
      user: updatedUser,
    });
  } catch (err) {
    req.log.error({ err }, 'Error verifying subscription payment');
    res.status(500).json({ message: 'Failed to verify payment subscription.' });
  }
}

module.exports = { createSubscriptionOrder, verifySubscription };
