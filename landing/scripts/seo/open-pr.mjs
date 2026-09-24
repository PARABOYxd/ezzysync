/**
 * Commits the weekly SEO changes to the `seo/weekly` branch and opens (or
 * updates) the pull request, with the report as its description.
 * Used by .github/workflows/seo-weekly.yml; every failure prints the exact
 * git / GitHub API error so a broken run explains itself.
 *
 * Env: GH_TOKEN, GITHUB_REPOSITORY (owner/name), REPORT (path from landing/),
 *      PR_TITLE, BASE_BRANCH (default main)
 */

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const { GH_TOKEN, GITHUB_REPOSITORY: REPO, REPORT, PR_TITLE } = process.env;
const BASE = process.env.BASE_BRANCH || "main";
const BRANCH = "seo/weekly";
const PATHS = [
  "seo/keywords.csv",
  "seo/reports",
  "content/blog",
  "src/content/seoOverrides.json",
  "src/content/internalLinks.json",
];

function fail(step, detail) {
  console.error(`✗ ${step} failed:\n${detail}`);
  process.exit(1);
}

const git = (args, step) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    // Never print the token.
    fail(step, String(e.stderr || e.message).replaceAll(GH_TOKEN, "***"));
  }
};

async function api(method, path, body) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

if (!GH_TOKEN) fail("setup", "GH_TOKEN is empty - add the SEO_BOT_TOKEN secret.");
if (!REPO || !REPORT) fail("setup", "GITHUB_REPOSITORY and REPORT must be set.");

// 1. Anything to commit? (content/blog may not exist in a week with no posts)
git(["add", "--", ...PATHS.filter((p) => existsSync(p))], "git add");
if (!git(["diff", "--cached", "--name-only"], "git diff")) {
  console.log("No SEO changes this week - nothing to open.");
  process.exit(0);
}
console.log("Changed files:\n" + git(["diff", "--cached", "--name-only"], "git diff"));

// 2. Commit on a fresh branch from the checked-out main.
git(["config", "user.name", "EzzySync SEO bot"], "git config");
git(["config", "user.email", "seo-bot@users.noreply.github.com"], "git config");
git(["checkout", "-B", BRANCH], "git checkout");
git(["commit", "-m", `chore(seo): ${PR_TITLE}`], "git commit");

// 3. Push with the bot token (checkout's own credentials are disabled in the workflow).
git(["push", "--force", `https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git`, `HEAD:refs/heads/${BRANCH}`], "git push");
console.log(`Pushed ${BRANCH}`);

// 4. Open the PR, or refresh the one already open from last week.
const body = (await readFile(REPORT, "utf8")).slice(0, 65000);
const owner = REPO.split("/")[0];
const open = await api("GET", `/pulls?state=open&head=${owner}:${encodeURIComponent(BRANCH)}`);
if (open.status !== 200) fail("find existing PR", `HTTP ${open.status}: ${JSON.stringify(open.data)}`);

if (open.data.length) {
  const pr = open.data[0];
  const upd = await api("PATCH", `/pulls/${pr.number}`, { title: PR_TITLE, body });
  if (upd.status !== 200) fail("update PR", `HTTP ${upd.status}: ${JSON.stringify(upd.data)}`);
  console.log(`Updated PR #${pr.number}: ${pr.html_url}`);
} else {
  const created = await api("POST", "/pulls", { title: PR_TITLE, head: BRANCH, base: BASE, body });
  if (created.status !== 201) {
    const hint = created.status === 403 || created.status === 404
      ? "\nThe token can't create PRs: SEO_BOT_TOKEN needs Contents + Pull requests: Read and write on this repository."
      : "";
    fail("create PR", `HTTP ${created.status}: ${JSON.stringify(created.data)}${hint}`);
  }
  console.log(`Opened PR #${created.data.number}: ${created.data.html_url}`);
}
