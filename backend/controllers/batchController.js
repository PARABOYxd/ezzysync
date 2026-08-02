const batchService = require('../services/batchService');
const auditService = require('../services/auditService');

async function list(req, res, next) {
  try {
    const batches = await batchService.listBatches(req.user.tenantId);
    res.json({ batches });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const detail = await batchService.getBatchDetail(req.user.tenantId, req.params.id);
    if (!detail) return res.status(404).json({ message: 'Tour batch not found.' });
    res.json(detail);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const batch = await batchService.createBatch(req.user.tenantId, req.body, req.user.name || req.user.email);
    await auditService.logAction(req, 'CREATE_TOUR_BATCH', { batchId: batch.batchId, name: batch.name });
    res.status(201).json({ batch });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const batch = await batchService.updateBatch(req.user.tenantId, req.params.id, req.body);
    await auditService.logAction(req, 'UPDATE_TOUR_BATCH', { batchId: req.params.id, updates: Object.keys(req.body) });
    res.json({ batch });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await batchService.softDeleteBatch(req.user.tenantId, req.params.id);
    await auditService.logAction(req, 'DELETE_TOUR_BATCH', { batchId: req.params.id });
    res.json({ message: 'Tour batch deleted.' });
  } catch (err) {
    next(err);
  }
}

async function link(req, res, next) {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'bookingId is required.' });
    const booking = await batchService.linkBooking(req.user.tenantId, req.params.id, bookingId);
    await auditService.logAction(req, 'LINK_BOOKING_TO_BATCH', { batchId: req.params.id, bookingId });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

async function unlink(req, res, next) {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'bookingId is required.' });
    const booking = await batchService.unlinkBooking(req.user.tenantId, bookingId);
    await auditService.logAction(req, 'UNLINK_BOOKING_FROM_BATCH', { batchId: req.params.id, bookingId });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove, link, unlink };
