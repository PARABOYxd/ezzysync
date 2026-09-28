/**
 * Can this endpoint be reached without a valid session?
 *
 * Nine ways of presenting no usable credential - absent, empty, malformed,
 * the wrong scheme, signed with the wrong key, signed with alg:none, expired,
 * and one belonging to a user who has since been deleted - against every
 * route that sits behind requireAuth. The expected answer is 401 in all nine
 * cases; a 200 is a hole, and a 500 means the guard crashed rather than
 * refused.
 *
 * The alg:none and wrong-key variants are the two that matter most. Both are
 * tokens the app would accept if it ever verified without pinning the
 * algorithm or the secret, and neither is something a normal client would
 * ever send, so nothing else in the suite would catch it.
 */
import { ENDPOINTS, SUPER_ADMIN_ENDPOINTS } from '../lib/inventory.js';
import { makeCase, resolvePath } from '../lib/case.js';
import { TOKEN_VARIANTS } from '../lib/payloads.js';
import { isUnauthorized, noServerError, SEVERITY, bodyDoesNotLeak } from '../lib/expect.js';

export const name = 'authentication';
export const description = 'Every authenticated route, against nine kinds of unusable credential.';

export function generate(ctx) {
  const cases = [];
  const skipped = [];

  const headerFor = (variant) => {
    switch (variant.header) {
      case 'ALG_NONE': return `Bearer ${ctx.badTokens.algNone}`;
      case 'WRONG_SIGNATURE': return `Bearer ${ctx.badTokens.wrongSignature}`;
      case 'EXPIRED': return `Bearer ${ctx.badTokens.expired}`;
      case 'DELETED_USER': return `Bearer ${ctx.badTokens.deletedUser}`;
      default: return variant.header;
    }
  };

  // Platform routes included: a forged or expired token reaching them would be
  // the most damaging failure in the app.
  for (const endpoint of [...ENDPOINTS, ...SUPER_ADMIN_ENDPOINTS]) {
    if (endpoint.auth !== 'required') continue;

    const path = resolvePath(endpoint, ctx);
    if (!path) {
      skipped.push({ rule: name, endpoint: endpoint.id, reason: 'path parameter could not be resolved from the seeded world' });
      continue;
    }

    for (const variant of TOKEN_VARIANTS) {
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `${endpoint.method.toUpperCase()} ${endpoint.path} with ${variant.label}`,
        path,
        body: endpoint.sample ? endpoint.sample(ctx) : undefined,
        headers: variant.header === null ? {} : { Authorization: headerFor(variant) },
        token: null,
        checks: [
          isUnauthorized(),
          noServerError(SEVERITY.critical),
          bodyDoesNotLeak(['jwt malformed', 'at Object.', 'node_modules', 'select ', 'password_hash']),
        ],
        tags: ['auth', 'security', variant.label],
      }));
    }
  }

  // A token minted for tenant A, presented to a route as though it were a
  // session - this one should work, and is here so the suite would notice if
  // requireAuth started rejecting valid sessions too.
  for (const endpoint of ENDPOINTS.filter((e) => e.auth === 'required' && !e.heavy && !e.externals && e.method === 'get').slice(0, 40)) {
    const path = resolvePath(endpoint, ctx);
    if (!path) continue;
    cases.push(makeCase({
      rule: name,
      endpoint,
      title: `${endpoint.method.toUpperCase()} ${endpoint.path} with a valid admin session`,
      path,
      token: ctx.users.adminA.token,
      checks: [
        { label: 'not-401', fn: (res) => res.status !== 401, severity: SEVERITY.critical, why: 'A valid, unexpired session was rejected. Every logged-in user would see this as being signed out at random.' },
        noServerError(SEVERITY.high),
      ],
      tags: ['auth', 'positive'],
    }));
  }

  return { cases, skipped };
}
