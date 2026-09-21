/**
 * Executing the generated cases.
 *
 * Every case goes out from its own X-Forwarded-For address. The app sets
 * `trust proxy 1`, so that is the address its rate limiters key on - without
 * it, case four hundred and one would be a 429 rather than a result, and the
 * report would be a study of express-rate-limit instead of the application.
 * The rate-limit rule opts back in by pinning its own address, which is the
 * only place a burst is the point.
 *
 * Concurrency is deliberately modest. These all share one Postgres, and a
 * flood of parallel writes would turn lock contention into timeouts that look
 * like application bugs.
 */
import { backendRequire } from './require.js';

const supertest = backendRequire('supertest');

const PASS = 'pass';
const FAIL = 'fail';
const ERROR = 'error';
const SKIP = 'skip';

/**
 * A crash in a handler does not end the run.
 *
 * Express catches what a handler throws synchronously, but not what a library
 * throws from a callback or a detached promise - and that reaches the process
 * as an uncaughtException, which by default takes the whole run with it. It
 * happened on the first full pass here: one field value made node:crypto
 * throw from outside the request chain and eighteen hundred cases in, the
 * suite simply died.
 *
 * That crash is a finding, and losing the other twelve thousand cases to it
 * is not acceptable, so both are handled: the event is recorded against
 * whatever was in flight, and the run carries on. Requests also get a
 * deadline, because the request whose handler died will never answer.
 */
const inFlight = new Map();
export const crashes = [];

function recordCrash(kind, err) {
  crashes.push({
    kind,
    message: err && err.message ? err.message : String(err),
    stack: err && err.stack ? String(err.stack).split('\n').slice(0, 8).join('\n') : null,
    inFlight: [...inFlight.values()].map((c) => ({ title: c.title, method: c.method, path: c.path, meta: c.meta })),
    at: new Date().toISOString(),
  });
}

process.on('uncaughtException', (err) => recordCrash('uncaughtException', err));
process.on('unhandledRejection', (err) => recordCrash('unhandledRejection', err));

const REQUEST_TIMEOUT_MS = Number(process.env.QA_REQUEST_TIMEOUT_MS || 20000);

let addressCounter = 0;
function nextAddress() {
  addressCounter += 1;
  const a = 100 + Math.floor(addressCounter / 65025) % 100;
  const b = Math.floor(addressCounter / 255) % 255;
  const c = addressCounter % 255;
  return `172.${a}.${b}.${c + 1}`;
}

function buildRequest(app, spec) {
  const method = (spec.method || 'get').toLowerCase();
  let req = supertest(app)[method](spec.path);

  req = req.set('X-Forwarded-For', spec.ip || nextAddress());
  if (spec.token) req = req.set('Authorization', `Bearer ${spec.token}`);
  for (const [k, v] of Object.entries(spec.headers || {})) {
    if (v != null) req = req.set(k, v);
  }
  if (spec.query) req = req.query(spec.query);

  if (spec.raw) {
    req = req.set('Content-Type', spec.contentType || 'application/json').send(spec.body);
  } else if (spec.body !== undefined) {
    if (spec.contentType) req = req.set('Content-Type', spec.contentType);
    req = req.send(spec.body);
  }
  return req;
}

async function send(app, spec) {
  try {
    const res = await Promise.race([
      buildRequest(app, spec),
      new Promise((resolve) => setTimeout(
        () => resolve({ status: 0, body: null, text: 'no response within the deadline', headers: {}, timedOut: true }),
        REQUEST_TIMEOUT_MS
      ).unref?.()),
    ]);
    return res || { status: 0, body: null, text: 'no response', headers: {}, timedOut: true };
  } catch (err) {
    // supertest rejects on a socket-level failure rather than an HTTP status;
    // that is a result too, and one worth seeing.
    return { status: 0, body: null, text: String(err && err.message), headers: {}, transportError: true };
  }
}

/** Has anything in this process contaminated Object.prototype? */
function prototypeIsClean() {
  const probe = {};
  return probe.qaPolluted === undefined && probe.qa === undefined && {}.qaPolluted === undefined;
}

function evaluate(testCase, res) {
  const failures = [];
  for (const check of testCase.checks || []) {
    let ok;
    try {
      ok = check.fn(res);
    } catch (err) {
      ok = false;
      failures.push({
        label: check.label,
        severity: check.severity,
        why: `The check itself threw: ${err.message}`,
        detail: { thrown: true },
      });
      continue;
    }
    if (!ok) {
      failures.push({
        label: check.label,
        severity: check.severity,
        why: check.why,
        detail: {
          status: res.status,
          body: excerpt(res.body ?? res.text),
        },
      });
    }
  }
  return failures;
}

