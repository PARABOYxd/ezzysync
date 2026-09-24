# SEO automation

Everything on-site is automated. The only human steps are merging the weekly
pull request and off-page work (backlinks, directories, PR).

## Weekly (Monday 9:00 IST, `.github/workflows/seo-weekly.yml`)

`npm run seo:weekly` runs these steps, then CI builds the site, audits it and
opens a pull request whose description is the report:

| Step | What it does | Writes |
|---|---|---|
| gsc | Last 28 days from Search Console; refreshes numbers, tracks new queries | `seo/keywords.csv` |
| suggest | Google search-box suggestions for our topics → new keyword ideas | `seo/keywords.csv` |
| plan | AI: map each open keyword to a page, write a post, or ignore it | `seo/keywords.csv` |
| write | AI: up to 3 posts (at least one pillar until all 10 exist), checked for length, structure, banned phrases, no stats, real links only | `content/blog/*.md` |
| meta | AI: new title/description for pages that rank but aren't clicked; rolled back after 4 weeks if CTR fell | `src/content/seoOverrides.json` |
| links | Keywords at position 8-20 become internal-link phrases | `src/content/internalLinks.json` |

Merging the PR deploys the site; `.github/workflows/seo-indexnow.yml` then
pings IndexNow (Bing etc.). Google re-reads `sitemap.xml` by itself.

## Built from data, never by hand

- `sitemap.xml`, `llms.txt`, `pricing.md` - generated from pages, posts and `src/data/plans.js`
- Related links and inline links in posts - from `src/content/internalLinks.json`
- Product facts the AI may use - `seo/product-facts.md`. **Update it when the product changes.**

## Secrets (GitHub → Settings → Secrets and variables → Actions)

- `GSC_SERVICE_ACCOUNT_JSON` - Search Console service-account key
- `GEMINI_API_KEY` (or `OPENAI_API_KEY`) - AI writer
- `SEO_BOT_TOKEN` - fine-grained token (contents + pull requests: write) so the PR triggers CI

## Local commands (from `landing/`)

- `npm run seo:audit` - crawl a running site for broken links, orphans, meta problems (`BASE_URL=...`)
- `npm run seo:weekly` - the weekly job (`GSC_SERVICE_ACCOUNT_FILE=./gsc-key.json`, `GEMINI_API_KEY=...`)
- `npm run seo:indexnow` - resubmit recently changed pages (`INDEXNOW_DAYS=365` for everything)

## Topic clusters

`keywords.csv` holds 10 pillar topics (`content_type` = pillar) and their
supporting posts (`cluster` = the pillar keyword). The job writes pillars
first (2000+ words), then cluster posts. Every cluster post must link to its
pillar, and a pillar links to its published cluster posts. Each new post's
keyword is added to `internalLinks.json`, so later posts link to it too. The
AI can schedule these rows but never ignore or re-point them - change the
plan by editing the CSV.

## Keyword statuses in `keywords.csv`

`live` targeted by a page · `tracking` found in Search Console, Google ranks a page for it ·
`idea` from Google suggestions, not yet planned · `planned` worth a post · `ignore` off-topic
