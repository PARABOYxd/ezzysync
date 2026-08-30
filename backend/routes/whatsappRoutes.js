const express = require('express');
const ctrl = require('../controllers/whatsappController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/:bookingId/send', requireAuth, ctrl.sendMessage);
router.get('/webhook', ctrl.verifyWebhook);
router.post('/webhook', ctrl.receiveWebhook);

// Live Chat screen endpoints
router.get('/chats', requireAuth, ctrl.getChats);
router.post('/chats/start', requireAuth, ctrl.startNewChat);
router.get('/chats/:chatId/messages', requireAuth, ctrl.getChatMessages);
router.post('/chats/:chatId/send', requireAuth, ctrl.sendChatMessage);
router.post('/chats/:chatId/read', requireAuth, ctrl.readChat);
router.put('/chats/:chatId/management', requireAuth, ctrl.updateChatManagement);

module.exports = router;
