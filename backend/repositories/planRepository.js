const { query } = require('../config/db');

async function getPlanById(planId) {
  const { rows } = await query('SELECT * FROM plans WHERE id = $1', [planId]);
  return rows[0];
}

async function getTenantPlan(tenantId) {
  const { rows } = await query(
    `SELECT p.* 
     FROM tenants t 
     JOIN plans p ON t.plan_id = p.id 
     WHERE t.id = $1`,
    [tenantId]
  );
  return rows[0] || null;
}

async function setTenantPlan(tenantId, planId) {
  await query('UPDATE tenants SET plan_id = $2 WHERE id = $1', [tenantId, planId]);
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
