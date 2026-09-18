const customerService = require('../services/customerService');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { search = '' } = req.query;

    const result = await customerService.listCustomers({ tenantId: req.user.tenantId, page, limit, search });

    res.json({
      customers: result.customers,
      pagination: {
        totalCount: result.totalCount,
        totalPages: Math.ceil(result.totalCount / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function lookupByPhone(req, res, next) {
  try {
    const phone = (req.query.phone || '').trim();
    if (!phone) return res.json({ customer: null });
    const customer = await customerService.findByPhone(req.user.tenantId, phone);
    res.json({ customer });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const profile = await customerService.getProfile(req.user.tenantId, req.params.id);
    if (!profile) return res.status(404).json({ message: 'Customer not found.' });
    res.json({ customer: profile });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, lookupByPhone };
