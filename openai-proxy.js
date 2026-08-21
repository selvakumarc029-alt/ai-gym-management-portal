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

const port = Number(process.env.PORT || 8787);
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    "You are AI Gym's premium bodybuilding assistant for a gym member dashboard.",
    "Answer fitness, exercise, nutrition, recovery, general health, and gym-plan questions clearly.",
    "Keep answers practical, concise, motivating, and safe.",
    "Do not diagnose disease or replace a doctor, physiotherapist, or registered dietitian.",
    "For pain, injury, illness, chest symptoms, fainting, or medical conditions, advise stopping training and consulting a qualified professional.",
    "",
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
  if (typeof payload.output_text === "string") return payload.output_text;

  const output = Array.isArray(payload.output) ? payload.output : [];
  return output
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
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
      message: apiKey ? "OpenAI proxy connected" : "OPENAI_API_KEY is not set"
    });
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/fitness-assistant") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  if (!apiKey) {
    sendJson(response, 500, { error: "OPENAI_API_KEY is not set" });
    return;
  }

  try {
    const body = await readBody(request);
    const prompt = buildPrompt(body);

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: 260
      })
    });

    const payload = await openaiResponse.json();

    if (!openaiResponse.ok) {
      sendJson(response, openaiResponse.status, {
        error: payload.error?.message || "OpenAI request failed"
      });
      return;
    }

    sendJson(response, 200, {
      answer: extractText(payload) || "I could not generate a clear answer. Please ask again."
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Proxy error" });
  }
});

server.listen(port, () => {
  console.log(`AI Gym OpenAI proxy running at http://localhost:${port}`);
  console.log(apiKey ? `OpenAI model: ${model}` : "Missing OPENAI_API_KEY. Run setup-openai-key.bat first.");
});
