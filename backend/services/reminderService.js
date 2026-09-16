const bookingRepository = require('../repositories/bookingRepository');
const hotelRepository = require('../repositories/hotelRepository');
const settingsService = require('./settingsService');
const whatsappSendService = require('./whatsappSendService');
const emailService = require('./emailService');
const planService = require('./planService');
const { rowToBooking } = require('../models/bookingSchema');
const logger = require('../utils/logger').child({ module: 'reminder_service' });

/**
 * Formats a localized Indian currency string.
 */
function formatRupees(val) {
  return Number(val || 0).toLocaleString('en-IN');
}

/**
 * Formats a clean date string (e.g. 20 Sep 2026).
 */
function formatReadableDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Builds the WhatsApp message for departure reminders (T-1 or T-3).
 */
function buildDepartureWhatsAppText({ booking, daysAhead, hotelsMap = {}, settings = {}, customNotes = '' }) {
  const isTomorrow = Number(daysAhead) === 1;
  const departureDate = formatReadableDate(booking.departure);
  const companyName = settings.companyName || 'EzzySync Travel';
  const helpline = settings.whatsappNumber || settings.phone || '';

  if (isTomorrow) {
    let cabSection = '';
    const transports = Array.isArray(booking.transports) && booking.transports.length > 0 ? booking.transports : [];
    if (transports.length > 0) {
      cabSection = '\n\n🚗 *Assigned Vehicle & Chauffeur Details:*\n' + transports.map((t, idx) => {
        const vehicle = t.vehicleType || 'Cab';
        const num = t.vehicleNumber ? ` (${t.vehicleNumber})` : '';
        const driver = t.driverName ? `\n   • Driver: *${t.driverName}*` : '';
        const phone = t.driverPhone ? `\n   • Contact: *${t.driverPhone}*` : '';
        const pickup = (t.pickupLocation || booking.pickup) ? `\n   • Pickup Spot: ${t.pickupLocation || booking.pickup}` : '';
        const time = t.pickupTime ? `\n   • Pickup Time: ${t.pickupTime}` : '';
        return `${idx + 1}. *${vehicle}*${num}${driver}${phone}${time}${pickup}`;
      }).join('\n');
    }

    let hotelSection = '';
    const hotelsStay = Array.isArray(booking.hotelsStay) && booking.hotelsStay.length > 0 ? booking.hotelsStay : [];
    if (hotelsStay.length > 0) {
      hotelSection = '\n\n🏨 *Hotel Accommodations:*\n' + hotelsStay.map((h, idx) => {
        const name = hotelsMap[h.hotelId]?.name || h.hotelName || `Stay #${idx + 1}`;
        const room = h.roomCategory ? ` (${h.roomCategory})` : '';
        const meal = h.mealPlan ? ` [Plan: ${h.mealPlan}]` : '';
        const checkIn = h.hotelCheckIn ? ` - Check-in: ${formatReadableDate(h.hotelCheckIn)}` : '';
        return `${idx + 1}. *${name}*${room}${meal}${checkIn}`;
      }).join('\n');
    }

    let paymentAlert = '';
    if (Number(booking.remaining || 0) > 0) {
      paymentAlert = `\n\n⚠️ *Pending Balance Reminder:*\nA pending balance of *₹${formatRupees(booking.remaining)}* is due on this booking. Please ensure payment is settled.`;
    }

    return (
      `Hello *${booking.customerName}*! 🎉\n\n` +
      `Your trip to *${booking.trip}* departs *TOMORROW*! ✈️\n` +
      `• *Travel Date:* ${departureDate}\n` +
      `• *Booking ID:* ${booking.bookingId}\n` +
      `• *Travelers:* ${booking.members || 1} Person(s)` +
      `${cabSection}` +
      `${hotelSection}` +
      `${paymentAlert}\n\n` +
      `📌 *Important Reminders:*\n` +
      `• Carry valid original Photo ID proofs (Aadhar/Passport) for all travelers.\n` +
      `• Please reach the pickup spot 15 minutes before scheduled time.\n` +
      (helpline ? `• For immediate assistance on the road: *${helpline}*\n` : '') +
      (customNotes ? `\n*Note:* ${customNotes}\n` : '') +
      `\nWish you a safe and memorable journey! 🌟\n— *${companyName}*`
    );
  }

  // T-3 Days Checklist Reminder
  let paymentAlert = '';
  if (Number(booking.remaining || 0) > 0) {
    paymentAlert = `\n\n⚠️ *Pending Balance Notice:*\nA pending balance of *₹${formatRupees(booking.remaining)}* is due. Please settle before your departure.`;
  }

  return (
    `Hello *${booking.customerName}*! 🌟\n\n` +
    `Your exciting trip to *${booking.trip}* is just *${daysAhead} days away*!\n` +
    `• *Departure Date:* ${departureDate}\n` +
    `• *Booking Reference:* ${booking.bookingId}\n` +
    `• *Travelers:* ${booking.members || 1} Person(s)\n\n` +
    `🧳 *Quick Preparation Checklist:*\n` +
    `1. Keep original photo IDs ready for hotel check-ins.\n` +
    `2. Keep copies of your itinerary and flight/train tickets.\n` +
    `3. Pack according to the destination's current weather.` +
    `${paymentAlert}\n\n` +
    (customNotes ? `*Special Note:* ${customNotes}\n\n` : '') +
    `We are putting the final touches on your arrangements! Feel free to reach out if you have any questions.\n\n` +
    `Warm regards,\n— *${companyName}*`
  );
}

