const { v4: uuidv4 } = require('uuid');
const bookingRepository = require('../repositories/bookingRepository');
const batchRepository = require('../repositories/batchRepository');
const expenseRepository = require('../repositories/expenseRepository');
const leadRepository = require('../repositories/leadRepository');
const customerService = require('./customerService');
const { rowToBooking, rowToPayment } = require('../models/bookingSchema');
const { rowToBatch } = require('../models/batchSchema');
const { query } = require('../config/db');
const settingsService = require('./settingsService');
const whatsappRepository = require('../repositories/whatsappRepository');
const voucherPdfService = require('./voucherPdfService');
const r2Service = require('./r2Service');
const whatsappSendService = require('./whatsappSendService');
const emailService = require('./emailService');
const logger = require('../utils/logger').child({ module: 'bookingService' });

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
  // Also reached from lead conversion, which has no request validator.
  if (!Number.isFinite(paid) || paid < 0) {
    const err = new Error('Amount paid must be a number of 0 or more.');
    err.status = 400;
    throw err;
  }
  const travelStatus = data.travelStatus || 'Confirming';
  const paymentStatus = data.paymentStatus || (remaining <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending');

  const customerId = await customerService.upsertFromContact(tenantId, {
    name: data.customerName, email: data.email, phone: data.phone,
  });

  const row = await bookingRepository.insertBooking(
    tenantId, bookingId, data, now, paid, totalAmount, remaining, travelStatus, paymentStatus, createdBy, customerId
  );

  // Best-effort: links this booking into any existing WhatsApp thread with
  // this phone number, so the chat's "Active Booking" card and voucher
  // actions have something to show instead of staying permanently empty.
  if (data.phone) {
    try {
      await whatsappRepository.linkBookingToChatByPhone(tenantId, data.phone, row.id);
    } catch (err) {
      logger.warn({ err, tenantId, bookingId }, 'Failed to link booking to a WhatsApp chat');
    }
  }

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
    try {
      await sendBookingConfirmation(tenantId, bookingObj);
    } catch (err) {
      logger.error({ err, bookingId: bookingObj.bookingId }, '[Booking Confirmation] Unexpected failure on create');
    }
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

  // The refund amount is money that actually left the business, so it can
  // never exceed what the customer actually paid in - the UI enforces this
  // as a field max, which is only ever a hint, not a guarantee.
  if (updates.refundedAmount !== undefined) {
    const paidAmount = updates.paid !== undefined ? Number(updates.paid) : existing.paid;
    if (Number(updates.refundedAmount) > paidAmount) {
      const err = new Error(`Cannot refund more than the ₹${paidAmount} collected on this booking.`);
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
  // Only on the transition into Booked - not on every subsequent edit to an
  // already-confirmed trip, which would otherwise re-send a confirmation
  // every time an agent tweaks an unrelated field like notes.
  if (statusChanged && updatedBooking.travelStatus === 'Booked') {
    try {
      await sendBookingConfirmation(tenantId, updatedBooking);
    } catch (err) {
      logger.error({ err, bookingId: updatedBooking.bookingId }, '[Booking Confirmation] Unexpected failure on update');
    }
  }
  return updatedBooking;
}

async function softDeleteBooking(tenantId, bookingId, updatedByUser) {
  return updateBooking(tenantId, bookingId, { deleted: true }, updatedByUser);
}

async function dashboardStats(tenantId, teamMemberName = null) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  // The headline numbers used to come from pulling every booking into Node
  // and summing/counting them in a loop - fine at a few hundred rows, a full
  // table scan into application memory on every dashboard load once a tenant
  // has thousands. Postgres does the same arithmetic in one pass instead.
  const counts = await bookingRepository.getDashboardCounts(tenantId, {
    teamMember: teamMemberName,
    today,
    thirtyDaysAgo: thirtyDaysAgoStr,
    sixtyDaysAgo: sixtyDaysAgoStr,
  });

  const revenue30Days = Number(counts.revenue_30_days);
  const revenuePrev30Days = Number(counts.revenue_prev_30_days);
  const stats = {
    totalBookings: Number(counts.total_bookings),
    upcomingTrips: Number(counts.upcoming_trips),
    completedTrips: Number(counts.completed_trips),
    cancelledTrips: Number(counts.cancelled_trips),
    todaysBookings: Number(counts.todays_bookings),
    totalRevenue: Number(counts.total_revenue),
    revenue30Days,
    revenuePrev30Days,
    // null when there is nothing to compare against - "+100%" against zero
    // (what the card used to hardcode) says nothing true.
    revenue30DaysChangePct: revenuePrev30Days > 0
      ? Math.round(((revenue30Days - revenuePrev30Days) / revenuePrev30Days) * 100)
      : null,
    totalPaid: Number(counts.total_paid),
    totalCost: Number(counts.total_cost),
    totalProfit: Number(counts.total_profit),
  };

  const recentBookings = (
    await bookingRepository.listRecentBookings(tenantId, { teamMember: teamMemberName, limit: 10 })
  ).map(rowToBooking);

  // Only candidates for the panel below (not-cancelled, today or later) -
  // not every booking the tenant has ever made. The batch-collapsing logic
  // still runs in JS since it needs tour_batches data this query doesn't have,
  // but it now runs over at most `limit` rows instead of the tenant's entire
  // history.
  const upcomingBookings = (
    await bookingRepository.listUpcomingBookingCandidates(tenantId, { teamMember: teamMemberName, today, limit: 200 })
  ).map(rowToBooking);

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

async function getPayments(tenantId, bookingIdText) {
  const rows = await bookingRepository.listPayments(tenantId, bookingIdText);
  return rows.map(rowToPayment);
}

async function addPayment(tenantId, bookingIdText, { amount, method, reference, paidOn, notes, createdBy }) {
  if (!(Number(amount) > 0)) {
    const err = new Error('Payment amount must be greater than zero.');
    err.status = 400;
    throw err;
  }
  const result = await bookingRepository.insertPayment(tenantId, bookingIdText, {
    amount: Number(amount),
    method,
    reference,
    paidOn: paidOn || new Date().toISOString().split('T')[0],
    notes,
    createdBy,
  });
  if (!result) {
    const err = new Error('Booking not found.');
    err.status = 404;
    throw err;
  }
  return {
    payment: rowToPayment(result.payment),
    paid: result.paid,
    remaining: result.remaining,
    paymentStatus: result.paymentStatus,
  };
}

async function removePayment(tenantId, bookingIdText, paymentId) {
  const result = await bookingRepository.deletePayment(tenantId, bookingIdText, paymentId);
  if (!result) {
    const err = new Error('Payment not found.');
    err.status = 404;
    throw err;
  }
  return result;
}

async function getBookingBySourceQuotation(tenantId, quotationId) {
  const row = await bookingRepository.getBookingBySourceQuotation(tenantId, quotationId);
  return rowToBooking(row);
}

async function getActiveBookingsByCustomer(tenantId, customerId) {
  const rows = await bookingRepository.getActiveBookingsByCustomer(tenantId, customerId);
  return rows.map(rowToBooking);
}

function toDay(value) {
  return new Date(value).toISOString().slice(0, 10);
}

async function billingAnalytics(tenantId, teamMemberName = null, startDate = null, endDate = null) {
  let allBookings = await listBookings(tenantId, { includeDeleted: false });
  if (teamMemberName) {
    allBookings = allBookings.filter((b) => (b.teamMember || '') === teamMemberName);
  }
  // Bookings have no created_at column - booking_timestamp is the creation
  // time. Filtering on the non-existent createdAt made every date range
  // return nothing. Compared as YYYY-MM-DD strings, the same way the dashboard
  // counts do, so the end date is inclusive of the whole day.
  const startDay = startDate ? toDay(startDate) : null;
  const endDay = endDate ? toDay(endDate) : null;
  if (startDay || endDay) {
    allBookings = allBookings.filter((b) => {
      const day = (b.bookingTimestamp || '').slice(0, 10);
      if (!day) return false;
      if (startDay && day < startDay) return false;
      if (endDay && day > endDay) return false;
      return true;
    });
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
        bookingId: b.bookingId,
        // The page's Team Member filter matches on this - it was missing, so
        // picking any member (or a team member viewing their own) showed zero.
        teamMember: b.teamMember || '',
        bookedOn: (b.bookingTimestamp || '').slice(0, 10),
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
    // Scoped to this one booking - this runs on every create/update that
    // lands as 'Booked', and listExpenses() would pull and JOIN the tenant's
    // entire expense ledger just to find the handful of rows that matter here.
    const bookingExpenses = await expenseRepository.listExpensesByBookingId(tenantId, booking.id);
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

/**
 * Fires once a booking first reaches 'Booked' - on direct creation as Booked,
 * or on an update that transitions it there. Never called merely because a
 * booking happens to already be Booked, so editing an already-confirmed trip
 * doesn't re-send a confirmation. Both channels are attempted independently
 * and a failure on one (or both) never bubbles up to the caller - the booking
 * itself already succeeded either way.
 */
async function sendBookingConfirmation(tenantId, booking, { userId = null } = {}) {
  const settings = await settingsService.getSettings(tenantId);
  const companyName = settings.companyName || 'EzzySync';
  const result = { emailSent: false, emailError: null, whatsappSent: false, whatsappError: null };

  if (booking.phone) {
    try {
      const chat = await whatsappSendService.findOrStartChat(tenantId, {
        phone: booking.phone,
        customerName: booking.customerName,
      });
      const messageText = `Hello *${booking.customerName}*! ✅\n\nYour booking for *${booking.trip}* is confirmed!\n\n📅 Departure: ${booking.departure || 'To be confirmed'}\n👥 Travelers: ${booking.members}\n💰 Total: ₹${booking.totalAmount}\n💳 Paid: ₹${booking.paid}\n\nWe're excited to have you travel with us — reach out here anytime.\n\n— ${companyName}`;
      await whatsappSendService.sendText(tenantId, { chat, userId, messageText });
      result.whatsappSent = true;
    } catch (err) {
      result.whatsappError = err.code === 'WHATSAPP_WINDOW_CLOSED'
        ? 'This customer has not messaged on WhatsApp in the last 24 hours, so Meta blocked the confirmation.'
        : err.message;
      logger.warn({ err, bookingId: booking.bookingId }, '[Booking Confirmation] Could not send via WhatsApp');
    }
  }

  if (booking.email) {
    const html = `
      <p>Hello ${booking.customerName},</p>
      <p>Your booking for <strong>${booking.trip}</strong> is confirmed!</p>
      <ul>
        <li>Departure: ${booking.departure || 'To be confirmed'}</li>
        <li>Travelers: ${booking.members}</li>
        <li>Total Amount: ₹${booking.totalAmount}</li>
        <li>Paid: ₹${booking.paid}</li>
      </ul>
      <p>We're excited to have you travel with us!</p>
    `;
    try {
      await emailService.sendMail({
        tenantId,
        to: booking.email,
        subject: `Booking Confirmed — ${booking.trip}`,
        html,
      });
      result.emailSent = true;
    } catch (err) {
      result.emailError = err.message;
      logger.warn({ err, bookingId: booking.bookingId }, '[Booking Confirmation] Could not send email');
    }
  }

  return result;
}

async function fetchHotelsForBooking(tenantId, booking) {
  const hotelIds = new Set();
  if (booking.hotelId) hotelIds.add(booking.hotelId);
  if (Array.isArray(booking.hotelsStay)) {
    booking.hotelsStay.forEach((h) => {
      if (h.hotelId) hotelIds.add(h.hotelId);
    });
  }

  const hotelsMap = {};
  if (hotelIds.size > 0) {
    const idsArray = Array.from(hotelIds);
    const placeholders = idsArray.map((_, i) => `$${i + 2}`).join(',');
    const hotelRes = await query(`SELECT * FROM hotels WHERE tenant_id = $1 AND id IN (${placeholders})`, [tenantId, ...idsArray]);
    hotelRes.rows.forEach((h) => {
      hotelsMap[h.id] = h;
    });
  }
  return hotelsMap;
}

async function generateVoucherPdf(tenantId, bookingId, type = 'hotel') {
  const booking = await getBookingById(tenantId, bookingId);
  if (!booking) {
    const err = new Error('Booking not found.');
    err.status = 404;
    throw err;
  }

  const hotelsMap = await fetchHotelsForBooking(tenantId, booking);
  const primaryHotel = hotelsMap[booking.hotelId] || Object.values(hotelsMap)[0] || null;
  const settings = await settingsService.getSettings(tenantId);
  const buffer = await voucherPdfService.generateVoucherPDF({
    booking,
    hotel: primaryHotel,
    hotelsMap,
    settings,
    type,
  });

  const isHotel = type === 'hotel';
  const prefix = isHotel ? 'Hotel-Voucher' : 'Cab-Voucher';
  const filename = `${prefix}-${booking.bookingId}.pdf`;

  return { buffer, filename, booking };
}

async function sendVoucherToWhatsApp(tenantId, bookingId, { type = 'hotel', customNotes = '', userId = null } = {}) {
  const booking = await getBookingById(tenantId, bookingId);
  if (!booking) {
    const err = new Error('Booking not found.');
    err.status = 404;
    throw err;
  }

  const hotelsMap = await fetchHotelsForBooking(tenantId, booking);
  const primaryHotel = hotelsMap[booking.hotelId] || Object.values(hotelsMap)[0] || null;
  const settings = await settingsService.getSettings(tenantId);
  const pdfBuffer = await voucherPdfService.generateVoucherPDF({
    booking,
    hotel: primaryHotel,
    hotelsMap,
    settings,
    type,
  });

  const isHotel = type === 'hotel';
  const prefix = isHotel ? 'Hotel-Voucher' : 'Cab-Voucher';
  const fileName = `${prefix}-${booking.bookingId}.pdf`;
  const folder = `vouchers/${tenantId}/${isHotel ? 'hotels' : 'transports'}`;

  // Stored once, privately - it carries the customer's name, trip and driver
  // phone numbers. The send below reuses this file instead of uploading again.
  const storedRef = await r2Service.uploadPrivateFile(pdfBuffer, fileName, 'application/pdf', folder);

  // Opens the chat on whichever connection can deliver, with the number in
  // WhatsApp form (bookings usually hold a bare 10-digit number).
  const chat = await whatsappSendService.findOrStartChat(tenantId, {
    phone: booking.phone,
    customerName: booking.customerName,
  });

  let multiSummary = '';
  if (isHotel) {
    const stays = Array.isArray(booking.hotelsStay) && booking.hotelsStay.length > 0 ? booking.hotelsStay : [];
    if (stays.length > 1) {
      multiSummary = '\n\n🏨 *Confirmed Accommodation Stays:*\n' + stays.map((h, idx) => {
        const name = hotelsMap[h.hotelId]?.name || `Property #${idx + 1}`;
        const conf = h.hotelConfirmationNo ? ` (Ref: ${h.hotelConfirmationNo})` : '';
        return `${idx + 1}. *${name}*${conf}`;
      }).join('\n');
    }
  } else {
    const cabs = Array.isArray(booking.transports) && booking.transports.length > 0 ? booking.transports : [];
    if (cabs.length > 1) {
      multiSummary = '\n\n🚗 *Assigned Cabs & Chauffeurs:*\n' + cabs.map((t, idx) => {
        const v = t.vehicleType || 'Cab';
        const no = t.vehicleNumber ? ` (${t.vehicleNumber})` : '';
        const d = t.driverName ? ` - ${t.driverName}` : '';
        const p = t.driverPhone ? ` (+${t.driverPhone.replace(/[^0-9]/g, '')})` : '';
        return `${idx + 1}. *${v}*${no}${d}${p}`;
      }).join('\n');
    }
  }

  const voucherText = isHotel
    ? `Hello *${booking.customerName}*! 🏨\n\nYour confirmed *Hotel Reservation Voucher* for *${booking.trip}* is ready! Please find the official voucher PDF attached.${multiSummary}\n\n${customNotes ? `${customNotes}\n\n` : ''}Wish you a wonderful stay! ✈️\n— ${settings.companyName || 'EzzySync'}`
    : `Hello *${booking.customerName}*! 🚗\n\nYour *Transport & Chauffeur Voucher* for *${booking.trip}* is ready! Please find the vehicle & pickup details attached in the PDF.${multiSummary}\n\n${customNotes ? `${customNotes}\n\n` : ''}Have a safe and happy journey! 🌟\n— ${settings.companyName || 'EzzySync'}`;

  let whatsappResult = null;
  let sentToWhatsApp = false;
  let whatsappError = null;
  try {
    whatsappResult = await whatsappSendService.sendText(tenantId, {
      chat,
      userId,
      messageText: voucherText,
      mediaBuffer: pdfBuffer,
      fileName,
      mimeType: 'application/pdf',
      storedMediaRef: storedRef,
    });
    sentToWhatsApp = true;
  } catch (err) {
    // The generic window message says "pick a template below", which means
    // nothing on the booking screen.
    whatsappError = err.code === 'WHATSAPP_WINDOW_CLOSED'
      ? 'This customer has not messaged you on WhatsApp in the last 24 hours, so Meta blocks ' +
        'attachments. Open their chat, send a template to restart the conversation, and send ' +
        'the voucher again once they reply. Download the PDF to share it another way meanwhile.'
      : err.message;
    logger.warn({ err, tenantId, bookingId }, 'Voucher PDF generated but could not send via WhatsApp');
  }

  return {
    success: true,
    pdfUrl: r2Service.resolveMediaUrl(storedRef),
    fileName,
    sentToWhatsApp,
    whatsappError,
    voucherType: type,
    whatsappResult,
  };
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
  getPayments,
  addPayment,
  removePayment,
  getBookingBySourceQuotation,
  getActiveBookingsByCustomer,
  billingAnalytics,
  generateVoucherPdf,
  sendVoucherToWhatsApp,
};
