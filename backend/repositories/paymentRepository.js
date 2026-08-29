const { query } = require('../config/db');

async function createPaymentRecord({ tenantId, userId, orderId, planId, amount, currency = 'INR' }) {
  const { rows } = await query(
    `INSERT INTO payments (tenant_id, user_id, order_id, plan_id, amount, currency, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'created')
     ON CONFLICT (order_id) DO UPDATE SET amount = EXCLUDED.amount, plan_id = EXCLUDED.plan_id
     RETURNING *`,
    [tenantId, userId, orderId, planId, amount, currency]
  );
  return rows[0];
}

async function updatePaymentSuccess({ orderId, paymentId, signature, rawResponse = null }) {
  const { rows } = await query(
    `UPDATE payments
     SET status = 'captured',
         payment_id = $2,
         signature = $3,
         raw_response = $4,
         updated_at = now()
     WHERE order_id = $1
     RETURNING *`,
    [orderId, paymentId, signature, rawResponse ? JSON.stringify(rawResponse) : null]
  );
  return rows[0];
}

async function updatePaymentFailed({ orderId, paymentId = null, rawResponse = null }) {
  const { rows } = await query(
    `UPDATE payments
     SET status = 'failed',
         payment_id = COALESCE($2, payment_id),
         raw_response = $3,
         updated_at = now()
     WHERE order_id = $1
     RETURNING *`,
    [orderId, paymentId, rawResponse ? JSON.stringify(rawResponse) : null]
  );
  return rows[0];
}

async function updatePaymentStatusByPaymentId(paymentId, status, rawResponse = null) {
  const { rows } = await query(
    `UPDATE payments
     SET status = $2,
         raw_response = $3,
         updated_at = now()
     WHERE payment_id = $1
     RETURNING *`,
    [paymentId, status, rawResponse ? JSON.stringify(rawResponse) : null]
  );
  return rows[0];
}

async function findPaymentByOrderId(orderId) {
  const { rows } = await query(`SELECT * FROM payments WHERE order_id = $1`, [orderId]);
  return rows[0];
}

async function findPaymentByPaymentId(paymentId) {
  const { rows } = await query(`SELECT * FROM payments WHERE payment_id = $1`, [paymentId]);
  return rows[0];
}

module.exports = {
  createPaymentRecord,
  updatePaymentSuccess,
  updatePaymentFailed,
  updatePaymentStatusByPaymentId,
  findPaymentByOrderId,
  findPaymentByPaymentId,
};
