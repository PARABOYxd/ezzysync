/**
 * The verbs nobody meant to expose, and the paths nobody meant to serve.
 *
 * Express routes by method, so `GET /api/bookings/:id` and
 * `DELETE /api/bookings/:id` are separate registrations - and a router that
 * registers one and not the other falls through to whatever matches next,
 * which is occasionally a different route with a different guard. Sending
 * every unregistered verb at every path is how that shows up.
 *
 * The unknown-path cases cover the other half: a 404 handler that renders a
 * stack trace, or a static middleware that serves `../../.env` when asked
 * nicely. Both have shipped in real Express apps.
 */
import { ENDPOINTS } from '../lib/inventory.js';
import { makeCase, resolvePath } from '../lib/case.js';
import { noServerError, bodyDoesNotLeak, SEVERITY } from '../lib/expect.js';

export const name = 'http-contract';
export const description = 'Unregistered verbs, unknown paths, and what the 404 handler says.';

const ALL_VERBS = ['get', 'post', 'put', 'patch', 'delete'];

/**
 * Traversal attempts are percent-encoded on purpose. An unencoded `..` is
 * collapsed by the HTTP client before the request is sent, so `/api/leads/../users`
 * arrives as `/api/users` and a 200 proves nothing except that the client
 * normalises paths. The %2f-encoded forms reach the server intact; `%2e%2e`
 * on its own does not - WHATWG URL parsing treats it as `..` and collapses it
 * client-side too, so it is left out.
 */
const UNKNOWN_PATHS = [
  '/api/does-not-exist',
  '/api/leads%2f..%2f..%2fetc%2fpasswd',
  '/api%2f..%2f.env',
  '/.env',
  '/api/admin',
  '/api/debug',
  '/api/v2/leads',
  '/api/leads%00',
  '/uploads/%2e%2e%2f.env',
  '/media/%2e%2e%2f%2e%2e%2fbackend%2f.env',
];

export function generate(ctx) {
  const cases = [];
  const skipped = [];

  const byPath = new Map();
  for (const e of ENDPOINTS) {
    if (!byPath.has(e.path)) byPath.set(e.path, new Set());
    byPath.get(e.path).add(e.method);
  }

  for (const [path, verbs] of byPath) {
    const endpoint = ENDPOINTS.find((e) => e.path === path);
    if (endpoint.heavy || endpoint.upload) continue;
    const resolved = resolvePath(endpoint, ctx);
    if (!resolved) {
      skipped.push({ rule: name, endpoint: endpoint.id, reason: 'path parameter could not be resolved' });
      continue;
    }

    for (const verb of ALL_VERBS) {
      if (verbs.has(verb)) continue;
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `${verb.toUpperCase()} ${path} (verb not registered on this route)`,
        method: verb,
        path: resolved,
        body: verb === 'get' || verb === 'delete' ? undefined : {},
        token: ctx.users.adminA.token,
        checks: [
          noServerError(SEVERITY.high),
          {
            label: 'unregistered-verb-refused',
            // Any refusal is fine: `PUT /expenses/templates` legitimately
            // lands on `PUT /expenses/:id` and is rejected there with a 400.
            // What must not happen is a 2xx from some other handler.
            fn: (res) => res.status >= 400 && res.status < 500,
            severity: SEVERITY.medium,
            why: 'A verb this route does not register was answered with a success. It fell through to another handler, which may not carry the same guards.',
          },
          bodyDoesNotLeak(['node_modules', 'at Layer.', 'at Function.']),
        ],
        tags: ['http-contract', 'verb'],
      }));
    }
  }

  for (const path of UNKNOWN_PATHS) {
    for (const verb of ['get', 'post']) {
      cases.push(makeCase({
        rule: name,
        endpoint: null,
        title: `${verb.toUpperCase()} ${path} (unknown path)`,
        method: verb,
        path,
        body: verb === 'post' ? {} : undefined,
        token: ctx.users.adminA.token,
        checks: [
          noServerError(SEVERITY.high),
          {
            label: 'unknown-path-404',
            fn: (res) => res.status === 404 || res.status === 400 || res.status === 401 || res.status === 403,
            severity: SEVERITY.high,
            why: 'A path the app does not define answered with something other than a 404. If it served a file, that is a traversal.',
          },
          bodyDoesNotLeak(['JWT_SECRET', 'DATABASE_URL', 'PGPASSWORD', 'BEGIN RSA', 'node_modules', 'at Layer.']),
        ],
        tags: ['http-contract', 'unknown-path', 'security'],
      }));
    }
  }

  return { cases, skipped };
}
