# The QA matrix

One command runs everything:

```bash
cd qa
npm run test:backend
```

Or double-click `test-backend.bat`, which does the same and opens the report.

That single pass takes about eight minutes and does three things: it checks the
machine can run a QA pass at all, it runs the hand-written backend tests (218 today),
and it generates and runs ~14,500 API cases against a throwaway database. It
finishes with one summary and one HTML report.

```
npm run test:backend  preflight + backend suite + matrix   (~8 min)
npm run qa:matrix     the matrix on its own, no wrapper
```

Flags: `--concurrency=N`, `--skip-vitest`, `--skip-matrix`, `--open`.

---

## Where the cases come from

Nobody wrote fourteen thousand tests. One file describes every route the app
exposes — `matrix/lib/inventory.js` — and fourteen rules each turn that
description into cases. Adding a route to the inventory is one entry and yields
roughly eighty new cases automatically.

| Rule | What it asks | Cases |
| --- | --- | ---: |
| `authentication` | Nine kinds of unusable token against every authenticated route | ~1,170 |
| `authorization` | Denied member, permitted member and admin against every gated route | ~270 |
| `tenant-isolation` | Tenant A, valid session, tenant B's record ids | ~100 |
| `field-validation` | Every writable field against 35 hostile and type-invalid values | ~6,600 |
| `path-parameters` | Fourteen malformed ids in every `:id` route | ~770 |
| `query-parameters` | Paging, search, sort and filter values on every list route | ~3,740 |
| `request-shape` | Body shapes, content types, the 2 MB ceiling | ~560 |
| `http-contract` | Unregistered verbs, unknown paths, encoded traversal | ~415 |
| `transport-security` | Security headers, the CORS allowlist, the deliberate public-form hole | 10 |
| `auth-flows` | Register, login, refresh, logout and reset as full sequences | 5 |
| `business-rules` | Totals, balances, capacity, conversion, soft deletes, plan limits | 10 |
| `rate-limits` | Brute force, OTP spam and the public form, from one address | 5 |
| `coverage-parity` | Whether this suite still covers the app that exists | 3 |
| `happy-path` | One valid, authorised request per route | ~165 |
| `canary` | Ordinary reads, re-run between rules | ~85 |

## What it runs against

A database it creates and drops. `ezzysync_qa_matrix_<pid>` is built from the
app's own `ensureSchema` plus its migrations, seeded through the API, and
dropped when the run ends. It is never your development database, and the suite
will not run without creating its own.

Outbound network is severed before a single application module loads, so
nothing reaches WhatsApp, Razorpay, Resend, Gemini or R2. A route that would
call one is expected to answer 502/503; a 500 there means the provider failure
was not handled.

Every case goes out from its own `X-Forwarded-For`, so the rate limiters do not
turn case 401 into a 429. The rate-limit rule pins one address deliberately —
it is the only place a burst is the point.

## Reading the report

`reports/matrix-report.html` is the one to open. `matrix-report.md` is the same
content for a pull request, and `matrix-results.json` has every row for
diffing runs.

Results are folded into **findings**: one per endpoint, per failed check, with
an occurrence count and up to five example inputs. One missing validation on
one endpoint is one finding seen two hundred times, not two hundred bugs.

Severity means:

- **critical** — a crash, an auth bypass, or one tenant reaching another's data
- **high** — a 500 on input the endpoint should have rejected, a permission gate
  that cannot be satisfied, a broken invariant
- **medium** — a missing header, an unbounded page size, a user-enumeration leak
- **low** — cosmetics, and external-provider noise the harness caused itself

## Two rules that check the suite rather than the app

`coverage-parity` reads `backend/server.js` and every file in `backend/routes/`,
and fails when a router is mounted in the app but not in the harness, or when a
route exists but is not in the inventory. Without it, a new endpoint would
quietly receive zero cases and the coverage number would be a lie.

`canary` re-runs six ordinary reads between rules. Fuzzing writes as well as
reads, and a value the API accepts but cannot later render turns every
subsequent list request into a 500. The canaries name the rule after which that
started, which is how the `Infinity` date bug below was located.

## Adding a route

Add it to `matrix/lib/inventory.js`:

```js
{
  id: 'hotels.archive',
  method: 'post',
  path: '/api/hotels/:id/archive',
  auth: 'required',
  permission: ['hotels', 'update'],
  params: { id: 'hotel' },
  body: { reason: f(T.string), archiveDate: f(T.date) },
  sample: () => ({ reason: 'QA archive' }),
}
```

That is the whole change. It now gets nine authentication cases, three
authorisation cases, two isolation cases, a body-fuzz matrix over both fields,
fourteen path-parameter cases, ten request-shape cases, four unregistered-verb
cases and a happy path — and `coverage-parity` stops complaining about it.

Flags worth knowing: `externals` (reaches a provider, so 502/503 is fine),
`heavy` (slow — cheap rules only), `destructive` (never run on the happy path),
`upload` (multipart, so body fuzzing does not apply), `adminOnly`,
`publicByDesign` (a share link, exempt from the isolation rule) and
`expectSampleRejected` (the valid-looking sample is supposed to be refused).

## Relationship to the older QA scripts

`npm run qa` and its siblings drive a browser with a local LLM and explore the
UI. They answer "does this feel broken to a user". The matrix answers "is this
endpoint correct under every input we can name". They do not overlap, and
neither replaces the other.
