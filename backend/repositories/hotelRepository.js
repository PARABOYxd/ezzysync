const { query } = require('../config/db');

async function createHotel(tenantId, { name, city, rating, address, contactPerson, contactPhone, roomsAndRates }) {
  const { rows } = await query(
    `INSERT INTO hotels (
      tenant_id, name, city, rating, address, contact_person, contact_phone, rooms_and_rates
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      tenantId,
      name,
      city,
      rating || '3 Star',
      address || '',
      contactPerson || '',
      contactPhone || '',
      JSON.stringify(roomsAndRates || [])
    ]
  );
  return rows[0];
}

async function listHotels(tenantId, search = '') {
  let text = 'SELECT * FROM hotels WHERE tenant_id = $1';
  const params = [tenantId];

  if (search) {
    text += ' AND (name ILIKE $2 OR city ILIKE $2)';
    params.push(`%${search}%`);
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

async function updateHotel(tenantId, id, { name, city, rating, address, contactPerson, contactPhone, roomsAndRates }) {
  const { rows } = await query(
    `UPDATE hotels
     SET name = $3, city = $4, rating = $5, address = $6, contact_person = $7, contact_phone = $8, rooms_and_rates = $9, updated_at = now()
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
      JSON.stringify(roomsAndRates || [])
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

module.exports = {
  createHotel,
  listHotels,
  getHotelById,
  updateHotel,
  deleteHotel
};
