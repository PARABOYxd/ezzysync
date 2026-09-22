/**
 * Everything that can go wrong on a page without a test asking about it.
 *
 * A button that throws in its onClick, a component that crashes on a null
 * field, an API call that comes back 500, a drawer that renders a white
 * screen - none of these fail a Playwright test on their own. The page just
 * sits there looking broken. So every page gets a monitor that listens for
 * all of it, and each use case asks "did anything new go wrong since the last
 * time I looked?"
 *
 * There is no React error boundary in this app, so a render error unmounts
 * the whole tree and leaves an empty #root. That is checked directly.
 */

// Browser noise that is not the app's fault and would drown the real errors.
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /React Router Future Flag Warning/i,
  /\[vite\]/i,
  /favicon/i,
  /net::ERR_BLOCKED_BY_CLIENT/i, // our own external-host block
  /Failed to load resource: net::ERR_FAILED/i,
  /ResizeObserver loop/i,
  /\[vercel/i,
  /service worker/i,
  /workbox/i,
];

export function attachMonitor(page, apiBase) {
  const state = {
    pageErrors: [],
    consoleErrors: [],
    serverErrors: [],
    dialogs: [],
    cursor: { pageErrors: 0, consoleErrors: 0, serverErrors: 0, dialogs: 0 },
  };

  page.on('pageerror', (err) => state.pageErrors.push(String(err?.message || err).slice(0, 300)));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    // A 4xx the page asked for (a validation error it then shows) is logged
    // by the browser as a console error. Those are not bugs; 5xx are caught
    // separately below.
    if (/status of 4\d\d/.test(text)) return;
    state.consoleErrors.push(text.slice(0, 300));
  });
  page.on('response', (res) => {
    if (res.status() >= 500 && res.url().startsWith(apiBase)) {
      state.serverErrors.push(`${res.status()} ${res.request().method()} ${res.url().replace(apiBase, '')}`);
    }
  });
  // An alert() nobody wrote is script injection. Dismiss it so the page does
  // not hang, and record it.
  // A confirm() ("Delete this expense?") is the app asking, not an attack;
  // it is dismissed, so nothing is deleted, and not counted. An alert whose
  // text is one of the payloads the matrix typed is script injection.
  page.on('dialog', async (dialog) => {
    const message = dialog.message();
    if (/ui-xss/.test(message) || message === '1') {
      state.dialogs.push(`${dialog.type()}: ${message.slice(0, 120)}`);
    }
    await dialog.dismiss().catch(() => {});
  });

  const since = (key) => state[key].slice(state.cursor[key]);

  return {
    state,
    /** Forget everything seen so far; the next check only sees what follows. */
    mark() {
      for (const key of Object.keys(state.cursor)) state.cursor[key] = state[key].length;
    },
    newPageErrors: () => since('pageErrors'),
    newConsoleErrors: () => since('consoleErrors'),
    newServerErrors: () => since('serverErrors'),
    newDialogs: () => since('dialogs'),
  };
}

/** Is there a rendered app on screen, or the white page of an unmounted tree? */
export async function isBlank(page) {
  return page.evaluate(() => {
    const root = document.getElementById('root');
    if (!root) return true;
    const text = (root.innerText || '').trim();
    return root.children.length === 0 || text.length === 0;
  }).catch(() => true);
}

/** Does anything stick out sideways? On a phone that is a broken layout. */
export async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  }).catch(() => 0);
}

/** Waits for the page to settle: network mostly quiet, a short grace for React. */
export async function settle(page, ms = 350) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

/**
 * Closes whatever drawer, modal or menu is open. Drawers are role="dialog";
 * the shared Modal is not (it has no role), so both close buttons are tried
 * by their labels, then Escape.
 */
export async function closeOverlays(page) {
  for (let i = 0; i < 3; i += 1) {
    // Any visible control whose label starts with "Close": the drawer's
    // "Close panel", the modal's "Close modal", the mobile sidebar's "Close
    // sidebar navigation", and whatever the next component calls its own.
    const closer = page.locator('[aria-label^="Close" i]:visible').last();
    if (await closer.count()) {
      await closer.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(150);
      continue;
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(100);
    if (!(await overlayOpen(page))) return;
  }
}

export async function overlayOpen(page) {
  return page.evaluate(() => {
    if (document.querySelector('[role="dialog"]')) return true;
    // The shared Modal: a fixed full-screen layer at z-50 with a backdrop.
    return [...document.querySelectorAll('div.fixed.inset-0')].some((el) => el.offsetParent !== null || getComputedStyle(el).display !== 'none');
  }).catch(() => false);
}
