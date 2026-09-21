/**
 * What reaches the database when the id in the URL is nonsense.
 *
 * Postgres is strict about types in a way Express is not. `/api/bookings/abc`
 * hands "abc" to a query whose column is an integer, and unless the route
 * checks first, the driver raises and the user gets a 500 with a Postgres
 * message in it - which names the table and the column, and is the kind of
 * detail that makes the next attack easier.
 *
 * So every :id gets fourteen values: zero, negative, absurdly large,
 * fractional, alphabetic, a UUID, two SQL fragments, two traversal attempts,
 * a null byte, a script tag, two kilobytes of A, an emoji, and a Mongo-style
 * operator object. None may crash, and none may return 200 - an id that does
 * not exist is a 404, not a record.
 */
import { withParams } from '../lib/inventory.js';
import { makeCase, resolvePath } from '../lib/case.js';
import { BAD_PATH_PARAMS } from '../lib/payloads.js';
import { noCrash, bodyDoesNotLeak, SEVERITY } from '../lib/expect.js';

export const name = 'path-parameters';
export const description = 'Malformed, hostile and non-existent ids in every parameterised route.';

const LEAK_NEEDLES = ['invalid input syntax', 'syntax error at or near', 'relation "', 'at Query.', 'node_modules'];

export function generate(ctx) {
  const cases = [];
  const skipped = [];

  for (const endpoint of withParams()) {
    if (endpoint.auth === 'webhook') continue;
    if (endpoint.heavy) continue;

    const names = (endpoint.path.match(/:[A-Za-z0-9_]+/g) || []).map((s) => s.slice(1));
    const token = endpoint.auth === 'required' ? ctx.users.adminA.token : null;

    for (const param of names) {
      for (const bad of BAD_PATH_PARAMS) {
        const path = resolvePath(endpoint, ctx, { overrides: { [param]: bad.value } });
        if (!path) {
          skipped.push({ rule: name, endpoint: endpoint.id, reason: `sibling parameter of ${param} could not be resolved` });
          continue;
        }

        cases.push(makeCase({
          rule: name,
          endpoint,
          title: `${endpoint.method.toUpperCase()} ${endpoint.path} with ${param} = ${bad.label}`,
          path,
          body: endpoint.sample ? endpoint.sample(ctx) : undefined,
          token,
          checks: [
            noCrash(endpoint, SEVERITY.high),
            {
              label: 'nonexistent-id-not-200',
              fn: (res) => res.status !== 200,
              severity: endpoint.destructive ? SEVERITY.critical : SEVERITY.medium,
              why: 'An id that cannot possibly match a record was answered with a 200. Either the route ignored the id, or it matched something it should not have.',
            },
            bodyDoesNotLeak(LEAK_NEEDLES),
          ],
          tags: ['path-params', 'fuzz', bad.label],
          meta: { param, valueLabel: bad.label },
        }));
      }
    }
  }

  return { cases, skipped };
}
