const bookingService = require('../services/bookingService');
const auditService = require('../services/auditService');
const settingsService = require('../services/settingsService');
const invoiceService = require('../services/invoiceService');
const logger = require('../utils/logger').child({ module: 'bookingController' });
const { shouldScopeToSelf } = require('../config/permissions');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { status, trip, departureFrom, departureTo, createdFrom, createdTo, search, sort } = req.query;
    const teamMember = shouldScopeToSelf(req.user, 'bookings') ? req.user.name : req.query.teamMember;

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
    if (shouldScopeToSelf(req.user, 'bookings') && booking.teamMember !== req.user.name) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const booking = await bookingService.createBooking(req.user.tenantId, req.body, req.user.email);
    await auditService.logAction(req, 'CREATE_LEAD', { bookingId: booking.bookingId, customerName: booking.customerName, trip: booking.trip });

    // Auto invoice sharing - Settings > Invoice > "Auto-send Invoice via
    // Email" / "via WhatsApp", each independently toggleable. A failure here
    // must never fail the booking-creation response - the booking already
    // exists either way.
    const settings = await settingsService.getSettings(req.user.tenantId);
    if (settings && (settings.autoSendInvoiceEmail || settings.autoSendInvoiceWhatsapp)) {
      try {
        const result = await invoiceService.sendInvoiceForBooking(req.user.tenantId, booking, settings, {
          userId: req.user.userId || req.user.id,
          channels: { email: !!settings.autoSendInvoiceEmail, whatsapp: !!settings.autoSendInvoiceWhatsapp },
        });
        logger.info(
          { bookingId: booking.bookingId, emailSent: result.emailSent, whatsappSent: result.whatsappSent },
          '[Auto-Invoice] Invoice auto-send attempted'
        );
        await auditService.logAction(req, 'AUTO_SEND_INVOICE', {
          bookingId: booking.bookingId,
          email: booking.email,
          emailSent: result.emailSent,
          whatsappSent: result.whatsappSent,
        });
      } catch (err) {
        logger.error({ err, bookingId: booking.bookingId }, '[Auto-Invoice] Failed to auto-send invoice');
      }
    }

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
    let bookings = await bookingService.listBookings(req.user.tenantId);
    if (shouldScopeToSelf(req.user, 'bookings')) {
      bookings = bookings.filter((b) => b.teamMember === req.user.name);
    }
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

async function listPayments(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.user.tenantId, req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (shouldScopeToSelf(req.user, 'bookings') && booking.teamMember !== req.user.name) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    const payments = await bookingService.getPayments(req.user.tenantId, req.params.id);
    res.json({ payments });
  } catch (err) {
    next(err);
  }
}

async function addPayment(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.user.tenantId, req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (shouldScopeToSelf(req.user, 'bookings') && booking.teamMember !== req.user.name) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const { amount, method, reference, paidOn, notes } = req.body;
    const result = await bookingService.addPayment(req.user.tenantId, req.params.id, {
      amount,
      method,
      reference,
      paidOn,
      notes,
      createdBy: req.user.name || req.user.email,
    });

    await auditService.logAction(req, 'ADD_BOOKING_PAYMENT', { bookingId: req.params.id, amount, method });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function removePayment(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.user.tenantId, req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (shouldScopeToSelf(req.user, 'bookings') && booking.teamMember !== req.user.name) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const result = await bookingService.removePayment(req.user.tenantId, req.params.id, req.params.paymentId);
    await auditService.logAction(req, 'DELETE_BOOKING_PAYMENT', { bookingId: req.params.id, paymentId: req.params.paymentId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getVoucherPdf(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.user.tenantId, req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (shouldScopeToSelf(req.user, 'bookings') && booking.teamMember !== req.user.name) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const type = (req.query.type === 'cab' || req.query.type === 'transport') ? 'cab' : 'hotel';
    const { buffer, filename } = await bookingService.generateVoucherPdf(req.user.tenantId, req.params.id, type);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

async function sendVoucher(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.user.tenantId, req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (shouldScopeToSelf(req.user, 'bookings') && booking.teamMember !== req.user.name) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const { type, customNotes } = req.body;
    const voucherType = (type === 'cab' || type === 'transport') ? 'cab' : 'hotel';

    const result = await bookingService.sendVoucherToWhatsApp(req.user.tenantId, req.params.id, {
      type: voucherType,
      customNotes,
      userId: req.user.userId || req.user.id,
    });

    await auditService.logAction(req, 'SEND_BOOKING_VOUCHER', {
      bookingId: req.params.id,
      type: voucherType,
      phone: result.phone,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function sendReminder(req, res, next) {
  try {
    const { type, daysAhead = 1, channel = 'both', customNotes = '' } = req.body;
    const reminderService = require('../services/reminderService');

    let result;
    if (type === 'payment' || type === 'payment_due') {
      result = await reminderService.sendPaymentReminder(req.user.tenantId, req.params.id, {
        channel,
        customNotes,
        force: true, // Manual action from UI is always forced
        userId: req.user.userId || req.user.id,
      });
    } else {
      result = await reminderService.sendDepartureReminder(req.user.tenantId, req.params.id, {
        daysAhead: Number(daysAhead) || 1,
        channel,
        customNotes,
        force: true, // Manual action from UI is always forced
        userId: req.user.userId || req.user.id,
      });
    }

    await auditService.logAction(req, 'SEND_BOOKING_REMINDER', {
      bookingId: req.params.id,
      type: type || 'departure',
      channel,
      success: result.success,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  exportCSV,
  listFollowUps,
  createFollowUp,
  listPayments,
  addPayment,
  removePayment,
  getVoucherPdf,
  sendVoucher,
  sendReminder,
};
