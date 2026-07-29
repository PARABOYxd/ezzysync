const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Verifies the JWT and attaches the decoded, trusted tenant context to
 * req.user. Every downstream controller/service reads tenantId from
 * HERE ONLY - never from a request body/query param - so a user can never
 * request another tenant's data by tampering with the payload.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || 'ADMIN',
      permissions: decoded.permissions || {},
      companyName: decoded.companyName,
      planId: decoded.planId || 'FREE',
    };
    // Bind tenant/user onto req.log so every req.log.* call downstream
    // (controllers, services) carries this context automatically, not
    // just the one-line request summary pino-http emits at the end.
    if (req.log) {
      req.log = req.log.child({ tenantId: req.user.tenantId, userId: req.user.userId });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = { requireAuth };
