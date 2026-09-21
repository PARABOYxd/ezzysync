/**
 * Tenant A, holding a perfectly valid session, reaching for tenant B's rows.
 *
 * Every route with an :id is called twice: once with B's real record id in
 * the path, and once with B's id in the body where the route takes one
 * (batch linking, itinerary sending). The session is genuine and the id
 * exists - the only thing standing between the caller and someone else's
 * customer list is the tenant filter in the query.
 *
 * 403 or 404 both pass; which one an app prefers is a design choice. A 200
 * carrying the other tenant's record is the failure this entire product
 * cannot survive, so these are scored critical without exception.
 */
import { ENDPOINTS, withParams } from '../lib/inventory.js';
import { makeCase, resolvePath, resolveParam } from '../lib/case.js';
import { deniedCrossTenant, refusedCrossTenant, noServerError, SEVERITY } from '../lib/expect.js';

export const name = 'tenant-isolation';
export const description = 'One tenant, valid session, other tenant\'s record ids.';

export function generate(ctx) {
  const cases = [];
  const skipped = [];

  for (const endpoint of withParams()) {
    if (endpoint.auth === 'webhook') continue;
    // A share link is meant to work for whoever holds it, including someone
    // outside the tenant that issued it. That is the feature, not a leak.
    if (endpoint.publicByDesign) continue;

    const path = resolvePath(endpoint, ctx, { side: 'B' });
    if (!path) {
      skipped.push({ rule: name, endpoint: endpoint.id, reason: 'tenant B has no seeded record for this route' });
      continue;
    }

    const token = endpoint.auth === 'required' ? ctx.users.adminA.token : null;
    // The id actually placed in the path, so the check can look for it in
    // the response rather than guessing at what a record looks like.
    const foreignId = Object.values(endpoint.params || {})
      .map((key) => resolveParam(key, ctx, 'B'))
      .find((v) => v && v !== '999999999');

    cases.push(makeCase({
      rule: name,
      endpoint,
      title: `${endpoint.method.toUpperCase()} ${endpoint.path} against tenant B's record, as tenant A's admin`,
      path,
      body: endpoint.sample ? endpoint.sample(ctx) : undefined,
      token,
      checks: [deniedCrossTenant(foreignId), refusedCrossTenant(), noServerError(SEVERITY.high)],
      tags: ['isolation', 'security', 'cross-tenant'],
      meta: { crossTenant: true },
    }));

    // The same route, but as a team member - a lower-privilege path to the
    // same data that sometimes skips the tenant filter a controller applies
    // only on the admin branch.
    if (endpoint.auth === 'required') {
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `${endpoint.method.toUpperCase()} ${endpoint.path} against tenant B's record, as tenant A's team member`,
        path,
        body: endpoint.sample ? endpoint.sample(ctx) : undefined,
        token: ctx.users.memberA.token,
        checks: [deniedCrossTenant(foreignId), refusedCrossTenant(), noServerError(SEVERITY.high)],
        tags: ['isolation', 'security', 'cross-tenant'],
        meta: { crossTenant: true },
      }));
    }
  }

  // Foreign ids smuggled through the body rather than the path.
  const bodyIdRoutes = ENDPOINTS.filter((e) => e.body && Object.entries(e.body).some(([, spec]) => spec.type === 'id'));
  for (const endpoint of bodyIdRoutes) {
    const path = resolvePath(endpoint, ctx, { side: 'A' });
    if (!path) continue;
    for (const [field, spec] of Object.entries(endpoint.body)) {
      if (spec.type !== 'id') continue;
      const resourceKey = field.toLowerCase().includes('booking') ? 'booking'
        : field.toLowerCase().includes('lead') ? 'lead'
        : field.toLowerCase().includes('quotation') ? 'quotation'
        : field.toLowerCase().includes('chat') ? 'chat' : null;
      if (!resourceKey) continue;
      const foreignId = resolveParam(resourceKey, ctx, 'B');
      if (!foreignId) continue;

      const body = { ...(endpoint.sample ? endpoint.sample(ctx) : {}), [field]: foreignId };
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `${endpoint.method.toUpperCase()} ${endpoint.path} with tenant B's ${resourceKey} id in "${field}"`,
        path,
        body,
        token: ctx.users.adminA.token,
        checks: [
          {
            label: 'foreign-id-in-body-rejected',
            fn: (res) => res.status !== 200 || !JSON.stringify(res.body || {}).includes(String(foreignId)),
            severity: SEVERITY.critical,
            why: 'A record id belonging to another tenant was accepted from the request body. The tenant filter has to apply to ids that arrive this way too, not only to path parameters.',
          },
          noServerError(SEVERITY.high),
        ],
        tags: ['isolation', 'security', 'body-id'],
        meta: { crossTenant: true },
      }));
    }
  }

  return { cases, skipped };
}
