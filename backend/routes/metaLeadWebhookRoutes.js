const express = require('express');
const ctrl = require('../controllers/metaLeadController');
const { requireMetaSignature } = require('../middleware/metaWebhookSignature');

const router = express.Router();

router.get('/', ctrl.verifyWebhook);
router.post('/', requireMetaSignature, ctrl.receiveWebhook);

module.exports = router;
