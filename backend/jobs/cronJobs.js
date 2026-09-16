const cron = require('node-cron');
const auditRepository = require('../repositories/auditRepository');
const logRepository = require('../repositories/logRepository');
const followUpRepository = require('../repositories/followUpRepository');
const userRepository = require('../repositories/userRepository');
const leadRepository = require('../repositories/leadRepository');
const emailService = require('../services/emailService');
const reminderService = require('../services/reminderService');
const logger = require('../utils/logger').child({ module: 'cron' });

/**
 * Initializes and schedules node-cron background tasks.
 * Boots automatically with server start.
 */
function initScheduler() {
  logger.info('Background schedulers active');

  // Job 1: Clean up audit trails older than 90 days (Runs every Sunday at midnight: 0 0 * * 0)
  cron.schedule('0 0 * * 0', async () => {
    try {
      logger.info('Running weekly audit log cleanup...');
      const cleaned = await auditRepository.deleteLogsOlderThanDays(90);
      logger.info({ removed: cleaned }, 'Weekly audit log cleanup complete');
    } catch (err) {
      logger.error({ err }, 'Error running weekly audit log cleanup');
    }
  });

  // Job 2: Run daily metrics summary calculation (Runs every night at midnight: 0 0 * * *)
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Daily stats calculation pass complete');
    } catch (err) {
      logger.error({ err }, 'Error running daily stats task');
    }
  });

  // Job 2b: Clean up app_logs older than 7 days, matching the rotating log
  // files' retention (see utils/logger.js). Runs nightly, not weekly - 7-day
  // retention needs daily upkeep or the table grows well past the window.
  cron.schedule('30 0 * * *', async () => {
    try {
      const cleaned = await logRepository.deleteLogsOlderThanDays(7);
      logger.info({ removed: cleaned }, 'Daily app_logs cleanup complete');
    } catch (err) {
      logger.error({ err }, 'Error running daily app_logs cleanup');
    }
  });

  // Job 2c: Follow-up reminder digest (Runs every morning at 7 AM: 0 7 * * *)
  // Emails each team member their due-today + overdue follow-ups across
  // both bookings and leads. Unassigned items go to the tenant's admins.
  cron.schedule('0 7 * * *', async () => {
    try {
      const tenantIds = await followUpRepository.listTenantsWithDueFollowUps();
      let sent = 0;
      for (const tenantId of tenantIds) {
        try {
          sent += await sendFollowUpDigestForTenant(tenantId);
        } catch (err) {
          logger.error({ err, tenantId }, 'Failed to send follow-up digest for tenant');
        }
      }
      logger.info({ tenants: tenantIds.length, emailsSent: sent }, 'Follow-up digest run complete');
    } catch (err) {
      logger.error({ err }, 'Error running follow-up digest job');
    }
  });

  // Job 3: Departure (T-1, T-3) and payment-due reminders, 8:30 AM India time.
  // The server runs on UTC; without the timezone this fired at 2 PM IST.
  cron.schedule('30 8 * * *', async () => {
    logger.info('Executing daily automated travel reminders cron...');
    try {
      const stats = await reminderService.runDailyRemindersCron();
      logger.info(stats, 'Daily automated travel reminders cron complete');
    } catch (err) {
      logger.error({ err }, 'Error executing daily automated travel reminders cron');
    }
<<<<<<< HEAD
  });

  // Job 4: Lead priority (Hot/Warm/Cold) recompute (Runs hourly at :00).
  // One bulk UPDATE across every tenant - see leadRepository.recomputeAllPriorities
  // for the scoring rule. Cheap and side-effect-free, so hourly is generous
  // rather than necessary.
  cron.schedule('0 * * * *', async () => {
    try {
      const updated = await leadRepository.recomputeAllPriorities();
      logger.info({ updated }, 'Lead priority recompute complete');
    } catch (err) {
      logger.error({ err }, 'Error running lead priority recompute job');
    }
  });

  // Also run once at boot, so a freshly restarted server doesn't leave every
  // lead showing yesterday's priority for up to an hour.
  leadRepository.recomputeAllPriorities()
    .then((updated) => logger.info({ updated }, 'Initial lead priority recompute complete'))
    .catch((err) => logger.error({ err }, 'Error running initial lead priority recompute'));
=======
  }, { timezone: 'Asia/Kolkata' });
>>>>>>> 0b72d21 (feat(reminders): Implement automated trip and payment reminders)
}

/**
 * Groups a tenant's due-today/overdue follow-ups by assignee and emails
 * each team member their own digest (unassigned items go to admins).
 * Returns the number of digest emails actually sent.
 */
