# Running EzzySync

Three apps in one repo:

| Folder | What it is | Dev port |
| --- | --- | --- |
| `backend` | Express API + WhatsApp/Instagram workers | 5001 |
| `frontend` | The CRM itself (Vite + React) | 5173 |
| `landing` | Marketing site (Next.js) | 3000 |

---

## First time on a machine

```bash
npm install        # root tooling
npm run setup      # installs all three apps, creates .env files, generates secrets
```

`npm run setup` is safe to re-run. It never overwrites a value you have set — it
only appends keys that are missing, so after pulling a change that adds a new
environment variable, running it again is all you need.

One thing it cannot guess is `DATABASE_URL`. Point that at a Postgres you can
reach, then:

```bash
npm run check      # confirms the environment, tests and builds are all healthy
```

---

## Day to day

| Command | What it does |
| --- | --- |
| `npm run dev` | Backend + frontend together, one terminal, colour-prefixed |
| `npm run dev:all` | The above plus the landing site |
| `npm run check` | Everything CI runs — env, static checks, tests, builds |
| `npm test` | Just the tests |
| `npm run build` | Production builds for frontend and landing |
| `npm start` | Runs the built output locally |

Ctrl+C stops every process started by `npm run dev`.

---

## The checks, and what each is for

Each one exists because something got through the others.

**`npm run test:env`** — compares your `.env` files against
`scripts/env-schema.js`, the single list of every variable the code reads. It
reports missing keys, keys that are set but nothing reads (usually a typo), and
secrets that are too short. `node scripts/check-env.js --prod` applies the
stricter production rules and fails on anything that would matter live.

**`node scripts/check-frontend.js`** — finds JSX that references a component
which was never imported. A bundler will not: the build succeeds and the page
throws `X is not defined` the moment a user opens it. It also flags object URLs
created without being released, and intervals started without being cleared.

**`node scripts/check-backend.js`** — requires every backend module. The old CI
step ran `node --check server.js`, which parses one file and therefore misses a
missing dependency, a broken require, or a module that throws at load because
an environment variable is absent.

**`npm --prefix backend test`** — creates a real Postgres database, runs
`ensureSchema()` against it and exercises the write paths. Every schema bug in
this project has looked the same: fine on a machine whose database still
carries columns from an older definition, broken on a fresh one. Only a real
database catches that. The suite skips itself if no Postgres is reachable.

---

## CI/CD

| Trigger | What happens |
| --- | --- |
| Pull request → `main`/`dev` | `ci.yml`: all checks above, with a Postgres service |
| Push to `dev` | Checks, then backend → Render, frontend → Vercel preview |
| Push to `main` | Checks, then backend → Railway, frontend → Vercel production, then a health check against the deployed API |

Deploy jobs reuse `ci.yml` rather than repeating its steps, so "CI passed"
means the same thing everywhere.

### Secrets and variables

Repository → Settings → Secrets and variables → Actions.

| Name | Kind | Needed for |
| --- | --- | --- |
| `RENDER_DEV_DEPLOY_HOOK` | secret | Dev backend deploy |
| `RAILWAY_TOKEN` | secret | Production backend deploy |
| `RAILWAY_SERVICE` | secret | Optional — the service name on Railway |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | secrets | Frontend deploys |
| `VITE_RAZORPAY_KEY_ID` | secret | Frontend build |
| `PROD_API_URL` | **variable** | Post-deploy health check (e.g. `https://api.ezzysync.com`) |

A missing secret fails the production deploy loudly. On dev it only warns, so a
half-configured dev pipeline does not block you.

---

## Before going live

`npm run check` passing is not the same as being ready to ship. Run
`node scripts/check-env.js --prod` and clear everything it marks with ✗.

The ones that bite hardest:

- **`R2_*`** — without all six, uploads are written to the container's local
  disk. That disk is wiped on every deploy, so customer photos and PDFs vanish,
  and a second instance cannot see the first one's files.
- **`TOKEN_ENCRYPTION_KEY`** — 64 hex characters. Without it the server does not
  start at all; the encryption module throws while loading and takes six
  controllers down with it.
- **`JWT_SECRET`** — long and random. Anything guessable is a way to mint
  tokens for any tenant.
- **`RAZORPAY_*`** — payments fall back to mock keys otherwise.
