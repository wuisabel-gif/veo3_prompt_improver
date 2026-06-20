// Regenerates chrome-extension/data.js from the canonical core/ data so the
// browser client never drifts from the server/MCP engine.
// Run: node scripts/build-clients.mjs

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const readJson = p => JSON.parse(readFileSync(path.join(root, p), "utf8"));

const models = readJson("core/models.json");
const library = readJson("core/library.json");

// Browser builder mirrors core/director.mjs (kept in sync via this script).
const header = `// AUTO-GENERATED from core/ by scripts/build-clients.mjs. Do not edit by hand.
// Shared data + prompt architecture for the Chrome extension (popup + worker).

const VISUAL_MODELS = ${JSON.stringify(models.visualModels, null, 2)};
const STYLE_CATEGORIES = VISUAL_MODELS; // alias used by the popup UI
const DIALOGUE_OPTIONS = ${JSON.stringify(models.dialogueOptions)};
const MUSIC_OPTIONS = ${JSON.stringify(models.musicOptions)};
const OUTPUT_TYPE_OPTIONS = ${JSON.stringify(models.outputTypeOptions)};
const ASPECT_RATIO_OPTIONS = ["16:9", "9:16", "1:1", "21:9"];
const DURATION_OPTIONS = ["4s", "6s", "8s"];
const LIBRARY = ${JSON.stringify(library)};
const SAFETY_BLOCK_REASONS = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "RECITATION"]);
const EXAMPLES_PER_CATEGORY = 2;
`;

