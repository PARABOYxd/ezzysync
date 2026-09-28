/**
 * Thread order: timestamp, then seq. WhatsApp timestamps are whole seconds, so
 * a burst of messages shares one and seq is what keeps them in order.
 */
function isBefore(a, b) {
  const ta = new Date(a.message_timestamp).getTime();
  const tb = new Date(b.message_timestamp).getTime();
  if (ta !== tb) return ta < tb;
  return Number(a.seq || 0) < Number(b.seq || 0);
}

/**
 * Folds the newest page of a thread (what every poll fetches) into what is on
 * screen, keeping any older pages the agent already scrolled back to load.
 * Without this, each poll would throw those pages away and jump the thread.
 */
export function mergeLatestPage(current, latest) {
  if (!latest.length) return current;
  const latestIds = new Set(latest.map((m) => m.id));
  const oldestLatest = latest[0];
  const older = current.filter((m) => !latestIds.has(m.id) && isBefore(m, oldestLatest));
  return [...older, ...latest];
}

/** Prepends an older page, dropping anything already on screen. */
export function prependOlderPage(current, older) {
  const have = new Set(current.map((m) => m.id));
  return [...older.filter((m) => !have.has(m.id)), ...current];
}

/** Cheap change check, so an unchanged poll does not re-render the thread. */
export function threadKey(messages) {
  return messages.map((m) => `${m.id}_${m.status}`).join('|');
}
