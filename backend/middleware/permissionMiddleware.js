const bookingService = require('../services/bookingService');

/**
 * Reusable permission middleware generator.
 * Gates access based on req.user.permissions[moduleKey][action].
 * Admins always bypass all restrictions. req.user.permissions is always
 * fully normalized (see config/permissions.js) by the time this runs, so
 * no fallback/default handling is needed here.
 */
function requirePermission(moduleKey, action) {
  return (req, res, next) => {
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (req.user.permissions?.[moduleKey]?.[action]) {
      return next();
    }

    return res.status(403).json({
      message: 'Access denied. You do not have permission to perform this action.',
    });
  };
}

/**
 * Custom middleware to restrict phone (mobile number) editing.
 * Gates updating the phone field for team members who do not have explicit permissions.
 */
async function restrictPhoneEdit(req, res, next) {
  if (req.user.role === 'ADMIN') {
    return next();
  }

  const hasAccess = !!req.user.permissions?.bookings?.editPhone;

  if (hasAccess) {
    return next();
  }

  // If the request contains a phone number update, check if it differs from the current record
  if (req.body.phone) {
    try {
      const existing = await bookingService.getBookingById(req.user.tenantId, req.params.id);
      if (existing && String(req.body.phone).trim() !== String(existing.phone).trim()) {
        return res.status(403).json({
          message: 'Access denied. You do not have permission to edit the mobile number.'
        });
      }
    } catch (err) {
      return next(err);
    }
  }

  next();
}

module.exports = {
  requirePermission,
  restrictPhoneEdit
};
