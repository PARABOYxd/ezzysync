const bookingService = require('../services/bookingService');

/**
 * Reusable permission middleware generator.
 * Gates access based on specific flags inside req.user.permissions.
 * Admins always bypass all restrictions.
 * 
 * @param {string} permissionKey The checkbox state key to evaluate
 * @param {boolean} defaultValue The fallback boolean value if flag is not defined (default: true)
 */
function requirePermission(permissionKey, defaultValue = true) {
  return (req, res, next) => {
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    const userPermission = req.user.permissions?.[permissionKey];
    const hasAccess = userPermission !== undefined ? userPermission : defaultValue;
    
    if (hasAccess) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'Access denied. You do not have permission to perform this action.' 
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
  
  const userPermission = req.user.permissions?.canEditMobileNumber;
  const hasAccess = userPermission !== undefined ? userPermission : false;
  
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