const body = String.raw`
function selectExamples(category, n) {
  n = n || EXAMPLES_PER_CATEGORY;
  const matches = LIBRARY.filter(ex => ex.category === category);
  const others = LIBRARY.filter(ex => ex.category !== category);
  return matches.concat(others).slice(0, n);
}

function buildSystemPrompt() {
  return [
    'You are an elite, award-winning fashion film Creative Director behind the visual styling of premium AI visualizers.',
    "Transform the user's rough description into a highly structured, ultra-cinematic visual director's brief suitable for premium generators like Veo 3.",
    '',
    'You MUST follow this exact format below. Do not output conversational introductions, pleasantries, or preamble. Start directly with the prompt:',
    '',
    'Ultra-cinematic [Style Family] visualizer inspired by [Atmospheric Director / High-End Brand / Cinema].',
    'A [Subject Details] in [Precise Setting]...',
    'Dialogue handling: [Follow the selected dialogue mode exactly]',
    'Music context: [Follow the selected music mode as pacing, atmosphere, rhythm, and scene-design metadata only]',
    'Output type: [Follow the selected output type and adapt structure accordingly]',
    'Scene visuals:',
    '• [Visual focal point bullet 1]',
    '• [Visual focal point bullet 2]',
    '• [Visual focal point bullet 3]',
    'Visual style: [Detailed camera lenses (e.g., 35mm, anamorphic), lighting setups, and visual texture]',
    'Color palette: [Highly specific color coordination, desaturation levels]',
    'Mood: [Deep artistic, sensory or emotional feelings]',
    'Camera: [Clean cinematic motion cues, dolly, or horizontal crane tracks]',
    'Music style: [Vibe-matching sounds, BPM, or specific tone]',
    'Technical specs: [Aspect ratio and clip duration exactly as provided]',
    'Avoid: [Negative-prompt elements to keep out of frame, only if provided]',
    'Reference mood:',
    '"[A single artistic philosophical quote mapping to the scene\'s core essence]"',
    '',
    'IMPORTANT RULES:',
    '- Follow safety guidelines. Refuse or redirect requests involving graphic violence, self-harm, sexual exploitation, hate, harassment, illegal instructions, or other harmful content.',
    '- If the user request is unsafe or sensitive, do not generate the cinematic prompt. Return a brief safety notice asking the user to revise the idea into a safe, non-graphic concept.',
    '- Never use generic words like "beautiful", "high-quality", or "photorealistic". Use technical cinematic framing.',
    '- Integrate the aesthetic language matching the selected visual category.',
    '- Focus strictly on photographic atmosphere, textures, reflection refractions, and micro-motion.',
    '- Dialogue is only allowed when the selected dialogue mode explicitly requests it.',
    '- Music metadata should influence atmosphere, pacing, visual rhythm, editing style, and scene design. Do not generate lyrics or audio.',
    '- If output type is Visualizer, keep it atmospheric with no storytelling unless the user explicitly asks.',
    '- If output type is Music Video, allow performance scenes and rhythm-driven editing.',
    '- If output type is Short Film, allow narrative structure and dialogue only when the dialogue mode permits it.',
    '- If output type is Fashion Film, prioritize editorial styling, cinematography, wardrobe, pose language, and luxury campaign pacing.',
    '- Honor the requested aspect ratio and duration. Compose framing and pacing appropriate to them (e.g. 9:16 vertical, 8s clip).',
    '- If an "Avoid" list is provided, never include those elements; omit the Avoid line entirely when none is provided.'
  ].join('\n');
}

function buildPromptPayload(opts) {
  const style = VISUAL_MODELS.find(c => c.name === opts.visualModel) || VISUAL_MODELS[0];
  const generationControls = {
    visualModel: style.name,
    dialogueMode: opts.dialogueMode || DIALOGUE_OPTIONS[0],
    musicMode: opts.musicMode || MUSIC_OPTIONS[0],
    outputType: opts.outputType || OUTPUT_TYPE_OPTIONS[0],
    aspectRatio: opts.aspectRatio || ASPECT_RATIO_OPTIONS[0],
    duration: opts.duration || DURATION_OPTIONS[2]
  };
  const negativePrompt = (opts.negativePrompt || '').trim();
  const modifier = (opts.presetModifier || opts.modifier || '').trim();

  const examplesText = selectExamples(style.name).map((ex, i) =>
    '\n### EXAMPLE ' + (i + 1) + ':\nCategory: ' + ex.category +
    '\nTags: ' + ((ex.tags || []).join(', ')) + '\nOutput Brief:\n' + ex.prompt + '\n'
  ).join('\n');

  const userContent = 'Convert this rough concept:\n"' + opts.roughInput + '"\n\n' +
    'Category chosen: ' + style.name + '\n' +
    'Target keywords to naturally weave in: ' + style.keywords.join(', ') + '\n\n' +
    'Generation controls:\n' + JSON.stringify(generationControls, null, 2) + '\n' +
    (negativePrompt ? '\nNegative prompt (elements to AVOID in frame): "' + negativePrompt + '"' : '') +
    (modifier ? '\nMODIFIER DEMAND: Change the style of the prompt to match this request: "' + modifier + '"' : '') +
    '\n\nUse these high-quality visual briefs as your absolute style, structural, and pacing guides. Match their exact level of detail and formatting:\n' +
    examplesText +
    '\n\nBegin rewriting directly. No pre-text or greetings:';

  return { systemPrompt: buildSystemPrompt(), userContent: userContent };
}

if (typeof self !== "undefined") {
  self.STYLE_CATEGORIES = STYLE_CATEGORIES;
  self.VISUAL_MODELS = VISUAL_MODELS;
  self.DIALOGUE_OPTIONS = DIALOGUE_OPTIONS;
  self.MUSIC_OPTIONS = MUSIC_OPTIONS;
  self.OUTPUT_TYPE_OPTIONS = OUTPUT_TYPE_OPTIONS;
  self.ASPECT_RATIO_OPTIONS = ASPECT_RATIO_OPTIONS;
  self.DURATION_OPTIONS = DURATION_OPTIONS;
  self.SAFETY_BLOCK_REASONS = SAFETY_BLOCK_REASONS;
  self.buildPromptPayload = buildPromptPayload;
}
`;

writeFileSync(path.join(root, "chrome-extension/data.js"), header + body);
console.log("Wrote chrome-extension/data.js from core (models:", models.visualModels.length, "library:", library.length + ")");
