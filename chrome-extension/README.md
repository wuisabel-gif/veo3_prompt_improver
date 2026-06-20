# Veo 3 Prompt Studio — Chrome Extension

A Manifest V3 browser extension that turns rough ideas into structured, ultra-cinematic
**Veo 3** prompts from a toolbar popup. It reuses the exact Creative Director system prompt,
12 visual models, and generation controls from the parent `veo3_prompt_improver` web app.

## How it reaches Gemini

The popup builds the same `systemPrompt` + `userContent` as the web app, then the background
service worker calls Gemini. Two modes (set in the options page):

1. **Direct mode** — you paste your own Gemini API key (stored in `chrome.storage.local`,
   never bundled). The worker calls `generativelanguage.googleapis.com` directly.
2. **Proxy mode** — set a backend URL pointing at your deployed `server.mjs`. The worker
   POSTs to `<url>/api/improve-prompt`, so the key stays server-side. Proxy takes priority
   when both are set. (`server.mjs` already sends `Access-Control-Allow-Origin: *`.)

## Install (unpacked, for development)

1. Open `chrome://extensions`.
2. Toggle **Developer mode** (top right).
3. Click **Load unpacked** and select this `chrome-extension/` folder.
4. Click the extension's icon → the ⚙ button (or right-click → Options) and add your Gemini
   API key or backend URL, then **Save**.

## Use

1. Click the toolbar icon.
2. Type a rough idea, pick a visual model + dialogue / music / output, optionally add a modifier.
3. **Unlock your creative potential** → the structured brief appears with a **Copy** button.

Your last form inputs are remembered between sessions.

## Files

- `manifest.json` — MV3 manifest (popup, options, background worker, Gemini host permission).
- `popup.html` / `popup.css` / `popup.js` — the prompt-builder UI.
- `options.html` / `options.js` — API key / model / backend settings.
- `background.js` — service worker; calls Gemini (with retry + safety handling) or the proxy.
- `data.js` — shared visual models, controls, few-shot references, and the prompt builder
  (ported from `index.html`).
- `icons/` — toolbar icons.

## Notes

- Direct mode exposes the API key to your own browser only, but anyone with access to your
  profile could read it from `chrome.storage`. For a shared/published build, prefer proxy mode.
- This is not packaged for the Chrome Web Store; publishing requires a developer account and a
  zipped build. Ask if you want a store-ready zip + listing copy.
