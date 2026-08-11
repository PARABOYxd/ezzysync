const { query } = require('../config/db');

async function insertWalkthroughRequest({ name, agencyName, email, phone }) {
  const { rows } = await query(
    `INSERT INTO walkthrough_requests (name, agency_name, email, phone)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, agencyName, email, phone || '']
  );
  return rows[0];
}

async function listWalkthroughRequests() {
  const { rows } = await query(
    `SELECT * FROM walkthrough_requests ORDER BY created_at DESC`
  );
  return rows;
}

module.exports = {
  insertWalkthroughRequest,
  listWalkthroughRequests,
};
