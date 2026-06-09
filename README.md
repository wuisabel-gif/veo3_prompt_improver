# Veo 3 Video Prompt Improver

Veo 3 Video Prompt Improver is a cinematic prompt studio for turning rough ideas, moods, lyrics, aesthetics, and visual concepts into polished Veo 3-ready creative briefs.

This app is built based on my successful trained examples for different types of videos, including fashion editorials, luxury campaigns, music visualizers, fantasy worlds, cinematic storytelling, beauty campaigns, runway direction, and curated visual aesthetics. It gives users a visual director-style workspace instead of a plain prompt box.

For more examples of my Veo 3 videos, visit my website: [Bella PI](https://wuisabel-gif.github.io/Bella_PI/index.html).

## What It Does

- Rewrites rough visual ideas into structured Veo 3 prompts.
- Uses aesthetic categories such as Runway Couture, Beauty Editorial, Minimalist Atmosphere, Cinematic Storytelling, Architectural Muse, and more.
- Includes a saved aesthetic library with ready-made cinematic prompt references.
- Lets users copy generated prompt text or refine it with micro-aesthetic adjustments.
- Plays rotating demo videos from hosted Cloudinary assets.
- Can run as a local project with your own API key for better reliability.

## Project Files

- `index.html` - Main single-page app.
- `server.mjs` - Local backend that protects the API key and sends prompt rewrite requests.
- `.env.example` - Safe template for configuring a local Gemini API key and optional Cloudinary upload settings.
- `asset/` - Local demo video files.
- `cloudinary-videos.json` - Uploaded Cloudinary video metadata.
- `scripts/upload-cloudinary.mjs` - Optional helper for uploading demo videos to Cloudinary.
- `Agent.md` - Creative brief source notes and prompt library material.

## Run Locally

You can open `index.html` directly in a browser for the interface, but prompt generation needs the local backend running.

### 1. Install Node.js

Use Node.js 18 or newer. The backend uses built-in `fetch`, so older Node versions may not work.

### 2. Create a `.env` File

Copy [.env.example](/.env.example) to a new `.env` file in the project root:

```env
CREATIVE_API_KEY=your_gemini_api_key_here
CREATIVE_MODEL=gemini-2.5-flash
AVR_BACKEND_PORT=8787
HOST=127.0.0.1
```

`CREATIVE_API_KEY` is your direct Gemini API key. The example file uses placeholders only, so replace `your_gemini_api_key_here` with your real key in `.env`.

Keep `.env` private. It should stay on your computer and should not be committed to GitHub.

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

The app will use the local backend automatically.

## Using Your Own API Key

My current public online demo is using a free API tier of Google Gemini Flash 2.5, which can sometimes be delayed by rate limits. Running the project locally with your own key gives you more control and usually better performance. You can also plug it into your own Gemini setup and use a more advanced model through `.env`.

The API key is stored only in `.env` and read by `server.mjs`. The browser never needs to know the secret key directly. This is important because putting an API key inside frontend code would expose it to anyone who opens the page.

Local flow:

1. The user writes a rough idea in the app.
2. `index.html` sends the request to `server.mjs`.
3. `server.mjs` reads `CREATIVE_API_KEY` from `.env`.
4. The backend calls the creative text API.
5. The generated Veo 3 prompt is sent back to the browser.

If prompt generation fails, check:

- `.env` exists in the project root.
- `CREATIVE_API_KEY` is filled in correctly.
- The backend is running with `npm start`.
- The browser is opened through `http://localhost:8787`, not only as a `file://` page.
- Your API provider account has available quota.

## Demo Videos

Demo videos are referenced from Cloudinary inside `index.html`. The local `asset/` folder keeps the original video files.

To upload videos again, configure Cloudinary environment variables in `.env`:

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
- Do not paste API secrets into `index.html`.
- Keep private keys inside the backend environment only.
- If a secret is accidentally committed, rotate it immediately in the provider dashboard.

## Credits

© 2026 Veo 3 Video Prompt Improver. All rights by wuisabel-gif on GitHub.
