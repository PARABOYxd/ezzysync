import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

console.log('\n======================================================');
console.log('🩺 AUTONOMOUS QA SYSTEM — DIAGNOSTIC DOCTOR CHECK');
console.log('======================================================\n');

let allPassed = true;

function check(title, fn) {
  try {
    const result = fn();
    console.log(`[PASS] ✅ ${title}${result ? ': ' + result : ''}`);
  } catch (err) {
    allPassed = false;
    console.error(`[FAIL] ❌ ${title}: ${err.message}`);
  }
}

async function runDoctor() {
  // 1. Node.js
  check('Node.js Runtime', () => {
    const v = process.version;
    const major = parseInt(v.slice(1).split('.')[0], 10);
    if (major < 18) throw new Error(`Node.js version must be >= 18. Current: ${v}`);
    return v;
  });

  // 2. npm
  check('npm Package Manager', () => {
    const v = execSync('npm -v', { encoding: 'utf-8' }).trim();
    return v;
  });

  // 3. Open-QA Framework
  check('Open-QA Framework', () => {
    const pkgPath = path.resolve('node_modules/openqa/package.json');
    if (!fs.existsSync(pkgPath)) {
      throw new Error('Open-QA package not installed. Run `npm install` inside qa/ directory.');
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return `v${pkg.version}`;
  });

  // 4. Playwright & Chromium
  check('Playwright Engine & Chromium Browser', () => {
    const pwPkg = path.resolve('node_modules/playwright/package.json');
    if (!fs.existsSync(pwPkg)) throw new Error('Playwright not found in node_modules.');
    
    // Check chromium executable cache
    const localAppData = process.env.LOCALAPPDATA || '';
    const pwBrowsers = path.join(localAppData, 'ms-playwright');
    if (!fs.existsSync(pwBrowsers)) {
      throw new Error('Playwright Chromium binaries not found. Run `npx playwright install chromium`.');
    }
    const items = fs.readdirSync(pwBrowsers).filter((f) => f.includes('chromium'));
    if (items.length === 0) {
      throw new Error('Chromium not downloaded. Run `npx playwright install chromium`.');
    }
    return items[0];
  });

  // 5. Verify LLM Provider is 100% LOCAL
  check('Local AI Architecture (Zero Cloud Cost Guarantee)', () => {
    const url = new URL(OLLAMA_HOST);
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      throw new Error(`SECURITY ALERT: Provider is not local! Host is set to: ${OLLAMA_HOST}`);
    }
    // Verify no cloud API keys are set or required
    if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY) {
      return `Local endpoint ${OLLAMA_HOST} (Notice: Cloud keys detected in env, but local Ollama is prioritized)`;
    }
    return `100% Local at ${OLLAMA_HOST} (₹0 cloud cost)`;
  });

  // 6. Ollama Server Status
  await (async () => {
    try {
      const res = await fetch(`${OLLAMA_HOST}`);
      const text = await res.text();
      if (text.includes('Ollama is running')) {
        console.log(`[PASS] ✅ Ollama Service: Running and responding at ${OLLAMA_HOST}`);
      } else {
        throw new Error(`Unexpected Ollama response: ${text}`);
      }
    } catch (err) {
      allPassed = false;
      console.error(`[FAIL] ❌ Ollama Service: Cannot reach ${OLLAMA_HOST}. Start Ollama using \`ollama serve\`. (${err.message})`);
    }
  })();

  // 7. Selected Ollama Model
  await (async () => {
    try {
      const res = await fetch(`${OLLAMA_HOST}/api/tags`);
      const data = await res.json();
      const models = data.models || [];
      const found = models.some((m) => m.name.startsWith(OLLAMA_MODEL) || m.name.includes(OLLAMA_MODEL));
      if (!found) {
        throw new Error(`Model "${OLLAMA_MODEL}" not found. Run \`ollama pull ${OLLAMA_MODEL}\`. Available: ${models.map(m=>m.name).join(', ')}`);
      }
      console.log(`[PASS] ✅ Selected Model: ${OLLAMA_MODEL} is downloaded and ready locally`);
    } catch (err) {
      allPassed = false;
      console.error(`[FAIL] ❌ Selected Model: ${err.message}`);
    }
  })();

  // 8. BASE_URL Connectivity
  await (async () => {
    try {
      const res = await fetch(BASE_URL);
      console.log(`[PASS] ✅ Application BASE_URL: ${BASE_URL} is reachable (HTTP ${res.status})`);
    } catch (err) {
      allPassed = false;
      console.error(`[FAIL] ❌ Application BASE_URL: Cannot connect to ${BASE_URL}. Ensure your dev server is running! (${err.message})`);
    }
  })();

  // 9. Test Credentials & Safety Configuration
  check('Configuration & Safety Controls', () => {
    const user = process.env.TEST_USERNAME;
    const pass = process.env.TEST_PASSWORD;
    const del = process.env.ALLOW_DELETE;
    const pay = process.env.ALLOW_PAYMENT;
    const wa = process.env.ALLOW_WHATSAPP;

    if (!user || !pass) throw new Error('TEST_USERNAME or TEST_PASSWORD missing in .env');
    return `User: ${user} | Safety: ALLOW_DELETE=${del}, ALLOW_PAYMENT=${pay}, ALLOW_WHATSAPP=${wa}`;
  });

  console.log('\n------------------------------------------------------');
  if (allPassed) {
    console.log('🎉 ALL SYSTEM DIAGNOSTICS PASSED! The QA system is ready to test.');
    console.log('Run command: npm run qa -- --headed');
  } else {
    console.log('⚠️ Some diagnostic checks failed. Review the errors above.');
  }
  console.log('------------------------------------------------------\n');
}

runDoctor().catch(console.error);
