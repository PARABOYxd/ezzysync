const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');
const { normalizePermissions } = require('../config/permissions');

/**
 * Verifies the JWT and attaches the decoded, trusted tenant context to
 * req.user. tenantId is read from the signed JWT ONLY - never from a
 * request body/query param - so a user can never request another
 * tenant's data by tampering with the payload.
 *
 * role/permissions are re-fetched from the DB on every request (instead of
 * trusting the JWT's baked-in copy) so an admin toggling a team member's
 * permissions takes effect immediately, without requiring that member to
 * log out and back in.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const dbUser = await userRepository.findUserById(decoded.userId);
    if (!dbUser) {
      return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
    }

    const role = dbUser.role || 'ADMIN';
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: dbUser.email || decoded.email,
      name: dbUser.name || decoded.name,
      role,
      permissions: normalizePermissions(dbUser.permissions, role),
      companyName: dbUser.company_name || decoded.companyName,
      planId: dbUser.plan_id || decoded.planId || 'FREE',
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
