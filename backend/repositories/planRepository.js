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

module.exports = {
  getPlanById,
  getTenantPlan,
};
