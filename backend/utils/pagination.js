/**
 * Page and page size from a query string, always within bounds.
 *
 * Each list controller used to do `parseInt(req.query.limit, 10) || 10`, which
 * passes -10 straight to Postgres (a 500) and 99999999 straight through (the
 * whole table in one response). The ceiling sits above the largest page the
 * frontend asks for (150, for quotation pickers).
 */
const MAX_LIMIT = 500;

function pageParams(query = {}, { defaultLimit = 10 } = {}) {
  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);
  return {
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    limit: Number.isFinite(limit) && limit >= 1 ? Math.min(limit, MAX_LIMIT) : defaultLimit,
  };
}

module.exports = { pageParams, MAX_LIMIT };
