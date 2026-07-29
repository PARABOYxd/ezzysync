const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/leadController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

const leadValidators = [
  body('customerName').notEmpty().withMessage('Customer name is required.'),
  body('phone').matches(/^[0-9+\-\s()]{7,15}$/).withMessage('A valid phone number is required.'),
];

router.get('/', ctrl.list);
router.get('/pipeline', ctrl.pipeline);
router.get('/:id', ctrl.getOne);
router.post('/', requirePermission('canCreateLeads', true), leadValidators, validate, ctrl.create);
router.put('/:id', requirePermission('canEditLeads', true), ctrl.update);
router.patch('/:id/stage', requirePermission('canEditLeads', true), ctrl.updateStage);
router.post('/:id/convert', requirePermission('canEditLeads', true), ctrl.convert);
router.delete('/:id', requirePermission('canDeleteLeads', false), ctrl.remove);

router.get('/:id/follow-ups', ctrl.listFollowUps);
router.post('/:id/follow-ups', ctrl.createFollowUp);

module.exports = router;
