const followUpRepository = require('../repositories/followUpRepository');
const auditService = require('../services/auditService');
const { shouldScopeToSelf } = require('../config/permissions');

async function list(req, res, next) {
  try {
    const { overdue, dueToday } = req.query;
    const assignedTo = shouldScopeToSelf(req.user, 'followUps') ? req.user.name : req.query.assignedTo;
    const followUps = await followUpRepository.listDueFollowUps(req.user.tenantId, {
      overdue: overdue === 'true',
      dueToday: dueToday === 'true',
      assignedTo,
    });
    res.json({ followUps });
  } catch (err) {
    next(err);
  }
}

async function listCompleted(req, res, next) {
  try {
    const assignedTo = shouldScopeToSelf(req.user, 'followUps') ? req.user.name : req.query.assignedTo;
    const followUps = await followUpRepository.listCompletedFollowUps(req.user.tenantId, { assignedTo });
    res.json({ followUps });
  } catch (err) {
    next(err);
  }
}

async function markDone(req, res, next) {
  try {
    const { outcomeNote } = req.body;
    const followUp = await followUpRepository.markDone(req.user.tenantId, req.params.id, outcomeNote);
    if (!followUp) return res.status(404).json({ message: 'Follow-up not found.' });
    await auditService.logAction(req, 'MARK_FOLLOW_UP_DONE', { followUpId: req.params.id });
    res.json({ followUp });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, listCompleted, markDone };
