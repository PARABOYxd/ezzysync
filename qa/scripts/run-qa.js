import { chromium } from 'playwright';
import { runAgent } from 'openqa';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { ollamaProvider } from '../harness/ollamaProvider.js';
import { BugReporter } from '../reporters/bugReporter.js';
import { TestGenerator } from '../reporters/testGenerator.js';
import { ErrorMonitor } from '../core/errorMonitor.js';
import { SafetyGuard } from '../core/safetyGuard.js';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_USERNAME = process.env.TEST_USERNAME || 'qa_tester@test.local';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Password@123';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const TEST_PREFIX = process.env.TEST_DATA_PREFIX || 'QA_';

const isHeaded = process.argv.includes('--headed') || process.env.HEADLESS === 'false';

console.log('\n======================================================');
console.log('🥊 EXECUTING ROUGH & TOUGH DEEP AUTONOMOUS QA TEST');
console.log('======================================================');
console.log(`- Target Application: ${BASE_URL}`);
console.log(`- Local AI Model:     ${OLLAMA_MODEL} via Ollama (${OLLAMA_HOST})`);
console.log(`- Browser Mode:       ${isHeaded ? 'Headed (Visible UI)' : 'Headless'}`);
console.log(`- Safety Enforced:    ALLOW_DELETE=${process.env.ALLOW_DELETE}, ALLOW_PAYMENT=${process.env.ALLOW_PAYMENT}`);
console.log('======================================================\n');

