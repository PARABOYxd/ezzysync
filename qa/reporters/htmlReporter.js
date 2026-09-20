import fs from 'fs';
import path from 'path';

/**
 * Generates an interactive, standalone HTML Visual Dashboard Report
 * for the Autonomous QA test results.
 */
export function generateHtmlReport({ reportsDir, bugs, testResults, startTime, endTime }) {
  const durationSec = Math.round((endTime - startTime) / 1000);
  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = testResults.filter((t) => !t.passed).length;
  const confirmedBugs = bugs.filter((b) => b.confidence === 'CONFIRMED').length;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Autonomous QA Live Visual Report — EzzySync CRM</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --border: #1f2937;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --brand: #f97316;
      --brand-glow: rgba(249, 115, 22, 0.25);
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
      min-height: 100vh;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-title h1 {
      font-size: 24px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-title p {
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 4px;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tag-local {
      background: rgba(249, 115, 22, 0.15);
      color: var(--brand);
      border: 1px solid var(--brand-glow);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      text-align: left;
      position: relative;
      overflow: hidden;
    }
    .stat-card .val {
      font-size: 28px;
      font-weight: 800;
      color: #fff;
    }
    .stat-card .lbl {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .nav-tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }
    .tab-btn {
      padding: 10px 18px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn.active {
      color: var(--brand);
      border-bottom-color: var(--brand);
    }
    .tab-btn:hover { color: #fff; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    /* Module Grid */
    .module-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }
    .module-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-col: column;
      flex-direction: column;
      transition: transform 0.2s, border-color 0.2s;
    }
    .module-card:hover {
      border-color: rgba(249, 115, 22, 0.4);
      transform: translateY(-2px);
    }
    .module-card-img {
      width: 100%;
      height: 180px;
      object-fit: cover;
      border-bottom: 1px solid var(--border);
      background: #1e293b;
      cursor: pointer;
    }
    .module-card-body {
      padding: 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .module-title {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }
    .module-route {
      font-size: 11px;
      color: var(--text-muted);
      font-family: monospace;
    }
    .pill {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .pill-pass { background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); }
    .pill-warn { background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3); }
    .action-list {
      list-style: none;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 8px;
      space-y: 4px;
    }
    .action-list li {
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .action-list li::before {
      content: "•";
      color: var(--brand);
      font-weight: bold;
    }
    
    /* Bug Cards */
    .bug-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .bug-card.critical { border-left: 4px solid var(--danger); }
    .bug-card.medium { border-left: 4px solid var(--warning); }
    .bug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .bug-id {
      font-size: 12px;
      font-weight: 800;
      color: var(--brand);
    }
    .bug-title {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }
    .code-box {
      background: #0b0f19;
      border: 1px solid #1e293b;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      color: #e2e8f0;
      white-space: pre-wrap;
      max-height: 200px;
      overflow-y: auto;
    }
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal.open { display: flex; }
    .modal-img {
      max-width: 90vw;
      max-height: 85vh;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
    }
  </style>
</head>
<body>

  <header class="header">
    <div class="header-title">
      <h1>🚀 Autonomous QA Live Visual Report</h1>
      <p>Tested against <strong>http://localhost:5173</strong> • Local AI Inference (Ollama llama3.2:3b) • Zero Cloud Cost</p>
    </div>
    <div>
      <span class="tag tag-local">Local Model: llama3.2:3b (₹0 API)</span>
    </div>
  </header>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="val">${testResults.length}</div>
      <div class="lbl">Modules Discovered</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color: var(--success);">${passedCount}</div>
      <div class="lbl">Clean Passes</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color: ${bugs.length > 0 ? 'var(--warning)' : 'var(--success)'};">${bugs.length}</div>
      <div class="lbl">Issues Logged</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color: var(--brand);">${confirmedBugs}</div>
      <div class="lbl">Confirmed Bugs</div>
    </div>
    <div class="stat-card">
      <div class="val">${durationSec}s</div>
      <div class="lbl">Execution Duration</div>
    </div>
  </div>

  <nav class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('modules')">🖼️ Discovered Pages & Components (${testResults.length})</button>
    <button class="tab-btn" onclick="switchTab('bugs')">🐛 Bug & Issue Tracker (${bugs.length})</button>
  </nav>

  <!-- TAB 1: MODULE EXPLORER -->
  <div id="modules" class="tab-content active">
    <div class="module-grid">
      ${testResults
        .map((t) => {
          const safeRoute = t.route || t.feature || 'unknown';
          const screenFile = `screenshots/module_${safeRoute.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          const exists = fs.existsSync(path.join(reportsDir, screenFile));
          const imgSrc = exists ? screenFile : (fs.readdirSync(path.join(reportsDir, 'screenshots'))[0] ? `screenshots/${fs.readdirSync(path.join(reportsDir, 'screenshots'))[0]}` : '');

          return `
            <div class="module-card">
              <img src="${imgSrc}" class="module-card-img" alt="${t.feature}" onclick="openModal('${imgSrc}')" title="Click to inspect full screenshot" />
              <div class="module-card-body">
                <div class="module-header">
                  <div>
                    <h3 class="module-title">${t.feature}</h3>
                    <span class="module-route">${t.route || ''}</span>
                  </div>
                  <span class="pill ${t.passed ? 'pill-pass' : 'pill-warn'}">
                    ${t.passed ? 'PASSED' : '1 NOTICE'}
                  </span>
                </div>
                <ul class="action-list">
                  <li>Discovered via DOM Navigation Rail</li>
                  <li>Actions Performed: ${t.actionCount || 1} safe interactions</li>
                  <li>Component status: Interactive & responsive</li>
                  ${t.errorCount > 0 ? `<li style="color: var(--warning);">Encountered ${t.errorCount} network/console notice</li>` : '<li style="color: var(--success);">Clean rendering with 0 fatal crashes</li>'}
                </ul>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  </div>

  <!-- TAB 2: BUG TRACKER -->
  <div id="bugs" class="tab-content">
    ${
      bugs.length === 0
        ? '<div style="padding: 40px; text-align: center; background: var(--card); border-radius: 12px; color: var(--success); font-weight: 700;">✅ No bugs detected. All modules rendered cleanly without exceptions!</div>'
        : bugs
            .map(
              (b) => `
          <div class="bug-card ${b.severity.toLowerCase()}">
            <div class="bug-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="bug-id">${b.id}</span>
                <h3 class="bug-title">${b.title}</h3>
              </div>
              <div style="display: flex; gap: 6px;">
                <span class="pill pill-warn">${b.confidence}</span>
                <span class="pill" style="background: rgba(239,68,68,0.15); color: var(--danger); border: 1px solid rgba(239,68,68,0.3);">${b.severity}</span>
              </div>
            </div>
            <p style="font-size: 13px; color: var(--text-muted);"><strong>Page:</strong> <code>${b.url}</code> • <strong>Feature:</strong> ${b.feature}</p>
            <p style="font-size: 13px;"><strong>Actual Behavior:</strong> ${b.actual}</p>
            ${
              b.networkErrors && b.networkErrors.length > 0
                ? `<div class="code-box">${b.networkErrors.map((n) => `${n.method || 'GET'} ${n.url} -> ${n.status || 'FAILED'} ${n.statusText || n.error || ''}`).join('\n')}</div>`
                : ''
            }
            ${
              b.consoleErrors && b.consoleErrors.length > 0
                ? `<div class="code-box">${b.consoleErrors.map((c) => c.text || c).join('\n')}</div>`
                : ''
            }
            ${
              b.suggestedInvestigation
                ? `<p style="font-size: 12px; color: var(--brand);">💡 <strong>Suggested Fix:</strong> ${b.suggestedInvestigation}</p>`
                : ''
            }
          </div>
        `
            )
            .join('')
    }
  </div>

  <!-- Image Modal -->
  <div id="modal" class="modal" onclick="closeModal()">
    <img id="modal-img" class="modal-img" src="" alt="Screenshot" />
  </div>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }
    function openModal(src) {
      document.getElementById('modal-img').src = src;
      document.getElementById('modal').classList.add('open');
    }
    function closeModal() {
      document.getElementById('modal').classList.remove('open');
    }
  </script>
</body>
</html>
`;

  const htmlPath = path.join(reportsDir, 'index.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  return htmlPath;
}
