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
    const { startDate, endDate } = req.query;
    // "0", "-10", "abc" all became Invalid Date further down and the report
    // crashed building its buckets. A bad range is the caller's mistake.
    for (const [label, value] of [['Start date', startDate], ['End date', endDate]]) {
      if (value && !Number.isFinite(new Date(value).getTime())) {
        return res.status(400).json({ message: `${label} must be a valid date.` });
      }
    }
    const data = await bookingService.billingAnalytics(req.user.tenantId, teamMemberName, startDate, endDate);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, getBillingAnalytics };

