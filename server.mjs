import http from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPromptPayload,
  VISUAL_MODELS,
  DIALOGUE_OPTIONS,
  MUSIC_OPTIONS,
  OUTPUT_TYPE_OPTIONS,
  ASPECT_RATIOS,
  DURATIONS,
  SAFETY_BLOCK_REASONS,
} from './core/director.mjs';

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

// CORS allowlist: comma-separated origins in ALLOWED_ORIGINS. Localhost and the
// file:// "null" origin are always permitted so local dev keeps working.
const CONFIGURED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const ALWAYS_ALLOWED = [/^https?:\/\/localhost(:\d+)?$/, /^https?:\/\/127\.0\.0\.1(:\d+)?$/];

// Simple in-memory rate limiter (per IP) so an exposed proxy can't be drained.
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 30);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const rateBuckets = new Map();

// Evict expired buckets so the map doesn't grow unbounded over long uptime.
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

function originHost(origin) {
  try { return new URL(origin).host; } catch { return null; }
}

function isOriginAllowed(origin, host) {
  if (!origin || origin === 'null') return true; // file:// / same-origin server render
  if (host && originHost(origin) === host) return true; // same-origin (e.g. the deployed site)
  if (origin.startsWith('chrome-extension://')) return true; // browser-extension clients
  if (CONFIGURED_ORIGINS.includes(origin)) return true;
  return ALWAYS_ALLOWED.some(re => re.test(origin));
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  const allowOrigin = isOriginAllowed(origin, req.headers.host) && origin ? origin : (CONFIGURED_ORIGINS[0] || '*');
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT_MAX;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
  res.end(body);
}

