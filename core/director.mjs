// Canonical Veo 3 "Creative Director" prompt engine.
// Single source of truth consumed by server.mjs, the MCP server, and (via the
// build script) the browser clients. Ported from the original index.html logic,
// with server-side input validation and Veo 3-native controls added.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readJson = name => JSON.parse(readFileSync(path.join(__dirname, name), "utf8"));

const MODELS = readJson("models.json");
const LIBRARY = readJson("library.json");

export const VISUAL_MODELS = MODELS.visualModels;
export const DIALOGUE_OPTIONS = MODELS.dialogueOptions;
export const MUSIC_OPTIONS = MODELS.musicOptions;
export const OUTPUT_TYPE_OPTIONS = MODELS.outputTypeOptions;

// Veo 3-native controls (new).
export const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "21:9"];
export const DURATIONS = ["4s", "6s", "8s"];

export const SAFETY_BLOCK_REASONS = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "RECITATION"]);

// Vague quality words the brief must never contain (see the banned-words rule).
export const BANNED_OUTPUT_WORDS = ["beautiful", "stunning", "gorgeous", "breathtaking", "high-quality", "photorealistic"];
const BANNED_OUTPUT_RE = new RegExp(
  "\\b(" + BANNED_OUTPUT_WORDS.map(w => w.replace(/-/g, "[-\\s]?")).join("|") + ")\\b",
  "gi"
);

// Scans a generated brief for banned vague words. Returns the matches found
// (lowercased), so callers can flag or reject output that violates the rule.
export function lintBrief(text) {
  if (!text) return [];
  return (String(text).match(BANNED_OUTPUT_RE) || []).map(m => m.toLowerCase());
}

const MAX_IDEA_LEN = 2000;
const MAX_MODIFIER_LEN = 500;
const MAX_NEGATIVE_LEN = 500;
const EXAMPLES_PER_CATEGORY = 2;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const names = list => list.map(x => (typeof x === "string" ? x : x.name));

// Validates and normalizes a client-supplied generation request. Throws
// ValidationError (status 400) on anything outside the known option sets.
// This is what makes the backend safe to expose: the client can only pick
// from fixed enums and supply bounded free text — never a raw prompt.
export function validateInput(raw = {}) {
  const idea = String(raw.idea ?? "").trim();
  if (!idea) throw new ValidationError("`idea` is required.");
  if (idea.length > MAX_IDEA_LEN) throw new ValidationError(`\`idea\` exceeds ${MAX_IDEA_LEN} characters.`);

  const pick = (value, list, label, fallback) => {
    if (value == null || value === "") return fallback;
    const allowed = names(list);
    if (!allowed.includes(value)) {
      throw new ValidationError(`Invalid ${label}: "${value}". Allowed: ${allowed.join(", ")}.`);
    }
    return value;
  };

  const visualModel = pick(raw.visualModel, VISUAL_MODELS, "visualModel", VISUAL_MODELS[0].name);
  const dialogueMode = pick(raw.dialogueMode, DIALOGUE_OPTIONS, "dialogueMode", DIALOGUE_OPTIONS[0]);
  const musicMode = pick(raw.musicMode, MUSIC_OPTIONS, "musicMode", MUSIC_OPTIONS[0]);
  const outputType = pick(raw.outputType, OUTPUT_TYPE_OPTIONS, "outputType", OUTPUT_TYPE_OPTIONS[0]);
  const aspectRatio = pick(raw.aspectRatio, ASPECT_RATIOS, "aspectRatio", ASPECT_RATIOS[0]);
  const duration = pick(raw.duration, DURATIONS, "duration", DURATIONS[2]);

  const modifier = String(raw.modifier ?? "").trim().slice(0, MAX_MODIFIER_LEN);
  const negativePrompt = String(raw.negativePrompt ?? "").trim().slice(0, MAX_NEGATIVE_LEN);

  return { idea, visualModel, dialogueMode, musicMode, outputType, aspectRatio, duration, modifier, negativePrompt };
}

// Picks category-matched few-shot examples, like the original web app did.
function selectExamples(category, n = EXAMPLES_PER_CATEGORY) {
  const matches = LIBRARY.filter(ex => ex.category === category);
  const others = LIBRARY.filter(ex => ex.category !== category);
  return [...matches, ...others].slice(0, n);
}

