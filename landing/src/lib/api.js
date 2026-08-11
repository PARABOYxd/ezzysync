/**
 * Client-side API helpers for the landing site. The CRM backend is the only
 * upstream, reached over its public (unauthenticated) endpoints.
 */

/** NEXT_PUBLIC_API_URL is sometimes configured as a bare host, which would
 * otherwise produce a relative URL in production. */
export function getApiBaseUrl() {
  let rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  if (rawApiUrl && !rawApiUrl.startsWith("http://") && !rawApiUrl.startsWith("https://")) {
    rawApiUrl = `https://${rawApiUrl}`;
  }
  return rawApiUrl;
}

/** Submits a demo/walkthrough request. Throws with the server's message on a
 * non-2xx response so the caller can surface it directly. The success body is
 * deliberately not parsed - no caller needs it. */
export async function submitWalkthroughRequest({ name, agencyName, email, phone }) {
  const response = await fetch(`${getApiBaseUrl()}/api/public/walkthrough`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, agencyName, email, phone }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Failed to submit request.");
  }
}
