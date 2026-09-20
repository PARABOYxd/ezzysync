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

Or double-click the one-click Windows batch files:
- `doctor.bat`
- `run-qa.bat`
- `clean-reports.bat`

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
