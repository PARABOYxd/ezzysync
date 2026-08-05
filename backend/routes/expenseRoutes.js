const express = require('express');
const ctrl = require('../controllers/expenseController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

// Require auth + admin permissions for managing expenses
router.use(requireAuth);
router.use(requirePermission('billing', 'write')); // Only admins / users with billing write permission

router.get('/', ctrl.listExpenses);
router.post('/', ctrl.createExpense);
router.put('/:id', ctrl.updateExpense);
router.delete('/:id', ctrl.deleteExpense);

// Cost Templates Management
router.get('/templates', ctrl.getTemplates);
router.post('/templates', ctrl.upsertTemplate);
router.delete('/templates/:id', ctrl.deleteTemplate);

module.exports = router;
