/**
 * Does the permission matrix actually gate anything?
 *
 * Three users, same tenant: an ADMIN, a TEAM_MEMBER with every module/action
 * switched on, and a TEAM_MEMBER with every one switched off. Each route that
 * declares a permission gets all three.
 *
 * The denied member must get 403 - that is the whole point of the feature.
 * The granted member must NOT get 403, and that direction is the interesting
 * one: it catches routes that gate on something the permission matrix cannot
 * grant. Two already exist in this codebase - the expense router asks for
 * `billing.write` and settings asks for `canManageSettings`, neither of which
 * appears in config/permissions - so an admin can use those screens and no
 * team member ever can, whatever their permissions say.
 *
 * Routes gated on role directly (`adminOnly`) are checked the other way: both
 * team members must be refused, permissions or not.
 *
 * Platform routes (`superAdminOnly`) go one step further: the tenant's own
 * admin must be refused too. An agency owner reaching one of these could
 * list, suspend, impersonate or delete every other agency on the platform.
 */
import { ENDPOINTS, SUPER_ADMIN_ENDPOINTS } from '../lib/inventory.js';
import { makeCase, resolvePath } from '../lib/case.js';
import { isForbidden, notForbidden, noServerError, noCrash, SEVERITY } from '../lib/expect.js';

export const name = 'authorization';
export const description = 'Role and permission gates, from both sides: denied users kept out, permitted users let in.';

export function generate(ctx) {
  const cases = [];
  const skipped = [];

  for (const endpoint of ENDPOINTS) {
    if (endpoint.auth !== 'required') continue;
    if (!endpoint.permission && !endpoint.adminOnly) continue;

    const path = resolvePath(endpoint, ctx);
    if (!path) {
      skipped.push({ rule: name, endpoint: endpoint.id, reason: 'path parameter could not be resolved' });
      continue;
    }
    const body = endpoint.sample ? endpoint.sample(ctx) : undefined;

    // A team member with nothing granted.
    cases.push(makeCase({
      rule: name,
      endpoint,
      title: `${endpoint.method.toUpperCase()} ${endpoint.path} as a team member with no permissions`,
      path,
      body,
      token: ctx.users.deniedA.token,
      checks: [isForbidden(), noServerError(SEVERITY.high)],
      tags: ['rbac', 'security', 'denied'],
      meta: { permission: endpoint.permission?.join('.') || 'role:ADMIN' },
    }));

    if (endpoint.adminOnly) {
      // Even a fully-permissioned member must not pass a role gate.
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `${endpoint.method.toUpperCase()} ${endpoint.path} as a team member with every permission (admin-only route)`,
        path,
        body,
        token: ctx.users.memberA.token,
        checks: [isForbidden(), noServerError(SEVERITY.high)],
        tags: ['rbac', 'security', 'admin-only'],
      }));
    } else if (endpoint.destructive) {
      // A granted member calling DELETE really would delete the fixture every
      // later rule depends on, and would prove only that DELETE deletes. The
      // denied-member case above is the one that carries the security claim.
      skipped.push({ rule: name, endpoint: endpoint.id, reason: 'granted-permission case skipped on a destructive route' });
    } else {
      // A team member holding exactly the permission the route names.
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `${endpoint.method.toUpperCase()} ${endpoint.path} as a team member holding ${endpoint.permission.join('.')}`,
        path,
        body,
        token: ctx.users.memberA.token,
        checks: [
          notForbidden(endpoint.destructive ? SEVERITY.low : SEVERITY.high),
          noCrash(endpoint, endpoint.externals ? SEVERITY.low : SEVERITY.high),
        ],
        tags: ['rbac', 'granted'],
        meta: { permission: endpoint.permission.join('.') },
      }));
    }

    // And the admin, who bypasses the matrix entirely.
    if (!endpoint.destructive) {
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `${endpoint.method.toUpperCase()} ${endpoint.path} as the tenant admin`,
        path,
        body,
        token: ctx.users.adminA.token,
        checks: [
          { label: 'admin-not-blocked', fn: (res) => res.status !== 401 && res.status !== 403, severity: SEVERITY.high, why: 'The tenant owner was refused their own data. Admins bypass the permission matrix by design.' },
          noCrash(endpoint, endpoint.externals || endpoint.heavy ? SEVERITY.low : SEVERITY.high),
        ],
        tags: ['rbac', 'admin'],
      }));
    }
  }

  for (const endpoint of SUPER_ADMIN_ENDPOINTS) {
    const path = resolvePath(endpoint, ctx);
    if (!path) {
      skipped.push({ rule: name, endpoint: endpoint.id, reason: 'path parameter could not be resolved' });
      continue;
    }
    const body = endpoint.sample ? endpoint.sample(ctx) : undefined;
    const verb = `${endpoint.method.toUpperCase()} ${endpoint.path}`;

    for (const [who, user] of [['a team member with no permissions', ctx.users.deniedA], ['a team member with every permission', ctx.users.memberA], ['the tenant admin', ctx.users.adminA]]) {
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `${verb} as ${who} (platform-only route)`,
        path,
        body,
        token: user.token,
        checks: [isForbidden(), noServerError(SEVERITY.high)],
        tags: ['rbac', 'security', 'super-admin', 'denied'],
        meta: { permission: 'super-admin' },
      }));
    }

    // Deleting the spare agency would prove only that DELETE deletes; the three
    // refusals above carry the security claim.
    if (endpoint.destructive) {
      skipped.push({ rule: name, endpoint: endpoint.id, reason: 'super-admin success case skipped on a destructive route' });
      continue;
    }
    cases.push(makeCase({
      rule: name,
      endpoint,
      title: `${verb} as a super admin`,
      path,
      body,
      token: ctx.users.superAdmin.token,
      checks: [
        { label: 'super-admin-not-blocked', fn: (res) => res.status !== 401 && res.status !== 403, severity: SEVERITY.high, why: 'A platform administrator was refused a platform route.' },
        noCrash(endpoint, SEVERITY.high),
      ],
      tags: ['rbac', 'super-admin', 'admin'],
    }));
  }

  // Routes with no declared permission at all, reachable by any team member.
  // Not a failure by itself - most of them are meant to be - but the report
  // lists them so the gap is a decision rather than an oversight.
  for (const endpoint of ENDPOINTS) {
    if (endpoint.auth !== 'required' || endpoint.permission || endpoint.adminOnly) continue;
    const path = resolvePath(endpoint, ctx);
    if (!path) continue;
    cases.push(makeCase({
      rule: name,
      endpoint,
      title: `${endpoint.method.toUpperCase()} ${endpoint.path} has no permission gate - reachable by any team member`,
      path,
      body: endpoint.sample ? endpoint.sample(ctx) : undefined,
      token: ctx.users.deniedA.token,
      checks: [
        noCrash(endpoint, SEVERITY.medium),
        { label: 'ungated-route-observed', fn: () => true, severity: SEVERITY.info, why: 'Recorded for review: any authenticated user of the tenant can call this.' },
      ],
      tags: ['rbac', 'ungated', 'review'],
    }));
  }

  return { cases, skipped };
}
