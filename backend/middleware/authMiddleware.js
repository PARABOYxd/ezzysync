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
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;

  // Fallback to query param for window.open() popup OAuth flows
  if (!token && req.query.token) {
    token = req.query.token;
  }

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
    const emailLower = (dbUser.email || decoded.email || '').toLowerCase();
    const isSuperAdmin =
      dbUser.is_super_admin === true ||
      role === 'SUPER_ADMIN' ||
      (env.superAdminEmails && env.superAdminEmails.includes(emailLower));

    // If an agency account is suspended by platform administration, prevent access
    if (dbUser.is_suspended && !isSuperAdmin) {
      return res.status(403).json({
        message: 'Your agency account has been suspended by EzzySync administration. Please contact support.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: dbUser.email || decoded.email,
      name: dbUser.name || decoded.name,
      role,
      permissions: normalizePermissions(dbUser.permissions, role),
      companyName: dbUser.company_name || decoded.companyName,
      planId: dbUser.plan_id || decoded.planId || 'FREE',
      isSuperAdmin: Boolean(isSuperAdmin),
    };
    // Bind tenant/user onto req.log so every req.log.* call downstream
    // (controllers, services) carries this context automatically, not
    // just the one-line request summary pino-http emits at the end.
    if (req.log) {
      req.log = req.log.child({ tenantId: req.user.tenantId, userId: req.user.userId, isSuperAdmin });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

/**
 * Route protection: only Super Admins (Platform Owners) are permitted.
 * Blocks any regular tenant admin or agent with 403 Forbidden.
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({ message: 'Access denied: Super Admin privilege required.' });
  }
  next();
}

module.exports = { requireAuth, requireSuperAdmin };
