const { query } = require('../config/db');

async function getQuotationById(tenantId, quotationId) {
  const { rows } = await query(
    `SELECT * FROM quotations WHERE tenant_id = $1 AND quotation_id = $2`,
    [tenantId, quotationId]
  );
  return rows[0];
}

async function getQuotationByUuid(uuid) {
  const { rows } = await query(
    `SELECT * FROM quotations WHERE id = $1`,
    [uuid]
  );
  return rows[0];
}

async function insertQuotation(tenantId, quotationId, data, customerId) {
  const { rows } = await query(
    `INSERT INTO quotations (
       tenant_id, quotation_id, customer_name, email, phone, trip_name, price_quote, valid_until, status, itinerary_days, customer_id, inclusions, exclusions, highlights, pickup_options, banner_url, related_quotations
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      tenantId,
      quotationId,
      data.customerName || 'TBD',
      data.email || '',
      data.phone || '',
      data.tripName,
      Number(data.priceQuote || 0),
      data.validUntil || '',
      data.status || 'Draft',
      JSON.stringify(data.itineraryDays || []),
      customerId || null,
      JSON.stringify(data.inclusions || []),
      JSON.stringify(data.exclusions || []),
      JSON.stringify(data.highlights || []),
      JSON.stringify(data.pickupOptions || []),
      data.bannerUrl || '',
      JSON.stringify(data.relatedQuotations || [])
    ]
  );
  return rows[0];
}

async function updateQuotation(tenantId, quotationId, merged) {
  const { rows } = await query(
    `UPDATE quotations SET
       customer_name = $1, email = $2, phone = $3, trip_name = $4, price_quote = $5,
       valid_until = $6, status = $7, itinerary_days = $8, inclusions = $11, exclusions = $12,
       highlights = $13, pickup_options = $14, banner_url = $15, related_quotations = $16, updated_at = now()
     WHERE tenant_id = $9 AND quotation_id = $10
     RETURNING *`,
    [
      merged.customerName,
      merged.email,
      merged.phone,
      merged.tripName,
      Number(merged.priceQuote || 0),
      merged.validUntil || '',
      merged.status || 'Draft',
      JSON.stringify(merged.itineraryDays || []),
      tenantId,
      quotationId,
      JSON.stringify(merged.inclusions || []),
      JSON.stringify(merged.exclusions || []),
      JSON.stringify(merged.highlights || []),
      JSON.stringify(merged.pickupOptions || []),
      merged.bannerUrl || '',
      JSON.stringify(merged.relatedQuotations || [])
    ]
  );
  return rows[0];
}

async function deleteQuotation(tenantId, quotationId) {
  const { rows } = await query(
    `DELETE FROM quotations WHERE tenant_id = $1 AND quotation_id = $2 RETURNING *`,
    [tenantId, quotationId]
  );
  return rows[0];
}

async function listQuotationsPaged(params) {
  const {
    tenantId,
    page = 1,
    limit = 10,
    search = '',
    status = '',
  } = params;

  const values = [tenantId];
  let paramIndex = 2;

  let whereClauses = ['tenant_id = $1'];

  if (status) {
    whereClauses.push(`status = $${paramIndex++}`);
    values.push(status);
  }

  if (search) {
    whereClauses.push(`(customer_name ILIKE $${paramIndex} OR quotation_id ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR trip_name ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  const whereSql = whereClauses.join(' AND ');

  // Total matching count query
  const countRes = await query(`SELECT COUNT(*)::int as count FROM quotations WHERE ${whereSql}`, values);
  const totalCount = countRes.rows[0]?.count || 0;

  // Pagination offset
  const offset = Math.max((page - 1) * limit, 0);

  values.push(Number(limit));
  const limitIndex = paramIndex++;
  values.push(Number(offset));
  const offsetIndex = paramIndex++;

  const selectSql = `
    SELECT *
    FROM quotations
    WHERE ${whereSql}
    ORDER BY created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const { rows } = await query(selectSql, values);

  return {
    quotations: rows,
    totalCount,
  };
}

module.exports = {
  getQuotationById,
  getQuotationByUuid,
  insertQuotation,
  updateQuotation,
  deleteQuotation,
  listQuotationsPaged,
};
