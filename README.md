<p align="center"><img src="logo.svg" alt="Real" width="110"></p>

# Real — Veo 3 Fashion Film Prompt Studio

> **Make it real.**

[![CI](https://github.com/wuisabel-gif/veo3_prompt_improver/actions/workflows/ci.yml/badge.svg)](https://github.com/wuisabel-gif/veo3_prompt_improver/actions/workflows/ci.yml)
![license MIT](https://img.shields.io/badge/license-MIT-blue)
![dependencies 0](https://img.shields.io/badge/dependencies-0-brightgreen)
![Veo 3](https://img.shields.io/badge/Veo%203-prompt%20studio-d4a0ff)
![powered by Gemini](https://img.shields.io/badge/powered%20by-Gemini-4285F4?logo=google&logoColor=white)

**Ready to use in:**

[![Web App](https://img.shields.io/badge/Web_App-live-06b6d4)](https://veo3-prompt-improver.onrender.com)
[![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-extension-4285F4?logo=google&logoColor=white)](gemini-extension)
[![Chrome](https://img.shields.io/badge/Chrome-extension-4285F4?logo=googlechrome&logoColor=white)](chrome-extension)
[![MCP](https://img.shields.io/badge/MCP-server-8A63D2)](mcp-server)
[![Claude](https://img.shields.io/badge/Claude-skill-D97757?logo=anthropic&logoColor=white)](claude-skill)

A Veo 3 prompt studio built for **fashion film** first — editorials, runway, beauty, and luxury campaigns — and ready for short films, music videos, and visualizers too. The system combines prompt retrieval, curated aesthetic models, generation controls, and visual prompt engineering to improve controllability and consistency in AI-generated video.

Currently available as a public prototype with potential future commercialization.

Over the past year, I have spent a significant amount of time experimenting with Veo 3 and other AI video-generation models while creating fashion films, editorials, and runway concepts for my [**Bella PI** YouTube channel](https://www.youtube.com/@BellaPi314).

▶️ **Watch the videos:** [youtube.com/@BellaPi314](https://www.youtube.com/@BellaPi314) · For more examples, visit my [website](https://wuisabel-gif.github.io/Bella_PI/index.html).

📖 **The story:** how a math-and-physics study channel became an AI fashion-film studio — [read the background →](BACKGROUND.md)

Through hundreds of prompt iterations, I began documenting recurring patterns that consistently produced stronger visual results. This project is an attempt to organize those observations into a reusable prompt-engineering framework that helps transform rough ideas into structured cinematic briefs.

The platform combines prompt retrieval, visual metadata modeling, aesthetic classification, and structured prompt assembly to generate more coherent Veo 3 prompts — fashion editorials, luxury campaigns, runway films, and beauty close-ups first, with the same engine supporting short films, music videos, and visualizers.

**Project Status:** Active Prototype (Potential Future Product)

[**Try the prototype**](https://veo3-prompt-improver.onrender.com)

**Topics:** `veo3` · `fashion-film` · `fashion-video` · `ai-fashion` · `fashion-editorial` · `runway` · `veo3-prompt-generator` · `cinematic-prompt-engineering` · `google-veo` · `gemini` · `text-to-video`

## Why AI Video Generation?

Generative AI is rapidly changing how visual content is created across advertising, entertainment, fashion, social media, and digital marketing. Companies increasingly use AI-generated video to prototype campaigns, explore creative concepts, build promotional content, and accelerate production workflows.

As video-generation models become more capable, the challenge is no longer simply generating content. It is directing the model toward a specific visual outcome.

This project explores how structured prompt engineering, visual metadata, and reusable aesthetic models can improve controllability and consistency in AI-generated video. By organizing successful visual patterns into reusable frameworks, the platform helps creators communicate visual intent more effectively and produce stronger cinematic results.

## What It Does

- Rewrites rough visual ideas into structured Veo 3 prompts.
- Uses visual models such as Runway Couture, Beauty Editorial, Minimalist Atmosphere, Cinematic Storytelling, Architectural Muse, and more.
- Adds Studio Space generation controls for dialogue mode, music context, and output type.
- Retrieves curated prompt examples from the internal prompt library.
- Assembles prompts into a repeatable visual-director brief format.
- Plays rotating demo videos from hosted Cloudinary assets.
- Supports local development with a private `.env` API key.
- Supports deployment with a Render backend so the Gemini key stays private.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, React, Babel, Tailwind CDN, Lucide-style icon usage, inline SVG brand icons.
- **Backend:** Node.js with the built-in `http` module.
- **AI Provider:** Google Gemini API through a backend proxy.
- **Deployment:** GitHub repository connected to Render Web Service for the backend.
- **Media Hosting:** Cloudinary for hosted demo videos.
- **Local Configuration:** `.env` and `.env.example`.

The web app lives in `index.html`; the backend proxy lives in `server.mjs`. The prompt-engineering
logic is centralized in `core/` and reused by every surface (web app, MCP server, browser
extension), so there is one source of truth.

## Surfaces

The same Veo 3 director engine ships in several forms:

- **Web app** — `index.html` + `server.mjs` (streaming output, Veo 3 controls).
- **MCP server** — `mcp-server/`, usable in Claude Desktop, Claude Code, Cursor, etc.
- **Gemini CLI extension** — `gemini-extension/` (`/veo3:improve`, `/veo3:models`).
- **Chrome extension** — `chrome-extension/` (toolbar popup; generated from `core/`).
- **Claude skill** — `claude-skill/veo3-director/`.

## Architecture & security notes

- The backend builds the Gemini prompt **server-side** from a constrained `{idea, model, controls}`
  payload (`core/`), so the proxy can't be abused as an open relay for arbitrary prompts.
- CORS is locked to `ALLOWED_ORIGINS` (localhost always allowed) and the prompt endpoint is
  per-IP rate limited (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`).
- Output streams over Server-Sent Events for progressive rendering.
- Veo 3-native controls: aspect ratio, clip duration, and a negative prompt.

## Project Files

- `index.html` - Main single-page Studio Space app.
- `server.mjs` - Node backend: validates input, builds prompts via `core/`, streams Gemini output.
- `core/` - Canonical director engine (`director.mjs`, `models.json`, `library.json`).
- `mcp-server/` - MCP server exposing the engine as tools.
- `gemini-extension/`, `chrome-extension/`, `claude-skill/` - Extension/skill packagings.
- `scripts/build-clients.mjs` - Regenerates `chrome-extension/data.js` from `core/`.
- `scripts/test-core.mjs` - Core engine tests (`npm test`).
- `.env.example` - Template for Gemini, backend, security, and Cloudinary settings.
- `asset/` - Local demo video files.
- `cloudinary-videos.json` - Cloudinary upload metadata.
- `scripts/upload-cloudinary.mjs` - Helper script for uploading demo videos to Cloudinary.
- `package.json` - Scripts: `start`, `build:clients`, `mcp`, `test`, `upload:cloudinary`.

## Prompt Algorithm

The app uses a structured prompt architecture rather than a simple one-shot prompt.

Pipeline:

```text
User Idea
↓
Visual Model Selection
↓
Dialogue Selection
↓
Music Selection
↓
Output Type
↓
Prompt Architecture Engine
↓
Veo 3 Prompt Output
```

The main algorithm happens in `index.html` inside the prompt generation flow.

When the user clicks `UNLOCK YOUR CREATIVE POTENTIAL`, the app:

1. Reads the rough user idea.
2. Reads the selected visual model.
3. Reads generation controls:
   - `dialogueMode`
   - `musicMode`
   - `outputType`
4. Retrieves related examples from the prompt library.
5. Extracts visual keywords from the selected aesthetic model.
6. Builds a `generationControls` object:

```js
{
  visualModel: "...",
  dialogueMode: "...",
  musicMode: "...",
  outputType: "..."
}
```

7. Creates a `systemPrompt` that defines the creative-director rules.
8. Creates `userContent` that includes the idea, selected model, keywords, examples, and controls.
9. Sends both values to the backend endpoint:

```text
POST /api/improve-prompt
```

10. Displays the generated Veo 3 prompt in the output panel.

## Current Control Logic

The dialogue, music, and output type controls are currently **prompt-guided**.

That means:

- The selected values are passed into prompt assembly.
- The system prompt explains how Gemini should interpret them.
- The model uses those controls to shape the final prompt.

There is not yet a deeper rule-based validation layer that automatically checks and regenerates outputs when the model disobeys the selected controls.

Future improvement:

```text
User Selections
↓
Control Policy Layer
↓
Prompt Assembly
↓
Model Generation
↓
Output Validation
↓
Optional Regeneration
```

This would make the controls behave more like a strict production pipeline.

## Backend API Flow

`server.mjs` protects the API key and handles the Gemini request.

Backend flow:

1. Loads `.env` values.
2. Exposes `GET /api/health` and `GET /api/options`.
3. Exposes `POST /api/improve-prompt`.
4. Receives a constrained `{ idea, visualModel, dialogueMode, musicMode, outputType, aspectRatio, duration, negativePrompt, modifier }` payload, validates it against the known option sets, and assembles the prompt server-side via `core/`.
5. Enforces a CORS allowlist (`ALLOWED_ORIGINS`, plus same-origin and localhost) and per-IP rate limiting.
6. Calls Gemini with the private API key, retrying temporary failures such as rate limits or service overload.
7. Streams the result over Server-Sent Events (or returns `{ text }` for non-streaming requests).

The browser never sees the Gemini API key, and the endpoint cannot be used to relay arbitrary prompts.

## Render Deployment Pipeline

This project is designed so the frontend can live publicly while the Gemini key stays private on Render.

Recommended production structure:

```text
GitHub repo
↓
Render Web Service
↓
server.mjs backend
↓
Gemini API
```

If the frontend is hosted separately on GitHub Pages, the frontend should call the Render backend URL for prompt generation.

Example:

```text
https://your-render-service.onrender.com/api/improve-prompt
```

Render setup:

- **Service Type:** Web Service
- **Runtime:** Node
- **Branch:** `main`
- **Root Directory:** leave empty
- **Build Command:** `npm install`
- **Start Command:** `npm start`

Render environment variables:

```env
CREATIVE_API_KEY=your_gemini_api_key_here
CREATIVE_MODEL=gemini-2.5-flash
HOST=0.0.0.0
```

Render provides `PORT` automatically, so you usually do not need to set `AVR_BACKEND_PORT` on Render.

Important: do not set the build command to `npn install`. It must be:

```bash
npm install
```

## Run Locally

You can open `index.html` directly for the interface, but prompt generation needs the backend running.

### 1. Install Node.js

Use Node.js 18 or newer.

### 2. Create `.env`

Copy [.env.example](./.env.example) to `.env`:

```env
CREATIVE_API_KEY=your_gemini_api_key_here
CREATIVE_MODEL=gemini-2.5-flash
AVR_BACKEND_PORT=8787
HOST=127.0.0.1
```

`CREATIVE_API_KEY` is your direct Gemini API key. Replace the placeholder with your real key only in `.env`.

### 3. Start the Backend

```bash
npm start
```

By default, the backend runs at:

```text
http://localhost:8787
```

Then open:

```text
http://localhost:8787
```

## Using Your Own API Key

My current public online demo uses a free API tier of Google Gemini Flash 2.5, which can sometimes be delayed by rate limits.

Running locally with your own key gives you more control and usually better performance. You can also plug the project into your own Gemini setup and use a more advanced model by changing `CREATIVE_MODEL` in `.env`.

The API key is stored only in `.env` locally or in Render environment variables in production. It should never be pasted into `index.html`.

## Demo Videos

Demo videos are referenced from Cloudinary inside `index.html`. The local `asset/` folder keeps the original video files.

To upload videos again, configure Cloudinary variables in `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_FOLDER=veo3-prompt-improver
```

Then run:

```bash
npm run upload:cloudinary
```

This updates `cloudinary-videos.json` with hosted video information.

## Security Notes

- Do not commit `.env`.
- Do not expose the Gemini API key in frontend code.
- Store production secrets in Render environment variables.
- Rotate any key immediately if it is accidentally committed or exposed.

## Credits

© 2026 Real — Make it real. All rights by wuisabel-gif on GitHub.