async function sendFollowUpDigestForTenant(tenantId) {
  const [dueFollowUps, users] = await Promise.all([
    followUpRepository.listDueFollowUps(tenantId, { overdue: true, dueToday: true }),
    userRepository.listUsersByTenant(tenantId),
  ]);
  if (dueFollowUps.length === 0) return 0;

  const byAssignee = new Map();
  const admins = users.filter((u) => u.role === 'ADMIN');
  for (const item of dueFollowUps) {
    const assignedUser = users.find((u) => u.name === item.assigned_to);
    const recipients = assignedUser ? [assignedUser] : admins;
    for (const recipient of recipients) {
      if (!byAssignee.has(recipient.email)) byAssignee.set(recipient.email, { name: recipient.name, items: [] });
      byAssignee.get(recipient.email).items.push(item);
    }
  }

  let sent = 0;
  for (const [email, { name, items }] of byAssignee.entries()) {
    const rows = items.map((item) => {
      const overdue = new Date(item.next_follow_up_date) < new Date(new Date().toDateString());
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a">${item.customer_name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#475569">${item.source_type === 'booking' ? 'Booking' : 'Lead'} #${item.source_id}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:${overdue ? '#dc2626' : '#475569'};font-weight:${overdue ? '700' : '400'}">${new Date(item.next_follow_up_date).toLocaleDateString('en-IN')}${overdue ? ' (Overdue)' : ''}</td>
      </tr>`;
    }).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px">
        <h2 style="color:#1e293b;margin-bottom:4px">Today's Follow-ups</h2>
        <p style="color:#64748b;font-size:13px;margin-top:0">Hi ${name || 'there'}, you have ${items.length} follow-up${items.length > 1 ? 's' : ''} due today or overdue.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border-radius:8px;padding:8px">
          <thead><tr style="text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase">
            <th style="padding:8px 0">Customer</th><th style="padding:8px 0">Reference</th><th style="padding:8px 0">Due Date</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    try {
      await emailService.sendMail({ tenantId, to: email, subject: `You have ${items.length} follow-up${items.length > 1 ? 's' : ''} due today`, html });
      sent++;
    } catch (err) {
      logger.warn({ err, tenantId, email }, 'Failed to send follow-up digest email');
    }
  }
  return sent;
}

<<<<<<< HEAD
/**
 * Sends a departure reminder over whichever channels this booking has data
 * for - email if there's an address, WhatsApp if there's a phone. Each
 * channel is attempted independently (matching the same best-effort pattern
 * as the booking-confirmation/auto-invoice sends): a booking with only a
 * phone on file, previously skipped by getUpcomingDepartures' email-only
 * filter, now gets its reminder over WhatsApp instead of nothing at all.
 */
async function sendDepartureAlert(booking, daysAhead) {
  const departureDate = new Date(booking.departure).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const urgency = daysAhead === 1 ? 'TOMORROW' : `in ${daysAhead} days`;
  const agencyName = booking.company_name || 'Your Travel Agency';

  if (booking.phone) {
    try {
      const whatsappSendService = require('../services/whatsappSendService');
      const chat = await whatsappSendService.findOrStartChat(booking.tenant_id, {
        phone: booking.phone,
        customerName: booking.customer_name,
      });
      const messageText = `Hello *${booking.customer_name}*! ✈️\n\nYour trip *${booking.trip}* departs ${urgency === 'TOMORROW' ? '*tomorrow*' : `in *${daysAhead} days*`} (${departureDate}).\n\n👥 Travelers: ${booking.members}${booking.pickup ? `\n📍 Pickup: ${booking.pickup}` : ''}\n\nPlease keep your travel documents and a valid photo ID ready. Reach out here for any last-minute questions!\n\n— ${agencyName}`;
      // On a Cloud API chat outside the 24h window this free-form send is
      // refused by Meta (WHATSAPP_WINDOW_CLOSED) - caught below same as any
      // other failure; the email reminder still goes out regardless.
      await whatsappSendService.sendText(booking.tenant_id, { chat, messageText });
      logger.info({ tenantId: booking.tenant_id, bookingId: booking.booking_id }, 'Sent departure alert via WhatsApp');
    } catch (err) {
      logger.warn({ err, tenantId: booking.tenant_id, bookingId: booking.booking_id }, 'Could not send departure alert via WhatsApp');
    }
  }

  if (!booking.email) return;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px">
      <div style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:24px;border-radius:10px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;margin:0;font-size:22px;">✈️ Trip Departure Reminder</h1>
        <p style="color:#ccfbf1;margin:8px 0 0;font-size:14px">Your trip is departing ${urgency}!</p>
      </div>
      
      <div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e2e8f0">
        <p style="color:#1e293b;font-size:15px;">Dear <strong>${booking.customer_name}</strong>,</p>
        <p style="color:#475569;font-size:14px">This is a friendly reminder that your upcoming trip is departing <strong style="color:#0f766e">${urgency}</strong>.</p>
        
        <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:16px;margin:16px 0">
          <table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155">
            <tr><td style="padding:6px 0;font-weight:bold;color:#64748b;width:140px">Trip / Destination</td><td style="color:#0f172a;font-weight:600">${booking.trip}</td></tr>
            <tr><td style="padding:6px 0;font-weight:bold;color:#64748b">Departure Date</td><td style="color:#0f172a;font-weight:600">${departureDate}</td></tr>
            <tr><td style="padding:6px 0;font-weight:bold;color:#64748b">Booking Reference</td><td style="color:#0f172a;font-weight:600">${booking.booking_id}</td></tr>
            <tr><td style="padding:6px 0;font-weight:bold;color:#64748b">Travelers</td><td style="color:#0f172a">${booking.members} Person(s)</td></tr>
            ${booking.pickup ? `<tr><td style="padding:6px 0;font-weight:bold;color:#64748b">Pickup From</td><td style="color:#0f172a">${booking.pickup}</td></tr>` : ''}
          </table>
        </div>

        <p style="color:#64748b;font-size:13px">Please ensure you have all your travel documents ready. Carry a valid photo ID on the day of departure.</p>
        <p style="color:#64748b;font-size:13px">For any last-minute queries, please contact us immediately.</p>
        
        <p style="color:#1e293b;font-size:13px;margin-top:20px">Warm Regards,<br/><strong>${agencyName}</strong></p>
      </div>
    </div>
  `;

  await emailService.sendMail({
    tenantId: booking.tenant_id,
    to: booking.email,
    subject: `🛫 Trip Departure ${urgency === 'TOMORROW' ? 'Tomorrow' : `in ${daysAhead} Days`}: ${booking.trip}`,
    html,
  });
}

=======
>>>>>>> 0b72d21 (feat(reminders): Implement automated trip and payment reminders)
module.exports = {
  initScheduler
};
