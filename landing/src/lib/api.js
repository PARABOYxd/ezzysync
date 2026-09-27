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

  // 1. Try internal Next.js server route first (same origin, avoids CORS and Mixed Content issues)
  try {
    const internalRes = await fetch("/api/walkthrough", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (internalRes.ok) {
      return await internalRes.json().catch(() => ({ success: true }));
    }

    // If server returned a 4xx/5xx with a specific error message, parse and throw it
    const errData = await internalRes.json().catch(() => ({}));
    if (errData?.message) {
      throw new Error(errData.message);
    }
  } catch (internalErr) {
    // If it threw with a valid backend validation message (e.g. invalid email), rethrow it
    if (internalErr.message && internalErr.message !== "Failed to fetch") {
      throw internalErr;
    }
    // Otherwise proceed to direct backend fallback
  }

  // 2. Direct backend fallback
  const response = await fetch(`${getApiBaseUrl()}/api/public/walkthrough`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

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

