/**
 * JSON-returning LLM call. Uses Gemini (GEMINI_API_KEY) and falls back to
 * OpenAI (OPENAI_API_KEY) - the same two providers the itinerary generator
 * already uses. Tries each model in order until one answers.
 */

const GEMINI_MODELS = [process.env.GEMINI_MODEL, "gemini-pro-latest", "gemini-flash-latest", "gemini-3.6-flash"].filter(Boolean);
const OPENAI_MODELS = [process.env.OPENAI_MODEL, "gpt-4o", "gpt-4o-mini"].filter(Boolean);

export const hasLlm = () => Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(cleaned);
}

async function gemini(model, system, prompt, temperature) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature, responseMimeType: "application/json", maxOutputTokens: 16000 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  return body.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

async function openai(model, system, prompt, temperature) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`openai ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).choices[0].message.content;
}

export async function askJson({ system, prompt, temperature = 0.4 }) {
  const attempts = [
    ...(process.env.GEMINI_API_KEY ? GEMINI_MODELS.map((m) => () => gemini(m, system, prompt, temperature)) : []),
    ...(process.env.OPENAI_API_KEY ? OPENAI_MODELS.map((m) => () => openai(m, system, prompt, temperature)) : []),
  ];
  const errors = [];
  for (const attempt of attempts) {
    try {
      return parseJson(await attempt());
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error(`No model answered: ${errors.join(" | ")}`);
}
