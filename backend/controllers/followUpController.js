const followUpRepository = require('../repositories/followUpRepository');
const auditService = require('../services/auditService');

async function list(req, res, next) {
  try {
    const { overdue, dueToday, assignedTo } = req.query;
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

async function markDone(req, res, next) {
  try {
    const followUp = await followUpRepository.markDone(req.user.tenantId, req.params.id);
    if (!followUp) return res.status(404).json({ message: 'Follow-up not found.' });
    await auditService.logAction(req, 'MARK_FOLLOW_UP_DONE', { followUpId: req.params.id });
    res.json({ followUp });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markDone };
