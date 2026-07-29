const planService = require('../services/planService');

function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const hasAccess = await planService.checkFeatureAccess(req.user.tenantId, featureKey);
      if (hasAccess) {
        return next();
      }
      return res.status(403).json({
        message: `This feature is locked under your current plan. Please upgrade to access this feature.`,
        code: 'FEATURE_LOCKED',
        feature: featureKey
      });
    } catch (err) {
      next(err);
    }
  };
}

function requireUsageLimit(resource) {
  return async (req, res, next) => {
    try {
      const allowed = await planService.checkUsageLimit(req.user.tenantId, resource);
      if (allowed) {
        return next();
      }
      return res.status(403).json({
        message: `You have reached the usage limit for ${resource} on your current plan. Please upgrade to increase your limits.`,
        code: 'USAGE_LIMIT_EXCEEDED',
        resource
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  requireFeature,
  requireUsageLimit,
};
