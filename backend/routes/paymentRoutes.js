const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/paymentController');

const router = express.Router();

// Public Webhook route (Called directly by Razorpay servers)
router.post('/webhook', ctrl.handleRazorpayWebhook);

// Protected routes (Require logged-in agency user JWT)
router.use(requireAuth);
router.post('/create-subscription-order', ctrl.createSubscriptionOrder);
router.post('/verify-subscription', ctrl.verifySubscription);

module.exports = router;
