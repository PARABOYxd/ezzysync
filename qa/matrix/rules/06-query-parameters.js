/**
 * The query string, which almost nothing validates.
 *
 * List screens send page, limit, search, a date range and a status filter,
 * and those values go into SQL - sometimes into a LIMIT, sometimes into an
 * ORDER BY, sometimes into a LIKE. Each is a different way to break: a
 * non-numeric LIMIT raises in the driver, a negative one raises in Postgres,
 * an enormous one asks the database for the entire table, and a search term
 * with a quote in it is the classic injection probe.
 *
 * `pg_sleep` is in the value set on purpose. If a case that sends it comes
 * back noticeably slower than its siblings, concatenation is happening
 * somewhere, and the runner records the duration of every case so that shows
 * up in the report rather than being invisible.
 */
import { ENDPOINTS, GENERIC_QUERY_PARAMS } from '../lib/inventory.js';
import { makeCase, resolvePath } from '../lib/case.js';
import { BAD_QUERY_VALUES } from '../lib/payloads.js';
import { noServerError, noCrash, bodyDoesNotLeak, SEVERITY } from '../lib/expect.js';

export const name = 'query-parameters';
export const description = 'Pagination, search, sort and filter parameters against hostile values.';

const LEAK_NEEDLES = ['invalid input syntax', 'syntax error at or near', 'relation "', 'at Query.', 'node_modules'];

export function generate(ctx) {
  const cases = [];
  const skipped = [];

  const listEndpoints = ENDPOINTS.filter((e) => e.list && !e.heavy);

  for (const endpoint of listEndpoints) {
    const path = resolvePath(endpoint, ctx);
    if (!path) {
      skipped.push({ rule: name, endpoint: endpoint.id, reason: 'path parameter could not be resolved' });
      continue;
    }
    const token = endpoint.auth === 'required' ? ctx.users.adminA.token : null;

    for (const param of GENERIC_QUERY_PARAMS) {
      for (const v of BAD_QUERY_VALUES) {
        cases.push(makeCase({
          rule: name,
          endpoint,
          title: `${endpoint.method.toUpperCase()} ${endpoint.path}?${param}=${v.label}`,
          path,
          query: { [param]: v.value },
          token,
          checks: [
            noCrash(endpoint, SEVERITY.high),
            bodyDoesNotLeak(LEAK_NEEDLES),
            {
              label: 'bounded-response',
              fn: (res) => {
                if (res.status !== 200) return true;
                const rows = Array.isArray(res.body) ? res.body : Object.values(res.body || {}).find(Array.isArray);
                return !Array.isArray(rows) || rows.length <= 1000;
              },
              severity: SEVERITY.medium,
              why: 'A client-supplied paging value produced more than a thousand rows in one response. Whatever the caller asks for, the page size needs a ceiling the server enforces.',
            },
          ],
          tags: ['query-params', 'fuzz', param],
          meta: { param, valueLabel: v.label, timingSensitive: v.label.includes('sqli') },
        }));
      }
    }

    // Repeated parameters, which Express turns into an array - a shape most
    // handlers never anticipate.
    cases.push(makeCase({
      rule: name,
      endpoint,
      title: `${endpoint.method.toUpperCase()} ${endpoint.path} with a repeated parameter (arrives as an array)`,
      path,
      query: { search: ['first', 'second'] },
      token,
      checks: [noServerError(SEVERITY.high), bodyDoesNotLeak(LEAK_NEEDLES)],
      tags: ['query-params', 'array-param'],
    }));

    // A parameter named like an internal column.
    cases.push(makeCase({
      rule: name,
      endpoint,
      title: `${endpoint.method.toUpperCase()} ${endpoint.path} with tenant_id in the query string`,
      path,
      query: { tenant_id: ctx.tenantB.tenantId, tenantId: ctx.tenantB.tenantId },
      token: ctx.users.adminA.token,
      checks: [
        noServerError(SEVERITY.high),
        {
          label: 'tenant-not-overridable',
          fn: (res) => res.status !== 200 || !JSON.stringify(res.body || {}).includes(String(ctx.tenantB.tenantId)),
          severity: SEVERITY.critical,
          why: 'A tenant id supplied in the query string appeared in the response. Tenant scope must come from the signed token and nowhere else.',
        },
      ],
      tags: ['query-params', 'isolation', 'security'],
    }));
  }

  return { cases, skipped };
}
