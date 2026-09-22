/**
 * One use case = one named check, recorded on its own.
 *
 * A page test walks forty buttons. If button seven breaks, the test must not
 * stop at seven - the point is to learn about all forty. So each check runs
 * as its own Playwright step: a failure is recorded against that step (the
 * report shows exactly which button and why), the walk carries on, and the
 * test fails once at the end if anything real went wrong.
 *
 * Two levels. `error` fails the test: a crash, a 500, a blank page, script
 * injection. `warn` is recorded but does not: a button with no accessible
 * name, a console warning - worth fixing, not worth a red build.
 *
 * The step titles start with "UC:" / "UC-WARN:" and the ui-matrix reporter
 * counts them, so the use-case total in the report is real, not estimated.
 */
import { test } from '@playwright/test';
import { isBlank } from './monitor.js';

export function useCases() {
  const failures = [];
  let count = 0;

  async function uc(title, fn, { level = 'error' } = {}) {
    count += 1;
    const prefix = level === 'warn' ? 'UC-WARN' : 'UC';
    try {
      await test.step(`${prefix}: ${title}`, fn);
    } catch (err) {
      failures.push({ title, level, message: String(err?.message || err).split('\n')[0].slice(0, 300) });
    }
  }

  function finish() {
    const errors = failures.filter((f) => f.level === 'error');
    if (errors.length) {
      const lines = errors.slice(0, 25).map((f) => `  - ${f.title}: ${f.message}`);
      throw new Error(`${errors.length} of ${count} use cases failed:\n${lines.join('\n')}${errors.length > 25 ? '\n  ...' : ''}`);
    }
  }

  return { uc, finish, failures, get count() { return count; } };
}

/**
 * The shared "nothing broke" assertion. Throws with every problem that
 * appeared since the monitor was last marked.
 */
export async function assertHealthy(page, monitor, { allowBlank = false } = {}) {
  const problems = [];
  const pageErrors = monitor.newPageErrors();
  const serverErrors = monitor.newServerErrors();
  const dialogs = monitor.newDialogs();
  if (pageErrors.length) problems.push(`JS error: ${pageErrors.join(' | ')}`);
  if (serverErrors.length) problems.push(`API 5xx: ${serverErrors.join(' | ')}`);
  if (dialogs.length) problems.push(`unexpected browser dialog (script injection?): ${dialogs.join(' | ')}`);
  // Back on a page opened by direct link leaves the app for about:blank -
  // that is the browser's history, not an unmounted React tree.
  const insideApp = /^https?:/.test(page.url());
  if (!allowBlank && insideApp && (await isBlank(page))) problems.push('page went blank - the React tree unmounted (no error boundary catches render errors)');
  if (problems.length) throw new Error(problems.join('; '));
}
