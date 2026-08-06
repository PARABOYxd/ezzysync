const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/leadController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

const leadValidators = [
  body('phone').matches(/^[0-9+\-\s()]{7,15}$/).withMessage('A valid phone number is required.'),
];

router.get('/', requirePermission('leads', 'read'), ctrl.list);
router.get('/pool', requirePermission('leads', 'read'), ctrl.listPool);
router.get('/pipeline', requirePermission('leads', 'read'), ctrl.pipeline);
router.get('/:id', requirePermission('leads', 'read'), ctrl.getOne);
router.post('/', requirePermission('leads', 'create'), leadValidators, validate, ctrl.create);
router.put('/:id', requirePermission('leads', 'update'), ctrl.update);
router.patch('/:id/stage', requirePermission('leads', 'update'), ctrl.updateStage);
router.post('/:id/convert', requirePermission('leads', 'update'), ctrl.convert);
router.post('/:id/claim', requirePermission('leads', 'update'), ctrl.claimLead);
router.delete('/:id', requirePermission('leads', 'delete'), ctrl.remove);

router.get('/:id/follow-ups', ctrl.listFollowUps);
router.post('/:id/follow-ups', ctrl.createFollowUp);

module.exports = router;
