const quotationService = require('../services/quotationService');
const settingsService = require('../services/settingsService');
const auditService = require('../services/auditService');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { search, status } = req.query;

    const result = await quotationService.listQuotationsPaged(req.user.tenantId, {
      page,
      limit,
      search,
      status,
    });

    res.json({
      quotations: result.quotations,
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

async function getOne(req, res, next) {
  try {
    const quotation = await quotationService.getQuotationById(req.user.tenantId, req.params.id);
    if (!quotation) return res.status(404).json({ message: 'Quotation not found.' });
    res.json({ quotation });
  } catch (err) {
    next(err);
  }
}

async function getPublic(req, res, next) {
  try {
    const quotation = await quotationService.getQuotationByUuid(req.params.uuid);
    if (!quotation) return res.status(404).json({ message: 'Itinerary details not found.' });

    const settings = await settingsService.getSettings(quotation.tenantId);
    res.json({ quotation, settings });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const quotation = await quotationService.createQuotation(req.user.tenantId, req.body);
    await auditService.logAction(req, 'CREATE_QUOTATION', { quotationId: quotation.quotationId, customerName: quotation.customerName });
    res.status(201).json({ quotation });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const quotation = await quotationService.updateQuotation(req.user.tenantId, req.params.id, req.body);
    await auditService.logAction(req, 'UPDATE_QUOTATION', { quotationId: req.params.id, updates: Object.keys(req.body) });
    res.json({ quotation });
  } catch (err) {
    next(err);
  }
}

async function deleteQuote(req, res, next) {
  try {
    const quotation = await quotationService.deleteQuotation(req.user.tenantId, req.params.id);
    if (!quotation) return res.status(404).json({ message: 'Quotation not found.' });
    await auditService.logAction(req, 'DELETE_QUOTATION', { quotationId: req.params.id });
    res.json({ message: 'Quotation deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

async function accept(req, res, next) {
  try {
    // If authenticated user calls it:
    const tenantId = req.user ? req.user.tenantId : req.body.tenantId;
    const acceptedBy = req.user ? req.user.email : 'Client Portal';

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant identifier is required to confirm booking.' });
    }

    const { booking, quotation, possibleDuplicates } = await quotationService.acceptQuotation(tenantId, req.params.id, acceptedBy);
    res.json({ message: 'Booking confirmed successfully!', booking, quotation, possibleDuplicates });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  getPublic,
  create,
  update,
  deleteQuote,
  accept,
};
