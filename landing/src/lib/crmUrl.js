/**
 * Returns the CRM app URL with a guaranteed protocol prefix.
 *
 * The NEXT_PUBLIC_CRM_URL env-var is sometimes set without a protocol
 * (e.g. "app.ezzysync.com"), which causes <a href> to treat it as a
 * relative path (ezzysync.com/app.ezzysync.com/login → 404).
 *
 * This helper ensures the value always starts with https:// (or
 * http:// when explicitly provided, e.g. during local dev).
 */
export function getCrmUrl() {
  let url = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:5173";
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}
