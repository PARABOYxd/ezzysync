/**
 * Client-side API helpers for the landing site. The CRM backend is the only
 * upstream, reached over its public (unauthenticated) endpoints.
 */

/** NEXT_PUBLIC_API_URL is sometimes configured as a bare host, which would
 * otherwise produce a relative URL in production. */
export function getApiBaseUrl() {
  let rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!rawApiUrl) {
    if (typeof window !== "undefined" && window.location.hostname.includes("ezzysync.com")) {
      return "https://ezzysync-production.up.railway.app";
    }
    rawApiUrl = process.env.NODE_ENV === "production"
      ? "https://ezzysync-production.up.railway.app"
      : "http://localhost:5000";
  }
  if (rawApiUrl && !rawApiUrl.startsWith("http://") && !rawApiUrl.startsWith("https://")) {
    rawApiUrl = `https://${rawApiUrl}`;
  }
  return rawApiUrl.replace(/\/$/, "");
}

/** Submits a demo/walkthrough request. Throws with the server's message on a
 * non-2xx response so the caller can surface it directly. */
export async function submitWalkthroughRequest({ name, agencyName, email, phone }) {
  const payload = { name, agencyName, email, phone };
  const post = (url) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  // 1. Our own Next.js route first (same origin: no CORS or mixed-content trouble).
  try {
    const internalRes = await post("/api/walkthrough");
    if (internalRes.ok) {
      return await internalRes.json().catch(() => ({ success: true }));
    }
    // The server answered with a reason (e.g. invalid email): show it, do not retry elsewhere.
    const errData = await internalRes.json().catch(() => ({}));
    if (errData?.message) throw Object.assign(new Error(errData.message), { fromServer: true });
  } catch (internalErr) {
    if (internalErr.fromServer) throw internalErr;
    // A network failure (the browser words it differently in Chrome, Safari and
    // Firefox) falls through to the direct backend call below.
  }

  // 2. Direct backend fallback
  let response;
  try {
    response = await post(`${getApiBaseUrl()}/api/public/walkthrough`);
  } catch {
    throw new Error("Unable to reach the server. Please check your connection or try again.");
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Failed to submit request.");
  }

  return await response.json().catch(() => ({ success: true }));
}

/** Generates a free day-wise travel itinerary using the internal API or CRM endpoint. */
export async function generateFreeItinerary({ destination, days, tripType, agencyName, email, phone, name, description, roughNotes }) {
  const payload = {
    destination,
    days,
    tripType,
    agencyName,
    email,
    phone,
    name,
    description: description || roughNotes || "",
  };

  // Try internal Next.js server route first (avoids CORS and external port issues)
  try {
    const internalRes = await fetch("/api/generate-itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (internalRes.ok) {
      return await internalRes.json();
    }
  } catch (e) {
    // Continue to backend fallback
  }

  // Fallback to backend API if internal route fails
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/public/generate-free-itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Silently continue to client-side smart engine
  }

  return null;
}