function sendText(res, status, body, contentType = 'text/plain; charset=utf-8', extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': contentType, ...extraHeaders });
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

function ensureConfigured() {
  if (!API_KEY) throw Object.assign(new Error('CREATIVE_API_KEY is missing from .env'), { status: 500 });
  if (!MODEL) throw Object.assign(new Error('CREATIVE_MODEL is missing from .env'), { status: 500 });
}

function geminiUrl(method) {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:${method}`
  );
  url.searchParams.set('key', API_KEY);
  return url;
}

function geminiRequestBody({ systemPrompt, userContent }) {
  return JSON.stringify({
    contents: [{ parts: [{ text: userContent }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  });
}

function safetyError() {
  return Object.assign(
    new Error('Safety notice: the creative provider blocked this request because it may include sensitive or unsafe content. Please revise the idea and try again.'),
    { status: 422 }
  );
}

// Non-streaming generation (with retry on transient errors).
async function generateOnce({ systemPrompt, userContent }) {
  ensureConfigured();
  const url = geminiUrl('generateContent');
  const requestBody = geminiRequestBody({ systemPrompt, userContent });

  for (let attempt = 1; attempt <= PROVIDER_MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!response.ok) {
      const isTransient = response.status === 429 || response.status === 503;
      if (isTransient && attempt < PROVIDER_MAX_RETRIES) {
        await delay(750 * attempt);
        continue;
      }
      const message = data?.error?.message || `Creative API returned ${response.status}`;
      throw Object.assign(new Error(message), { status: response.status, details: data?.error });
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const finishReason = data.candidates?.[0]?.finishReason;
    const promptBlockReason = data.promptFeedback?.blockReason;

    if (promptBlockReason || SAFETY_BLOCK_REASONS.has(finishReason)) throw safetyError();
    if (!generatedText) throw Object.assign(new Error('Creative API returned an empty response'), { status: 502 });
    return generatedText;
  }

  throw Object.assign(new Error('Creative API did not return a response'), { status: 502 });
}

// Streaming generation: pipes Gemini SSE deltas to the client as SSE.
async function streamGeneration(res, headers, { systemPrompt, userContent }) {
  ensureConfigured();
  const url = geminiUrl('streamGenerateContent');
  url.searchParams.set('alt', 'sse');

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: geminiRequestBody({ systemPrompt, userContent }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    let detail;
    try { detail = JSON.parse(errText)?.error?.message; } catch { /* ignore */ }
    sendJson(res, upstream.status || 502, { error: detail || `Creative API returned ${upstream.status}` }, headers);
    return;
  }

  res.writeHead(200, {
    ...headers,
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const decoder = new TextDecoder();
  let buffer = '';
  let emittedAny = false;

  const emit = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  for await (const chunk of upstream.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const json = trimmed.slice(5).trim();
      if (!json || json === '[DONE]') continue;
      let payload;
      try { payload = JSON.parse(json); } catch { continue; }

      const finishReason = payload.candidates?.[0]?.finishReason;
      const blockReason = payload.promptFeedback?.blockReason;
      if (blockReason || SAFETY_BLOCK_REASONS.has(finishReason)) {
        emit('error', { error: safetyError().message, status: 422 });
        res.end();
        return;
      }
      const delta = payload.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
      if (delta) {
        emittedAny = true;
        emit('delta', { text: delta });
      }
    }
  }

  if (!emittedAny) emit('error', { error: 'Creative API returned an empty response', status: 502 });
  else emit('done', { ok: true });
  res.end();
}

function createAppServer() {
  return http.createServer(async (req, res) => {
    const headers = corsHeaders(req);
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === 'GET' && url.pathname === '/api/health') {
        sendJson(res, 200, { ok: true, model: MODEL, hasCreativeApiKey: Boolean(API_KEY) }, headers);
        return;
      }

      // Exposes the option sets so clients build forms from the same source of truth.
      if (req.method === 'GET' && url.pathname === '/api/options') {
        sendJson(res, 200, {
          visualModels: VISUAL_MODELS,
          dialogueOptions: DIALOGUE_OPTIONS,
          musicOptions: MUSIC_OPTIONS,
          outputTypeOptions: OUTPUT_TYPE_OPTIONS,
          aspectRatios: ASPECT_RATIOS,
          durations: DURATIONS,
        }, headers);
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/improve-prompt') {
        if (!isOriginAllowed(req.headers.origin, req.headers.host)) {
          sendJson(res, 403, { error: 'Origin not allowed.' }, headers);
          return;
        }
        if (!checkRateLimit(req)) {
          sendJson(res, 429, { error: 'Rate limit exceeded. Please slow down and try again shortly.' }, headers);
          return;
        }

        const body = await readJsonBody(req);
        // Prompt is assembled server-side from a constrained payload; the client
        // can no longer inject an arbitrary prompt onto our API key.
        const { systemPrompt, userContent } = buildPromptPayload(body);

        const wantsStream = url.searchParams.get('stream') === '1'
          || (req.headers.accept || '').includes('text/event-stream');

        if (wantsStream) {
          await streamGeneration(res, headers, { systemPrompt, userContent });
        } else {
          const text = await generateOnce({ systemPrompt, userContent });
          sendJson(res, 200, { text }, headers);
        }
        return;
      }

      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        const html = await readFile(path.join(__dirname, 'index.html'), 'utf8');
        sendText(res, 200, html, 'text/html; charset=utf-8', headers);
        return;
      }

      // Serve a small allowlist of root image assets (e.g. the logo). Filename
      // only — no slashes — so there's no path traversal.
      if (req.method === 'GET' && /^\/[\w.-]+\.(png|jpe?g|svg|webp|ico)$/.test(url.pathname)) {
        const name = url.pathname.slice(1);
        const filePath = path.join(__dirname, name);
        if (existsSync(filePath)) {
          const types = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon' };
          const ext = name.split('.').pop().toLowerCase();
          const buf = await readFile(filePath);
          res.writeHead(200, { ...headers, 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
          res.end(buf);
          return;
        }
      }

      sendJson(res, 404, { error: 'Not found' }, headers);
    } catch (error) {
      const status = Number(error.status) || 500;
      if (res.headersSent) {
        res.end();
        return;
      }
      sendJson(res, status, { error: error.message || 'Server error', details: error.details }, headers);
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
    if (CONFIGURED_ORIGINS.length) console.log(`Allowed origins: ${CONFIGURED_ORIGINS.join(', ')}`);
  });
}

listen(PORT);
