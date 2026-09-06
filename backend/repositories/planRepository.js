const { query } = require('../config/db');

async function getPlanById(planId) {
  const { rows } = await query('SELECT * FROM plans WHERE id = $1', [planId]);
  return rows[0];
}

async function getTenantPlan(tenantId) {
  const { rows } = await query(
    `SELECT p.*,
            t.plan_expires_at,
            -- Decided in SQL so the answer uses the database clock, not the
            -- app server's - they drift, and this one gates access.
            (t.plan_expires_at IS NOT NULL AND t.plan_expires_at <= NOW()) AS plan_has_expired
       FROM tenants t
       JOIN plans p ON t.plan_id = p.id
      WHERE t.id = $1`,
    [tenantId]
  );
  return rows[0] || null;
}

/**
 * Moves a tenant onto a plan for one paid month.
 *
 * Renewing early does not cost the tenant the days they have left: when the
 * plan is unchanged and still running, the new month is added to the existing
 * expiry rather than replacing it. Switching to a different plan starts a
 * fresh month from today, since the old plan stops applying immediately.
 *
 * GREATEST(..., NOW()) keeps a lapsed tenant from being credited for the time
 * their account sat expired - a plan that ran out in March and is renewed in
 * June buys June, not March.
 */
async function setTenantPlan(tenantId, planId) {
  await query(
    `UPDATE tenants
        SET plan_id = $2,
            plan_expires_at = CASE
              WHEN plan_id = $2 AND plan_expires_at IS NOT NULL
                THEN GREATEST(plan_expires_at, NOW()) + INTERVAL '1 month'
              ELSE NOW() + INTERVAL '1 month'
            END
      WHERE id = $1`,
    [tenantId, planId]
  );
}

async function countActiveBookings(tenantId) {
  const { rows } = await query(
    'SELECT COUNT(*)::int as count FROM bookings WHERE tenant_id = $1 AND deleted = FALSE',
    [tenantId]
  );
  return rows[0].count;
}

/**
 * Counts seats in use, which means every user who can log in - the admin
 * included.
 *
 * Plans are sold in logins ("1 Solo Login", "Up to 5 Team Logins"), but this
 * used to filter on role = 'TEAM_MEMBER', so the owner's own account was free.
 * A Solo tenant with maxTeamMembers = 1 could therefore add a staff member on
 * top of themselves and run two logins on a one-login plan.
 */
async function countTeamMembers(tenantId) {
  const { rows } = await query(
    'SELECT COUNT(*)::int as count FROM users WHERE tenant_id = $1',
    [tenantId]
  );
  return rows[0].count;
}

module.exports = {
  getPlanById,
  getTenantPlan,
  setTenantPlan,
  countActiveBookings,
  countTeamMembers,
};
