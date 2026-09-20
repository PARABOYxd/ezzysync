import fs from 'fs';
import path from 'path';
import { generateHtmlReport } from './htmlReporter.js';

export class BugReporter {
  constructor(reportsDir = 'reports') {
    this.reportsDir = reportsDir;
    this.screenshotsDir = path.join(reportsDir, 'screenshots');
    this.tracesDir = path.join(reportsDir, 'traces');
    this.bugs = [];
    this.testResults = [];
    this.startTime = new Date();

    // Ensure directories exist
    fs.mkdirSync(this.reportsDir, { recursive: true });
    fs.mkdirSync(this.screenshotsDir, { recursive: true });
    fs.mkdirSync(this.tracesDir, { recursive: true });
  }

  recordTest(result) {
    this.testResults.push(result);
  }

  addBug(bug) {
    const bugId = `BUG-${String(this.bugs.length + 1).padStart(3, '0')}`;
    const entry = {
      id: bugId,
      timestamp: new Date().toISOString(),
      url: bug.url || 'Unknown',
      feature: bug.feature || 'General',
      title: bug.title || 'Unspecified issue',
      confidence: bug.confidence || 'POSSIBLE', // CONFIRMED | LIKELY | POSSIBLE
      severity: bug.severity || 'Medium',       // Critical | High | Medium | Low
      steps: bug.steps || [],
      expected: bug.expected || 'Expected action to succeed without error.',
      actual: bug.actual || 'Encountered unexpected behavior or failure.',
      screenshot: bug.screenshot || null,
      trace: bug.trace || null,
      consoleErrors: bug.consoleErrors || [],
      networkErrors: bug.networkErrors || [],
      technicalDetails: bug.technicalDetails || '',
      suggestedInvestigation: bug.suggestedInvestigation || '',
    };
    this.bugs.push(entry);
    return entry;
  }

  generateReports() {
    const endTime = new Date();
    const durationSec = Math.round((endTime - this.startTime) / 1000);

    // 1. JSON Report
    const bugsJsonPath = path.join(this.reportsDir, 'bugs.json');
    fs.writeFileSync(bugsJsonPath, JSON.stringify(this.bugs, null, 2), 'utf-8');

    // 2. Markdown Bug Report
    const bugReportPath = path.join(this.reportsDir, 'bug-report.md');
    let md = `# Autonomous QA Bug Report\n\n`;
    md += `**Execution Time:** ${this.startTime.toISOString()} (${durationSec}s)\n`;
    md += `**Total Bugs Detected:** ${this.bugs.length}\n\n`;

    if (this.bugs.length === 0) {
      md += `> ✅ **No bugs found.** All tested workflows and edge-cases executed cleanly without uncaught errors.\n`;
    } else {
      md += `| Bug ID | Severity | Confidence | Feature | Title |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- |\n`;
      for (const b of this.bugs) {
        md += `| **${b.id}** | \`${b.severity}\` | **${b.confidence}** | ${b.feature} | [${b.title}](#${b.id.toLowerCase()}) |\n`;
      }
      md += `\n---\n\n`;

      for (const b of this.bugs) {
        md += `### ${b.id}: ${b.title}\n\n`;
        md += `- **URL:** \`${b.url}\`\n`;
        md += `- **Feature:** ${b.feature}\n`;
        md += `- **Severity:** \`${b.severity}\`\n`;
        md += `- **Confidence:** **${b.confidence}**\n\n`;

        md += `#### Steps to Reproduce:\n`;
        if (b.steps.length > 0) {
          b.steps.forEach((s, idx) => {
            md += `${idx + 1}. ${s}\n`;
          });
        } else {
          md += `1. Navigate to \`${b.url}\`.\n`;
        }

        md += `\n**Expected Result:** ${b.expected}\n\n`;
        md += `**Actual Result:** ${b.actual}\n\n`;

        if (b.screenshot) {
          md += `**Screenshot:** ![Screenshot](${b.screenshot})\n\n`;
        }
        if (b.trace) {
          md += `**Playwright Trace:** \`${b.trace}\`\n\n`;
        }

        if (b.consoleErrors.length > 0) {
          md += `**Console Errors:**\n\`\`\`text\n`;
          b.consoleErrors.forEach((ce) => {
            md += `${ce.text || ce}\n`;
          });
          md += `\`\`\`\n\n`;
        }

        if (b.networkErrors.length > 0) {
          md += `**Network Failures:**\n\`\`\`text\n`;
          b.networkErrors.forEach((ne) => {
            md += `${ne.method || 'GET'} ${ne.url} -> ${ne.status || 'FAILED'} ${ne.statusText || ne.error || ''}\n`;
          });
          md += `\`\`\`\n\n`;
        }

        if (b.suggestedInvestigation) {
          md += `**Suggested Investigation:** ${b.suggestedInvestigation}\n\n`;
        }
        md += `---\n\n`;
      }
    }
    fs.writeFileSync(bugReportPath, md, 'utf-8');

    // 3. Test Summary Report
    const summaryPath = path.join(this.reportsDir, 'test-summary.md');
    let sm = `# Autonomous QA Test Summary\n\n`;
    sm += `**Date:** ${new Date().toLocaleString()}\n`;
    sm += `**Duration:** ${durationSec}s\n`;
    sm += `**AI Model:** ${process.env.OLLAMA_MODEL || 'llama3.2:3b'} (Local Ollama ₹0)\n\n`;

    sm += `## Execution Breakdown\n\n`;
    sm += `- **Total Workflows Tested:** ${this.testResults.length}\n`;
    sm += `- **Bugs / Issues Logged:** ${this.bugs.length}\n`;
    sm += `- **Screenshots Captured:** ${fs.readdirSync(this.screenshotsDir).length}\n`;
    sm += `- **Playwright Traces:** ${fs.readdirSync(this.tracesDir).length}\n\n`;

    sm += `## Tested Modules & Workflows\n\n`;
    if (this.testResults.length > 0) {
      sm += `| Feature / Page | Status | Actions Performed | Errors |\n`;
      sm += `| :--- | :--- | :--- | :--- |\n`;
      for (const t of this.testResults) {
        sm += `| **${t.feature}** | ${t.passed ? '✅ Passed' : '⚠️ Issue Detected'} | ${t.actionCount || 1} actions | ${t.errorCount || 0} |\n`;
      }
    } else {
      sm += `*No workflow executions recorded yet.*\n`;
    }

    fs.writeFileSync(summaryPath, sm, 'utf-8');

    // 4. Standalone Visual HTML Dashboard Report
    const htmlPath = generateHtmlReport({
      reportsDir: this.reportsDir,
      bugs: this.bugs,
      testResults: this.testResults,
      startTime: this.startTime,
      endTime,
    });

    return { bugsJsonPath, bugReportPath, summaryPath, htmlPath };
  }
}
