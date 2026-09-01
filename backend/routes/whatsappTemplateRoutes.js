const express = require('express');
const ctrl = require('../controllers/whatsappTemplateController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, ctrl.getTemplates);
router.get('/lookup', requireAuth, ctrl.lookupTemplate);
router.post('/', requireAuth, ctrl.createTemplate);
router.post('/sync', requireAuth, ctrl.syncTemplates);
router.post('/:id/submit', requireAuth, ctrl.submitMetaTemplate);
router.put('/:id', requireAuth, ctrl.updateTemplate);
router.delete('/:id', requireAuth, ctrl.deleteTemplate);

module.exports = router;
