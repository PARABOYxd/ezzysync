import { NextResponse } from "next/server";
import {
  buildSmartItinerary,
  formatItineraryForWhatsapp,
  parseMarkdownToStructuredItinerary,
} from "@/lib/smartItineraryEngine";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      destination = "",
      days = 4,
      tripType = "Family Vacation",
      agencyName = "",
      email = "",
      phone = "",
      description = "",
      roughNotes = "",
    } = body;

    const commandText = description || roughNotes || "";

    // 1. Check if GEMINI_API_KEY is configured in server env
    const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim();
    let geminiMarkdown = "";

    if (geminiApiKey) {
      try {
        const prompt = `AI ITINERARY GENERATOR — SYSTEM PROMPT
You are an expert travel itinerary planner for India and worldwide.
Your job is to convert a user's natural-language travel request into a realistic, geographically logical, time-feasible itinerary.

USER REQUEST:
- Main Destination: ${destination}
- Duration: ${days} Days / ${Math.max(1, Number(days) - 1)} Nights
- Trip Style: ${tripType}
- Agency Branding: ${agencyName || "EzzySync Partner Agency"}
- User Command / Specifics: ${commandText}

GEOGRAPHIC & REALISTIC RULES:
1. No impossible flights for destinations without airports (e.g. Harsil, Chopta, Rishikesh, Kasol, Manali). Use realistic road/rail combinations.
2. For trekking destinations, identify the actual base village / trailhead (e.g. Khireshwar for Aadrai Jungle Trek; Chopta for Tungnath & Chandrashila; Sari for Deoria Tal; Gangotri / Lanka for Gartang Gali). Distinguish driving from trekking.
3. Realistic daily time management: accounting for wake-up, driving, meals, rest, and check-in.
4. Extract practical package inclusions (stays, meals, private vehicle, permits, guide) and exclusions.

Format the response cleanly in markdown with:
# ${destination} ${days}D/${Math.max(1, Number(days) - 1)}N Tour Itinerary ✈️
**Duration:** ${days} Days | **Prepared By:** ${agencyName || "EzzySync Partner Agency"}

---

## Day 1: [Day Title with Route]
- **Morning:** [Details]
- **Afternoon:** [Details]
- **Evening:** [Details]
- **Stay:** [Stay details]

---

## 🎒 Package Inclusions
- [Item 1]
- [Item 2]

## ❌ Package Exclusions
- [Item 1]
- [Item 2]

## 💡 Travel Specialist Tips for ${destination}
- [Tip 1]
- [Tip 2]`;

        const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
        for (const model of models) {
          try {
            const apiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { maxOutputTokens: 2500, temperature: 0.7 },
                }),
              }
            );
            if (apiRes.ok) {
              const resData = await apiRes.json();
              const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text && text.trim().length > 50) {
                geminiMarkdown = text;
                break;
              }
            }
          } catch (mErr) {
            // Try next model
          }
        }
      } catch (err) {
        console.warn("[api/generate-itinerary] Gemini call warning:", err.message);
      }
    }

    // 2. If Gemini returned valid markdown, parse it to structured format
    let structured = null;
    if (geminiMarkdown && geminiMarkdown.trim().length > 50) {
      structured = parseMarkdownToStructuredItinerary(geminiMarkdown, {
        destination,
        days,
        tripType,
        agencyName,
        phone,
        email,
      });
    }

    // 3. If Gemini is not configured or offline, execute smart realistic engine
    if (!structured) {
      structured = buildSmartItinerary({
        destination,
        days,
        tripType,
        agencyName,
        phone,
        email,
        roughNotes: commandText,
      });
    }

    return NextResponse.json({
      success: true,
      itinerary: geminiMarkdown || "",
      structured,
    });
  } catch (err) {
    console.error("[api/generate-itinerary] Internal error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to generate itinerary." },
      { status: 500 }
    );
  }
}
