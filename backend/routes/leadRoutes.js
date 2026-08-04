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
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('A valid email is required.'),
];

// PUT sends a full lead object in practice, but fields are still checked as
// optional here so a partial update isn't rejected outright - each one is
// just required to be valid *if present*, instead of having no validation
// at all (which previously let customerName be saved as an empty string).
const leadUpdateValidators = [
  body('customerName').optional().notEmpty().withMessage('Customer name cannot be empty.'),
  body('phone').optional().matches(/^[0-9+\-\s()]{7,15}$/).withMessage('A valid phone number is required.'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('A valid email is required.'),
];

router.get('/', requirePermission('leads', 'read'), ctrl.list);
router.get('/pipeline', requirePermission('leads', 'read'), ctrl.pipeline);
router.get('/:id', requirePermission('leads', 'read'), ctrl.getOne);
router.post('/', requirePermission('leads', 'create'), leadValidators, validate, ctrl.create);
router.put('/:id', requirePermission('leads', 'update'), leadUpdateValidators, validate, ctrl.update);
router.patch('/:id/stage', requirePermission('leads', 'update'), ctrl.updateStage);
router.post('/:id/convert', requirePermission('leads', 'update'), ctrl.convert);
router.delete('/:id', requirePermission('leads', 'delete'), ctrl.remove);

router.get('/:id/follow-ups', requirePermission('leads', 'read'), ctrl.listFollowUps);
router.post('/:id/follow-ups', requirePermission('leads', 'update'), ctrl.createFollowUp);

module.exports = router;
