import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rateLimit";

function getBackendUrl() {
  const envUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    let url = envUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    return url.replace(/\/$/, "");
  }
  // Production default on Railway
  if (process.env.NODE_ENV === "production") {
    return "https://ezzysync-production.up.railway.app";
  }
  return "http://localhost:5000";
}

const clip = (v, max) => String(v ?? "").trim().slice(0, max);

export async function POST(req) {
  try {
    const limited = rateLimit(`walkthrough:${clientIp(req)}`, { limit: 8, windowMs: 10 * 60 * 1000 });
    if (!limited.ok) {
      return NextResponse.json(
        { message: "Too many requests. Please try again in a few minutes." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    let raw;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid request." }, { status: 400 });
    }
    // Forward only the four fields the form has, bounded, never the raw body.
    const body = {
      name: clip(raw?.name, 100),
      agencyName: clip(raw?.agencyName, 150),
      email: clip(raw?.email, 150),
      phone: clip(raw?.phone, 30),
    };
    if (!body.name || !body.agencyName || !body.email) {
      return NextResponse.json({ message: "Name, agency name and email are required." }, { status: 400 });
    }
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/public/walkthrough`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to submit request" },
        { status: response.status || 400 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[api/walkthrough] Error proxying to backend:", error);
    return NextResponse.json(
      { message: "Unable to reach the server. Please try again shortly." },
      { status: 500 }
    );
  }
}
