const express = require('express');
const ctrl = require('../controllers/quotationController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { publicLimiter } = require('../middleware/rateLimiter');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { quotationValidators } = require('../validators/quotationValidators');

const router = express.Router();

// Public routes for clients (No login required)
router.get('/public/:uuid', publicLimiter, ctrl.getPublic);
router.post('/:id/accept-public', publicLimiter, ctrl.accept);

// Authenticated CRM team routes
router.use(requireAuth);
router.get('/', requirePermission('quotations', 'read'), ctrl.list);
router.get('/:id', requirePermission('quotations', 'read'), ctrl.getOne);
router.post('/', requirePermission('quotations', 'create'), quotationValidators, validate, ctrl.create);
router.put('/:id', requirePermission('quotations', 'update'), quotationValidators, validate, ctrl.update);
router.delete('/:id', requirePermission('quotations', 'delete'), ctrl.deleteQuote);
router.post('/:id/accept', requirePermission('quotations', 'update'), ctrl.accept);
router.post('/:id/duplicate', requirePermission('quotations', 'create'), ctrl.duplicate);

module.exports = router;
