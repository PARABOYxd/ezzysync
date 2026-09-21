/**
 * Fields a client may never set through a generic update.
 *
 * Leads, bookings and batches are updated by merging req.body over the stored
 * record, and soft delete is implemented as that same update with
 * `{ deleted: true }`. So `PUT /api/leads/:id {"deleted": true}` deleted the
 * lead - through the `update` permission, which team members hold by default,
 * rather than `delete`, which they do not. The QA matrix found it when its
 * mass-assignment cases quietly removed the lead every later case needed.
 *
 * Deleting goes through the DELETE routes; ids, ownership and timestamps are
 * the server's to set.
 */
const ALWAYS = [
  'deleted', 'tenantId', 'tenant_id', 'id',
  'createdBy', 'created_by', 'createdAt', 'created_at', 'updatedAt', 'updated_at',
];

function withoutProtectedFields(body, extra = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  const blocked = new Set([...ALWAYS, ...extra]);
  const out = {};
  for (const [key, value] of Object.entries(body)) {
    if (!blocked.has(key) && key !== '__proto__' && key !== 'constructor' && key !== 'prototype') out[key] = value;
  }
  return out;
}

module.exports = { withoutProtectedFields };