async function main() {
  const reporter = new BugReporter('reports');
  const generator = new TestGenerator('generated-tests');
  const errorMonitor = new ErrorMonitor();
  const safetyGuard = new SafetyGuard(process.env);

  console.log('1. Launching Playwright Chromium browser...');
  const browser = await chromium.launch({
    headless: !isHeaded,
    slowMo: isHeaded ? 120 : 0,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const tracePath = path.resolve('reports/traces/qa-run-trace.zip');
  await context.tracing.start({ screenshots: true, snapshots: true });

  const page = await context.newPage();
  errorMonitor.attach(page);

  // Suppress onboarding tour from blocking clicks
  await page.addInitScript(() => {
    localStorage.setItem('journeyflow_tour_status', 'completed');
    localStorage.setItem('journeyflow_tour_done', 'true');
  });

  try {
    // 2. Open BASE_URL
    console.log(`2. Opening Base URL: ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });

    // 3. Login
    console.log(`3. Logging into CRM with test account (${TEST_USERNAME})...`);
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"], input[name="email"]', TEST_USERNAME);
      await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 10000 });
      console.log('   ✅ Authenticated successfully. Landed on:', page.url());
    }

    // Dismiss any modal overlay if present
    try {
      const dismissBtn = await page.$('button[title*="Close"], button:has-text("Skip")');
      if (dismissBtn) await dismissBtn.click({ timeout: 1500 });
    } catch {}

    const postLoginScreen = path.resolve('reports/screenshots/01_dashboard_logged_in.png');
    await page.screenshot({ path: postLoginScreen });

    // 4. Hand over to Open-QA + Local Ollama Agent for initial inspection
    console.log('\n4. Handing over to Open-QA + Local Ollama Agent for initial inspection...');
    const provider = ollamaProvider({ host: OLLAMA_HOST, model: OLLAMA_MODEL });

    try {
      const agentResult = await runAgent(
        provider,
        'Inspect the current dashboard page. Describe what major navigation links or stat cards are visible.',
        page,
        { verbose: true }
      );
      console.log('   🦙 Open-QA Agent Inspection Output:', agentResult.result || agentResult);
    } catch (agentErr) {
      console.log('   ⚠️ Open-QA agent notice:', agentErr.message);
    }

    // 5. Dynamic Module Discovery
    console.log('\n5. Dynamically discovering application modules from DOM...');
    const navItems = await page.$$eval('aside a[href], nav a[href]', (els) => {
      return els
        .map((el) => ({
          href: el.getAttribute('href'),
          text: el.innerText.trim().replace(/\n/g, ' '),
        }))
        .filter((i) => i.href && i.href.startsWith('/') && i.href !== '/login');
    });

    const uniqueModules = [];
    const seen = new Set();
    for (const item of navItems) {
      if (!seen.has(item.href)) {
        seen.add(item.href);
        uniqueModules.push(item);
      }
    }

    console.log(`   Found ${uniqueModules.length} application modules:`);
    uniqueModules.forEach((m) => console.log(`   - [${m.text}] -> ${m.href}`));

    // Global third-party script tracker
    let razorpayBlockedCount = 0;

    // 6. Deep Rough & Tough Exploratory Testing per Module
    for (const mod of uniqueModules) {
      console.log(`\n======================================================`);
      console.log(`🥊 DEEP TESTING MODULE: ${mod.text} (${mod.href})`);
      console.log(`======================================================`);

      const errorsBefore = errorMonitor.getErrors();
      let actionsCount = 0;
      const executedActions = [];

      try {
        await page.goto(`${BASE_URL}${mod.href}`, { waitUntil: 'networkidle', timeout: 12000 });
        await page.waitForTimeout(400);

        // Screenshot of freshly loaded module
        const screenName = `module_${mod.href.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        const screenPath = path.resolve(`reports/screenshots/${screenName}`);
        await page.screenshot({ path: screenPath });

        // ASSERTION 1: Blank Screen / Crash Check
        const mainContent = await page.$('main');
        if (!mainContent) {
          reporter.addBug({
            url: page.url(),
            feature: mod.text,
            title: `Critical Blank Screen: No <main> element rendered on ${mod.text}`,
            confidence: 'CONFIRMED',
            severity: 'Critical',
            steps: [`Navigate to ${BASE_URL}${mod.href}`],
            expected: 'Application renders standard layout with <main> viewport.',
            actual: 'Page content is completely missing or empty.',
            screenshot: screenPath,
            suggestedInvestigation: 'Check React Router and ProtectedRoute wrappers.',
          });
        }

        // Check for React Error Boundary Crash
        const crashText = await page.evaluate(() => {
          const body = document.body.innerText || '';
          if (body.includes('Something went wrong') || body.includes('Cannot read properties of undefined')) {
            return body.slice(0, 300);
          }
          return null;
        });

        if (crashText) {
          reporter.addBug({
            url: page.url(),
            feature: mod.text,
            title: `React Component Crash on ${mod.text}`,
            confidence: 'CONFIRMED',
            severity: 'Critical',
            steps: [`Navigate to ${BASE_URL}${mod.href}`],
            expected: 'Page renders without throwing React exceptions.',
            actual: crashText,
            screenshot: screenPath,
            suggestedInvestigation: 'Inspect console errors and unhandled props in component.',
          });
        }

        // TEST 2: In-Page Search Box (Happy Path & Negative Empty Query)
        const searchInput = await page.$(
          'main input[placeholder*="Search"]:not([readonly]), main input[type="search"]:not([readonly]), main input[type="text"]:not([readonly])'
        );
        if (searchInput) {
          try {
            console.log('   [Action] Testing in-page search box with valid and edge queries...');
            // Happy path query
            await searchInput.fill('Deepak');
            await page.waitForTimeout(350);
            executedActions.push('Tested Search input with query "Deepak"');

            // Negative non-matching query
            await searchInput.fill(`${TEST_PREFIX}_NON_EXISTENT_QUERY_999`);
            await page.waitForTimeout(350);
            executedActions.push('Tested Search input with non-matching edge query');

            // Reset
            await searchInput.fill('');
            await page.waitForTimeout(200);
            actionsCount += 2;
          } catch (searchErr) {
            console.log('   ⚠️ Search interaction error:', searchErr.message);
          }
        }

        // TEST 3: Status Filter Pills / Buttons (Rapid Click & State Toggle)
        const filterPills = await page.$$(
          'main button:has-text("All"), main button:has-text("Pending"), main button:has-text("Active"), main button:has-text("Won")'
        );
        if (filterPills.length > 0) {
          try {
            const pill = filterPills[0];
            const pillText = (await pill.innerText()).trim();
            const safety = safetyGuard.checkSafety(pillText);
            if (safety.safe) {
              console.log(`   [Action] Testing filter pill toggle: "${pillText}"...`);
              await pill.click({ timeout: 2000 });
              await page.waitForTimeout(250);
              // Rapid double click test (race condition check)
              await pill.click({ timeout: 2000 });
              await page.waitForTimeout(250);
              executedActions.push(`Toggled filter button "${pillText}" with rapid-click check`);
              actionsCount++;
            }
          } catch (filterErr) {
            console.log('   ⚠️ Filter interaction error:', filterErr.message);
          }
        }

        // TEST 4: Pagination Navigation
        const pageTwoBtn = await page.$('main button:has-text("2"), nav button:has-text("2")');
        if (pageTwoBtn) {
          try {
            console.log('   [Action] Testing pagination to page 2...');
            await pageTwoBtn.click({ timeout: 2000 });
            await page.waitForTimeout(400);
            executedActions.push('Tested pagination page 2 button click');
            actionsCount++;
          } catch (pageErr) {
            console.log('   ⚠️ Pagination interaction error:', pageErr.message);
          }
        }

        // TEST 5: Form Drawer / Modal & Negative Empty Field Submission
        const newBtn = await page.$(
          'button:has-text("Quick Add"), button:has-text("New Lead"), button:has-text("New Booking"), button:has-text("New Itinerary")'
        );
        if (newBtn) {
          try {
            const btnLabel = (await newBtn.innerText()).trim();
            const safety = safetyGuard.checkSafety(btnLabel);
            if (safety.safe && !btnLabel.toLowerCase().includes('delete')) {
              console.log(`   [Action] Opening form drawer: "${btnLabel}"...`);
              await newBtn.click({ timeout: 2500 });
              await page.waitForTimeout(500);

              const modal = await page.$('[role="dialog"], .fixed.inset-0');
              if (modal) {
                console.log('   ✅ Drawer/Modal opened. Executing Negative Test: Empty field submission...');
                executedActions.push(`Opened modal "${btnLabel}"`);

                const saveBtn = await page.$(
                  'button[type="submit"], button:has-text("Save"), button:has-text("Create")'
                );
                if (saveBtn) {
                  await saveBtn.click({ timeout: 2000 });
                  await page.waitForTimeout(400);
                  executedActions.push('Executed empty required field submission');

                  // Check if validation feedback is displayed (red text or error toast)
                  const hasValidation = await page.evaluate(() => {
                    const errors = document.querySelectorAll(
                      '.text-rose-500, .text-danger, .text-red-500, [aria-invalid="true"], [role="alert"]'
                    );
                    return errors.length > 0;
                  });

                  if (!hasValidation) {
                    console.log('   ℹ️ Note: No explicit validation error element found on empty submit.');
                  } else {
                    console.log('   ✅ Form validation properly triggered on empty submit!');
                  }
                }

                // Close modal cleanly via Escape key
                await page.keyboard.press('Escape');
                await page.waitForTimeout(300);
                executedActions.push('Closed modal via Escape key');
                actionsCount += 2;
              }
            }
          } catch (formErr) {
            console.log('   ⚠️ Form drawer test error:', formErr.message);
          }
        }

        // TEST 6: Global Search Shortcut Test (Ctrl + K)
        if (mod.href === '/dashboard') {
          try {
            console.log('   [Action] Testing Keyboard Shortcut Ctrl+K for Global Search...');
            await page.keyboard.press('Control+KeyK');
            await page.waitForTimeout(400);

            const searchModal = await page.$('[role="dialog"], .fixed');
            if (searchModal) {
              console.log('   ✅ Global Search Popover successfully triggered via Ctrl+K!');
              await page.keyboard.press('Escape');
              await page.waitForTimeout(300);
              executedActions.push('Tested Ctrl+K Global Search modal');
              actionsCount++;
            }
          } catch {}
        }

        // Error Analysis for this module
        const errorsAfter = errorMonitor.getErrors();
        const newPageErrors = errorsAfter.pageErrors.slice(errorsBefore.pageErrors.length);
        const newConsoleErrors = errorsAfter.consoleErrors.slice(errorsBefore.consoleErrors.length);
        const newNetworkErrors = errorsAfter.networkErrors.slice(errorsBefore.networkErrors.length);

        // Filter out the global Razorpay ORB script notice so it doesn't pollute every module
        const realNetworkErrors = newNetworkErrors.filter((ne) => {
          if (ne.url.includes('razorpay.com/build/undefined')) {
            razorpayBlockedCount++;
            return false;
          }
          return true;
        });

        const fatalIssues = newPageErrors.length + realNetworkErrors.length;

        if (fatalIssues > 0) {
          console.log(`   ❌ Detected ${fatalIssues} real issue(s) on ${mod.text}`);
          reporter.addBug({
            url: page.url(),
            feature: mod.text,
            title: `Issue detected on ${mod.text} module`,
            confidence: newPageErrors.length > 0 ? 'CONFIRMED' : 'LIKELY',
            severity: newPageErrors.length > 0 ? 'Critical' : 'High',
            steps: [`Navigate to ${BASE_URL}${mod.href}`, ...executedActions],
            expected: `Module renders and handles user input without runtime exceptions or API failures.`,
            actual: `Encountered ${fatalIssues} issue(s).`,
            screenshot: screenPath,
            consoleErrors: newConsoleErrors,
            networkErrors: realNetworkErrors,
            technicalDetails: JSON.stringify({ newPageErrors, realNetworkErrors }, null, 2),
            suggestedInvestigation: `Review component rendering logic and network calls on ${mod.href}.`,
          });
        } else {
          console.log(`   ✅ Module passed all deep tests cleanly with ${actionsCount} actions!`);
        }

        reporter.recordTest({
          feature: mod.text,
          route: mod.href,
          passed: fatalIssues === 0,
          actionCount: actionsCount,
          errorCount: fatalIssues,
        });

        // Generate clean reproducible Playwright spec
        generator.generatePlaywrightTest(
          mod.text,
          [`Navigate to ${mod.href}`, ...executedActions],
          BASE_URL
        );

      } catch (err) {
        console.error(`   ❌ Failed while testing ${mod.href}:`, err.message);
        const errScreen = path.resolve(`reports/screenshots/error_${mod.href.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
        await page.screenshot({ path: errScreen }).catch(() => {});

        reporter.addBug({
          url: `${BASE_URL}${mod.href}`,
          feature: mod.text,
          title: `Fatal Navigation Failure on ${mod.text}`,
          confidence: 'CONFIRMED',
          severity: 'Critical',
          steps: [`Navigate to ${BASE_URL}${mod.href}`],
          expected: 'Page should load within timeout.',
          actual: `Timeout / crash: ${err.message}`,
          screenshot: errScreen,
          technicalDetails: err.stack,
        });
      }
    }

    // If Razorpay ORB script was blocked, record it once globally with proper definition!
    if (razorpayBlockedCount > 0) {
      reporter.addBug({
        url: BASE_URL,
        feature: 'Third-Party Payments Integration',
        title: 'Blocked Third-Party Script: Razorpay Checkout script fetching undefined build URL',
        confidence: 'CONFIRMED',
        severity: 'Medium',
        steps: [
          'Open application at http://localhost:5173',
          'Inspect network traffic in browser developer tools',
          'Observe browser ORB blocking request to https://checkout-static-next.razorpay.com/build/undefined',
        ],
        expected: 'Razorpay checkout script should only load valid bundle assets or defer loading until checkout is opened.',
        actual: `Browser intercepted and blocked ${razorpayBlockedCount} malformed script request(s) with net::ERR_BLOCKED_BY_ORB.`,
        suggestedInvestigation: 'Check paymentService.js or Razorpay script loader in DashboardLayout.jsx for an undefined version or bundle path.',
      });
    }

  } finally {
    console.log('\n7. Stopping Playwright tracing and saving trace file...');
    await context.tracing.stop({ path: tracePath });
    await browser.close();
  }

  // 8. Generate Reports
  console.log('8. Generating final structured reports (Markdown, JSON & Visual HTML)...');
  const { bugReportPath, bugsJsonPath, summaryPath, htmlPath } = reporter.generateReports();

  console.log('\n======================================================');
  console.log('📊 ROUGH & TOUGH QA RUN COMPLETED!');
  console.log('======================================================');
  console.log(`- 🌐 Visual HTML Dashboard: ${htmlPath}`);
  console.log(`- 📝 Markdown Bug Report:   ${bugReportPath}`);
  console.log(`- 📄 Machine JSON Data:     ${bugsJsonPath}`);
  console.log(`- 📋 Test Summary:          ${summaryPath}`);
  console.log(`- 📁 Generated Tests:       generated-tests/`);
  console.log(`- 🖼️ Screenshots:           reports/screenshots/`);
  console.log(`- 📦 Playwright Traces:     reports/traces/`);
  console.log('======================================================\n');
  console.log('💡 Tip: Run `npm run report` to view the visual dashboard in your browser!\n');
}

main().catch((err) => {
  console.error('\nFatal QA Error:', err);
  process.exit(1);
});
