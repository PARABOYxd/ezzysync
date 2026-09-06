const jwt = require('jsonwebtoken');
const env = require('../config/env');
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

async function requireActiveSubscription(req, res, next) {
  try {
    let tenantId = req.user?.tenantId;

    if (!tenantId) {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token;
      if (token) {
        try {
          const decoded = jwt.verify(token, env.jwtSecret);
          tenantId = decoded.tenantId;
        } catch (_) {}
      }
    }

    if (!tenantId) {
      return next(); // Unauthenticated requests are handled by requireAuth downstream
    }

    const limits = await planService.getTenantPlanLimits(tenantId);
    if (limits.isExpired) {
      // A lapsed subscription and a lapsed trial both land here, and telling a
      // paying customer their "free trial" expired is both wrong and alarming.
      const lapsedPaidPlan = Boolean(limits.lapsedPlanId);
      return res.status(403).json({
        message: lapsedPaidPlan
          ? 'Your subscription has ended. Renew your plan to continue using EzzySync.'
          : 'Your 30-day free trial has expired. Please subscribe to a plan to continue using EzzySync.',
        code: lapsedPaidPlan ? 'SUBSCRIPTION_EXPIRED' : 'TRIAL_EXPIRED',
        expired: true,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requireFeature,
  requireUsageLimit,
  requireActiveSubscription,
};
