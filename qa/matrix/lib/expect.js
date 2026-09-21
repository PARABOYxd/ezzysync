/**
 * What a case asserts, as small composable checks.
 *
 * A check returns true when the response is acceptable. Each carries its own
 * severity and a plain-English "why", because a report that says
 * `expected 4xx, got 500` on ten thousand rows is unreadable - the reader
 * needs to know which of those rows is a crash and which is a missing
 * validation message.
 */

export const SEVERITY = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'info',
};

const check = (label, fn, severity, why) => ({ label, fn, severity, why });

/** The one assertion nearly every case makes: the server chose its error. */
export const noServerError = (severity = SEVERITY.high) =>
  check(
    'no-5xx',
    (res) => res.status < 500,
    severity,
    'The endpoint threw instead of rejecting. Unhandled input reaching a 500 is a crash, not validation.'
  );

/**
 * The same assertion, for a route whose provider the harness has cut off.
 *
 * A 502 or 503 there is the correct answer to an unreachable provider, and
 * counting it as a crash would bury the real 500s under a hundred rows about
 * a network the suite severed on purpose.
 */
export const noCrash = (endpoint, severity = SEVERITY.high) => {
  if (!endpoint?.externals) return noServerError(severity);
  return check(
    'no-5xx',
    (res) => res.status < 500 || res.status === 502 || res.status === 503,
    severity,
    'The endpoint threw rather than reporting that its provider was unavailable. A 502 or 503 would be a handled failure; a 500 is an unhandled one.'
  );
};

export const statusIn = (codes, severity = SEVERITY.high, why) =>
  check(
    `status-in-${codes.join('/')}`,
    (res) => codes.includes(res.status),
    severity,
    why || `Expected one of ${codes.join(', ')}.`
  );

export const statusNotIn = (codes, severity = SEVERITY.high, why) =>
  check(
    `status-not-in-${codes.join('/')}`,
    (res) => !codes.includes(res.status),
    severity,
    why || `Did not expect ${codes.join(', ')}.`
  );

export const isRejected = (severity = SEVERITY.high, why) =>
  check(
    'rejected-4xx',
    (res) => res.status >= 400 && res.status < 500,
    severity,
    why || 'Invalid input was accepted instead of being rejected with a 4xx.'
  );

export const isUnauthorized = () =>
  check(
    'unauthenticated-401',
    (res) => res.status === 401,
    SEVERITY.critical,
    'An endpoint behind requireAuth answered a request with no usable token. Anything other than 401 means the guard did not run.'
  );

export const isForbidden = () =>
  check(
    'forbidden-403',
    (res) => res.status === 403,
    SEVERITY.critical,
    'A user without the permission was not stopped. 403 is the only correct answer here.'
  );

export const notForbidden = (severity = SEVERITY.medium) =>
  check(
    'not-403',
    (res) => res.status !== 403,
    severity,
    'A user who holds the permission this route asks for was refused anyway - the gate checks something the permission matrix cannot grant.'
  );

/**
 * The hard half of cross-tenant: nothing belonging to the other tenant may
 * come back in the body. A 200 carrying a foreign record is the failure the
 * whole multi-tenant model rests on.
 */
export const deniedCrossTenant = (foreignId) =>
  check(
    'cross-tenant-denied',
    (res) => {
      if (res.status === 403 || res.status === 404) return true;
      if (res.status >= 500) return false;
      if (res.status !== 200) return true;

      const body = res.body;
      if (body == null) return true;

      // The decisive question is whether the other tenant's record came back,
      // not whether the status was 200. A route that answers `{success:true}`
      // without having touched anything is wrong - but it is a different and
      // lesser wrong than one that returns the record, and
      // `refusedCrossTenant` covers it separately. Mixing the two made every
      // over-cheerful handler look like a data breach.
      if (foreignId) return !JSON.stringify(body).includes(String(foreignId));

      if (Array.isArray(body)) return body.length === 0;
      if (typeof body === 'object') {
        const arrays = Object.values(body).filter(Array.isArray);
        if (arrays.length && arrays.every((a) => a.length === 0)) return true;
        // A record is recognisable by carrying an identifier of its own.
        const looksLikeARecord = ['id', 'tenant_id', 'tenantId', 'lead_id', 'booking_id', 'quotation_id']
          .some((k) => body[k] != null || body?.data?.[k] != null);
        return !looksLikeARecord;
      }
      return false;
    },
    SEVERITY.critical,
    'One tenant reached another tenant\'s record. This is the isolation failure the whole multi-tenant model rests on.'
  );

/**
 * The softer half: even when nothing leaks, answering 200 to a request for
 * someone else's record is wrong. The row was not found, the write did not
 * happen, and telling the caller it succeeded hides both.
 */
export const refusedCrossTenant = () =>
  check(
    'cross-tenant-refused',
    (res) => res.status !== 200,
    SEVERITY.high,
    'A request naming another tenant\'s record was answered with 200. Nothing leaked and nothing was written - which is the problem: the caller is told an operation succeeded when the record was never theirs to touch.'
  );

export const bodyDoesNotLeak = (needles, severity = SEVERITY.critical) =>
  check(
    'no-internal-leak',
    (res) => {
      const text = JSON.stringify(res.body || '') + (res.text || '');
      return !needles.some((n) => text.toLowerCase().includes(String(n).toLowerCase()));
    },
    severity,
    'The response body carried internal detail (a stack trace, a SQL fragment, a secret) that a client should never see.'
  );

export const hasHeader = (name, matcher, severity = SEVERITY.medium, why) =>
  check(
    `header-${name}`,
    (res) => {
      const v = res.headers?.[name.toLowerCase()];
      if (v == null) return false;
      return matcher ? matcher(String(v)) : true;
    },
    severity,
    why || `Expected the ${name} response header.`
  );

export const custom = (label, fn, severity, why) => check(label, fn, severity, why);
