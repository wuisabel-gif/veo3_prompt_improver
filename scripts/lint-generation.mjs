// Live check: generate a few briefs through Gemini and lint them for banned
// vague words. Needs CREATIVE_API_KEY in .env, so it is NOT part of `npm test`.
// Run: npm run check:output
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPromptPayload, lintBrief } from "../core/director.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

const API_KEY = process.env.CREATIVE_API_KEY;
const MODEL = process.env.CREATIVE_MODEL || "gemini-2.5-flash";

if (!API_KEY) {
  console.log("Skipping live output lint — CREATIVE_API_KEY not set in .env.");
  process.exit(0);
}

const SAMPLES = [
  { idea: "a lone dancer in an abandoned neon subway at 3am", visualModel: "K-Street", outputType: "🎤 Music Video" },
  { idea: "a model on a quiet rooftop at golden hour", visualModel: "Architectural Muse" },
  { idea: "a cozy rainy morning by the window", visualModel: "Seoul Morning" },
];

async function generate({ systemPrompt, userContent }) {
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`);
  url.searchParams.set("key", API_KEY);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userContent }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gemini returned ${res.status}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

let failures = 0;
for (const sample of SAMPLES) {
  const text = await generate(buildPromptPayload(sample));
  const hits = lintBrief(text);
  if (hits.length) {
    failures++;
    console.log(`  ✗ [${sample.visualModel}] "${sample.idea}" → banned: ${[...new Set(hits)].join(", ")}`);
  } else {
    console.log(`  ✓ [${sample.visualModel}] "${sample.idea}" → clean`);
  }
}

console.log(failures ? `\n${failures} generation(s) contained banned words.` : "\nAll generations clean.");
process.exit(failures ? 1 : 0);
