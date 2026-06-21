# Real — Gemini CLI Extension

Turn rough ideas into structured, ultra-cinematic **Veo 3** fashion film prompts directly inside the
[Gemini CLI](https://github.com/google-gemini/gemini-cli). This is **Real** (make it real), the
prompt engine packaged as a Gemini CLI extension: the same Creative Director system prompt,
12 visual models, generation controls, and golden style references — no separate backend or
API key required (the Gemini CLI uses your existing Gemini auth).

## What you get

- `/veo3:improve <idea>` — rewrite a rough concept into a full cinematic director's brief.
- `/veo3:models` — list the visual models and generation controls.

## Install

The extension lives in this folder (`gemini-extension/`).

**From the local path:**

```bash
gemini extensions install --path ./gemini-extension
```

**Or link it into your Gemini config manually** by copying this folder to:

```
~/.gemini/extensions/veo3-prompt-studio
```

Then start (or restart) the CLI and run `/extensions list` to confirm it loaded.

## Usage

```text
/veo3:improve a girl dancing alone in a neon-lit Seoul apartment at dawn
```

Add optional control hints anywhere in the line (in `key:"value"` form):

```text
/veo3:improve champagne on a cliffside infinity pool model:"Poolside Muse" output:"Fashion Film" music:"Tropical House" dialogue:"Voiceover"
```

- `model:`    — one of the visual models (see `/veo3:models`). Omit it and the director picks the best fit.
- `dialogue:` — No Dialogue · Ambient Speech · Character Dialogue · Narration · Voiceover
- `music:`    — No Music Reference · Dark Synthwave · Phonk · Festival EDM · Latin Pop · K-Pop · Dream Pop · Tropical House · Cinematic Score
- `output:`   — Visualizer · Music Video · Short Film · Fashion Film
- `modifier:` — an extra styling demand to bend the prompt toward

## Files

- `gemini-extension.json` — extension manifest (name, version, context file).
- `GEMINI.md` — the Creative Director system: output format, rules, visual models, controls, and few-shot references.
- `commands/veo3/improve.toml` — the `/veo3:improve` command.
- `commands/veo3/models.toml` — the `/veo3:models` command.

## Relationship to the web app

This extension is a faithful port of the prompt-engineering core in the parent
`veo3_prompt_improver` project (`index.html` + `server.mjs`). The web app calls the Gemini API
through a Render proxy; this extension runs the same director logic inside the Gemini CLI's own
model, so it needs no proxy or API key of its own.
