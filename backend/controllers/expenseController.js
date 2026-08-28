const expenseRepository = require('../repositories/expenseRepository');

async function createExpense(req, res, next) {
  try {
    const expense = await expenseRepository.createExpense(req.user.tenantId, {
      ...req.body,
      created_by: req.user.name
    });
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

async function listExpenses(req, res, next) {
  try {
    const list = await expenseRepository.listExpenses(req.user.tenantId, req.query);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

async function updateExpense(req, res, next) {
  try {
    const expense = await expenseRepository.updateExpense(req.user.tenantId, req.params.id, req.body);
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const expense = await expenseRepository.deleteExpense(req.user.tenantId, req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });
    res.json({ message: 'Expense deleted successfully.', expense });
  } catch (err) {
    next(err);
  }
}

async function getTemplates(req, res, next) {
  try {
    const list = await expenseRepository.getTemplates(req.user.tenantId);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

async function upsertTemplate(req, res, next) {
  try {
    const template = await expenseRepository.upsertTemplate(req.user.tenantId, req.body);
    res.json(template);
  } catch (err) {
    next(err);
  }
}

async function deleteTemplate(req, res, next) {
  try {
    const template = await expenseRepository.deleteTemplate(req.user.tenantId, req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found.' });
    res.json({ message: 'Template deleted successfully.', template });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createExpense,
  listExpenses,
  updateExpense,
  deleteExpense,
  getTemplates,
  upsertTemplate,
  deleteTemplate
};
