import { NextResponse } from "next/server";

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

export async function POST(req) {
  try {
    const body = await req.json();
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
