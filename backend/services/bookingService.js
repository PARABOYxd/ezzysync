const { v4: uuidv4 } = require('uuid');
const bookingRepository = require('../repositories/bookingRepository');
const customerService = require('./customerService');
const { rowToBooking } = require('../models/bookingSchema');

function computeAmounts({ members, pricePerPerson, paid }) {
  const totalAmount = Number(members || 0) * Number(pricePerPerson || 0);
  const remaining = Math.max(totalAmount - Number(paid || 0), 0);
  return { totalAmount, remaining };
}

async function listBookings(tenantId, { includeDeleted = false } = {}) {
  const rows = await bookingRepository.listBookings(tenantId, includeDeleted);
  return rows.map(rowToBooking);
}

async function getBookingById(tenantId, bookingId) {
  const row = await bookingRepository.getBookingById(tenantId, bookingId);
  return rowToBooking(row);
}

async function createBooking(tenantId, data, createdBy) {
  const { totalAmount, remaining } = computeAmounts(data);
  const bookingId = `BK-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;
  const now = new Date().toISOString();
  const paid = Number(data.paid || 0);
  const travelStatus = data.travelStatus || 'Booked';
  const paymentStatus = data.paymentStatus || (remaining <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending');

  const customerId = await customerService.upsertFromContact(tenantId, {
    name: data.customerName, email: data.email, phone: data.phone,
  });

  const row = await bookingRepository.insertBooking(
    tenantId, bookingId, data, now, paid, totalAmount, remaining, travelStatus, paymentStatus, createdBy, customerId
  );

  // Log initial creation details in follow-up history
  await bookingRepository.insertFollowUp(
    tenantId,
    bookingId,
    `Lead created. Travel Status set to *${travelStatus}*, Payment Status set to *${paymentStatus}*.` + (data.notes ? `\nNote: ${data.notes}` : ''),
    'note',
    null,
    createdBy || 'System'
  );

  return rowToBooking(row);
}

async function updateBooking(tenantId, bookingId, updates, updatedByUser) {
  const existing = await getBookingById(tenantId, bookingId);
  if (!existing) {
    const err = new Error('Booking not found.');
    err.status = 404;
    throw err;
  }

  if (updates.travelStatus && ['Completed', 'Refunded'].includes(updates.travelStatus)) {
    if (existing.travelStatus !== 'Booked' && existing.travelStatus !== updates.travelStatus) {
      const err = new Error(`Cannot mark status as ${updates.travelStatus} unless the previous status was Booked.`);
      err.status = 400;
      throw err;
    }
  }

  const merged = { ...existing, ...updates };
  const { totalAmount, remaining } = computeAmounts(merged);
  const updatedAt = new Date().toISOString();

  const contactChanged = updates.phone !== undefined || updates.email !== undefined || updates.customerName !== undefined;
  const customerId = contactChanged
    ? await customerService.upsertFromContact(tenantId, { name: merged.customerName, email: merged.email, phone: merged.phone })
    : null;

  const row = await bookingRepository.updateBooking(
    tenantId, bookingId, merged, totalAmount, remaining, updatedAt, customerId
  );

  // Determine what changed to auto-log in history
  const statusChanged = updates.travelStatus && updates.travelStatus !== existing.travelStatus;
  const paymentChanged = updates.paymentStatus && updates.paymentStatus !== existing.paymentStatus;
  const notesChanged = updates.notes !== undefined && updates.notes !== existing.notes;
  const deletedChanged = updates.deleted !== undefined && updates.deleted !== existing.deleted;

  if (statusChanged || paymentChanged || notesChanged || deletedChanged) {
    let logMsg = '';
    let activityType = 'note';

    if (deletedChanged && updates.deleted) {
      logMsg += `Lead deleted/archived.\n`;
    } else {
      if (statusChanged) {
        logMsg += `Travel Status changed from *${existing.travelStatus}* to *${updates.travelStatus}*.\n`;
        activityType = 'meeting'; // 'meeting' represents milestone changes
      }
      if (paymentChanged) {
        logMsg += `Payment Status changed from *${existing.paymentStatus}* to *${updates.paymentStatus}*.\n`;
      }
      if (notesChanged) {
        logMsg += `Note updated: ${updates.notes || '(cleared)'}\n`;
      }
    }

    if (logMsg.trim()) {
      await bookingRepository.insertFollowUp(
        tenantId,
        bookingId,
        logMsg.trim(),
        activityType,
        null,
        updatedByUser || 'System'
      );
    }
  }

  return rowToBooking(row);
}

async function softDeleteBooking(tenantId, bookingId, updatedByUser) {
  return updateBooking(tenantId, bookingId, { deleted: true }, updatedByUser);
}

async function dashboardStats(tenantId) {
  const bookings = await listBookings(tenantId);
  const today = new Date().toISOString().slice(0, 10);

  let totalRevenue = 0;
  let totalPaid = 0;
  let totalCost = 0;
  let totalProfit = 0;

  bookings.forEach((b) => {
    if (b.travelStatus !== 'Cancelled') {
      totalRevenue += Number(b.totalAmount || 0);
      totalPaid += Number(b.paid || 0);
      const cost =
        Number(b.vendorHotelCost || 0) +
        Number(b.vendorFlightCost || 0) +
        Number(b.vendorTransportCost || 0) +
        Number(b.vendorOtherCost || 0);
      totalCost += cost;
      totalProfit += Number(b.netProfit || 0);
    }
  });

  const stats = {
    totalBookings: bookings.length,
    upcomingTrips: bookings.filter((b) => b.travelStatus === 'Booked' && b.departure >= today).length,
    completedTrips: bookings.filter((b) => b.travelStatus === 'Completed').length,
    cancelledTrips: bookings.filter((b) => b.travelStatus === 'Cancelled').length,
    refundedTrips: bookings.filter((b) => b.travelStatus === 'Refunded').length,
    postponedTrips: bookings.filter((b) => b.travelStatus === 'Postponed').length,
    todaysBookings: bookings.filter((b) => (b.bookingTimestamp || '').slice(0, 10) === today).length,
    totalRevenue,
    totalPaid,
    totalCost,
    totalProfit,
  };

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.bookingTimestamp) - new Date(a.bookingTimestamp))
    .slice(0, 10);

  const upcomingDepartures = bookings
    .filter((b) => b.departure >= today && b.travelStatus !== 'Cancelled')
    .sort((a, b) => a.departure.localeCompare(b.departure))
    .slice(0, 10);

  return { stats, recentBookings, upcomingDepartures };
}

async function listBookingsPaged(tenantId, params) {
  const result = await bookingRepository.listBookingsPaged({ ...params, tenantId });
  return {
    bookings: result.bookings.map(rowToBooking),
    totalCount: result.totalCount,
  };
}

async function getFollowUps(tenantId, bookingIdText) {
  return bookingRepository.listFollowUps(tenantId, bookingIdText);
}

async function addFollowUp(tenantId, bookingIdText, { note, activityType, nextFollowUpDate, createdBy }) {
  return bookingRepository.insertFollowUp(tenantId, bookingIdText, note, activityType, nextFollowUpDate, createdBy);
}

async function getBookingBySourceQuotation(tenantId, quotationId) {
  const row = await bookingRepository.getBookingBySourceQuotation(tenantId, quotationId);
  return rowToBooking(row);
}

async function getActiveBookingsByCustomer(tenantId, customerId) {
  const rows = await bookingRepository.getActiveBookingsByCustomer(tenantId, customerId);
  return rows.map(rowToBooking);
}

module.exports = {
  listBookings,
  getBookingById,
  createBooking,
  updateBooking,
  softDeleteBooking,
  dashboardStats,
  computeAmounts,
  listBookingsPaged,
  getFollowUps,
  addFollowUp,
  getBookingBySourceQuotation,
  getActiveBookingsByCustomer,
};
