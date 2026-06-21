# Contributing

Thanks for your interest in the Veo 3 Prompt Studio. This guide covers how the project
is wired and the few rules that keep its five surfaces in sync.

## Project layout

| Path | What it is |
|------|------------|
| `core/` | The canonical prompt engine — `director.mjs` plus `models.json` and `library.json`. Everything else builds on this. |
| `index.html` | The single-file web app (React via Babel CDN). |
| `server.mjs` | Node backend: builds prompts from `core/`, calls Gemini, streams the result. |
| `mcp-server/` | MCP server exposing the engine as tools (imports `core/` directly). |
| `gemini-extension/` | Gemini CLI extension (`/veo3:improve`, `/veo3:models`). |
| `chrome-extension/` | Manifest V3 browser extension. |
| `claude-skill/` | A Claude skill mirroring the director. |
| `scripts/` | Build, test, and maintenance scripts. |

## The one rule that matters: `core/` is the single source of truth

The visual models, generation controls, system prompt, and few-shot library live in
`core/` and nowhere else. Three consequences:

1. **Change behavior in `core/`**, not in a copy. The server and MCP server import `core/`
   directly, so they pick up changes for free.
2. **`chrome-extension/data.js` is generated.** Its header says so. Never edit it by hand —
   edit `core/`, then run `npm run build:clients` to regenerate it.
3. **The hand-written mirrors** — `gemini-extension/GEMINI.md` and `claude-skill/veo3-director/SKILL.md` —
   restate the rules in prose for their host environment. If you change a rule in `core/`,
   update those two files in the same change so they don't drift.

### Adding a visual model or example

- New visual model → add it to `core/models.json` (`visualModels`), then
  `npm run build:clients`. Mention it in the `GEMINI.md` and `SKILL.md` model tables.
- New few-shot example → add it to `core/library.json`, then `npm run build:clients`.
  Keep it free of the banned vague words (see below) — `npm test` enforces this.

## Local development

```bash
cp .env.example .env        # add your Gemini API key
npm start                   # serve the app + API at http://localhost:8787
```

You can also open `index.html` directly, but prompt generation needs the backend running
(it falls back to `http://localhost:8787`).

## Scripts

| Command | Does |
|---------|------|
| `npm start` | Run the backend + serve the web app. |
| `npm test` | Core engine + output-linter unit tests. Must pass before a PR. |
| `npm run build:clients` | Regenerate `chrome-extension/data.js` from `core/`. |
| `npm run check:output` | Live check — generate briefs through Gemini and lint them for banned words (needs `CREATIVE_API_KEY`). |
| `npm run clean:icloud` | Delete iCloud sync conflict copies (`"name 2.ext"`). |

## House rules for prompts

- **No vague quality words.** A generated brief must never contain "beautiful", "stunning",
  "gorgeous", "breathtaking", "high-quality", or "photorealistic" — including in Mood lines.
  `lintBrief()` in `core/director.mjs` checks this, and `npm test` fails if the shipped
  few-shot library violates it.
- **Safety.** The engine refuses graphic, harmful, or exploitative requests and returns a
  short safety notice instead. Keep that behavior intact.

## Submitting changes

1. Branch off `main`.
2. Make the change in `core/` (and regenerate clients / update the prose mirrors as needed).
3. Run `npm test`. If you touched generation, run `npm run check:output` too.
4. Open a PR describing what changed and which surfaces it affects.

A note on the working tree: this repo syncs through iCloud Drive, which occasionally creates
conflict copies like `SKILL 2.md`. Run `npm run clean:icloud` if you see them in `git status`.