/**
 * Builds HTML for departure reminder email.
 */
function buildDepartureEmailHtml({ booking, daysAhead, hotelsMap = {}, settings = {}, customNotes = '' }) {
  const isTomorrow = Number(daysAhead) === 1;
  const departureDate = formatReadableDate(booking.departure);
  const companyName = settings.companyName || 'EzzySync Travel';
  const urgency = isTomorrow ? 'TOMORROW' : `in ${daysAhead} days`;

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:16px;color:#334155">
      <div style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:24px;border-radius:12px;text-align:center;margin-bottom:20px">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:800">✈️ Trip Departure Reminder</h1>
        <p style="color:#ccfbf1;margin:6px 0 0;font-size:14px">Your trip to <strong>${booking.trip}</strong> departs ${urgency}!</p>
      </div>

      <div style="background:#ffffff;border-radius:12px;padding:22px;border:1px solid #e2e8f0;margin-bottom:16px">
        <p style="font-size:15px;color:#0f172a;margin-top:0">Dear <strong>${booking.customerName}</strong>,</p>
        <p style="font-size:14px;line-height:1.6;color:#475569">
          This is a friendly reminder that your upcoming travel package is scheduled to begin <strong>${urgency}</strong> (${departureDate}).
        </p>

        <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:16px;margin:18px 0">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:5px 0;color:#64748b;font-weight:600;width:140px">Trip Destination:</td><td style="color:#0f172a;font-weight:700">${booking.trip}</td></tr>
            <tr><td style="padding:5px 0;color:#64748b;font-weight:600">Departure Date:</td><td style="color:#0f172a;font-weight:700">${departureDate}</td></tr>
            <tr><td style="padding:5px 0;color:#64748b;font-weight:600">Booking ID:</td><td style="color:#0f172a;font-family:monospace;font-weight:700">${booking.bookingId}</td></tr>
            <tr><td style="padding:5px 0;color:#64748b;font-weight:600">Travelers:</td><td style="color:#0f172a">${booking.members || 1} Person(s)</td></tr>
            ${booking.pickup ? `<tr><td style="padding:5px 0;color:#64748b;font-weight:600">Pickup Spot:</td><td style="color:#0f172a">${booking.pickup}</td></tr>` : ''}
          </table>
        </div>

        ${Number(booking.remaining || 0) > 0 ? `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin:16px 0;font-size:13px;color:#991b1b">
            <strong>⚠️ Pending Balance Notice:</strong> A balance of ₹${formatRupees(booking.remaining)} is remaining. Please ensure payment is completed prior to departure.
          </div>
        ` : ''}

        ${customNotes ? `<div style="background:#f8fafc;border-left:3px solid #0d9488;padding:10px 14px;margin:16px 0;font-size:13px;color:#475569"><strong>Special Instructions:</strong> ${customNotes}</div>` : ''}

        <p style="font-size:13px;line-height:1.5;color:#64748b">
          Please carry a valid government-issued photo ID (Aadhaar / Passport) for hotel check-ins. If you need any assistance, reach out to our team immediately.
        </p>

        <p style="font-size:14px;color:#0f172a;margin:24px 0 0">
          Warm regards,<br/>
          <strong>${companyName}</strong>
        </p>
      </div>
    </div>
  `;
}

/**
 * Builds the WhatsApp message for payment due reminders.
 */
function buildPaymentWhatsAppText({ booking, settings = {}, customNotes = '' }) {
  const companyName = settings.companyName || 'EzzySync Travel';
  const helpline = settings.whatsappNumber || settings.phone || '';
  const departureDate = formatReadableDate(booking.departure);

  return (
    `Hello *${booking.customerName}*! 💳\n\n` +
    `This is a friendly reminder regarding your pending payment for booking *#${booking.bookingId}* (*${booking.trip}*).\n\n` +
    `📊 *Payment Breakdown:*\n` +
    `• Total Package: ₹${formatRupees(booking.totalAmount)}\n` +
    `• Amount Paid: ₹${formatRupees(booking.paid)}\n` +
    `• *Remaining Balance:* *₹${formatRupees(booking.remaining)}*\n` +
    (departureDate ? `• Departure Date: ${departureDate}\n` : '') +
    `\n` +
    `To ensure your hotel reservation vouchers and cab bookings proceed without interruption, kindly clear the balance at your earliest convenience.\n` +
    (customNotes ? `\n*Note:* ${customNotes}\n` : '') +
    (helpline ? `\nFor payment details or invoice assistance, message us here: *${helpline}*\n` : '') +
    `\nThank you for choosing *${companyName}*! 🙏`
  );
}

