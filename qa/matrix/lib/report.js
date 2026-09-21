/**
 * Ten thousand results, turned into something a person will actually read.
 *
 * Raw pass/fail rows are useless at this scale: one missing check on one
 * endpoint produces two hundred failures that are all the same bug seen two
 * hundred times. So results are folded into findings - one per endpoint, per
 * failed check - carrying how many cases hit it and the handful of inputs
 * that did. The reader gets "bookings.create returns 500 for 34 inputs, here
 * are five of them", which is a bug report; the JSON keeps every row for
 * anything that wants to diff runs.
 */
import fs from 'node:fs';
import path from 'node:path';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

export function buildFindings(results) {
  const byKey = new Map();

  for (const r of results) {
    for (const fail of r.failures || []) {
      const key = `${r.endpoint || r.rule}::${fail.label}::${fail.severity}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          endpoint: r.endpoint,
          rule: r.rule,
          check: fail.label,
          severity: fail.severity,
          why: fail.why,
          method: r.method,
          path: r.path,
          occurrences: 0,
          examples: [],
          statuses: {},
        });
      }
      const finding = byKey.get(key);
      finding.occurrences += 1;
      if (finding.examples.length < 5) {
        finding.examples.push({
          title: r.title,
          method: r.method,
          path: r.path,
          status: fail.detail?.status ?? r.status,
          field: r.meta?.field,
          value: r.meta?.valueLabel,
          response: fail.detail?.body || fail.detail,
        });
      }
      const s = String(fail.detail?.status ?? r.status ?? 'n/a');
      finding.statuses[s] = (finding.statuses[s] || 0) + 1;
    }
  }

  return [...byKey.values()].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || b.occurrences - a.occurrences
  );
}

export function summarise(results, extra = {}) {
  const total = results.length;
  const failed = results.filter((r) => r.outcome === 'fail').length;
  const errored = results.filter((r) => r.outcome === 'error').length;
  const passed = total - failed - errored;

  const byRule = {};
  for (const r of results) {
    byRule[r.rule] = byRule[r.rule] || { total: 0, failed: 0 };
    byRule[r.rule].total += 1;
    if (r.outcome !== 'pass') byRule[r.rule].failed += 1;
  }

  const findings = buildFindings(results);
  const bySeverity = {};
  for (const s of SEVERITY_ORDER) bySeverity[s] = findings.filter((f) => f.severity === s).length;

  const slowest = [...results].sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0)).slice(0, 10)
    .map((r) => ({ title: r.title, ms: r.durationMs, path: r.path }));

  return { total, passed, failed, errored, byRule, findings, bySeverity, slowest, ...extra };
}

export function writeJson(dir, payload) {
  const file = path.join(dir, 'matrix-results.json');
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

function mdEscape(s) {
  return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function writeMarkdown(dir, summary, meta) {
  const lines = [];
  lines.push('# QA matrix report');
  lines.push('');
  lines.push(`Run at ${meta.startedAt}, finished in ${(meta.durationMs / 1000).toFixed(1)}s.`);
  lines.push('');
  lines.push(`**${summary.total.toLocaleString()} cases** - ${summary.passed.toLocaleString()} passed, ${summary.failed.toLocaleString()} failed, ${summary.errored} errored.`);
  lines.push('');
  lines.push('| Severity | Distinct findings |');
  lines.push('| --- | --- |');
  for (const s of SEVERITY_ORDER) lines.push(`| ${s} | ${summary.bySeverity[s] || 0} |`);
  lines.push('');

  lines.push('## Coverage');
  lines.push('');
  lines.push(`- Endpoints in the inventory: ${meta.endpointCount}`);
  lines.push(`- Cases generated: ${summary.total.toLocaleString()}`);
  lines.push(`- Outbound network calls blocked: ${meta.blockedCalls}`);
  if (meta.skipped?.length) {
    lines.push(`- Cases skipped for want of a fixture: ${meta.skipped.length}`);
  }
  lines.push('');

  lines.push('## Cases by rule');
  lines.push('');
  lines.push('| Rule | Cases | Failing |');
  lines.push('| --- | ---: | ---: |');
  for (const [rule, stats] of Object.entries(summary.byRule).sort((a, b) => b[1].total - a[1].total)) {
    lines.push(`| ${rule} | ${stats.total.toLocaleString()} | ${stats.failed.toLocaleString()} |`);
  }
  lines.push('');

  lines.push('## Findings');
  lines.push('');
  if (!summary.findings.length) {
    lines.push('Nothing failed. Every generated case met its expectations.');
  }

  for (const s of SEVERITY_ORDER) {
    const group = summary.findings.filter((f) => f.severity === s);
    if (!group.length) continue;
    lines.push(`### ${s[0].toUpperCase()}${s.slice(1)}`);
    lines.push('');
    for (const finding of group) {
      lines.push(`#### ${finding.endpoint || finding.rule} - ${finding.check}`);
      lines.push('');
      lines.push(finding.why || '');
      lines.push('');
      lines.push(`Seen in **${finding.occurrences}** case${finding.occurrences === 1 ? '' : 's'}. Response statuses: ${Object.entries(finding.statuses).map(([k, v]) => `${k} (x${v})`).join(', ')}.`);
      lines.push('');
      lines.push('| Case | Status | Response |');
      lines.push('| --- | --- | --- |');
      for (const ex of finding.examples) {
        lines.push(`| ${mdEscape(ex.title)} | ${ex.status ?? '-'} | ${mdEscape(typeof ex.response === 'string' ? ex.response : JSON.stringify(ex.response))} |`);
      }
      lines.push('');
    }
  }

  const file = path.join(dir, 'matrix-report.md');
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  return file;
}

export function writeHtml(dir, summary, meta) {
  const sev = (s) => ({ critical: '#b3261e', high: '#c2410c', medium: '#a16207', low: '#3f6212', info: '#475569' }[s] || '#475569');

  const findingsHtml = summary.findings.map((finding) => `
    <details class="finding" data-severity="${finding.severity}">
      <summary>
        <span class="pill" style="background:${sev(finding.severity)}">${finding.severity}</span>
        <strong>${escapeHtml(finding.endpoint || finding.rule)}</strong>
        <span class="check">${escapeHtml(finding.check)}</span>
        <span class="count">${finding.occurrences} case${finding.occurrences === 1 ? '' : 's'}</span>
      </summary>
      <p class="why">${escapeHtml(finding.why || '')}</p>
      <p class="statuses">Statuses: ${Object.entries(finding.statuses).map(([k, v]) => `<code>${k}</code> x${v}`).join(', ')}</p>
      <table>
        <thead><tr><th>Case</th><th>Status</th><th>Response</th></tr></thead>
        <tbody>
          ${finding.examples.map((ex) => `<tr><td>${escapeHtml(ex.title)}</td><td>${ex.status ?? '-'}</td><td><code>${escapeHtml(typeof ex.response === 'string' ? ex.response : JSON.stringify(ex.response))}</code></td></tr>`).join('')}
        </tbody>
      </table>
    </details>
  `).join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QA matrix report</title>
<style>
  :root { color-scheme: light dark; --bg:#fbfbfa; --fg:#1b1b1a; --muted:#5f5f5c; --line:#e3e3e0; --card:#fff; }
  @media (prefers-color-scheme: dark) { :root { --bg:#141413; --fg:#eceae4; --muted:#a3a29c; --line:#2c2c29; --card:#1c1c1a; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:32px 16px 80px; background:var(--bg); color:var(--fg); font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .wrap { max-width: 1000px; margin: 0 auto; }
  h1 { font-size: 28px; margin: 0 0 4px; letter-spacing:-0.02em; }
  .sub { color: var(--muted); margin: 0 0 28px; }
  .tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:28px; }
  .tile { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 16px; }
  .tile .n { font-size:26px; font-weight:600; letter-spacing:-0.02em; }
  .tile .l { color:var(--muted); font-size:13px; }
  table { width:100%; border-collapse:collapse; margin:12px 0; font-size:13px; }
  th,td { text-align:left; padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--muted); font-weight:500; }
  code { font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; word-break:break-all; }
  .finding { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:12px 16px; margin-bottom:10px; }
  .finding summary { cursor:pointer; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .pill { color:#fff; border-radius:999px; padding:2px 9px; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; }
  .check { color:var(--muted); font-size:13px; }
  .count { margin-left:auto; color:var(--muted); font-size:13px; }
  .why { color:var(--fg); }
  .statuses { color:var(--muted); font-size:13px; }
  h2 { font-size:18px; margin:32px 0 8px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>QA matrix report</h1>
  <p class="sub">${escapeHtml(meta.startedAt)} &middot; ${(meta.durationMs / 1000).toFixed(1)}s &middot; ${meta.endpointCount} endpoints</p>

  <div class="tiles">
    <div class="tile"><div class="n">${summary.total.toLocaleString()}</div><div class="l">cases run</div></div>
    <div class="tile"><div class="n">${summary.passed.toLocaleString()}</div><div class="l">passed</div></div>
    <div class="tile"><div class="n">${summary.failed.toLocaleString()}</div><div class="l">failed</div></div>
    <div class="tile"><div class="n">${summary.findings.length}</div><div class="l">distinct findings</div></div>
    <div class="tile"><div class="n" style="color:${sev('critical')}">${summary.bySeverity.critical || 0}</div><div class="l">critical</div></div>
    <div class="tile"><div class="n" style="color:${sev('high')}">${summary.bySeverity.high || 0}</div><div class="l">high</div></div>
  </div>

  <h2>Cases by rule</h2>
  <table>
    <thead><tr><th>Rule</th><th>Cases</th><th>Failing</th></tr></thead>
    <tbody>
      ${Object.entries(summary.byRule).sort((a, b) => b[1].total - a[1].total).map(([rule, s]) => `<tr><td>${escapeHtml(rule)}</td><td>${s.total.toLocaleString()}</td><td>${s.failed.toLocaleString()}</td></tr>`).join('')}
    </tbody>
  </table>

  <h2>Findings</h2>
  ${findingsHtml || '<p>Nothing failed. Every generated case met its expectations.</p>'}
</div>
</body>
</html>`;

  const file = path.join(dir, 'matrix-report.html');
  fs.writeFileSync(file, html, 'utf8');
  return file;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { SEVERITY_ORDER };
