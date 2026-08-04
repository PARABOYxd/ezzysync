const bookingService = require('../services/bookingService');

async function getDashboard(req, res, next) {
  try {
    let teamMemberName;
    if (req.user.role === 'TEAM_MEMBER') {
      teamMemberName = req.user.name; // team member always sees own data
    } else if (req.query.member) {
      teamMemberName = req.query.member; // admin can filter by any member
    }
    const data = await bookingService.dashboardStats(req.user.tenantId, teamMemberName);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getBillingAnalytics(req, res, next) {
  try {
    let teamMemberName;
    if (req.user.role === 'TEAM_MEMBER') {
      teamMemberName = req.user.name;
    } else if (req.query.member) {
      teamMemberName = req.query.member;
    }
    const data = await bookingService.billingAnalytics(req.user.tenantId, teamMemberName);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, getBillingAnalytics };

