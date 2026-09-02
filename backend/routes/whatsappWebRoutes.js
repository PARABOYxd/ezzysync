const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/whatsappWebController');

const router = express.Router();
const upload = multer({
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

router.use(requireAuth);

router.get('/status', ctrl.getStatus);
router.post('/connect', ctrl.startSession);
router.post('/disconnect', ctrl.disconnect);
router.post('/toggle-autopilot', ctrl.toggleAiAutopilot);
router.get('/chats', ctrl.listChats);
router.get('/chats/:chatId/messages', ctrl.getChatMessages);
router.post('/chats/:chatId/send', upload.single('file'), ctrl.sendMessage);
router.post('/chats/:chatId/toggle-ai', ctrl.toggleChatAi);
router.post('/chats/:chatId/ai-suggest', ctrl.aiSuggest);
router.post('/send-itinerary-pdf', ctrl.sendItineraryPdf);

module.exports = router;
