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

const port = Number(process.env.GROQ_PORT || 8788);
const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

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

const systemPrompt = [
  "You are AI Gym's premium bodybuilding assistant for a gym member dashboard.",
  "Answer fitness, workout, nutrition, weight management, recovery, and general health questions clearly.",
  "Give practical, concise, personalized guidance using the member data.",
  "Do not diagnose disease or replace a doctor, physiotherapist, or registered dietitian.",
  "For pain, injury, illness, chest symptoms, fainting, or medical conditions, advise stopping training and consulting a qualified professional."
].join(" ");

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
      message: apiKey ? "Groq proxy connected" : "GROQ_API_KEY is not set"
    });
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/fitness-assistant") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  if (!apiKey) {
    sendJson(response, 500, { error: "GROQ_API_KEY is not set" });
    return;
  }

  try {
    const body = await readBody(request);

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildPrompt(body) }
        ],
        temperature: 0.65,
        max_tokens: 260
      })
    });

    const payload = await groqResponse.json();

    if (!groqResponse.ok) {
      sendJson(response, groqResponse.status, {
        error: payload.error?.message || "Groq request failed"
      });
      return;
    }

    sendJson(response, 200, {
      answer: payload.choices?.[0]?.message?.content?.trim() || "Groq could not generate a clear answer. Please ask again."
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Groq proxy error" });
  }
});

server.listen(port, () => {
  console.log(`AI Gym Groq proxy running at http://localhost:${port}`);
  console.log(apiKey ? `Groq model: ${model}` : "Missing GROQ_API_KEY. Run setup-groq-key.bat first.");
});
