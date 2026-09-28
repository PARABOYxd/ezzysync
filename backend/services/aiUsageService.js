const { query } = require('../config/db');
const planService = require('./planService');
const logger = require('../utils/logger').child({ module: 'ai_usage' });

/**
 * The monthly AI allowance.
 *
 * Every AI call an agency causes - a generated reply, a draft, an itinerary,
 * a ticket or PDF extraction, a lead auto-fill - is one "AI action". Each plan
 * allows so many per calendar month (Solo 500, Growth 2,000; -1 unlimited),
 * because AI is the one cost that grows with use.
 *
 * Months are India time: an agency in Jaipur expects its allowance to reset
 * at its own midnight on the 1st, not at 5:30 am.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function currentPeriod(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 7);
}

/** The 1st of next month (IST), as 'YYYY-MM-DD', for "resets on" messages. */
function nextResetDate(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const next = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 1));
  return next.toISOString().slice(0, 10);
}

async function usedThisPeriod(tenantId, period = currentPeriod()) {
  const { rows } = await query(
    'SELECT used FROM ai_usage_monthly WHERE tenant_id = $1 AND period = $2',
    [tenantId, period]
  );
  return rows[0]?.used || 0;
}

/**
 * Takes one action from this month's allowance, or refuses.
 *
 * The check and the increment are one statement, so two AI calls landing at
 * the same moment cannot both squeeze past the last remaining action.
 *
 * @returns {Promise<{ ok: boolean, reason?: 'plan'|'limit', used: number, limit: number, resetsOn: string }>}
 */
async function tryConsume(tenantId, feature = 'ai') {
  const limits = await planService.getTenantPlanLimits(tenantId);
  const limit = Number(limits.aiActionsPerMonth ?? 0);
  const period = currentPeriod();
  const resetsOn = nextResetDate();

  if (!limits.canUseAi || limit === 0) {
    return { ok: false, reason: 'plan', used: await usedThisPeriod(tenantId, period), limit: 0, resetsOn };
  }

  const { rows } = await query(
    `INSERT INTO ai_usage_monthly (tenant_id, period, used) VALUES ($1, $2, 1)
     ON CONFLICT (tenant_id, period) DO UPDATE
       SET used = ai_usage_monthly.used + 1, updated_at = now()
       WHERE $3::int < 0 OR ai_usage_monthly.used < $3::int
     RETURNING used`,
    [tenantId, period, limit]
  );

  if (!rows.length) {
    logger.info({ tenantId, feature, limit }, 'AI allowance used up for this month');
    return { ok: false, reason: 'limit', used: limit, limit, resetsOn };
  }
  return { ok: true, used: rows[0].used, limit, resetsOn };
}

/**
 * Whether any allowance is left, without spending it.
 *
 * For gates that may still decide not to call the AI after passing (the
 * webhook waits out a burst and only answers the last message): they check
 * here, and tryConsume() is called at the one point the model is really used.
 */
async function hasAllowance(tenantId) {
  const limits = await planService.getTenantPlanLimits(tenantId);
  const limit = Number(limits.aiActionsPerMonth ?? 0);
  if (!limits.canUseAi || limit === 0) return false;
  if (limit < 0) return true;
  return (await usedThisPeriod(tenantId)) < limit;
}

/** Gives one action back - for a call that failed on our side, not the user's. */
async function refund(tenantId) {
  await query(
    `UPDATE ai_usage_monthly SET used = GREATEST(used - 1, 0), updated_at = now()
      WHERE tenant_id = $1 AND period = $2`,
    [tenantId, currentPeriod()]
  ).catch((err) => logger.warn({ err, tenantId }, 'AI usage refund failed'));
}

/** What the plan page shows: used and allowed this month. */
async function getUsage(tenantId) {
  const limits = await planService.getTenantPlanLimits(tenantId);
  return {
    used: await usedThisPeriod(tenantId),
    limit: limits.canUseAi ? Number(limits.aiActionsPerMonth ?? 0) : 0,
    period: currentPeriod(),
    resetsOn: nextResetDate(),
  };
}

/** The message an agent sees when the allowance is gone. */
function limitMessage({ reason, limit, resetsOn }) {
  if (reason === 'plan') return 'AI is not included in your current plan. Please upgrade to use AI.';
  const resets = new Date(`${resetsOn}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `You have used all ${limit} AI actions for this month. They reset on ${resets}.`;
}

module.exports = { tryConsume, hasAllowance, refund, getUsage, limitMessage, currentPeriod, nextResetDate };
