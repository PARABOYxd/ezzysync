/**
 * The request itself, rather than what is in it.
 *
 * Handlers are written against a JSON object. They receive, over a long
 * enough life: no body at all, a JSON array, a bare string, truncated JSON
 * from a dropped connection, a form-encoded body from a client that got its
 * headers wrong, and five hundred junk keys from a script. Every one of those
 * reaches `req.body.something` and finds `undefined` somewhere the code did
 * not check.
 *
 * The prototype-pollution body is the one with teeth: a literal `__proto__`
 * key in JSON, which contaminates every object in the process if anything
 * merges request bodies without care. The runner checks afterwards whether a
 * fresh empty object inherited the polluted key, so a hit is proven rather
 * than guessed at.
 */
import { withBody, ENDPOINTS } from '../lib/inventory.js';
import { makeCase, resolvePath } from '../lib/case.js';
import { BODY_SHAPES } from '../lib/payloads.js';
import { noCrash, bodyDoesNotLeak, SEVERITY } from '../lib/expect.js';

export const name = 'request-shape';
export const description = 'Whole-body shapes, content types and oversized payloads.';

export function generate(ctx) {
  const cases = [];
  const skipped = [];

  for (const endpoint of withBody()) {
    if (endpoint.destructive || endpoint.heavy) continue;
    const path = resolvePath(endpoint, ctx);
    if (!path) {
      skipped.push({ rule: name, endpoint: endpoint.id, reason: 'path parameter could not be resolved' });
      continue;
    }
    const token = endpoint.auth === 'required' ? ctx.users.adminA.token : null;

    for (const shape of BODY_SHAPES) {
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `${endpoint.method.toUpperCase()} ${endpoint.path} with a ${shape.label}`,
        path,
        body: shape.body,
        raw: shape.raw,
        contentType: shape.contentType,
        token,
        checks: [
          noCrash(endpoint, SEVERITY.high),
          bodyDoesNotLeak(['at JSON.parse', 'node_modules', 'at Query.', 'invalid input syntax']),
        ],
        tags: ['request-shape', shape.label],
        meta: { shape: shape.label, pollutionProbe: shape.label === 'proto-pollution-body' },
      }));
    }
  }

  // The 2mb express.json ceiling, from both sides.
  const target = ENDPOINTS.find((e) => e.id === 'leads.create');
  if (target) {
    cases.push(makeCase({
      rule: name,
      endpoint: target,
      title: 'POST /api/leads with a body just over the 2mb JSON limit',
      path: '/api/leads',
      body: { ...(target.sample ? target.sample(ctx) : {}), notes: 'A'.repeat(2.1 * 1024 * 1024) },
      token: ctx.users.adminA.token,
      checks: [
        {
          label: 'oversized-body-rejected',
          fn: (res) => res.status === 413 || (res.status >= 400 && res.status < 500),
          severity: SEVERITY.medium,
          why: 'A body past the configured 2mb ceiling should be refused with 413 before it is parsed, not accepted or answered with a 500.',
        },
        noCrash(target, SEVERITY.high),
      ],
      tags: ['request-shape', 'payload-limit'],
    }));

    cases.push(makeCase({
      rule: name,
      endpoint: target,
      title: 'POST /api/leads with a large-but-legal body just under the limit',
      path: '/api/leads',
      body: { ...(target.sample ? target.sample(ctx) : {}), notes: 'A'.repeat(1.5 * 1024 * 1024) },
      token: ctx.users.adminA.token,
      checks: [noCrash(target, SEVERITY.high)],
      tags: ['request-shape', 'payload-limit'],
    }));
  }

  return { cases, skipped };
}
