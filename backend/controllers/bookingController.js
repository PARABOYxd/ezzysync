const bookingService = require('../services/bookingService');
const auditService = require('../services/auditService');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { status, trip, teamMember, departureFrom, departureTo, createdFrom, createdTo, search, sort } = req.query;

    const result = await bookingService.listBookingsPaged(req.user.tenantId, {
      page,
      limit,
      status,
      trip,
      teamMember,
      departureFrom,
      departureTo,
      createdFrom,
      createdTo,
      search,
      sort,
    });

    res.json({
      bookings: result.bookings,
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
    const booking = await bookingService.getBookingById(req.user.tenantId, req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const booking = await bookingService.createBooking(req.user.tenantId, req.body, req.user.email);
    await auditService.logAction(req, 'CREATE_LEAD', { bookingId: booking.bookingId, customerName: booking.customerName, trip: booking.trip });
    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const booking = await bookingService.updateBooking(req.user.tenantId, req.params.id, req.body, req.user.name || req.user.email);
    await auditService.logAction(req, 'UPDATE_LEAD', { bookingId: req.params.id, updates: Object.keys(req.body) });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await bookingService.softDeleteBooking(req.user.tenantId, req.params.id, req.user.name || req.user.email);
    await auditService.logAction(req, 'DELETE_LEAD', { bookingId: req.params.id });
    res.json({ message: 'Booking deleted.' });
  } catch (err) {
    next(err);
  }
}

async function exportCSV(req, res, next) {
  try {
    const bookings = await bookingService.listBookings(req.user.tenantId);
    const headers = [
      'Booking ID', 'Customer', 'Email', 'Phone', 'Trip', 'Departure', 'Members',
      'Total Amount', 'Paid', 'Remaining', 'Travel Status', 'Payment Status',
    ];
    const lines = [headers.join(',')];
    bookings.forEach((b) => {
      lines.push(
        [b.bookingId, b.customerName, b.email, b.phone, b.trip, b.departure, b.members,
          b.totalAmount, b.paid, b.remaining, b.travelStatus, b.paymentStatus]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      );
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bookings.csv"');
    res.send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
}

async function listFollowUps(req, res, next) {
  try {
    const logs = await bookingService.getFollowUps(req.user.tenantId, req.params.id);
    res.json({ followUps: logs });
  } catch (err) {
    next(err);
  }
}

async function createFollowUp(req, res, next) {
  try {
    const { note, activityType, nextFollowUpDate } = req.body;
    if (!note) {
      return res.status(400).json({ message: 'Note content is required.' });
    }
    const log = await bookingService.addFollowUp(req.user.tenantId, req.params.id, {
      note,
      activityType: activityType || 'note',
      nextFollowUpDate,
      createdBy: req.user.name,
    });
    
    await auditService.logAction(req, 'CREATE_FOLLOW_UP_LOG', { bookingId: req.params.id, activityType });
    res.status(201).json({ followUp: log });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove, exportCSV, listFollowUps, createFollowUp };
