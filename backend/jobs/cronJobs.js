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
  }, { timezone: 'Asia/Kolkata' });

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

module.exports = {
  initScheduler
};
