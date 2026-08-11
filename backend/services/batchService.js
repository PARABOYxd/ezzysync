const batchRepository = require('../repositories/batchRepository');
const bookingRepository = require('../repositories/bookingRepository');
const { BATCH_STATUSES, rowToBatch } = require('../models/batchSchema');
const { rowToBooking } = require('../models/bookingSchema');
const { rowToLead } = require('../models/leadSchema');

async function getBatchByBatchId(tenantId, batchId) {
  const row = await batchRepository.getBatchByBatchId(tenantId, batchId);
  return rowToBatch(row);
}

async function listBatches(tenantId) {
  const rows = await batchRepository.listBatches(tenantId);
  return rows.map(rowToBatch);
}

async function createBatch(tenantId, data, createdBy) {
  if (data.status && !BATCH_STATUSES.includes(data.status)) {
    throw new Error('Invalid batch status.');
  }

  const seq = await batchRepository.nextBatchSeq();
  const batchId = `TB-${seq}`;

  const row = await batchRepository.insertBatch(tenantId, batchId, data, createdBy);
  return rowToBatch(row);
}

async function updateBatch(tenantId, batchId, updates) {
  const existing = await getBatchByBatchId(tenantId, batchId);
  if (!existing) {
    const err = new Error('Tour batch not found.');
    err.status = 404;
    throw err;
  }

  if (updates.status && !BATCH_STATUSES.includes(updates.status)) {
    throw new Error('Invalid batch status.');
  }

  const merged = { ...existing, ...updates };
  const row = await batchRepository.updateBatch(tenantId, batchId, merged);
  return rowToBatch(row);
}

async function softDeleteBatch(tenantId, batchId) {
  return updateBatch(tenantId, batchId, { deleted: true });
}

async function getBatchDetail(tenantId, batchId) {
  const batch = await getBatchByBatchId(tenantId, batchId);
  if (!batch) return null;

  const bookingRows = await batchRepository.listBookingsForBatch(tenantId, batch.id);
  const bookings = bookingRows.map(rowToBooking);

  const leadRows = await batchRepository.listLeadsForBatch(tenantId, batch.id);
  const leads = leadRows.map(rowToLead);

  const totalPaid = bookings.reduce((sum, b) => sum + (b.paid || 0), 0);
  const totalPending = bookings.reduce((sum, b) => sum + (b.remaining || 0), 0);

  return {
    batch,
    bookings,
    leads,
    summary: {
      totalCapacity: batch.totalCapacity,
      confirmedSeats: batch.confirmedSeats,
      remainingSeats: Math.max(batch.totalCapacity - batch.confirmedSeats, 0),
      totalPaid,
      totalPending,
    },
  };
}

async function linkBooking(tenantId, batchId, bookingIdText) {
  const batch = await getBatchByBatchId(tenantId, batchId);
  if (!batch) {
    const err = new Error('Tour batch not found.');
    err.status = 404;
    throw err;
  }

  const bookingRow = await bookingRepository.getBookingById(tenantId, bookingIdText);
  if (!bookingRow) {
    const err = new Error('Booking not found.');
    err.status = 404;
    throw err;
  }

  // A batch is one fixed departure with one shared itinerary - a booking for
  // a different trip or date can't be counted toward its seat capacity.
  const sameTrip = bookingRow.trip === batch.tripName;
  const sameDate = (bookingRow.departure || '').slice(0, 10) === (batch.departureDate || '').slice(0, 10);
  if (!sameTrip || !sameDate) {
    const err = new Error(`This booking's trip/departure date doesn't match the batch's itinerary (${batch.tripName}, ${batch.departureDate}).`);
    err.status = 400;
    throw err;
  }

  const row = await batchRepository.assignBookingToBatch(tenantId, bookingIdText, batch.id);
  return rowToBooking(row);
}

async function unlinkBooking(tenantId, bookingIdText) {
  const row = await batchRepository.unassignBookingFromBatch(tenantId, bookingIdText);
  if (!row) {
    const err = new Error('Booking not found.');
    err.status = 404;
    throw err;
  }
  return rowToBooking(row);
}

async function linkLead(tenantId, batchId, leadIdText) {
  const batch = await getBatchByBatchId(tenantId, batchId);
  if (!batch) {
    const err = new Error('Tour batch not found.');
    err.status = 404;
    throw err;
  }
  const row = await batchRepository.assignLeadToBatch(tenantId, leadIdText, batch.id);
  if (!row) {
    const err = new Error('Lead not found.');
    err.status = 404;
    throw err;
  }
  return rowToLead(row);
}

async function unlinkLead(tenantId, leadIdText) {
  const row = await batchRepository.unassignLeadFromBatch(tenantId, leadIdText);
  if (!row) {
    const err = new Error('Lead not found.');
    err.status = 404;
    throw err;
  }
  return rowToLead(row);
}

module.exports = {
  listBatches,
  getBatchByBatchId,
  createBatch,
  updateBatch,
  softDeleteBatch,
  getBatchDetail,
  linkBooking,
  unlinkBooking,
  linkLead,
  unlinkLead,
};