function excerpt(value, max = 400) {
  if (value == null) return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function runOne(app, testCase) {
  const started = Date.now();

  if (testCase.script) {
    const assertions = [];
    const assert = (label, ok, severity, why, detail) => {
      assertions.push({ label, ok, severity, why, detail });
    };
    const request = (spec) => send(app, spec);

    try {
      await testCase.script({ request, assert, app });
    } catch (err) {
      return {
        ...summary(testCase),
        outcome: ERROR,
        durationMs: Date.now() - started,
        failures: [{
          label: 'script-threw',
          severity: 'high',
          why: `The scripted case stopped with an error: ${err.message}`,
          detail: { stack: excerpt(err.stack, 600) },
        }],
        assertions: assertions.length,
      };
    }

    const failures = assertions.filter((a) => !a.ok && a.severity !== 'info').map((a) => ({
      label: a.label, severity: a.severity, why: a.why, detail: a.detail,
    }));
    const notes = assertions.filter((a) => a.severity === 'info').map((a) => ({
      label: a.label, why: a.why, detail: a.detail,
    }));

    return {
      ...summary(testCase),
      outcome: failures.length ? FAIL : PASS,
      durationMs: Date.now() - started,
      failures,
      notes,
      assertions: assertions.length,
    };
  }

  inFlight.set(testCase.id, testCase);
  const res = await send(app, {
    method: testCase.method,
    path: testCase.path,
    body: testCase.body,
    raw: testCase.raw,
    contentType: testCase.contentType,
    query: testCase.query,
    token: testCase.token,
    headers: testCase.headers,
    ip: testCase.ip,
  });

  inFlight.delete(testCase.id);

  const failures = res.timedOut || res.transportError
    ? [{
        label: res.timedOut ? 'no-response' : 'transport-error',
        severity: 'critical',
        why: res.timedOut
          ? 'The request never produced a response. A handler that neither answers nor errors holds the connection until the client gives up, and under load it holds a database connection with it.'
          : `The connection itself failed: ${res.text}`,
        detail: { status: res.status },
      }]
    : evaluate(testCase, res);

  if (testCase.meta?.pollutionProbe && !prototypeIsClean()) {
    failures.push({
      label: 'prototype-polluted',
      severity: 'critical',
      why: 'After a request whose body carried a literal __proto__ key, a freshly created empty object had inherited that key. Something in the request path merges client input into objects without guarding the prototype, which means any request can add a property to every object in the process.',
      detail: { status: res.status },
    });
  }

  return {
    ...summary(testCase),
    outcome: failures.length ? FAIL : PASS,
    status: res.status,
    durationMs: Date.now() - started,
    failures,
    response: failures.length ? excerpt(res.body ?? res.text) : null,
  };
}

function summary(testCase) {
  return {
    id: testCase.id,
    rule: testCase.rule,
    endpoint: testCase.endpoint,
    title: testCase.title,
    method: testCase.method,
    path: testCase.path,
    tags: testCase.tags,
    meta: testCase.meta,
  };
}

export async function runAll(app, cases, { concurrency = 6, onProgress } = {}) {
  const results = new Array(cases.length);
  let index = 0;
  let done = 0;

  const worker = async () => {
    while (index < cases.length) {
      const i = index;
      index += 1;
      results[i] = await runOne(app, cases[i]);
      done += 1;
      if (onProgress && done % 100 === 0) onProgress(done, cases.length);
    }
  };

  // Scripted cases run first and alone: several of them count requests or
  // fill a rate-limit bucket, and a parallel flood alongside would change
  // what they measure.
  const scripted = cases.map((c, i) => [c, i]).filter(([c]) => c.script);
  for (const [c, i] of scripted) {
    results[i] = await runOne(app, c);
    done += 1;
  }

  const plain = cases.map((c, i) => [c, i]).filter(([c]) => !c.script);
  index = 0;
  const queue = plain;
  const plainWorker = async () => {
    while (index < queue.length) {
      const i = index;
      index += 1;
      const [c, originalIndex] = queue[i];
      results[originalIndex] = await runOne(app, c);
      done += 1;
      if (onProgress && done % 250 === 0) onProgress(done, cases.length);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => plainWorker()));
  void worker;

  return results;
}

export const OUTCOMES = { PASS, FAIL, ERROR, SKIP };
