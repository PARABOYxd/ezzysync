const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const ctrl = require('../controllers/aiController');

const router = express.Router();
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

router.use(requireAuth);

router.post('/parse', requirePermission('aiTools', 'use'), upload.single('file'), ctrl.parseTicketOrChat);
router.post('/generate-itinerary', requirePermission('aiTools', 'use'), ctrl.generateItinerary);
router.post('/whatsapp-reply', requirePermission('aiTools', 'use'), ctrl.whatsappReply);
router.post('/download-itinerary', requirePermission('aiTools', 'use'), ctrl.downloadItinerary);

module.exports = router;
