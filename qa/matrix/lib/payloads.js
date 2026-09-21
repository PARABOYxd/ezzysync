/**
 * The values thrown at every field.
 *
 * Two kinds. The hostile set goes at every field regardless of type - these
 * are the inputs that crash handlers rather than get rejected by them: a
 * string where an object is expected, a number where a string is, a payload
 * big enough to blow a column, a prototype-pollution key, a null byte.
 *
 * The typed set is narrower and stricter. A required email field handed
 * "not-an-email" has exactly one correct response, and it is a 4xx. Anything
 * else - a 200, or a 500 from deep inside pg - is a finding, so those cases
 * carry `mustReject`.
 *
 * Nothing here is expected to succeed. The single assertion every fuzz case
 * shares is that the server answers with an error it chose, not one it
 * suffered: no 5xx, ever.
 */

const LONG = 'A'.repeat(10000);
const DEEP = (() => {
  let o = { end: true };
  for (let i = 0; i < 60; i += 1) o = { nested: o };
  return o;
})();

/** Applied to every field of every type. */
export const HOSTILE_VALUES = [
  { label: 'empty-string', value: '' },
  { label: 'whitespace-only', value: '   ' },
  { label: 'null', value: null },
  { label: 'zero', value: 0 },
  { label: 'negative-number', value: -1 },
  { label: 'boolean-true', value: true },
  { label: 'boolean-false', value: false },
  { label: 'empty-array', value: [] },
  { label: 'array-of-objects', value: [{ a: 1 }] },
  { label: 'empty-object', value: {} },
  { label: 'nested-object-60-deep', value: DEEP },
  { label: 'very-long-string-10k', value: LONG },
  { label: 'xss-script-tag', value: '<script>alert("qa")</script>' },
  { label: 'xss-img-onerror', value: '<img src=x onerror=alert(1)>' },
  { label: 'sqli-drop-table', value: "'; DROP TABLE leads; --" },
  { label: 'sqli-or-true', value: "' OR '1'='1" },
  { label: 'sqli-union-select', value: "' UNION SELECT NULL,NULL,NULL --" },
  { label: 'path-traversal', value: '../../../../etc/passwd' },
  { label: 'windows-path-traversal', value: '..\\..\\..\\windows\\win.ini' },
  { label: 'template-injection', value: '{{7*7}}' },
  { label: 'log4shell-style', value: '${jndi:ldap://qa.invalid/a}' },
  { label: 'null-byte', value: 'qa\u0000value' },
  { label: 'url-encoded-null', value: 'qa%00value' },
  { label: 'crlf-injection', value: 'qa\r\nX-Injected: yes' },
  { label: 'unicode-rtl-override', value: 'qa‮eulav' },
  { label: 'emoji-and-astral', value: 'QA 🧪🚀𝕏' },
  { label: 'numeric-string-huge', value: '999999999999999999999999999999' },
  { label: 'float-overflow', value: 1e309 },
  { label: 'nan-string', value: 'NaN' },
  { label: 'infinity-string', value: 'Infinity' },
  { label: 'proto-pollution', value: { __proto__: { qaPolluted: true } } },
  { label: 'constructor-key', value: { constructor: { prototype: { qa: 1 } } } },
];

/** Values that are unambiguously wrong for a given declared type. */
export const TYPED_INVALID = {
  email: [
    { label: 'no-at-sign', value: 'notanemail', mustReject: true },
    { label: 'missing-domain', value: 'qa@', mustReject: true },
    { label: 'missing-local', value: '@qa.invalid', mustReject: true },
    { label: 'spaces-inside', value: 'qa user@qa.invalid', mustReject: true },
    { label: 'double-at', value: 'qa@@qa.invalid', mustReject: true },
    { label: 'header-injection', value: 'qa@qa.invalid\nBcc: victim@qa.invalid', mustReject: true },
  ],
  phone: [
    { label: 'letters', value: 'not-a-phone', mustReject: true },
    { label: 'too-short', value: '12', mustReject: true },
    { label: 'too-long', value: '1234567890123456789012345', mustReject: true },
    { label: 'symbols-only', value: '@@@@@@@@', mustReject: true },
    { label: 'sqli-in-phone', value: "9999999999' OR 1=1 --", mustReject: true },
  ],
  int: [
    { label: 'not-a-number', value: 'abc', mustReject: true },
    { label: 'negative', value: -5 },
    { label: 'fractional', value: 1.5 },
    { label: 'exponent-overflow', value: '1e999' },
  ],
  float: [
    { label: 'not-a-number', value: 'abc', mustReject: true },
    { label: 'negative', value: -1000 },
    { label: 'currency-string', value: 'Rs. 5,000' },
  ],
  date: [
    { label: 'not-a-date', value: 'not-a-date' },
    { label: 'impossible-date', value: '2026-13-45' },
    { label: 'zero-date', value: '0000-00-00' },
    { label: 'far-future', value: '9999-12-31' },
    { label: 'epoch-number', value: 1767225600000 },
  ],
  bool: [
    { label: 'maybe', value: 'maybe', mustReject: true },
    { label: 'number-two', value: 2, mustReject: true },
    { label: 'empty-string', value: '' },
  ],
  enum: [
    { label: 'unknown-value', value: 'SUPERADMIN', mustReject: true },
    { label: 'lowercased', value: 'admin', mustReject: true },
    { label: 'privilege-escalation-attempt', value: 'OWNER', mustReject: true },
  ],
  json: [
    { label: 'string-not-json', value: 'not-json' },
    { label: 'number-not-json', value: 12345 },
    { label: 'deeply-nested', value: DEEP },
  ],
  id: [
    { label: 'other-tenant-shaped', value: '00000000-0000-0000-0000-000000000000' },
    { label: 'sqli-id', value: "1 OR 1=1" },
    { label: 'negative-id', value: -1 },
  ],
  string: [],
  text: [],
};

