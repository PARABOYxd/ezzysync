const express = require('express');
const ctrl = require('../controllers/expenseController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validate } = require('../middleware/validate');
const { expenseValidators, expenseTemplateValidators } = require('../validators/expenseValidators');

const router = express.Router();

// Gated on the `expenses` module the Team screen actually lets an admin
// grant. This used to ask for billing.write, an action the permission matrix
// never defined - so the sidebar showed Expenses to team members holding
// expenses.read, and every click on it was refused.
router.use(requireAuth);

router.get('/', requirePermission('expenses', 'read'), ctrl.listExpenses);
router.post('/', requirePermission('expenses', 'create'), expenseValidators, validate, ctrl.createExpense);
router.put('/:id', requirePermission('expenses', 'update'), expenseValidators, validate, ctrl.updateExpense);
router.delete('/:id', requirePermission('expenses', 'delete'), ctrl.deleteExpense);

// Cost Templates Management
router.get('/templates', requirePermission('expenses', 'read'), ctrl.getTemplates);
router.post('/templates', requirePermission('expenses', 'update'), expenseTemplateValidators, validate, ctrl.upsertTemplate);
router.delete('/templates/:id', requirePermission('expenses', 'delete'), ctrl.deleteTemplate);

module.exports = router;
