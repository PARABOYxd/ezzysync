/**
 * Nothing leaves this machine while the matrix runs.
 *
 * The suite pokes ten thousand requests at endpoints that, on the happy path,
 * send WhatsApp messages, email invoices, call Razorpay and upload to R2. The
 * existing backend suite already proved this is not hypothetical: one of its
 * tests reached Resend and came back with a live 422 from their API.
 *
 * So outbound HTTP is severed at the socket layer before a single application
 * module is loaded. A blocked call fails the way an unreachable network does,
 * which is a case worth testing in itself - an endpoint that returns 500
 * because its provider is down is a different bug from one that crashes on
 * bad input, and the report keeps them apart.
 */
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

const LOCAL = /^(localhost|127\.0\.0\.1|::1|0\.0\.0\.0)$/i;

let blocked = 0;
export const blockedCalls = [];

function isLocal(host) {
  return !host || LOCAL.test(String(host));
}

function record(target) {
  blocked += 1;
  if (blockedCalls.length < 200) blockedCalls.push(target);
}

function wrapRequest(mod, name) {
  const original = mod[name];
  mod[name] = function guardedRequest(...args) {
    const opts = typeof args[0] === 'string' || args[0] instanceof URL ? { url: args[0] } : args[0] || {};
    const host = opts.url ? new URL(String(opts.url)).hostname : opts.hostname || opts.host;
    if (isLocal(host)) return original.apply(this, args);
    record(String(opts.url || host));
    const err = new Error(`QA-MATRIX: outbound network call to "${host}" blocked`);
    err.code = 'ENETUNREACH';
    // Throwing synchronously would look like a programming error to callers
    // that only handle request-level failures, so fail the way a dead network
    // does: an 'error' event on the returned request object.
    const req = new http.ClientRequest({ host: '127.0.0.1', port: 1, createConnection: () => new net.Socket() });
    req.on('error', () => {});
    process.nextTick(() => req.emit('error', err));
    return req;
  };
}

export function installNetworkGuard() {
  wrapRequest(http, 'request');
  wrapRequest(http, 'get');
  wrapRequest(https, 'request');
  wrapRequest(https, 'get');

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    const host = (() => { try { return new URL(url).hostname; } catch { return null; } })();
    if (isLocal(host)) return realFetch(input, init);
    record(url);
    throw Object.assign(new Error(`QA-MATRIX: outbound fetch to "${url}" blocked`), { code: 'ENETUNREACH' });
  };
}

export const blockedCount = () => blocked;