/** Path parameter values that must never reach the database as-is. */
export const BAD_PATH_PARAMS = [
  { label: 'zero', value: '0' },
  { label: 'negative', value: '-1' },
  { label: 'huge-number', value: '99999999999999999999' },
  { label: 'float', value: '1.5' },
  { label: 'alpha', value: 'abc' },
  { label: 'uuid-shaped', value: '00000000-0000-0000-0000-000000000000' },
  { label: 'sqli-or-true', value: "1' OR '1'='1" },
  { label: 'sqli-drop', value: "1; DROP TABLE bookings" },
  { label: 'path-traversal', value: '..%2f..%2fetc%2fpasswd' },
  { label: 'null-byte', value: '1%00' },
  { label: 'xss', value: '<script>alert(1)</script>' },
  { label: 'very-long', value: 'A'.repeat(2000) },
  { label: 'unicode', value: '🧪' },
  { label: 'json-injection', value: '{"$ne":null}' },
];

/** Query string values for list endpoints. */
export const BAD_QUERY_VALUES = [
  { label: 'empty', value: '' },
  { label: 'zero', value: '0' },
  { label: 'negative', value: '-10' },
  { label: 'huge', value: '99999999' },
  { label: 'float', value: '2.7' },
  { label: 'alpha', value: 'abc' },
  { label: 'sqli-order-by', value: '1; SELECT pg_sleep(1)' },
  { label: 'sqli-quote', value: "' OR '1'='1" },
  { label: 'sql-comment', value: '--' },
  { label: 'xss', value: '<script>alert(1)</script>' },
  { label: 'very-long', value: 'A'.repeat(5000) },
  { label: 'null-byte', value: 'a%00b' },
];

/** Whole-body shapes, replacing the payload entirely. */
export const BODY_SHAPES = [
  { label: 'empty-object', body: {} },
  { label: 'null-body', body: null },
  { label: 'array-body', body: [1, 2, 3] },
  { label: 'string-body', body: '"just a string"', raw: true, contentType: 'application/json' },
  { label: 'number-body', body: '42', raw: true, contentType: 'application/json' },
  { label: 'malformed-json', body: '{"unclosed": ', raw: true, contentType: 'application/json' },
  { label: 'wrong-content-type', body: 'name=qa&phone=999', raw: true, contentType: 'text/plain' },
  { label: 'form-encoded', body: 'name=qa&phone=999', raw: true, contentType: 'application/x-www-form-urlencoded' },
  { label: 'proto-pollution-body', body: JSON.parse('{"__proto__":{"qaPolluted":true},"name":"qa"}') },
  { label: 'huge-key-count', body: Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`k${i}`, i])) },
];

export const TOKEN_VARIANTS = [
  { label: 'no-authorization-header', header: null },
  { label: 'empty-bearer', header: 'Bearer ' },
  { label: 'garbage-token', header: 'Bearer not.a.jwt' },
  { label: 'bearer-missing-prefix', header: 'justthetokenvalue' },
  { label: 'basic-auth-instead', header: 'Basic cWE6cWE=' },
  { label: 'alg-none-token', header: 'ALG_NONE' },
  { label: 'wrong-signature', header: 'WRONG_SIGNATURE' },
  { label: 'expired-token', header: 'EXPIRED' },
  { label: 'token-for-deleted-user', header: 'DELETED_USER' },
];
