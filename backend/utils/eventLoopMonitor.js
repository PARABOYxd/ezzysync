const { monitorEventLoopDelay } = require('node:perf_hooks');
const logger = require('./logger');

/**
 * Says when the server stopped answering, and what it was doing.
 *
 * Node runs this whole API on one thread. Anything that holds that thread -
 * rendering a PDF, hashing a password, a Signal handshake for a WhatsApp
 * session - stops every other request, including /api/health. From outside it
 * looks like the server is down; from inside there is nothing in the log,
 * because the requests that were waiting eventually complete and are logged
 * as slow, not as blocked.
 *
 * So the delay is measured directly, and when it crosses the threshold the
 * requests that were in flight at the time are named. That is usually enough
 * to point at the handler responsible.
 */
const BLOCK_MS = Number(process.env.EVENT_LOOP_BLOCK_MS || 1000);
const CHECK_EVERY_MS = 5000;

const inFlight = new Map();
let nextId = 0;

/** Records what each request is, so a block can be attributed to it. */
function trackInFlight(req, res, next) {
  const id = (nextId += 1);
  inFlight.set(id, { at: Date.now(), what: `${req.method} ${req.originalUrl.split('?')[0]}` });
  res.on('finish', () => inFlight.delete(id));
  res.on('close', () => inFlight.delete(id));
  next();
}

function startEventLoopMonitor() {
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();

  const timer = setInterval(() => {
    const worstMs = histogram.max / 1e6;
    histogram.reset();
    if (worstMs < BLOCK_MS) return;

    const running = [...inFlight.values()]
      .sort((a, b) => a.at - b.at)
      .slice(0, 8)
      .map((r) => `${r.what} (${Date.now() - r.at}ms ago)`);

    logger.warn(
      { blockedForMs: Math.round(worstMs), inFlight: running, inFlightCount: inFlight.size },
      'Event loop was blocked - every request waited, including health checks'
    );
  }, CHECK_EVERY_MS);
  timer.unref();

  return () => clearInterval(timer);
}

module.exports = { startEventLoopMonitor, trackInFlight };
