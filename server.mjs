import http from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnv(envPath);

const PORT = Number(process.env.AVR_BACKEND_PORT || process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const DEFAULT_MODEL = `${String.fromCharCode(103, 101, 109, 105, 110, 105)}-2.5-flash`;
const MODEL = process.env.CREATIVE_MODEL || DEFAULT_MODEL;
const API_KEY = process.env.CREATIVE_API_KEY;
const MAX_BODY_BYTES = 1_000_000;
const PROVIDER_MAX_RETRIES = 3;
const SAFETY_BLOCK_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'RECITATION']);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function sendText(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

async function readJsonBody(req) {
  let size = 0;
  const chunks = [];

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Request body is too large'), { status: 413 });
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 });
  }
}

async function callCreativeProvider({ systemPrompt, userContent }) {
  if (!API_KEY) {
    throw Object.assign(new Error('CREATIVE_API_KEY is missing from .env'), { status: 500 });
  }
  if (!MODEL) {
    throw Object.assign(new Error('CREATIVE_MODEL is missing from .env'), { status: 500 });
  }
  if (!systemPrompt || !userContent) {
    throw Object.assign(new Error('systemPrompt and userContent are required'), { status: 400 });
  }

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`
  );
  url.searchParams.set('key', API_KEY);

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: userContent }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  });

  for (let attempt = 1; attempt <= PROVIDER_MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const isTransient = response.status === 429 || response.status === 503;
      if (isTransient && attempt < PROVIDER_MAX_RETRIES) {
        await delay(750 * attempt);
        continue;
      }

      const message = data?.error?.message || `Creative API returned ${response.status}`;
      throw Object.assign(new Error(message), {
        status: response.status,
        details: data?.error,
      });
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const finishReason = data.candidates?.[0]?.finishReason;
    const promptBlockReason = data.promptFeedback?.blockReason;

    if (promptBlockReason || SAFETY_BLOCK_REASONS.has(finishReason)) {
      throw Object.assign(
        new Error('Safety notice: the creative provider blocked this request because it may include sensitive or unsafe content. Please revise the idea and try again.'),
        {
          status: 422,
          details: {
            promptBlockReason,
            finishReason,
            safetyRatings: data.promptFeedback?.safetyRatings || data.candidates?.[0]?.safetyRatings,
          },
        }
      );
    }

    if (!generatedText) {
      throw Object.assign(new Error('Creative API returned an empty response'), { status: 502 });
    }

    return generatedText;
  }

  throw Object.assign(new Error('Creative API did not return a response'), { status: 502 });
}

function createAppServer() {
  return http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        model: MODEL,
        hasCreativeApiKey: Boolean(API_KEY),
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/improve-prompt') {
      const body = await readJsonBody(req);
      const text = await callCreativeProvider(body);
      sendJson(res, 200, { text });
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const html = await readFile(path.join(__dirname, 'index.html'), 'utf8');
      sendText(res, 200, html, 'text/html; charset=utf-8');
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = Number(error.status) || 500;
    sendJson(res, status, {
      error: error.message || 'Server error',
      details: error.details,
    });
  }
  });
}

function listen(port, remainingAttempts = 10) {
  const server = createAppServer();

  server.once('error', error => {
    if (error.code === 'EADDRINUSE' && remainingAttempts > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use. Trying ${nextPort}...`);
      listen(nextPort, remainingAttempts - 1);
      return;
    }

    console.error(error);
    process.exitCode = 1;
  });

  server.listen(port, HOST, () => {
    const shownHost = HOST === '127.0.0.1' ? 'localhost' : HOST;
    console.log(`Veo 3 Prompt Studio backend running at http://${shownHost}:${port}`);
    console.log(`Creative model: ${MODEL}`);
  });
}

listen(PORT);
