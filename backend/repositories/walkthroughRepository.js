const { query } = require('../config/db');

async function insertWalkthroughRequest({
  name,
  agencyName,
  email,
  phone,
  city = '',
  state = '',
  travelSpeciality = '',
  instagramLink = '',
  websiteLink = '',
  websiteOrInstagram = '',
  gstNumber = '',
  visitingCardUrl = '',
}) {
  const effectiveSocial = instagramLink || websiteLink || websiteOrInstagram || '';
  const { rows } = await query(
    `INSERT INTO walkthrough_requests (
      name, agency_name, email, phone, city, state, travel_speciality,
      website_or_instagram, instagram_link, website_link, gst_number, visiting_card_url
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      name,
      agencyName,
      email,
      phone || '',
      city || '',
      state || '',
      travelSpeciality || '',
      effectiveSocial,
      instagramLink || '',
      websiteLink || '',
      gstNumber || '',
      visitingCardUrl || '',
    ]
  );
  return rows[0];
}

async function listWalkthroughRequests() {
  const { rows } = await query(
    `SELECT * FROM walkthrough_requests ORDER BY created_at DESC`
  );
  return rows;
}

async function findRecentRequest({ email, phone, windowMinutes = 60 }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').trim();

  let sql;
  let params;
  if (cleanPhone) {
    sql = `SELECT * FROM walkthrough_requests 
           WHERE (LOWER(email) = LOWER($1) OR (phone IS NOT NULL AND phone != '' AND phone = $2))
             AND created_at > NOW() - ($3 || ' minutes')::interval
           ORDER BY created_at DESC 
           LIMIT 1`;
    params = [normalizedEmail, cleanPhone, windowMinutes];
  } else {
    sql = `SELECT * FROM walkthrough_requests 
           WHERE LOWER(email) = LOWER($1)
             AND created_at > NOW() - ($2 || ' minutes')::interval
           ORDER BY created_at DESC 
           LIMIT 1`;
    params = [normalizedEmail, windowMinutes];
  }

  const { rows } = await query(sql, params);
  return rows[0] || null;
}

module.exports = {
  insertWalkthroughRequest,
  listWalkthroughRequests,
  findRecentRequest,
};

