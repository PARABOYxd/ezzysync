# EzzySync — Travel CRM & Booking Management Suite

A highly scalable, multi-tenant booking and operations management suite designed specifically for travel agencies and tour operators. EzzySync features strict tenant isolation, granular role-based access control, Google single-sign-on, and scheduled background workers.

---

## ⚡ Tech Stack & Architecture

EzzySync uses a clean, separation-of-concerns architecture designed to scale with your business operations:

* **Frontend:** React (Vite) + Tailwind CSS + Lucide Icons + Axios Clients
* **Backend:** Node.js + Express.js (N-Tier Architecture separating controllers, services, and repositories)
* **Database:** PostgreSQL (with automatic schema initialization and DDL migrations)
* **Auth & Security:** JWT Tokenization + OAuth 2.0 + bcryptjs + helmet rate-limiters
* **Background Processing:** node-cron scheduled tasks
* **Integrations:** SMTP Nodemailer + WhatsApp Cloud API + Google Gmail API + Google OAuth

---

## 🚀 Key Features

### 1. N-Tier Repository Pattern
To maintain database portability and isolate database structures from business execution, we migrated direct SQL queries out of the Services layer into dedicated Repository modules:
* `userRepository.js` — Handles authentication, password linking, Google profiles, and user tables.
* `bookingRepository.js` — Manages bookings, passenger details, and soft-deletes.
* `settingsRepository.js` — Customizes logos, sender signatures, and GST credentials.
* `auditRepository.js` — Tracks user activities and security trails.

### 2. Role-Based Access Control (RBAC) & Permission Gating
Admin tenants can onboard team members and customize their permissions dynamically:
* **Admin:** Full read/write access to dashboard metrics, team panels, settings, and integrations.
* **Team Members:** Scoped views restricting dashboard analytics. Individual permissions can be configured for:
  * Creating Leads
  * Editing Leads
  * Editing Mobile Numbers (Security locking feature)
  * Downloading & Emailing Invoices
  * Deleting Leads

### 3. Subscription & Feature Gating
Database-controlled subscription settings enforce usage caps and unlock premium features:
* **Free Plan:** Unlimited bookings, team onboarding, and invoice operations.
* **Pro Plan:** Access to premium tools, including the upcoming **AI Travel Tools Suite** (Lead Scoring, WhatsApp auto-replies, and 1-Click Itinerary PDF generation).
* Gated endpoints are automatically secured via `planMiddleware.js`.

### 4. Secure Google Sign-In & Single-Sign-On
* Seamless one-click authentication on both Login & Register forms.
* Automatic tenant creation for first-time signups, or instant secure linking for existing email accounts.
* Encrypted session tokens returned via secure callback redirects.

### 5. Audit Logging Trail
Every critical data mutation or permission change is tracked for security:
* Actions like `CREATE_LEAD`, `UPDATE_LEAD`, `DELETE_LEAD`, and `TEAM_MEMBER_CREATED` are stored in the `audit_logs` table.
* Logs capture the committing user, timestamp, actions description, and payload diffs.

### 6. Scheduled Background Cron Workers
Automated routines run using `node-cron` background tasks:
* **Weekly Log Archiving:** Automatically purges system audit logs older than 90 days.
* **Daily Stats Calculation:** Automatically runs every midnight to aggregate analytics charts and travel numbers.

---

## 📁 Project Structure

```
leadCRM/
├── backend/                  # N-Tier REST API
│   ├── config/                # DB connections, schema bootstrap, google config
│   ├── controllers/           # HTTP Request controllers & route handler logic
│   ├── jobs/                  # Background worker schedules (cronJobs)
│   ├── middleware/            # JWT validation, RBAC filters, plan limits checks
│   ├── models/                # DB model schemas & snake_case translation mapping
│   ├── repositories/          # Isolated raw SQL query database handlers
│   ├── routes/                # Express endpoint mappings
│   ├── services/              # Pure business logic (bookings, plans, WhatsApp, Gmail)
│   └── server.js
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/         # Reusable SelectFields, InputFields, modals
│   │   ├── hooks/              # useAuth context, useToast triggers
│   │   ├── layouts/            # Dashboard layout sidebar & topbar navigators
│   │   ├── pages/              # Dashboard, Bookings, Team management, Profile, AI Tools...
│   │   └── services/           # Axios network endpoints config
│   └── vite.config.js
└── landing/                  # Next.js Static Landing Page & Walkthrough Booking Form
```

---

## 🛠️ Setup & Local Development

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **PostgreSQL** installed.

### 2. Environment Setup
Copy `.env.example` to `.env` in both folders and fill in your keys:

**Backend (`backend/.env`):**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/ezzysync
JWT_SECRET=your_super_secret_jwt_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/google/callback
GOOGLE_LOGIN_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5001/api
```

### 3. Running Backend Server
```bash
cd backend
npm install
npm run dev
```
*Note: Database tables, initial schema, default plans, and indices are automatically initialized on boot.*

### 4. Running Frontend CRM
```bash
cd frontend
npm install
npm run dev
```

### 5. Running Landing Page
```bash
cd landing
npm install
npm run dev
```

---

## 🔒 Security & Reliability Features
* **SQL Injection Protection:** All queries inside the `/repositories` layer utilize parameterized queries.
* **Tenant Isolation:** Every single business query is scoped explicitly with `WHERE tenant_id = $1` parsed from the short-lived verified JWT.
* **Keystroke Filtering:** Input fields in forms filter out forbidden characters in real-time, preventing incorrect entry (e.g. phone fields block letters).
* **Robust Error Boundaries:** Frontend state views utilize optional chaining and safe fallbacks to prevent crashes during connection timeouts.
