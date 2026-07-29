const express = require('express');
const ctrl = require('../controllers/whatsappController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/:bookingId/send', requireAuth, ctrl.sendMessage);
module.exports = router;
