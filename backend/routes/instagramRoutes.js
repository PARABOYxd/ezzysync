const express = require('express');
const ctrl = require('../controllers/instagramController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// OAuth flow (popup-based, user-friendly)
router.get('/auth', requireAuth, ctrl.startOAuth);
router.get('/callback', ctrl.handleCallback);   // public — verified via state+JWT
router.post('/disconnect', requireAuth, ctrl.disconnect);

// Meta webhook
router.get('/webhook', ctrl.verifyWebhook);
router.post('/webhook', ctrl.receiveWebhook);

module.exports = router;
