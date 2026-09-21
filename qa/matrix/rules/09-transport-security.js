/**
 * The headers on the way out, and who is allowed to ask.
 *
 * Helmet is mounted, so the security headers ought to be present - but
 * "mounted" and "present on this response" are different claims, and a route
 * that writes its own headers or streams a file can lose them. Each is
 * checked on a real response rather than inferred from the middleware list.
 *
 * CORS is the more interesting half, because this app has a deliberate hole
 * in it: the public lead-capture path answers any origin, because agencies
 * embed the form on their own websites. That exception is tested here from
 * both directions - it must stay open without credentials, and it must not
 * have widened to cover anything else.
 */
import { makeCase } from '../lib/case.js';
import { hasHeader, noServerError, bodyDoesNotLeak, SEVERITY } from '../lib/expect.js';

export const name = 'transport-security';
export const description = 'Security headers, CORS allowlist, and the deliberate public-form exception.';

const FOREIGN_ORIGINS = [
  'https://evil.qa.invalid',
  'http://localhost:9999',
  'null',
  'https://ezzysync.com.evil.qa.invalid',
  'https://wwwezzysync.com',
];

export function generate(ctx) {
  const cases = [];

  const probes = [
    { path: '/api/health', token: null, label: 'health' },
    { path: '/api/leads', token: ctx.users.adminA.token, label: 'an authenticated list route' },
    { path: '/api/plans/catalog', token: null, label: 'the public plan catalog' },
  ];

  for (const probe of probes) {
    cases.push(makeCase({
      rule: name,
      endpoint: null,
      title: `Security headers on ${probe.label}`,
      method: 'get',
      path: probe.path,
      token: probe.token,
      checks: [
        hasHeader('x-content-type-options', (v) => v.toLowerCase() === 'nosniff', SEVERITY.medium,
          'X-Content-Type-Options: nosniff is missing, so a browser may sniff a response into a type it was not sent as.'),
        hasHeader('x-frame-options', null, SEVERITY.medium,
          'No framing protection on this response - the page can be embedded in an attacker\'s iframe.'),
        {
          label: 'no-x-powered-by',
          fn: (res) => res.headers['x-powered-by'] == null,
          severity: SEVERITY.low,
          why: 'X-Powered-By names the server framework and version for anyone deciding which exploits to try.',
        },
        noServerError(SEVERITY.high),
      ],
      tags: ['headers', 'security'],
    }));
  }

  for (const origin of FOREIGN_ORIGINS) {
    cases.push(makeCase({
      rule: name,
      endpoint: null,
      title: `Request from disallowed origin ${origin}`,
      method: 'get',
      path: '/api/leads',
      token: ctx.users.adminA.token,
      headers: { Origin: origin },
      checks: [
        {
          label: 'origin-not-reflected',
          fn: (res) => {
            const allow = res.headers['access-control-allow-origin'];
            return allow == null || (allow !== origin && allow !== '*');
          },
          severity: SEVERITY.critical,
          why: 'An origin outside the allowlist was echoed back in Access-Control-Allow-Origin. With credentials enabled that lets that site read this tenant\'s data from a logged-in browser.',
        },
        bodyDoesNotLeak(['password_hash', 'JWT_SECRET']),
      ],
      tags: ['cors', 'security'],
    }));
  }

  const leadKey = ctx.res.A.leadKey;
  if (leadKey) {
    cases.push(makeCase({
      rule: name,
      endpoint: null,
      title: 'The public lead-capture form still accepts an unknown origin (deliberate exception)',
      method: 'post',
      path: `/api/public/leads/${encodeURIComponent(leadKey)}`,
      body: { customerName: 'QA CORS Probe', phone: ctx.newPhone() },
      headers: { Origin: 'https://some-agency-website.qa.invalid' },
      checks: [
        {
          label: 'public-form-open',
          fn: (res) => res.status < 500 && res.headers['access-control-allow-origin'] != null,
          severity: SEVERITY.high,
          why: 'The embeddable lead form stopped answering unknown origins. Every agency that pasted the embed onto their own site would silently stop receiving leads.',
        },
        {
          label: 'public-form-without-credentials',
          fn: (res) => res.headers['access-control-allow-credentials'] !== 'true',
          severity: SEVERITY.high,
          why: 'The wide-open public path is also sending Access-Control-Allow-Credentials. Open origin plus credentials is the combination that makes a logged-in browser readable by any site.',
        },
      ],
      tags: ['cors', 'public-form'],
    }));
  }

  cases.push(makeCase({
    rule: name,
    endpoint: null,
    title: 'An error response does not carry a stack trace',
    method: 'get',
    path: '/api/leads/definitely-not-a-real-id-%F0%9F%A7%AA',
    token: ctx.users.adminA.token,
    checks: [
      noServerError(SEVERITY.high),
      bodyDoesNotLeak(['at Object.', 'at Query.', 'node_modules', '.js:', 'DATABASE_URL'], SEVERITY.high),
    ],
    tags: ['errors', 'security'],
  }));

  return { cases, skipped: [] };
}
