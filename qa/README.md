# QA

Two systems live here, and they answer different questions.

## Three files, that is all

| Double-click | What it tests | Needs |
| --- | --- | --- |
| `test-backend.bat` | Backend unit/integration suite (real Postgres) + ~14,500 generated API cases: auth, permissions, tenant isolation, validation, fuzzing, business rules, rate limits | Postgres running. Nothing else - it builds and drops its own database |
| `test-frontend.bat` | Real browser, real UI (Playwright, no AI). **Full** (default): the UI matrix - every page x 3 roles x desktop/phone, every button, tab, dropdown option and search box, every create form x every field x bad values - plus the business flows. **Quick**: business flows only, about a minute | Starts backend (5001) and frontend (5173) itself if they are not up |
| `test-both.bat` | Backend first, then frontend, one PASS/FAIL line for each at the end | Both of the above |

Same thing from a terminal: `npm run test:backend`, `npm run test:frontend`.

Reports: `reports/matrix-report.html` (backend), `reports/ui-matrix-report.html` (frontend use cases, grouped by what broke) and `reports/e2e-html/index.html` (Playwright's own, with screenshots and traces). They open by themselves when a run finishes.

### What the UI matrix checks (`tests/ui-matrix/`)

| Rule | Asks |
| --- | --- |
| `01-page-health` | Every page renders for admin, full member and no-permission member, on desktop and phone: no JS error, no API 500, no white screen, the right user is let in or redirected, survives a refresh, fits a phone. Plus accessibility: every button named, every field labelled, every image with alt text (warnings) |
| `02-navigation` | Every sidebar link per role; links to modules a user cannot open are hidden; back/forward; every protected page sends a signed-out visitor to login; wrong URLs and bad ids show a page, not a crash |
| `03-every-button` | Every button, tab, link, checkbox, dropdown option and search box on every page, for admin and member, desktop and phone. After each press: nothing broke, drawers close again, links land somewhere that renders |
| `04-every-form` | Every Add/New form, every field, each with blank, spaces, 5,000 chars, script tags, SQL, emoji, extreme numbers and dates - then Save. Must not crash or run the script; the list is reloaded afterwards to catch stored script injection |

Buttons that would reach outside the test tenant (send, pay, connect Google/WhatsApp) or destroy the data the walk needs (delete, logout) are not pressed - they are listed by name in the report. The browser also refuses every request to a host that is not the app itself.

Adding a page: add it to `tests/ui-matrix/lib/inventory.js`. A test fails if `frontend/src/App.jsx` has a route the inventory does not.

Frontend tests create a temporary tenant in your dev database for each test file and delete it afterwards (`KEEP_QA_DATA=true` keeps it for debugging). Backend tests never touch your dev database.

How the backend matrix works, and how to add a route to it: **[MATRIX.md](MATRIX.md)**.

## 2. The autonomous browser explorer

Everything below drives a real browser with a local LLM and explores the UI.
It answers "does this feel broken to a user", where the matrix answers "is this
endpoint correct under every input we can name".

---

# 100% Free, Local Autonomous QA Testing System

An autonomous QA testing system powered by **Open-QA**, **Playwright**, and **Ollama**.
Runs 100% locally on your Windows machine with **₹0 AI API cost** and **no external cloud calls**.

---

## 1. System Requirements
- **OS:** Windows 10/11 (64-bit)
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **RAM:** Minimum 8 GB (16 GB recommended)
- **Ollama:** Installed locally on Windows

---

## 2. Quick Start

Inside the `qa/` directory:

```bash
# 1. Run diagnostic doctor check
npm run doctor

# 2. Run autonomous QA exploration (Headless)
npm run qa

# 3. Run autonomous QA with visible browser (Headed)
npm run qa -- --headed

# 4. Clean previous reports
npm run clean
```


---

## 3. Ollama Installation & Service
Ollama runs the local AI model natively on your machine:
```powershell
# Install Ollama on Windows
winget install Ollama.Ollama --silent

# Start Ollama service (if not already running)
ollama serve
```

---

## 4. Model Installation
We use the lightweight, high-performance model `llama3.2:3b` (~2.0 GB), optimized for tool calling and reasoning on standard 16GB laptops without high GPU demands:
```powershell
ollama pull llama3.2:3b
```

---

## 5. Open-QA Configuration
Open-QA (`openqa` v0.0.10) provides the agentic browser harness over Playwright MCP (`@playwright/mcp`).
Our native provider (`qa/harness/ollamaProvider.js`) bridges Open-QA's MCP browser server directly to local Ollama (`http://127.0.0.1:11434`), ensuring zero paid API calls.

---

## 6. Environment Variables (`qa/.env`)
Edit `qa/.env` to configure your environment:

```ini
# Target Application
BASE_URL=http://localhost:5173

# Test Credentials
TEST_USERNAME=qa_tester@test.local
TEST_PASSWORD=Password@123

# Local Ollama Inference
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b

# Safety Controls
ALLOW_DELETE=false
ALLOW_PAYMENT=false
ALLOW_EXTERNAL_MESSAGES=false
ALLOW_EMAIL=false
ALLOW_WHATSAPP=false

# Test Data Prefix
TEST_DATA_PREFIX=QA_

# Browser Execution
HEADLESS=true
```

---

## 7. Test Credentials
A pre-seeded QA test user is available for local testing:
- **Email:** `qa_tester@test.local`
- **Password:** `Password@123`
- **Role:** `ADMIN` (Full access to all CRM navigation links)

---

## 8. Starting Autonomous QA
Execute autonomous exploration:
```bash
node scripts/run-qa.js
```
The agent will:
1. Launch Chromium via Playwright.
2. Log into the application using your test credentials.
3. Hand over context to Open-QA + local Ollama for visual/DOM inspection.
4. Dynamically discover all navigation routes (Dashboard, Leads, Follow-ups, Quotations, Bookings, Invoices, Hotels, etc.).
5. Explore each page: test search boxes, toggle filters, check pagination, test modal forms, and attempt empty field submissions.
6. Record console logs, network errors, and unhandled JS exceptions.
7. Output structured markdown and JSON bug reports.

---

## 9. Headed Browser Mode
To watch the browser navigate and test in real time:
```bash
node scripts/run-qa.js --headed
```

---

## 10. Reports
Reports are generated in `qa/reports/`:
- `reports/bug-report.md`: Detailed markdown bug report with reproduction steps, severity, and suggested investigations.
- `reports/bugs.json`: Machine-readable JSON summary of all bugs.
- `reports/test-summary.md`: High-level test summary with duration, tested modules, and pass/fail metrics.

---

## 11. Screenshots
Every discovered module and failure is screenshotted and saved in:
`qa/reports/screenshots/`

---

## 12. Playwright Traces
Full Playwright execution traces containing DOM snapshots, console logs, and action timelines are saved in:
`qa/reports/traces/qa-run-trace.zip`

View any trace anytime using:
```bash
npx playwright show-trace reports/traces/qa-run-trace.zip
```

---

## 13. Business Rules (`qa/config/business-rules.md`)
Custom business rules are documented in `qa/config/business-rules.md`. The QA agent uses these rules to evaluate whether an action succeeded or violated an application invariant.

---

## 14. Safety Controls
The safety guard (`qa/core/safetyGuard.js`) blocks dangerous actions before execution:
- Blocks buttons/actions matching: `Delete`, `Remove`, `Destroy`, `Trash`, `Drop`.
- Blocks financial actions: `Pay`, `Purchase`, `Checkout`, `Refund`.
- Blocks real messaging: `WhatsApp`, `Email`, `Broadcast`.
- All generated test data uses the prefix `QA_`.

---

## 15. Troubleshooting
- **Ollama connection failed (`fetch failed`)**:
  Start Ollama in a terminal:
  ```powershell
  ollama serve
  ```
- **Playwright Chromium missing**:
  Install Chromium binaries:
  ```bash
  npx playwright install chromium
  ```
- **Target application not reachable**:
  Ensure your dev server is running on `http://localhost:5173`.
