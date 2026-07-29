const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/aiController');

const router = express.Router();
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

router.use(requireAuth);

router.post('/parse', upload.single('file'), ctrl.parseTicketOrChat);
router.post('/generate-itinerary', ctrl.generateItinerary);
router.post('/whatsapp-reply', ctrl.whatsappReply);
router.post('/download-itinerary', ctrl.downloadItinerary);

module.exports = router;
