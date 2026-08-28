const { v4: uuidv4 } = require('uuid');
const bookingRepository = require('../repositories/bookingRepository');
const batchRepository = require('../repositories/batchRepository');
const expenseRepository = require('../repositories/expenseRepository');
const leadRepository = require('../repositories/leadRepository');
const customerService = require('./customerService');
const { rowToBooking } = require('../models/bookingSchema');
const { rowToBatch } = require('../models/batchSchema');

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
  const travelStatus = data.travelStatus || 'Confirming';
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

  const bookingObj = rowToBooking(row);
  if (bookingObj.travelStatus === 'Booked') {
    await autoGenerateExpensesFromTemplate(tenantId, bookingObj, createdBy);
  }
  return bookingObj;
}

async function updateBooking(tenantId, bookingId, updates, updatedByUser) {
  const existing = await getBookingById(tenantId, bookingId);
  if (!existing) {
    const err = new Error('Booking not found.');
    err.status = 404;
    throw err;
  }

  if (updates.travelStatus && ['Completed'].includes(updates.travelStatus)) {
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

  const updatedBooking = rowToBooking(row);
  if (updatedBooking.travelStatus === 'Booked') {
    await autoGenerateExpensesFromTemplate(tenantId, updatedBooking, updatedByUser);
  }
  return updatedBooking;
}

async function softDeleteBooking(tenantId, bookingId, updatedByUser) {
  return updateBooking(tenantId, bookingId, { deleted: true }, updatedByUser);
}

async function dashboardStats(tenantId, teamMemberName = null) {
  let bookings = await listBookings(tenantId);
  if (teamMemberName) {
    bookings = bookings.filter((b) => (b.teamMember || '') === teamMemberName);
  }
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  let totalRevenue = 0;
  let totalPaid = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let revenue30Days = 0;

  bookings.forEach((b) => {
    if (b.travelStatus !== 'Cancelled') {
      const rev = Number(b.totalAmount || 0);
      totalRevenue += rev;
      totalPaid += Number(b.paid || 0);
      const cost =
        Number(b.vendorHotelCost || 0) +
        Number(b.vendorFlightCost || 0) +
        Number(b.vendorTransportCost || 0) +
        Number(b.vendorOtherCost || 0);
      totalCost += cost;
      totalProfit += Number(b.netProfit || 0);

      const createdDate = b.bookingTimestamp ? new Date(b.bookingTimestamp).toISOString().slice(0, 10) : '';
      if (createdDate >= thirtyDaysAgoStr) {
        revenue30Days += rev;
      }
    }
  });

  const stats = {
    totalBookings: bookings.length,
    upcomingTrips: bookings.filter((b) => b.travelStatus === 'Booked' && b.departure >= today).length,
    completedTrips: bookings.filter((b) => b.travelStatus === 'Completed').length,
    cancelledTrips: bookings.filter((b) => b.travelStatus === 'Cancelled').length,
    todaysBookings: bookings.filter((b) => (b.bookingTimestamp || '').slice(0, 10) === today).length,
    totalRevenue,
    revenue30Days,
    totalPaid,
    totalCost,
    totalProfit,
  };

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.bookingTimestamp) - new Date(a.bookingTimestamp))
    .slice(0, 10);

  const upcomingBookings = bookings
    .filter((b) => b.departure >= today && b.travelStatus !== 'Cancelled')
    .sort((a, b) => a.departure.localeCompare(b.departure));

  // Bookings linked to a Group Tour batch collapse into a single "batch"
  // entry showing its total seat count, instead of one dashboard row per
  // traveler - individual (non-batch) bookings stay as their own rows.
  let upcomingDepartures;
  if (upcomingBookings.some((b) => b.batchId)) {
    const batches = (await batchRepository.listBatches(tenantId)).map(rowToBatch);
    const batchById = new Map(batches.map((b) => [b.id, b]));
    const seenBatchIds = new Set();
    const entries = [];

    for (const b of upcomingBookings) {
      const batch = b.batchId ? batchById.get(b.batchId) : null;
      if (!batch) {
        entries.push({ type: 'single', departure: b.departure, booking: b });
        continue;
      }
      if (seenBatchIds.has(batch.id)) continue;
      seenBatchIds.add(batch.id);
      entries.push({
        type: 'batch',
        departure: batch.departureDate,
        batch: {
          batchId: batch.batchId,
          name: batch.name,
          tripName: batch.tripName,
          confirmedSeats: batch.confirmedSeats,
          totalCapacity: batch.totalCapacity,
        },
      });
    }

    upcomingDepartures = entries
      .sort((a, b) => a.departure.localeCompare(b.departure))
      .slice(0, 10);
  } else {
    upcomingDepartures = upcomingBookings
      .slice(0, 10)
      .map((b) => ({ type: 'single', departure: b.departure, booking: b }));
  }

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

