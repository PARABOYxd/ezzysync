const express = require('express');
const ctrl = require('../controllers/whatsappController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/:bookingId/send', requireAuth, ctrl.sendMessage);
router.get('/webhook', ctrl.verifyWebhook);
router.post('/webhook', ctrl.receiveWebhook);
module.exports = router;
