/**
 * Turning an inventory entry plus a rule's intent into one runnable case.
 *
 * Path parameters are the fiddly part. Several tables key on a business id
 * rather than a primary key, and a case that pokes `/api/leads/999` when the
 * app expects `LEAD-00012` proves nothing about the route - it only proves
 * that unknown ids 404. So every parameter is resolved from the seeded world,
 * and a case whose parameter cannot be resolved is skipped loudly rather than
 * run against a guess.
 */

let counter = 0;

export function resolveParam(key, ctx, side = 'A') {
  if (key === 'unknownNumeric') return '999999999';
  if (key === 'teamUser') return side === 'A' ? String(ctx.users.memberA.id) : String(ctx.users.adminB.id);
  const value = ctx.res?.[side]?.[key];
  return value == null || value === '' ? null : String(value);
}

/**
 * Fills :params in a path. Returns null when something could not be
 * resolved, which the caller turns into a skip.
 */
export function resolvePath(endpoint, ctx, { side = 'A', overrides = {} } = {}) {
  let path = endpoint.path;
  const names = (endpoint.path.match(/:[A-Za-z0-9_]+/g) || []).map((s) => s.slice(1));
  for (const name of names) {
    let value;
    if (Object.prototype.hasOwnProperty.call(overrides, name)) {
      value = overrides[name];
    } else {
      const key = endpoint.params?.[name];
      if (!key) return null;
      value = resolveParam(key, ctx, side);
    }
    if (value == null) return null;
    path = path.replace(`:${name}`, encodeURIComponent(String(value)));
  }
  return path;
}

export function makeCase({
  rule, endpoint, title, method, path, body, raw, contentType, query,
  token, headers, checks, tags = [], meta = {},
}) {
  counter += 1;
  return {
    seq: counter,
    id: `${rule}#${counter}`,
    rule,
    endpoint: endpoint?.id || null,
    title,
    method: method || endpoint?.method,
    path,
    body,
    raw,
    contentType,
    query,
    token,
    headers,
    checks,
    tags,
    meta,
  };
}

export function caseCount() {
  return counter;
}

/** A body built from an endpoint's sample, with one field replaced. */
export function bodyWithField(endpoint, ctx, field, value) {
  const base = endpoint.sample ? { ...endpoint.sample(ctx) } : {};
  base[field] = value;
  return base;
}

/**
 * A case that drives several requests in sequence.
 *
 * Some rules cannot be expressed as one request and one status code - a
 * refresh token is only interesting the second time it is used, and a
 * payment only breaks the total once two of them exist. Those get a script
 * and report their own assertions.
 */
export function makeScriptCase({ rule, title, tags = [], run, meta = {} }) {
  counter += 1;
  return {
    seq: counter,
    id: `${rule}#${counter}`,
    rule,
    endpoint: null,
    title,
    script: run,
    tags,
    meta,
    checks: [],
  };
}
