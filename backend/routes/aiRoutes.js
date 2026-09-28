const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { requireFeature, requireAiAllowance } = require('../middleware/planMiddleware');
const ctrl = require('../controllers/aiController');

const router = express.Router();
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

router.use(requireAuth);
router.use(requireFeature('canUseAi'));

router.post('/parse', requirePermission('aiTools', 'use'), upload.single('file'), requireAiAllowance('ticket_parse'), ctrl.parseTicketOrChat);
router.post('/parse-itinerary', requirePermission('aiTools', 'use'), upload.single('file'), requireAiAllowance('itinerary_pdf'), ctrl.parseItineraryPdf);
router.post('/generate-itinerary', requirePermission('aiTools', 'use'), requireAiAllowance('itinerary_generate'), ctrl.generateItinerary);
router.post('/whatsapp-reply', requirePermission('aiTools', 'use'), requireAiAllowance('whatsapp_reply'), ctrl.whatsappReply);
router.post('/download-itinerary', requirePermission('aiTools', 'use'), ctrl.downloadItinerary);

module.exports = router;
