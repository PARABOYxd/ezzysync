/**
 * Landing page screenshot audit — task 3e
 * Captures the homepage at 4 viewports, saves PNGs, then reports
 * any obvious layout issues found via page.evaluate.
 *
 * Run:
 *   node scripts/screenshot-audit.mjs
 * (from leadCRM-main root, with `next dev` or `next start` running on port 3000)
 */

import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "screenshot-audit");
const BASE_URL = "http://localhost:3000";

const VIEWPORTS = [
  { name: "mobile-390",  width: 390,  height: 844  },
  { name: "tablet-768",  width: 768,  height: 1024 },
  { name: "laptop-1024", width: 1024, height: 768  },
  { name: "desktop-1440",width: 1440, height: 900  },
];

async function auditPage(page, viewportName) {
  const issues = [];

  // 1. Check for horizontal overflow (no scroll at any width)
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  if (scrollWidth > clientWidth + 2) {
    issues.push(`❌ HORIZONTAL SCROLL: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`);
  } else {
    issues.push(`✅ No horizontal scroll (scrollWidth=${scrollWidth})`);
  }

  // 2. Check for text overflow — elements wider than viewport
  const overflowing = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const bad = [];
    document.querySelectorAll("*").forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 2) {
        const cls = Array.from(el.classList).slice(0,3).join(".");
        bad.push(`${el.tagName}${cls ? "."+cls : ""} right=${Math.round(r.right)}`);
      }
    });
    return bad.slice(0, 5); // top 5 offenders
  });
  if (overflowing.length > 0) {
    issues.push(`⚠️  Overflowing elements: ${overflowing.join(" | ")}`);
  } else {
    issues.push(`✅ No overflowing elements`);
  }

  // 3. Check heading count (should be exactly 1 h1)
  const h1Count = await page.evaluate(() => document.querySelectorAll("h1").length);
  if (h1Count === 1) {
    issues.push(`✅ Exactly 1 <h1>`);
  } else {
    issues.push(`❌ <h1> count: ${h1Count} (expected 1)`);
  }

  // 4. Check tap targets < 44px on mobile
  if (parseInt(viewportName) <= 768) {
    const smallTargets = await page.evaluate(() => {
      const els = [...document.querySelectorAll("a, button")];
      return els.filter(el => {
        const r = el.getBoundingClientRect();
        return (r.width > 0 || r.height > 0) && (r.height < 44 || r.width < 44);
      }).map(el => {
        const r = el.getBoundingClientRect();
        return `${el.tagName} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0,20)}" ${Math.round(r.width)}×${Math.round(r.height)}`;
      }).slice(0, 5);
    });
    if (smallTargets.length > 0) {
      issues.push(`⚠️  Small tap targets (<44px): ${smallTargets.join(" | ")}`);
    } else {
      issues.push(`✅ All tap targets ≥44px`);
    }
  }

  // 5. Check images missing alt text
  const missingAlts = await page.evaluate(() => {
    return [...document.querySelectorAll("img")].filter(img => !img.alt || img.alt.trim() === "").map(img => img.src.split("/").pop()).slice(0, 5);
  });
  if (missingAlts.length > 0) {
    issues.push(`⚠️  Images missing alt: ${missingAlts.join(", ")}`);
  } else {
    issues.push(`✅ All images have alt text`);
  }

  return issues;
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const allResults = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n📸  ${vp.name} (${vp.width}×${vp.height})`);
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    try {
      await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
      // Wait for section nav and animations to settle
      await page.waitForTimeout(1500);

      // Full-page screenshot
      const screenshotPath = join(OUT_DIR, `${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   Saved: ${screenshotPath}`);

      // Audit
      const issues = await auditPage(page, vp.name);
      issues.forEach(i => console.log(`   ${i}`));
      allResults.push({ viewport: vp.name, issues });
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      allResults.push({ viewport: vp.name, issues: [`❌ Error: ${err.message}`] });
    }

    await page.close();
  }

  await browser.close();

  console.log("\n\n══════════════════════════════════════");
  console.log("  AUDIT SUMMARY");
  console.log("══════════════════════════════════════");
  allResults.forEach(({ viewport, issues }) => {
    const errors = issues.filter(i => i.startsWith("❌"));
    const warnings = issues.filter(i => i.startsWith("⚠️"));
    const status = errors.length > 0 ? "❌ FAIL" : warnings.length > 0 ? "⚠️  WARN" : "✅ PASS";
    console.log(`\n${status}  ${viewport}`);
    issues.forEach(i => console.log(`  ${i}`));
  });

  console.log(`\nScreenshots saved to: ${OUT_DIR}`);
}

run().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
