const bookingService = require('../services/bookingService');

async function getDashboard(req, res, next) {
  try {
    const data = await bookingService.dashboardStats(req.user.tenantId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