export function buildSystemPrompt() {
  return `You are an elite, award-winning fashion film Creative Director behind the visual styling of premium AI visualizers.
Transform the user's rough description into a highly structured, ultra-cinematic visual director's brief suitable for premium generators like Veo 3.

You MUST follow this exact format below. Do not output conversational introductions, pleasantries, or preamble. Start directly with the prompt:

Ultra-cinematic [Style Family] visualizer inspired by [Atmospheric Director / High-End Brand / Cinema].
A [Subject Details] in [Precise Setting]...
Dialogue handling: [Follow the selected dialogue mode exactly]
Music context: [Follow the selected music mode as pacing, atmosphere, rhythm, and scene-design metadata only]
Output type: [Follow the selected output type and adapt structure accordingly]
Scene visuals:
• [Visual focal point bullet 1]
• [Visual focal point bullet 2]
• [Visual focal point bullet 3]
Visual style: [Detailed camera lenses (e.g., 35mm, anamorphic), lighting setups, and visual texture]
Color palette: [Highly specific color coordination, desaturation levels]
Mood: [Deep artistic, sensory or emotional feelings]
Camera: [Clean cinematic motion cues, dolly, or horizontal crane tracks]
Music style: [Vibe-matching sounds, BPM, or specific tone]
Technical specs: [Aspect ratio and clip duration exactly as provided]
Avoid: [Negative-prompt elements to keep out of frame, only if provided]
Reference mood:
"[A single artistic philosophical quote mapping to the scene's core essence]"

IMPORTANT RULES:
- Follow safety guidelines. Refuse or redirect requests involving graphic violence, self-harm, sexual exploitation, hate, harassment, illegal instructions, or other harmful content.
- If the user request is unsafe or sensitive, do not generate the cinematic prompt. Return a brief safety notice asking the user to revise the idea into a safe, non-graphic concept.
- Preserve the user's original subject and core intent. Enrich, stylize, and add cinematic specificity to THEIR idea — never replace the stated subject (person, animal, object, place, or action) with a different one just to fit the chosen aesthetic. The aesthetic dresses the idea; it does not overwrite it.
- Banned vague words: never use "beautiful", "stunning", "gorgeous", "high-quality", or "photorealistic" ANYWHERE, including the Mood and emotional lines (e.g. do not write "beautiful loneliness"). Name the concrete sensory effect or the specific feeling instead, using technical cinematic framing.
- Integrate the aesthetic language matching the selected visual category.
- Focus strictly on photographic atmosphere, textures, reflection refractions, and micro-motion.
- Dialogue is only allowed when the selected dialogue mode explicitly requests it.
- Music metadata should influence atmosphere, pacing, visual rhythm, editing style, and scene design. Do not generate lyrics or audio.
- If output type is Visualizer, keep it atmospheric with no storytelling unless the user explicitly asks.
- If output type is Music Video, allow performance scenes and rhythm-driven editing.
- If output type is Short Film, allow narrative structure and dialogue only when the dialogue mode permits it.
- If output type is Fashion Film, prioritize editorial styling, cinematography, wardrobe, pose language, and luxury campaign pacing.
- Honor the requested aspect ratio and duration. Compose framing and pacing appropriate to them (e.g. 9:16 vertical, 8s clip).
- If an "Avoid" list is provided, never include those elements; omit the Avoid line entirely when none is provided.`;
}

export function buildUserContent(input) {
  const { idea, visualModel, dialogueMode, musicMode, outputType, aspectRatio, duration, modifier, negativePrompt } = input;
  const style = VISUAL_MODELS.find(c => c.name === visualModel) || VISUAL_MODELS[0];
  const styleKeywords = style.keywords.join(", ");

  const generationControls = {
    visualModel: style.name,
    dialogueMode,
    musicMode,
    outputType,
    aspectRatio,
    duration
  };

  const examplesText = selectExamples(style.name)
    .map((ex, i) => `
### EXAMPLE ${i + 1}:
Category: ${ex.category}
Tags: ${(ex.tags || []).join(", ")}
Output Brief:
${ex.prompt}
`).join("\n");

  return `Convert this rough concept:
"${idea}"

Category chosen: ${style.name}
Target keywords to naturally weave in: ${styleKeywords}

Generation controls:
${JSON.stringify(generationControls, null, 2)}
${negativePrompt ? `\nNegative prompt (elements to AVOID in frame): "${negativePrompt}"` : ""}
${modifier ? `\nMODIFIER DEMAND: Change the style of the prompt to match this request: "${modifier}"` : ""}

Use these reference visual briefs as your absolute style, structural, and pacing guides. Match their exact level of detail and formatting:
${examplesText}

Begin rewriting directly. No pre-text or greetings:`;
}

// High-level entry point: validate + build the system/user prompt pair.
export function buildPromptPayload(rawInput) {
  const input = validateInput(rawInput);
  return {
    input,
    systemPrompt: buildSystemPrompt(),
    userContent: buildUserContent(input)
  };
}
