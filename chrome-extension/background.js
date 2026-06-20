// Service worker: handles "improve" requests. Mirrors server.mjs behavior
// (retry on transient errors, safety-block detection) for the direct-key mode.
importScripts("data.js");

const PROVIDER_MAX_RETRIES = 3;
const DEFAULT_MODEL = "gemini-2.5-flash";

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGeminiDirect({ systemPrompt, userContent, apiKey, model }) {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  );
  url.searchParams.set("key", apiKey);

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: userContent }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  });

  for (let attempt = 1; attempt <= PROVIDER_MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody
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
      const message = data?.error?.message || `Gemini API returned ${response.status}`;
      throw new Error(message);
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const finishReason = data.candidates?.[0]?.finishReason;
    const promptBlockReason = data.promptFeedback?.blockReason;

    if (promptBlockReason || SAFETY_BLOCK_REASONS.has(finishReason)) {
      throw new Error("SAFETY: the creative provider blocked this request because it may include sensitive or unsafe content. Please revise the idea and try again.");
    }

    if (!generatedText) {
      throw new Error("Gemini API returned an empty response");
    }

    return generatedText;
  }

  throw new Error("Gemini API did not return a response");
}

// Proxy mode sends the raw constrained input; the backend builds the prompt
// server-side (matching server.mjs /api/improve-prompt).
async function callBackendProxy({ input, backendUrl }) {
  const base = backendUrl.replace(/\/+$/, "");
  const response = await fetch(`${base}/api/improve-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Backend returned ${response.status}`);
  }
  if (!data.text) {
    throw new Error("Backend returned an empty response");
  }
  return data.text;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "improve") return false;

  (async () => {
    try {
      const { apiKey, creativeModel, backendUrl } = await chrome.storage.local.get([
        "apiKey", "creativeModel", "backendUrl"
      ]);
      const input = msg.input || {};

      let text;
      if (backendUrl && backendUrl.trim()) {
        text = await callBackendProxy({ input, backendUrl: backendUrl.trim() });
      } else if (apiKey && apiKey.trim()) {
        // Direct mode: build the prompt locally from the same core data.
        const { systemPrompt, userContent } = buildPromptPayload({
          roughInput: input.idea,
          visualModel: input.visualModel,
          dialogueMode: input.dialogueMode,
          musicMode: input.musicMode,
          outputType: input.outputType,
          aspectRatio: input.aspectRatio,
          duration: input.duration,
          negativePrompt: input.negativePrompt,
          presetModifier: input.modifier
        });
        text = await callGeminiDirect({
          systemPrompt,
          userContent,
          apiKey: apiKey.trim(),
          model: (creativeModel && creativeModel.trim()) || DEFAULT_MODEL
        });
      } else {
        throw new Error("No Gemini API key or backend URL set. Open the extension options to configure one.");
      }

      sendResponse({ ok: true, text });
    } catch (err) {
      sendResponse({ ok: false, error: err.message || "Generation failed" });
    }
  })();

  return true; // keep the message channel open for the async response
});
