const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/paymentController');

const router = express.Router();

router.use(requireAuth);

router.post('/create-subscription-order', ctrl.createSubscriptionOrder);
router.post('/verify-subscription', ctrl.verifySubscription);

module.exports = router;
