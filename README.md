# Be Your Own Director — AI-Powered Veo 3 Prompt Studio

Veo 3 Video Prompt Improver is a cinematic prompt studio for turning rough ideas, moods, lyrics, aesthetics, and visual concepts into polished Veo 3-ready creative briefs.

Over the past year, I have spent a significant amount of time experimenting with Veo 3 and other AI video-generation models while creating music visualizers, fashion films, fantasy scenes, and cinematic concepts for my Bella Pi YouTube channel.

For more examples of my Veo 3 videos, visit my website: [Bella PI](https://wuisabel-gif.github.io/Bella_PI/index.html).

Through hundreds of prompt iterations, I began documenting recurring patterns that consistently produced stronger visual results. This project is an attempt to organize those observations into a reusable prompt-engineering framework that helps transform rough ideas into structured cinematic briefs.

The platform combines prompt retrieval, visual metadata modeling, aesthetic classification, and structured prompt assembly to generate more coherent Veo 3 prompts across fashion editorials, luxury campaigns, fantasy worlds, runway films, and music-video concepts.

**Project Status:** Active Prototype (Potential Future Product)

**Try the prototype:** [YOUR_LINK_HERE]

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

The project is intentionally lightweight. The main app lives in `index.html`, and the backend API proxy lives in `server.mjs`.

## Project Files

- `index.html` - Main single-page Studio Space app.
- `server.mjs` - Node backend that protects the API key and calls Gemini.
- `.env.example` - Safe template for Gemini, local backend, and Cloudinary settings.
- `asset/` - Local demo video files.
- `cloudinary-videos.json` - Cloudinary upload metadata.
- `scripts/upload-cloudinary.mjs` - Helper script for uploading demo videos to Cloudinary.
- `package.json` - Project scripts for starting the backend and uploading videos.

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
2. Exposes `GET /api/health`.
3. Exposes `POST /api/improve-prompt`.
4. Receives `systemPrompt` and `userContent`.
5. Calls Gemini with the private API key.
6. Retries temporary failures such as rate limits or service overload.
7. Returns `{ text }` to the frontend.

The browser never sees the Gemini API key.

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

© 2026 Veo 3 Video Prompt Improver. All rights by wuisabel-gif on GitHub.
