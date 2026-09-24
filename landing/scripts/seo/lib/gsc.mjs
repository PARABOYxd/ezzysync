import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { daysAgo } from "./files.mjs";

/** Search Console access through a service account. No dependencies. */

export const GSC_SITE = process.env.GSC_SITE_URL || "https://www.ezzysync.com/";
export const hasGsc = () => Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON || process.env.GSC_SERVICE_ACCOUNT_FILE);

async function loadKey() {
  if (process.env.GSC_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON);
  return JSON.parse(await readFile(process.env.GSC_SERVICE_ACCOUNT_FILE, "utf8"));
}

let token;
async function getToken() {
  if (token) return token;
  const key = await loadKey();
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Google auth failed: ${body.error_description || body.error}`);
  return (token = body.access_token);
}

// Data lags 2-3 days; ending 3 days ago avoids half-filled days.
export const CURRENT = { startDate: daysAgo(30), endDate: daysAgo(3) };
export const PREVIOUS = { startDate: daysAgo(58), endDate: daysAgo(31) };

export async function gscQuery(range, dimensions, filters) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...range,
      dimensions,
      rowLimit: 25000,
      dataState: "final",
      ...(filters && { dimensionFilterGroups: [{ filters }] }),
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    const hint = res.status === 403 ? " (add the service account email as a user on the Search Console property)" : "";
    throw new Error(`Search Console ${res.status}: ${body.error?.message}${hint}`);
  }
  return body.rows || [];
}

export const toPath = (url) => new URL(url).pathname.replace(/\/$/, "") || "/";
