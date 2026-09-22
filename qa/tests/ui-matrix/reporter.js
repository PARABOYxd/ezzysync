/**
 * Counts use cases, not tests.
 *
 * A UI-matrix test walks a whole page and runs dozens of named checks inside
 * it, each as a "UC:" step. Playwright's own report counts the ~250 tests;
 * this one counts every check inside them, groups the failures by what went
 * wrong, and writes reports/ui-matrix-report.html alongside a JSON copy.
 */
import fs from 'node:fs';
import path from 'node:path';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default class UiMatrixReporter {
  constructor(options = {}) {
    this.outDir = options.outputDir || 'reports';
    this.cases = [];
    this.skips = [];
    this.started = Date.now();
    this.stalls = [];
  }

  /**
   * Pings the backend every two seconds for the whole run. A backend that
   * stops answering is a finding in its own right - under four browsers of
   * load, it is exactly what a busy agency would hit - and without this it
   * only shows up as a pile of unrelated-looking test timeouts.
   */
  onBegin() {
    const url = `${(process.env.API_URL || 'http://localhost:5001/api').replace(/\/$/, '')}/health`;
    let stalledSince = null;
    this.healthTimer = setInterval(async () => {
      const at = Date.now();
      let ok = false;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        ok = res.ok;
      } catch { ok = false; }
      if (!ok && stalledSince == null) stalledSince = at;
      if (ok && stalledSince != null) {
        this.stalls.push({ from: new Date(stalledSince).toISOString(), seconds: Math.round((at - stalledSince) / 1000) });
        stalledSince = null;
      }
    }, 2000);
    this.healthTimer.unref?.();
    this.stalledSinceRef = () => stalledSince;
  }

  onStepEnd(test, result, step) {
    const m = /^UC(-WARN)?: (.*)$/.exec(step.title);
    if (!m) return;
    this.cases.push({
      spec: path.basename(test.location.file),
      test: test.title,
      title: m[2],
      level: m[1] ? 'warn' : 'error',
      ok: !step.error,
      error: step.error ? String(step.error.message || '').split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '').slice(0, 400) : null,
    });
  }

  onTestEnd(test, result) {
    for (const a of result.annotations || test.annotations || []) {
      if (/not pressed/.test(a.type)) this.skips.push({ test: test.title, buttons: a.description });
      if (/not reachable/.test(a.type)) (this.unreachable ||= []).push({ test: test.title, buttons: a.description });
    }
  }

  onEnd() {
    clearInterval(this.healthTimer);
    const open = this.stalledSinceRef?.();
    if (open != null) this.stalls.push({ from: new Date(open).toISOString(), seconds: Math.round((Date.now() - open) / 1000), stillDown: true });
    const total = this.cases.length;
    const failed = this.cases.filter((c) => !c.ok && c.level === 'error');
    const warned = this.cases.filter((c) => !c.ok && c.level === 'warn');
    const passed = total - failed.length - warned.length;

    const bySpec = {};
    for (const c of this.cases) {
      bySpec[c.spec] = bySpec[c.spec] || { total: 0, failed: 0, warned: 0 };
      bySpec[c.spec].total += 1;
      if (!c.ok) bySpec[c.spec][c.level === 'warn' ? 'warned' : 'failed'] += 1;
    }

    // One finding per distinct problem, however many pages it showed up on.
    const group = (list) => {
      const map = new Map();
      for (const c of list) {
        const key = c.error.replace(/\d{2,}/g, 'N').replace(/"[^"]*"/g, '"…"').slice(0, 160);
        if (!map.has(key)) map.set(key, { problem: c.error, count: 0, examples: [] });
        const g = map.get(key);
        g.count += 1;
        if (g.examples.length < 6) g.examples.push(c.title);
      }
      return [...map.values()].sort((a, b) => b.count - a.count);
    };
    const failGroups = group(failed);
    const warnGroups = group(warned);

    fs.mkdirSync(this.outDir, { recursive: true });
    fs.writeFileSync(path.join(this.outDir, 'ui-matrix-results.json'), JSON.stringify({ total, passed, failed: failed.length, warned: warned.length, stalls: this.stalls, bySpec, failGroups, warnGroups, skips: this.skips, cases: this.cases }, null, 2));

    const section = (title, groups, color) => groups.length ? `
      <h2>${title}</h2>
      ${groups.map((g) => `<details class="f"><summary><span class="pill" style="background:${color}">${g.count}</span> ${esc(g.problem)}</summary><ul>${g.examples.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></details>`).join('')}` : '';

    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>UI matrix report</title>
<style>
:root{color-scheme:light dark;--bg:#fbfbfa;--fg:#1b1b1a;--muted:#5f5f5c;--line:#e3e3e0;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#eceae4;--muted:#a3a29c;--line:#2c2c29;--card:#1c1c1a}}
body{margin:0;padding:32px 16px 80px;background:var(--bg);color:var(--fg);font:15px/1.6 ui-sans-serif,system-ui,"Segoe UI",sans-serif}
.w{max-width:1000px;margin:0 auto}h1{font-size:28px;margin:0 0 4px}.sub{color:var(--muted);margin:0 0 24px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px}
.t{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}.t .n{font-size:26px;font-weight:600}.t .l{color:var(--muted);font-size:13px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-weight:500}
.f{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:8px}.f summary{cursor:pointer}.f ul{color:var(--muted);font-size:13px}
.pill{color:#fff;border-radius:999px;padding:1px 9px;font-size:12px;margin-right:6px}h2{font-size:18px;margin:28px 0 8px}
</style></head><body><div class="w">
<h1>UI matrix report</h1><p class="sub">${new Date().toISOString()} · ${((Date.now() - this.started) / 60000).toFixed(1)} min</p>
<div class="tiles">
<div class="t"><div class="n">${total.toLocaleString()}</div><div class="l">use cases run</div></div>
<div class="t"><div class="n">${passed.toLocaleString()}</div><div class="l">passed</div></div>
<div class="t"><div class="n" style="color:#b3261e">${failed.length.toLocaleString()}</div><div class="l">failed (breaks)</div></div>
<div class="t"><div class="n" style="color:#a16207">${warned.length.toLocaleString()}</div><div class="l">warnings (a11y, layout, console)</div></div>
</div>
<h2>By rule</h2><table><thead><tr><th>Spec</th><th>Use cases</th><th>Failed</th><th>Warnings</th></tr></thead><tbody>
${Object.entries(bySpec).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.total.toLocaleString()}</td><td>${v.failed}</td><td>${v.warned}</td></tr>`).join('')}
</tbody></table>
${this.stalls.length ? `<h2>Backend stopped responding</h2><p class="sub">/api/health did not answer within 3 seconds. Tests that ran during these windows may have failed for this reason alone.</p><table><thead><tr><th>From</th><th>For</th></tr></thead><tbody>${this.stalls.map((s) => `<tr><td>${esc(s.from)}</td><td>${s.seconds}s${s.stillDown ? ' (still down at the end)' : ''}</td></tr>`).join('')}</tbody></table>` : ''}
${section('Failures - something broke', failGroups, '#b3261e')}
${section('Warnings - works, but should be fixed', warnGroups, '#a16207')}
${(this.unreachable || []).length ? `<h2>Controls seen once but not found again from a clean page</h2><p class="sub">Usually controls that only exist after another action (a second pagination page, an expanded row). Not counted as use cases.</p><table><tbody>${this.unreachable.map((s) => `<tr><td>${esc(s.test)}</td><td>${esc(s.buttons)}</td></tr>`).join('')}</tbody></table>` : ''}
${this.skips.length ? `<h2>Buttons deliberately not pressed</h2><p class="sub">They reach outside the test tenant (send, pay, connect) or destroy the data the walk needs.</p><table><tbody>${this.skips.map((s) => `<tr><td>${esc(s.test)}</td><td>${esc(s.buttons)}</td></tr>`).join('')}</tbody></table>` : ''}
</div></body></html>`;
    fs.writeFileSync(path.join(this.outDir, 'ui-matrix-report.html'), html);

    process.stdout.write(`\n  UI matrix: ${total.toLocaleString()} use cases - ${passed.toLocaleString()} passed, ${failed.length} failed, ${warned.length} warnings${this.stalls.length ? `\n  Backend stopped responding ${this.stalls.length}x (longest ${Math.max(...this.stalls.map((x) => x.seconds))}s) - see the report` : ''}\n  Report: ${path.resolve(this.outDir, 'ui-matrix-report.html')}\n`);
  }
}