/**
 * Builds HTML for payment due email.
 */
function buildPaymentEmailHtml({ booking, settings = {}, customNotes = '' }) {
  const companyName = settings.companyName || 'EzzySync Travel';
  const departureDate = formatReadableDate(booking.departure);

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:16px;color:#334155">
      <div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:24px;border-radius:12px;text-align:center;margin-bottom:20px">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:800">💳 Payment Due Reminder</h1>
        <p style="color:#94a3b8;margin:6px 0 0;font-size:14px">Booking Reference: <strong>${booking.bookingId}</strong> (${booking.trip})</p>
      </div>

      <div style="background:#ffffff;border-radius:12px;padding:22px;border:1px solid #e2e8f0;margin-bottom:16px">
        <p style="font-size:15px;color:#0f172a;margin-top:0">Dear <strong>${booking.customerName}</strong>,</p>
        <p style="font-size:14px;line-height:1.6;color:#475569">
          We hope you are looking forward to your upcoming trip to <strong>${booking.trip}</strong>. This is a gentle reminder regarding the outstanding balance for your travel reservation.
        </p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:18px 0">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:6px 0;color:#64748b">Total Trip Package:</td><td style="padding:6px 0;text-align:right;color:#0f172a;font-weight:700">₹${formatRupees(booking.totalAmount)}</td></tr>
            <tr><td style="padding:6px 0;color:#059669">Total Paid:</td><td style="padding:6px 0;text-align:right;color:#059669;font-weight:700">₹${formatRupees(booking.paid)}</td></tr>
            <tr style="border-top:1px solid #cbd5e1"><td style="padding:8px 0 0;color:#dc2626;font-size:15px;font-weight:700">Remaining Balance:</td><td style="padding:8px 0 0;text-align:right;color:#dc2626;font-size:16px;font-weight:800">₹${formatRupees(booking.remaining)}</td></tr>
          </table>
        </div>

        ${departureDate ? `<p style="font-size:13px;color:#64748b">Scheduled Departure Date: <strong>${departureDate}</strong></p>` : ''}
        ${customNotes ? `<div style="background:#eff6ff;border-left:3px solid #3b82f6;padding:10px 14px;margin:16px 0;font-size:13px;color:#1e40af"><strong>Note:</strong> ${customNotes}</div>` : ''}

        <p style="font-size:13px;line-height:1.5;color:#64748b">
          Please clear the remaining amount to ensure all confirmations and vehicle vouchers are finalized without interruption.
        </p>

        <p style="font-size:14px;color:#0f172a;margin:24px 0 0">
          Warm regards,<br/>
          <strong>${companyName}</strong>
        </p>
      </div>
    </div>
  `;
}

/** Today's date in India, which is the date agencies and customers mean. */
function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The object with every text field escaped, for the email builders.
 * Customer names and trip titles come from web forms, and notes from whoever
 * typed them; interpolated raw they could put markup or links into an email
 * sent under the agency's name.
 */
function htmlSafe(obj) {
  const safe = {};
  for (const [key, value] of Object.entries(obj || {})) {
    safe[key] = typeof value === 'string' ? escapeHtml(value) : value;
  }
  return safe;
}

/**
 * Reserves, sends on the requested channels, and records the outcome. Both
 * reminder types differ only in their content, so they share this.
 */
async function deliver(tenantId, booking, { type, channel, force, userId, extra = {}, whatsappText, email, timelineNote }) {
  const claimId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const base = { type, claimId, sentDate: todayInIndia(), ...extra };

  const claimed = await bookingRepository.claimReminder(
    tenantId,
    booking.bookingId,
    { ...base, status: 'sending', sentAt: new Date().toISOString() },
    { force }
  );
  if (!claimed) {
    return { success: true, skipped: true, reason: 'This reminder was already sent today.' };
  }

  let whatsappSent = false;
  let emailSent = false;
  let whatsappError = null;
  let emailError = null;
  let record;

  try {
    if ((channel === 'whatsapp' || channel === 'both') && booking.phone) {
      try {
        const chat = await whatsappSendService.findOrStartChat(tenantId, {
          phone: booking.phone,
          customerName: booking.customerName,
        });
        await whatsappSendService.sendText(tenantId, { chat, userId, messageText: whatsappText() });
        whatsappSent = true;
      } catch (err) {
        whatsappError = err.code === 'WHATSAPP_WINDOW_CLOSED'
          ? 'The customer has not messaged in 24 hours, so Meta blocks this WhatsApp message.'
          : err.message;
        logger.warn({ err, tenantId, bookingId: booking.bookingId, type }, 'WhatsApp reminder not sent');
      }
    }

    if ((channel === 'email' || channel === 'both') && booking.email) {
      try {
        await emailService.sendMail({ tenantId, to: booking.email, subject: email.subject, html: email.html() });
        emailSent = true;
      } catch (err) {
        emailError = err.message;
        logger.warn({ err, tenantId, bookingId: booking.bookingId, type }, 'Email reminder not sent');
      }
    }
  } finally {
    // Always resolved, so an unexpected error mid-send cannot leave the day
    // blocked by a reservation for a message that never went out.
    record = {
      ...base,
      sentAt: new Date().toISOString(),
      channels: {
        whatsapp: whatsappSent ? 'sent' : (booking.phone ? 'failed' : 'skipped'),
        email: emailSent ? 'sent' : (booking.email ? 'failed' : 'skipped'),
      },
      status: whatsappSent || emailSent ? 'sent' : 'failed',
      whatsappError,
      emailError,
    };
    await bookingRepository.finishReminder(tenantId, booking.bookingId, claimId, record);
  }

  if (record.status === 'sent') {
    const via = whatsappSent && emailSent ? 'WhatsApp & Email' : (whatsappSent ? 'WhatsApp' : 'Email');
    try {
      // Positional arguments: passing an object here stored the whole object
      // as JSON text in the timeline note.
      await bookingRepository.insertFollowUp(
        tenantId,
        booking.bookingId,
        `${timelineNote} via ${via}.`,
        whatsappSent ? 'whatsapp' : 'email',
        null,
        'EzzySync Bot'
      );
    } catch (err) {
      logger.warn({ err, tenantId, bookingId: booking.bookingId }, 'Could not log reminder to timeline');
    }
  }

  return {
    success: record.status === 'sent',
    channels: { whatsapp: whatsappSent, email: emailSent },
    record,
    whatsappError,
    emailError,
  };
}

async function loadBooking(tenantId, bookingId) {
  const row = await bookingRepository.getBookingById(tenantId, bookingId);
  if (!row) {
    const err = new Error('Booking not found.');
    err.status = 404;
    throw err;
  }
  return rowToBooking(row);
}

/**
 * Sends a departure reminder for a single booking across WhatsApp and/or Email.
 */
async function sendDepartureReminder(tenantId, bookingId, { daysAhead = 1, channel = 'both', customNotes = '', force = false, userId = null } = {}) {
  const booking = await loadBooking(tenantId, bookingId);
  const days = Number(daysAhead) === 1 ? 1 : Number(daysAhead) || 3;

  const hotelIds = [...new Set([booking.hotelId, ...(booking.hotelsStay || []).map((h) => h.hotelId)].filter(Boolean))];
  const hotelsMap = {};
  (await hotelRepository.getHotelsByIds(tenantId, hotelIds)).forEach((h) => { hotelsMap[h.id] = h; });

  const settings = await settingsService.getSettings(tenantId);

  return deliver(tenantId, booking, {
    type: days === 1 ? 'departure_1day' : 'departure_3day',
    channel,
    force,
    userId,
    extra: { daysAhead: days },
    whatsappText: () => buildDepartureWhatsAppText({ booking, daysAhead: days, hotelsMap, settings, customNotes }),
    email: {
      subject: `\u{1F6EB} Trip Departure ${days === 1 ? 'Tomorrow' : `in ${days} Days`}: ${booking.trip}`,
      html: () => buildDepartureEmailHtml({
        booking: htmlSafe(booking),
        daysAhead: days,
        hotelsMap,
        settings: htmlSafe(settings),
        customNotes: escapeHtml(customNotes),
      }),
    },
    timelineNote: `Departure alert (${days === 1 ? '1 day before' : `${days} days before`}) sent`,
  });
}

/**
 * Sends a payment due reminder for a booking across WhatsApp and/or Email.
 */
async function sendPaymentReminder(tenantId, bookingId, { channel = 'both', customNotes = '', force = false, userId = null } = {}) {
  const booking = await loadBooking(tenantId, bookingId);

  if (Number(booking.remaining || 0) <= 0) {
    return { success: true, skipped: true, reason: 'No remaining balance due on this booking.' };
  }

  const settings = await settingsService.getSettings(tenantId);

  return deliver(tenantId, booking, {
    type: 'payment_due',
    channel,
    force,
    userId,
    extra: { amountDue: booking.remaining },
    whatsappText: () => buildPaymentWhatsAppText({ booking, settings, customNotes }),
    email: {
      subject: `\u{1F4B3} Payment Reminder: Booking #${booking.bookingId} (${booking.trip})`,
      html: () => buildPaymentEmailHtml({
        booking: htmlSafe(booking),
        settings: htmlSafe(settings),
        customNotes: escapeHtml(customNotes),
      }),
    },
    timelineNote: `Payment reminder of ₹${formatRupees(booking.remaining)} sent`,
  });
}


