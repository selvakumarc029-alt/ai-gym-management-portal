const http = require("http");
const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const separator = trimmed.indexOf("=");
      if (separator === -1) return;

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    });
}

loadEnvFile();

const port = Number(process.env.GEMINI_PORT || 8788);
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    ...corsHeaders,
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function buildPrompt({ question, member, dashboard }) {
  return [
    `Member: ${member?.name || "Member"}`,
    `Plan: ${member?.plan || "Unknown"}`,
    `Progress: ${member?.progress ?? "Unknown"}%`,
    `Attendance streak: ${member?.attendance ?? "Unknown"}`,
    `Trainer: ${dashboard?.trainer || "Unassigned"}`,
    `Pending workout: ${dashboard?.nextWorkout || "None"}`,
    "",
    `Question: ${question}`
  ].join("\n");
}

function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("").trim();
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, {
      ok: Boolean(apiKey),
      model,
      message: apiKey ? "Gemini proxy connected" : "GEMINI_API_KEY is not set"
    });
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/fitness-assistant") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  if (!apiKey) {
    sendJson(response, 500, { error: "GEMINI_API_KEY is not set" });
    return;
  }

  try {
    const body = await readBody(request);
    const prompt = buildPrompt(body);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: [
              "You are AI Gym's premium bodybuilding assistant for a gym member dashboard.",
              "Answer all fitness, workout, nutrition, weight management, recovery, and general health questions clearly.",
              "Give practical, concise, personalized guidance using the member data.",
              "Do not diagnose disease or replace a doctor, physiotherapist, or registered dietitian.",
              "For pain, injury, illness, chest symptoms, fainting, or medical conditions, advise stopping training and consulting a qualified professional."
            ].join(" ")
          }]
        },
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 260
        }
      })
    });

    const payload = await geminiResponse.json();

    if (!geminiResponse.ok) {
      sendJson(response, geminiResponse.status, {
        error: payload.error?.message || "Gemini request failed"
      });
      return;
    }

    sendJson(response, 200, {
      answer: extractText(payload) || "Gemini could not generate a clear answer. Please ask again."
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Gemini proxy error" });
  }
});

server.listen(port, () => {
  console.log(`AI Gym Gemini proxy running at http://localhost:${port}`);
  console.log(apiKey ? `Gemini model: ${model}` : "Missing GEMINI_API_KEY. Run setup-gemini-key.bat first.");
});
