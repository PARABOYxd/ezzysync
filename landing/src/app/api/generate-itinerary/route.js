import { NextResponse } from "next/server";
import {
  buildSmartItinerary,
  formatItineraryForWhatsapp,
  parseMarkdownToStructuredItinerary,
} from "@/lib/smartItineraryEngine";
import {
  fetchRouteData,
  fetchWeatherData,
  fetchTrekDetails,
} from "@/lib/realtimeTravel";

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

    // 1. Extract origin & vehicle from user command
    const lowerCmd = commandText.toLowerCase();
    let origin = "Delhi";
    if (lowerCmd.includes("mumbai")) origin = "Mumbai";
    else if (lowerCmd.includes("pune")) origin = "Pune";
    else if (lowerCmd.includes("bangalore")) origin = "Bangalore";
    else if (lowerCmd.includes("hyderabad")) origin = "Hyderabad";
    else if (lowerCmd.includes("chandigarh")) origin = "Chandigarh";
    else if (lowerCmd.includes("dehradun")) origin = "Dehradun";

    let vehicle = "AC Tourist Vehicle";
    if (lowerCmd.includes("tempo traveller") || lowerCmd.includes("traveller")) vehicle = "AC Tempo Traveller";
    else if (lowerCmd.includes("innova") || lowerCmd.includes("suv")) vehicle = "AC Innova Crysta / SUV";
    else if (lowerCmd.includes("volvo") || lowerCmd.includes("bus")) vehicle = "AC Volvo Bus";

    // 2. Fetch live telemetry (Routing, Weather, Trek Trailhead) in parallel
    const [routeData, weatherData, trekData] = await Promise.all([
      fetchRouteData(origin, destination, vehicle),
      fetchWeatherData(destination),
      Promise.resolve(fetchTrekDetails(destination)),
    ]);

    let realContext = `\n--- LIVE TRAVEL TELEMETRY ---
• Routing (Maps/OSRM): ${routeData.origin} to ${routeData.destination} | Distance: ${routeData.distanceKm} km | Drive Time: ~${routeData.durationHours} hrs | Vehicle: ${routeData.vehicle} | Route: ${routeData.routeSummary}
• Live Weather: Current ${weatherData.temperature} | Rain Chance: ${weatherData.rainChance} | Advisory: ${weatherData.advisory}`;

    if (trekData) {
      realContext += `\n• Trek Intelligence: ${trekData.name} | Base Village: ${trekData.baseVillage} | Trail: ${trekData.trailLengthKm} km one-way | Difficulty: ${trekData.difficulty} | Permits: ${trekData.permits} | Highlights: ${trekData.highlights.join(", ")}`;
    }

    const prompt = `AI ITINERARY GENERATOR — SYSTEM PROMPT
You are an expert travel logistics specialist for India and worldwide.
Convert this travel request into a realistic, geographically sequential day-by-day itinerary using the live travel telemetry provided.

USER REQUEST:
- Main Destination: ${destination}
- Duration: ${days} Days / ${Math.max(1, Number(days) - 1)} Nights
- Trip Style: ${tripType}
- Agency Branding: ${agencyName || "EzzySync Partner Agency"}
- User Specifics / Command: ${commandText}
${realContext}

CRITICAL RULES:
1. Incorporate the exact road distance (${routeData.distanceKm} km), driving time (~${routeData.durationHours} hrs), and assigned vehicle (${routeData.vehicle}).
2. If overnight travel was requested, Day 1 must explicitly state overnight journey from ${routeData.origin} and early morning arrival.
3. If this is a trek, start from the actual base village (${trekData?.baseVillage || "trailhead"}), distinguish road transit from the mountain trek, and specify trail safety.
4. On the final day (${days}), feature check-out, souvenir shopping, and return journey back to ${routeData.origin}.
5. Extract realistic package inclusions and exclusions.

Format strictly in clean markdown:
# ${destination} ${days}D/${Math.max(1, Number(days) - 1)}N Tour Itinerary ✈️
**Duration:** ${days} Days | **Prepared By:** ${agencyName || "EzzySync Partner Agency"}

---

## Day 1: [Day Title with Route]
- **Morning:** [Details]
- **Afternoon:** [Details]
- **Evening:** [Details]
- **Stay:** [Stay details]

(Continue for all ${days} days with realistic timings)

---

## 🎒 Package Inclusions
- [Item 1]
- [Item 2]

## ❌ Package Exclusions
- [Item 1]
- [Item 2]

## 💡 Travel Specialist Tips for ${destination}
- [Live weather note, route tip, trek gear advisory]`;

    let generatedMarkdown = "";

    // 3. Check OpenAI API Key first if present
    const openaiApiKey = (process.env.OPENAI_API_KEY || "").trim();
    if (openaiApiKey) {
      try {
        const oRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are an elite, realistic travel planning assistant." },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 2800,
          }),
        });
        if (oRes.ok) {
          const oData = await oRes.json();
          const text = oData?.choices?.[0]?.message?.content;
          if (text && text.trim().length > 50) {
            generatedMarkdown = text;
          }
        }
      } catch (oErr) {
        console.warn("[api/generate-itinerary] OpenAI call warning:", oErr.message);
      }
    }

    // 4. Check Gemini API Key if OpenAI was not used or failed
    const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!generatedMarkdown && geminiApiKey) {
      const models = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-pro-latest", "gemini-2.0-flash", "gemini-1.5-flash"];
      for (const model of models) {
        try {
          const apiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 2800, temperature: 0.7 },
              }),
            }
          );
          if (apiRes.ok) {
            const resData = await apiRes.json();
            const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim().length > 50) {
              generatedMarkdown = text;
              break;
            }
          }
        } catch (mErr) {
          // Try next model
        }
      }
    }

    // 5. If AI returned valid markdown, parse it to structured format
    let structured = null;
    if (generatedMarkdown && generatedMarkdown.trim().length > 50) {
      structured = parseMarkdownToStructuredItinerary(generatedMarkdown, {
        destination,
        days,
        tripType,
        agencyName,
        phone,
        email,
      });
    }

    // 6. If AI is not configured or offline, execute smart realistic engine
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
      itinerary: generatedMarkdown || "",
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
