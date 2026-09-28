const express = require('express');
const router = express.Router();
const { requireAuth, requireSuperAdmin } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/superAdminController');
const { validate } = require('../middleware/validate');
const { createTenantValidators } = require('../validators/superAdminValidators');

// All routes in this router require a verified session AND Super Admin privilege
router.use(requireAuth, requireSuperAdmin);

router.get('/stats', ctrl.getStats);
router.get('/tenants', ctrl.listTenants);
router.post('/tenants', createTenantValidators, validate, ctrl.createTenant);
router.get('/tenants/:id', ctrl.getTenantDetails);
router.patch('/tenants/:id/plan', ctrl.updatePlan);
router.patch('/tenants/:id/profile', ctrl.updateProfile);
router.patch('/tenants/:id/status', ctrl.toggleSuspension);
router.post('/tenants/:id/impersonate', ctrl.impersonate);
router.delete('/tenants/:id', ctrl.deleteTenant);

module.exports = router;
