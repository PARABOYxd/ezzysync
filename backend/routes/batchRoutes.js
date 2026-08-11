const express = require('express');
const ctrl = require('../controllers/batchController');
const { batchValidators } = require('../validators/batchValidators');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('tourBatches', 'read'), ctrl.list);
router.get('/:id', requirePermission('tourBatches', 'read'), ctrl.getOne);
router.post('/', requirePermission('tourBatches', 'create'), batchValidators, validate, ctrl.create);
router.put('/:id', requirePermission('tourBatches', 'update'), batchValidators, validate, ctrl.update);
router.delete('/:id', requirePermission('tourBatches', 'delete'), ctrl.remove);
router.post('/:id/link', requirePermission('tourBatches', 'update'), ctrl.link);
router.post('/:id/unlink', requirePermission('tourBatches', 'update'), ctrl.unlink);
router.post('/:id/link-lead', requirePermission('tourBatches', 'update'), ctrl.linkLead);
router.post('/:id/unlink-lead', requirePermission('tourBatches', 'update'), ctrl.unlinkLead);
module.exports = router;
