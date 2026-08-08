const express = require('express');
const ctrl = require('../controllers/instagramController');

const router = express.Router();

// Meta webhook verification (GET)
router.get('/webhook', ctrl.verifyWebhook);

// Meta webhook incoming events (POST)
router.post('/webhook', ctrl.receiveWebhook);

module.exports = router;
