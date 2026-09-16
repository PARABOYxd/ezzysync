const { query } = require('../config/db');

async function createHotel(tenantId, { name, city, rating, address, contactPerson, contactPhone, roomsAndRates, contacts }) {
  const { rows } = await query(
    `INSERT INTO hotels (
      tenant_id, name, city, rating, address, contact_person, contact_phone, rooms_and_rates, contacts
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      tenantId,
      name,
      city,
      rating || '3 Star',
      address || '',
      contactPerson || '',
      contactPhone || '',
      JSON.stringify(roomsAndRates || []),
      JSON.stringify(contacts || [])
    ]
  );
  return rows[0];
}

async function listHotels(tenantId, search = '') {
  let text = 'SELECT * FROM hotels WHERE tenant_id = $1';
  const params = [tenantId];

  if (search && search.trim()) {
    const tokens = search.trim().split(/\s+/).filter(Boolean);
    const searchTarget = "CONCAT_WS(' ', name, city, address, rating, contact_person, contact_phone)";
    let paramIndex = params.length + 1;
    const searchConditions = tokens.map((token) => {
      params.push(`%${token}%`);
      return `${searchTarget} ILIKE $${paramIndex++}`;
    });
    text += ` AND (${searchConditions.join(' AND ')})`;
  }

  text += ' ORDER BY name ASC';
  const { rows } = await query(text, params);
  return rows;
}

async function getHotelById(tenantId, id) {
  const { rows } = await query(
    'SELECT * FROM hotels WHERE tenant_id = $1 AND id = $2',
    [tenantId, id]
  );
  return rows[0];
}

async function updateHotel(tenantId, id, { name, city, rating, address, contactPerson, contactPhone, roomsAndRates, contacts }) {
  const { rows } = await query(
    `UPDATE hotels
     SET name = $3, city = $4, rating = $5, address = $6, contact_person = $7, contact_phone = $8, rooms_and_rates = $9, contacts = $10, updated_at = now()
     WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    [
      tenantId,
      id,
      name,
      city,
      rating,
      address || '',
      contactPerson || '',
      contactPhone || '',
      JSON.stringify(roomsAndRates || []),
      JSON.stringify(contacts || [])
    ]
  );
  return rows[0];
}

async function deleteHotel(tenantId, id) {
  const { rows } = await query(
    'DELETE FROM hotels WHERE tenant_id = $1 AND id = $2 RETURNING *',
    [tenantId, id]
  );
  return rows[0];
}

async function getHotelsByIds(tenantId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const { rows } = await query(
    'SELECT * FROM hotels WHERE tenant_id = $1 AND id::text = ANY($2::text[])',
    [tenantId, ids.map(String)]
  );
  return rows;
}

module.exports = {
  createHotel,
  listHotels,
  getHotelById,
  getHotelsByIds,
  updateHotel,
  deleteHotel
};