async function billingAnalytics(tenantId, teamMemberName = null, startDate = null, endDate = null) {
  let allBookings = await listBookings(tenantId, { includeDeleted: false });
  if (teamMemberName) {
    allBookings = allBookings.filter((b) => (b.teamMember || '') === teamMemberName);
  }
  if (startDate) {
    const start = new Date(startDate);
    allBookings = allBookings.filter((b) => new Date(b.createdAt) >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    allBookings = allBookings.filter((b) => new Date(b.createdAt) <= end);
  }
  
  // 1. Fetch all expenses for calculations
  const expenses = await expenseRepository.listExpenseRowsByTenant(tenantId);

  // Group batch expenses
  const batchExpensesTotal = {};
  expenses.forEach(e => {
    if (e.link_type === 'batch' && e.batch_id) {
      batchExpensesTotal[e.batch_id] = (batchExpensesTotal[e.batch_id] || 0) + Number(e.amount);
    }
  });

  // Calculate travelers in each batch
  const batchTravelersCount = {};
  allBookings.forEach(b => {
    if (b.batchId && b.travelStatus !== 'Cancelled') {
      batchTravelersCount[b.batchId] = (batchTravelersCount[b.batchId] || 0) + (b.members || 0);
    }
  });

  // Group booking expenses
  const directBookingExpenses = {};
  expenses.forEach(e => {
    if (e.link_type === 'booking' && e.booking_id) {
      directBookingExpenses[e.booking_id] = (directBookingExpenses[e.booking_id] || 0) + Number(e.amount);
    }
  });

  // Also get leads to count leads worked on per team member
  const leadCountRows = await leadRepository.countLeadsByAssignee(tenantId, { startDate, endDate });

  const teamLeads = {};
  for (const row of leadCountRows) {
    if (row.assigned_to) {
      teamLeads[row.assigned_to] = Number(row.lead_count);
    }
  }

  const tripStats = {};
  const monthlyStats = {};
  const teamStats = {};

  for (const b of allBookings) {
    // Only count confirmed/completed bookings for revenue
    if (b.travelStatus === 'Cancelled') {
      continue;
    }

    const revenue = b.totalAmount || 0;
    
    // Calculate dynamic vendor cost from expenses ledger
    let vendorCost = directBookingExpenses[b.id] || 0;
    if (vendorCost === 0) {
      vendorCost = Number(b.vendorHotelCost || 0) + Number(b.vendorFlightCost || 0) + Number(b.vendorTransportCost || 0) + Number(b.vendorOtherCost || 0);
    }
    if (b.batchId && batchExpensesTotal[b.batchId]) {
      const totalTravelers = batchTravelersCount[b.batchId] || 0;
      if (totalTravelers > 0) {
        const costPerTraveler = batchExpensesTotal[b.batchId] / totalTravelers;
        vendorCost += costPerTraveler * (b.members || 0);
      }
    }

    const profit = revenue - vendorCost;
    
    // Trip Wise
    const trip = b.trip || 'Uncategorized';
    if (!tripStats[trip]) tripStats[trip] = { trip, count: 0, members: 0, revenue: 0, vendorCost: 0, profit: 0 };
    tripStats[trip].count++;
    tripStats[trip].members += b.members;
    tripStats[trip].revenue += revenue;
    tripStats[trip].vendorCost += vendorCost;
    tripStats[trip].profit += profit;

    // Month Wise (By departure)
    const month = (b.departure || '').substring(0, 7) || 'Unknown';
    if (!monthlyStats[month]) monthlyStats[month] = { month, count: 0, revenue: 0, vendorCost: 0, profit: 0 };
    monthlyStats[month].count++;
    monthlyStats[month].revenue += revenue;
    monthlyStats[month].vendorCost += vendorCost;
    monthlyStats[month].profit += profit;

    // Team Wise
    const teamMember = b.teamMember || 'Unassigned';
    if (!teamStats[teamMember]) teamStats[teamMember] = { teamMember, leads: 0, bookingsClosed: 0, revenue: 0, profit: 0 };
    if (b.travelStatus === 'Booked' || b.travelStatus === 'Completed') {
      teamStats[teamMember].bookingsClosed++;
    }
    teamStats[teamMember].revenue += revenue;
    teamStats[teamMember].profit += profit;
  }

  // Merge leads count into teamStats
  for (const member of Object.keys(teamLeads)) {
    if (!teamStats[member]) {
      teamStats[member] = { teamMember: member, leads: 0, bookingsClosed: 0, revenue: 0, profit: 0 };
    }
    teamStats[member].leads = teamLeads[member];
  }

  const rawBookings = allBookings
    .filter(b => b.travelStatus !== 'Cancelled')
    .map(b => {
      let vendorCost = directBookingExpenses[b.id] || 0;
      if (vendorCost === 0) {
        vendorCost = Number(b.vendorHotelCost || 0) + Number(b.vendorFlightCost || 0) + Number(b.vendorTransportCost || 0) + Number(b.vendorOtherCost || 0);
      }
      if (b.batchId && batchExpensesTotal[b.batchId]) {
        const totalTravelers = batchTravelersCount[b.batchId] || 0;
        if (totalTravelers > 0) {
          const costPerTraveler = batchExpensesTotal[b.batchId] / totalTravelers;
          vendorCost += costPerTraveler * (b.members || 0);
        }
      }
      return {
        trip: b.trip,
        departure: b.departure,
        members: b.members,
        totalAmount: Number(b.totalAmount || 0),
        paid: Number(b.paid || 0),
        remaining: Number(b.remaining || 0),
        vendorCost: Number(vendorCost),
        netProfit: Number(b.totalAmount || 0) - vendorCost,
        travelStatus: b.travelStatus
      };
    });

  return {
    tripWise: Object.values(tripStats).sort((a, b) => b.revenue - a.revenue),
    monthWise: Object.values(monthlyStats).sort((a, b) => a.month.localeCompare(b.month)),
    teamWise: Object.values(teamStats).sort((a, b) => b.revenue - a.revenue),
    bookings: rawBookings,
  };
}

async function autoGenerateExpensesFromTemplate(tenantId, booking, createdBy) {
  try {
    const existingExpenses = await expenseRepository.listExpenses(tenantId);
    
    // Filter expenses linked to this booking
    const bookingExpenses = existingExpenses.filter((e) => e.booking_id === booking.id);
    const hasManualExpenses = bookingExpenses.some((e) => e.vendor_name !== 'Default Template Vendor');
    
    // Protect manual custom expenses
    if (hasManualExpenses) return;

    // Delete existing template auto-generated expenses to support updates (pax changes, etc.)
    for (const e of bookingExpenses) {
      if (e.vendor_name === 'Default Template Vendor') {
        await expenseRepository.deleteExpense(tenantId, e.id);
      }
    }

    let template = null;
    if (booking.costTemplateId) {
      template = await expenseRepository.getTemplateById(tenantId, booking.costTemplateId);
    }
    if (!template && booking.trip) {
      template = await expenseRepository.getPreferredTemplateByTripName(tenantId, booking.trip);
    }
    if (!template) return;

    const pax = Number(booking.members || 1);
    const categories = [
      { name: 'Hotel', field: 'hotel_cost_per_pax', title: 'Hotel Cost (Template)' },
      { name: 'Flight', field: 'flight_cost_per_pax', title: 'Flight Cost (Template)' },
      { name: 'Transport', field: 'transport_cost_per_pax', title: 'Transport Cost (Template)' },
      { name: 'Other', field: 'other_cost_per_pax', title: 'Other Cost (Template)' }
    ];

    for (const cat of categories) {
      const perPaxAmount = Number(template[cat.field] || 0);
      if (perPaxAmount > 0) {
        await expenseRepository.createExpense(tenantId, {
          title: `${cat.title} - ${booking.trip}`,
          amount: perPaxAmount * pax,
          category: cat.name,
          link_type: 'booking',
          booking_id: booking.id,
          batch_id: null,
          vendor_name: 'Default Template Vendor',
          status: 'Pending',
          created_by: createdBy || 'System Automation'
        });
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[bookingService] Error auto-generating template expenses:', err.message);
  }
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
  billingAnalytics,
};
