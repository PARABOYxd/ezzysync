const { query } = require('../config/db');

async function createExpense(tenantId, { title, amount, category, link_type, booking_id, batch_id, vendor_name, status, created_by }) {
  const { rows } = await query(
    `INSERT INTO expenses (
      tenant_id, title, amount, category, link_type, booking_id, batch_id, vendor_name, status, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      tenantId,
      title,
      Number(amount || 0),
      category || 'Other',
      link_type || 'general',
      link_type === 'booking' && booking_id ? booking_id : null,
      link_type === 'batch' && batch_id ? batch_id : null,
      vendor_name || '',
      status || 'Pending',
      created_by || ''
    ]
  );
  return rows[0];
}

async function listExpenses(tenantId) {
  const { rows } = await query(
    `SELECT e.*, b.booking_id as booking_code, b.customer_name as booking_customer, t.batch_id as batch_code, t.name as batch_name 
     FROM expenses e
     LEFT JOIN bookings b ON e.booking_id = b.id
     LEFT JOIN tour_batches t ON e.batch_id = t.id
     WHERE e.tenant_id = $1 
     ORDER BY e.created_at DESC`,
    [tenantId]
  );
  return rows;
}

async function getExpenseById(tenantId, id) {
  const { rows } = await query(
    'SELECT * FROM expenses WHERE tenant_id = $1 AND id = $2',
    [tenantId, id]
  );
  return rows[0];
}

async function updateExpense(tenantId, id, { title, amount, category, link_type, booking_id, batch_id, vendor_name, status }) {
  const { rows } = await query(
    `UPDATE expenses
     SET title = $3, amount = $4, category = $5, link_type = $6, booking_id = $7, batch_id = $8, vendor_name = $9, status = $10, updated_at = now()
     WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    [
      tenantId,
      id,
      title,
      Number(amount || 0),
      category,
      link_type,
      link_type === 'booking' && booking_id ? booking_id : null,
      link_type === 'batch' && batch_id ? batch_id : null,
      vendor_name || '',
      status
    ]
  );
  return rows[0];
}

async function deleteExpense(tenantId, id) {
  const { rows } = await query(
    'DELETE FROM expenses WHERE tenant_id = $1 AND id = $2 RETURNING *',
    [tenantId, id]
  );
  return rows[0];
}

async function getTemplates(tenantId) {
  const { rows } = await query(
    'SELECT * FROM trip_cost_templates WHERE tenant_id = $1 ORDER BY trip_name ASC',
    [tenantId]
  );
  return rows;
}

async function upsertTemplate(tenantId, { trip_name, template_name, hotel_cost_per_pax, flight_cost_per_pax, transport_cost_per_pax, other_cost_per_pax }) {
  const { rows } = await query(
    `INSERT INTO trip_cost_templates (
      tenant_id, trip_name, template_name, hotel_cost_per_pax, flight_cost_per_pax, transport_cost_per_pax, other_cost_per_pax, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (tenant_id, trip_name, template_name) 
     DO UPDATE SET 
      hotel_cost_per_pax = EXCLUDED.hotel_cost_per_pax,
      flight_cost_per_pax = EXCLUDED.flight_cost_per_pax,
      transport_cost_per_pax = EXCLUDED.transport_cost_per_pax,
      other_cost_per_pax = EXCLUDED.other_cost_per_pax,
      updated_at = now()
     RETURNING *`,
    [
      tenantId,
      trip_name,
      template_name || 'Default',
      Number(hotel_cost_per_pax || 0),
      Number(flight_cost_per_pax || 0),
      Number(transport_cost_per_pax || 0),
      Number(other_cost_per_pax || 0)
    ]
  );
  return rows[0];
}

async function deleteTemplate(tenantId, id) {
  const { rows } = await query(
    'DELETE FROM trip_cost_templates WHERE tenant_id = $1 AND id = $2 RETURNING *',
    [tenantId, id]
  );
  return rows[0];
}

async function getTemplateByTripName(tenantId, trip_name) {
  const { rows } = await query(
    'SELECT * FROM trip_cost_templates WHERE tenant_id = $1 AND LOWER(trip_name) = LOWER($2)',
    [tenantId, trip_name]
  );
  return rows[0];
}

module.exports = {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getTemplates,
  upsertTemplate,
  deleteTemplate,
  getTemplateByTripName
};
