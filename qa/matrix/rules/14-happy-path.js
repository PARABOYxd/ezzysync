/**
 * The boring case: a correct request from a user who is allowed to make it.
 *
 * A suite made only of hostile input has a blind spot you can drive a release
 * through - every case passes just as happily against an endpoint that
 * rejects everything as against one that works. So each route gets one
 * request with a valid body, a valid session and valid ids, and is expected
 * to answer like a working endpoint.
 *
 * Routes that would send a message, charge a card or render a PDF are held to
 * a lower bar: they are allowed to fail, because the network guard has cut
 * them off from their provider on purpose. What they are not allowed to do is
 * answer 401 or 403, because that would mean the failure was about
 * permission rather than about the provider.
 */
import { ENDPOINTS } from '../lib/inventory.js';
import { makeCase, resolvePath } from '../lib/case.js';
import { SEVERITY, bodyDoesNotLeak } from '../lib/expect.js';

export const name = 'happy-path';
export const description = 'One valid, authorised request per route.';

export function generate(ctx) {
  const cases = [];
  const skipped = [];

  for (const endpoint of ENDPOINTS) {
    if (endpoint.destructive || endpoint.skipHappy || endpoint.upload) continue;

    const path = resolvePath(endpoint, ctx);
    if (!path) {
      skipped.push({ rule: name, endpoint: endpoint.id, reason: 'path parameter could not be resolved' });
      continue;
    }

    const token = endpoint.auth === 'required' ? ctx.users.adminA.token : null;
    const tolerant = endpoint.externals || endpoint.heavy;

    const checks = [bodyDoesNotLeak(['password_hash', 'JWT_SECRET', 'DATABASE_URL', 'at Query.', 'node_modules'])];

    // Routes whose sample deliberately carries bad credentials - a login with
    // the wrong password, a webhook with no signature - are supposed to answer
    // 401. Demanding otherwise would contradict the case's own expectation.
    if (!endpoint.expectSampleRejected && endpoint.auth !== 'webhook') {
      checks.push({
        label: 'not-refused-for-permission',
        fn: (res) => res.status !== 401 && res.status !== 403,
        severity: SEVERITY.high,
        why: 'A correct request from the tenant\'s own admin was refused on authentication or permission grounds.',
      });
    }

    if (endpoint.expectSampleRejected) {
      checks.push({
        label: 'expected-rejection',
        fn: (res) => res.status >= 400 && res.status < 500,
        severity: SEVERITY.high,
        why: 'This request carries deliberately invalid credentials or tokens and must be rejected with a 4xx - accepting it would be the bug.',
      });
    } else if (!tolerant) {
      checks.push({
        label: 'succeeds',
        fn: (res) => res.status >= 200 && res.status < 400,
        severity: SEVERITY.high,
        why: 'A valid request to this route did not succeed. Whatever else the suite reports, this is the path a real user takes.',
      });
    } else {
      checks.push({
        label: 'no-unexplained-5xx',
        fn: (res) => res.status < 500 || res.status === 502 || res.status === 503,
        severity: SEVERITY.low,
        why: 'This route reaches an external provider that the harness has deliberately cut off. A 502/503 is the correct answer to that; a 500 means the provider failure was not handled.',
      });
    }

    cases.push(makeCase({
      rule: name,
      endpoint,
      title: `${endpoint.method.toUpperCase()} ${endpoint.path} with a valid request`,
      path,
      body: endpoint.sample ? endpoint.sample(ctx) : undefined,
      token,
      checks,
      tags: ['happy-path', tolerant ? 'external' : 'core'],
    }));

    // GET routes also get their response shape sanity-checked.
    if (endpoint.method === 'get' && !tolerant) {
      cases.push(makeCase({
        rule: name,
        endpoint,
        title: `GET ${endpoint.path} answers with JSON`,
        path,
        token,
        checks: [
          {
            label: 'json-content-type',
            fn: (res) => {
              if (res.status >= 400) return true;
              const ct = res.headers['content-type'] || '';
              return ct.includes('json') || ct.includes('csv') || ct.includes('pdf') || ct.includes('octet-stream') || ct.includes('sheet');
            },
            severity: SEVERITY.medium,
            why: 'A successful API response came back as something other than JSON or a recognised download type.',
          },
        ],
        tags: ['happy-path', 'contract'],
      }));
    }
  }

  return { cases, skipped };
}
