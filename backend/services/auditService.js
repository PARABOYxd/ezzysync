const auditRepository = require('../repositories/auditRepository');
const logger = require('../utils/logger').child({ module: 'audit' });

/**
 * Audit log service helper.
 * Automatically captures authentication context from the incoming request (req.user)
 * and commits the action trail to the PostgreSQL audit_logs database.
 * 
 * @param {object} req Express request object containing req.user
 * @param {string} action Upper-case string describing the audit trigger (e.g. 'CREATE_LEAD')
 * @param {object} details JSON-serializable meta context for the logged action
 */
async function logAction(req, action, details) {
  try {
    if (req && req.user) {
      const tenantId = req.user.tenantId;
      const userId = req.user.userId || null;
      
      await auditRepository.createLog(tenantId, userId, action, details);
    }
  } catch (err) {
    const log = req?.log || logger;
    log.error({ err, action, tenantId: req?.user?.tenantId }, 'Failed to commit audit trail');
  }
}

module.exports = {
  logAction,
};