/**
 * Scheduled cron handler: runs daily at 08:30 AM.
 * Scans for upcoming 1-day and 3-day departures and pending payment dues.
 */
async function runDailyRemindersCron() {
  logger.info('Starting daily automated trip reminders run...');
  const stats = {
    oneDayAlerts: 0,
    threeDayAlerts: 0,
    paymentAlerts: 0,
    skippedExpiredPlan: 0,
    errors: 0,
  };

  // A lapsed plan gets no automated messages, however its settings are left.
  // Looked up once per tenant per run.
  const planActive = new Map();
  async function tenantIsActive(tenantId) {
    if (!planActive.has(tenantId)) {
      try {
        const limits = await planService.getTenantPlanLimits(tenantId);
        planActive.set(tenantId, !limits?.isExpired);
      } catch (err) {
        logger.warn({ err, tenantId }, 'Could not read plan; skipping reminders for this tenant');
        planActive.set(tenantId, false);
      }
    }
    return planActive.get(tenantId);
  }

  try {
    // 1. Process 1-Day Departures (Tomorrow)
    const tomorrowBookings = await bookingRepository.getUpcomingDepartures(1);
    for (const b of tomorrowBookings) {
      if (!(await tenantIsActive(b.tenant_id))) { stats.skippedExpiredPlan++; continue; }
      try {
        const res = await sendDepartureReminder(b.tenant_id, b.booking_id, { daysAhead: 1, force: false });
        if (res.success && !res.skipped) stats.oneDayAlerts++;
      } catch (err) {
        stats.errors++;
        logger.error({ err, tenantId: b.tenant_id, bookingId: b.booking_id }, 'Error sending 1-day reminder in cron');
      }
    }

    // 2. Process 3-Day Departures
    const threeDaysBookings = await bookingRepository.getUpcomingDepartures(3);
    for (const b of threeDaysBookings) {
      if (!(await tenantIsActive(b.tenant_id))) { stats.skippedExpiredPlan++; continue; }
      try {
        const res = await sendDepartureReminder(b.tenant_id, b.booking_id, { daysAhead: 3, force: false });
        if (res.success && !res.skipped) stats.threeDayAlerts++;
      } catch (err) {
        stats.errors++;
        logger.error({ err, tenantId: b.tenant_id, bookingId: b.booking_id }, 'Error sending 3-day reminder in cron');
      }
    }

    // 3. Process Pending Payment Reminders for trips departing in 2 days or 7 days
    for (const days of [2, 7]) {
      const paymentDues = await bookingRepository.getPendingPaymentBookings(days);
      for (const b of paymentDues) {
        if (!(await tenantIsActive(b.tenant_id))) { stats.skippedExpiredPlan++; continue; }
        try {
          const res = await sendPaymentReminder(b.tenant_id, b.booking_id, { force: false });
          if (res.success && !res.skipped) stats.paymentAlerts++;
        } catch (err) {
          stats.errors++;
          logger.error({ err, tenantId: b.tenant_id, bookingId: b.booking_id }, 'Error sending payment reminder in cron');
        }
      }
    }

    logger.info(stats, 'Daily automated trip reminders run completed');
  } catch (err) {
    logger.error({ err }, 'Fatal error running daily automated trip reminders cron');
  }

  return stats;
}

module.exports = {
  sendDepartureReminder,
  sendPaymentReminder,
  runDailyRemindersCron,
  buildDepartureWhatsAppText,
  buildPaymentWhatsAppText,
};
