/**
 * One field at a time, everything else valid.
 *
 * This is where most of the ten thousand cases come from, and the
 * one-field-at-a-time shape is what makes them worth reading: when a case
 * fails, the failing input is a single named field with a single named value,
 * so the report says "bookings.create, members = '1e999', 500" rather than
 * "some booking payload broke something".
 *
 * Two bars, deliberately different heights:
 *
 *   Every case, without exception, must come back under 500. A handler that
 *   throws on input it did not expect is a crash - the client gets nothing
 *   useful, the log gets a stack trace, and on a bad day the transaction is
 *   left half-applied.
 *
 *   Cases marked `mustReject` must additionally come back 4xx: a required
 *   email field handed "notanemail" has one correct answer. Values that are
 *   merely odd (a negative price, a date in 9999) are not held to that -
 *   plenty of them are legitimately accepted, and demanding a rejection would
 *   fill the report with noise.
 *
 * Endpoints that reach a provider or render a PDF get the typed set only.
 * Throwing ten thousand hostile strings at a route that would render a PDF
 * for each one buys nothing but minutes.
 */
import { withBody } from '../lib/inventory.js';
import { makeCase, resolvePath, bodyWithField } from '../lib/case.js';
import { HOSTILE_VALUES, TYPED_INVALID } from '../lib/payloads.js';
import { noServerError, noCrash, isRejected, bodyDoesNotLeak, SEVERITY } from '../lib/expect.js';

export const name = 'field-validation';
export const description = 'Every writable field against hostile and type-invalid values, one field at a time.';

const LEAK_NEEDLES = [
  'syntax error at or near',
  'invalid input syntax',
  'relation "',
  'at Query.',
  'node_modules',
  'password_hash',
  'jwtsecret',
  'econnrefused',
];

export function generate(ctx) {
  const cases = [];
  const skipped = [];

  for (const endpoint of withBody()) {
    const path = resolvePath(endpoint, ctx);
    if (!path) {
      skipped.push({ rule: name, endpoint: endpoint.id, reason: 'path parameter could not be resolved' });
      continue;
    }
    if (endpoint.destructive) continue; // a fuzzed delete is still a delete

    const token = endpoint.auth === 'required' ? ctx.users.adminA.token : null;
    const cheap = !endpoint.externals && !endpoint.heavy;

    for (const [field, spec] of Object.entries(endpoint.body)) {
      const typed = (TYPED_INVALID[spec.type] || []).map((v) => ({ ...v, family: 'typed' }));
      const hostile = cheap ? HOSTILE_VALUES.map((v) => ({ ...v, family: 'hostile' })) : [];
      const values = [...typed, ...hostile];

      for (const v of values) {
        const mustReject = Boolean(v.mustReject && spec.required);
        cases.push(makeCase({
          rule: name,
          endpoint,
          title: `${endpoint.method.toUpperCase()} ${endpoint.path} with ${field} = ${v.label}`,
          path,
          body: bodyWithField(endpoint, ctx, field, v.value),
          token,
          checks: [
            noCrash(endpoint, SEVERITY.high),
            ...(mustReject ? [isRejected(SEVERITY.high, `"${field}" is a required ${spec.type} and ${v.label} is not a valid one, so the request has to be rejected with a 4xx.`)] : []),
            bodyDoesNotLeak(LEAK_NEEDLES),
          ],
          tags: ['validation', 'fuzz', v.family, spec.type],
          meta: { field, valueLabel: v.label, fieldType: spec.type, required: !!spec.required },
        }));
      }
    }

    // Each required field, simply absent.
    for (const [field, spec] of Object.entries(endpoint.body)) {
      if (!spec.required) continue;
      const body = endpoint.sample ? { ...endpoint.sample(ctx) } : {};
      delete body[field];
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `${endpoint.method.toUpperCase()} ${endpoint.path} with required field "${field}" missing`,
        path,
        body,
        token,
        checks: [
          noServerError(SEVERITY.high),
          isRejected(SEVERITY.high, `"${field}" is documented as required; omitting it must produce a 4xx with a message naming the field, not a silent default or a crash.`),
          bodyDoesNotLeak(LEAK_NEEDLES),
        ],
        tags: ['validation', 'missing-required'],
        meta: { field },
      }));
    }

    // Unknown fields, including ones that name internal columns. Mass
    // assignment is the risk: a route that spreads req.body into an UPDATE
    // will happily take tenant_id or role along with it.
    for (const injected of ['tenant_id', 'tenantId', 'id', 'role', 'permissions', 'created_by', 'deleted', 'plan_id', 'is_admin', '__proto__']) {
      const body = { ...(endpoint.sample ? endpoint.sample(ctx) : {}), [injected]: injected === 'role' ? 'ADMIN' : injected === 'deleted' ? true : 'qa-injected' };
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `${endpoint.method.toUpperCase()} ${endpoint.path} with unexpected field "${injected}"`,
        path,
        body,
        token,
        checks: [
          noServerError(SEVERITY.high),
          {
            label: 'no-mass-assignment',
            fn: (res) => {
              if (res.status >= 400) return true;
              const echoed = JSON.stringify(res.body || {});
              return !echoed.includes('qa-injected');
            },
            severity: SEVERITY.high,
            why: `The value sent as "${injected}" came back in the response, which means the route passed an unrecognised client-supplied field straight through. Ownership and role columns must never be settable from a request body.`,
          },
        ],
        tags: ['validation', 'mass-assignment', 'security'],
        meta: { field: injected },
      }));
    }
  }

  return { cases, skipped };
}
