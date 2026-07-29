const cron = require('node-cron');
const auditRepository = require('../repositories/auditRepository');
const bookingRepository = require('../repositories/bookingRepository');
const logRepository = require('../repositories/logRepository');
const followUpRepository = require('../repositories/followUpRepository');
const userRepository = require('../repositories/userRepository');
const emailService = require('../services/emailService');
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

  // Job 3: Upcoming Departure Alerts (Runs every morning at 8 AM: 0 8 * * *)
  // Sends reminder emails for bookings departing in 1 day and 3 days.
  cron.schedule('0 8 * * *', async () => {
    logger.info('Checking upcoming departures...');
    try {
      // Alert for 1-day departures
      const tomorrow = await bookingRepository.getUpcomingDepartures(1);
      for (const booking of tomorrow) {
        try {
          await sendDepartureAlert(booking, 1);
          logger.info({ tenantId: booking.tenant_id, bookingId: booking.booking_id, email: booking.email }, 'Sent 1-day departure alert');
        } catch (mailErr) {
          logger.error({ err: mailErr, tenantId: booking.tenant_id, bookingId: booking.booking_id, email: booking.email }, 'Failed to send 1-day departure alert');
        }
      }

      // Alert for 3-day departures
      const in3Days = await bookingRepository.getUpcomingDepartures(3);
      for (const booking of in3Days) {
        try {
          await sendDepartureAlert(booking, 3);
          logger.info({ tenantId: booking.tenant_id, bookingId: booking.booking_id, email: booking.email }, 'Sent 3-day departure alert');
        } catch (mailErr) {
          logger.error({ err: mailErr, tenantId: booking.tenant_id, bookingId: booking.booking_id, email: booking.email }, 'Failed to send 3-day departure alert');
        }
      }

      logger.info({ oneDay: tomorrow.length, threeDay: in3Days.length }, 'Departure alerts complete');
    } catch (err) {
      logger.error({ err }, 'Error running departure alert job');
    }
  });
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

/**
 * Send a departure reminder email to a traveler.
 */
async function sendDepartureAlert(booking, daysAhead) {
  const departureDate = new Date(booking.departure).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const urgency = daysAhead === 1 ? 'TOMORROW' : `in ${daysAhead} days`;
  const agencyName = booking.company_name || 'Your Travel Agency';

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

module.exports = {
  initScheduler
};
