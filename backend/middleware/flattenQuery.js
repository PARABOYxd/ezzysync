/**
 * One string per query parameter.
 *
 * Express hands a repeated parameter (`?search=a&search=b`) to handlers as an
 * array, and `?search[x]=1` as an object. No route in this app expects either,
 * and every list endpoint called `.trim()` or put the value into SQL as if it
 * were a string - so both shapes were a 500 on every list screen. The last
 * value wins for a repeat, the same as a browser form would send; nested
 * objects are dropped.
 */
function flattenQuery(req, res, next) {
  const flat = {};
  for (const [key, value] of Object.entries(req.query || {})) {
    if (Array.isArray(value)) {
      const last = value[value.length - 1];
      if (typeof last === 'string') flat[key] = last;
    } else if (typeof value === 'string') {
      flat[key] = value;
    }
  }
  // req.query is a getter in newer Express; defining it keeps this working
  // on both 4 and 5.
  Object.defineProperty(req, 'query', { value: flat, writable: true, configurable: true, enumerable: true });
  next();
}

module.exports = { flattenQuery };
