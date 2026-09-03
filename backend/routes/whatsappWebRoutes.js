const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/planMiddleware');
const ctrl = require('../controllers/whatsappWebController');

const router = express.Router();
// One customer message may carry several attachments. The count cap is
// enforced here so multer rejects the extras before anything is buffered.
const MAX_ATTACHMENTS = 8;
const upload = multer({
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB per file
    files: MAX_ATTACHMENTS,
  },
});

router.use(requireAuth);

router.get('/status', ctrl.getStatus);
router.post('/connect', ctrl.startSession);
router.post('/disconnect', ctrl.disconnect);
router.post('/toggle-autopilot', requireFeature('canUseAi'), ctrl.toggleAiAutopilot);
router.get('/chats', ctrl.listChats);
router.get('/chats/:chatId/messages', ctrl.getChatMessages);
router.post('/chats/:chatId/send', upload.array('files', MAX_ATTACHMENTS), ctrl.sendMessage);
router.post('/chats/:chatId/toggle-ai', requireFeature('canUseAi'), ctrl.toggleChatAi);
router.post('/chats/:chatId/ai-suggest', requireFeature('canUseAi'), ctrl.aiSuggest);
router.post('/send-itinerary-pdf', ctrl.sendItineraryPdf);

// Quick replies for the composer's "/" picker. Read-only: these are the
// text templates from Settings, which owns creating and editing them.
router.get('/quick-replies', ctrl.listQuickReplies);

module.exports = router;
