// Shared data + prompt architecture, ported faithfully from index.html.
// Loaded by popup.html (<script>) and background.js (importScripts), so it
// defines globals on the shared scope.

const STYLE_CATEGORIES = [
  { name: "Runway Couture", icon: "👠", desc: "High fashion, luxury campaigns, Paris Fashion Week.", keywords: ["high fashion", "luxury campaign", "Paris Fashion Week", "runway couture", "editorial styling"] },
  { name: "Beauty Editorial", icon: "📸", desc: "Close-ups, jewelry, makeup, Vogue-style beauty campaigns.", keywords: ["beauty close-up", "jewelry", "makeup", "Vogue-style campaign", "editorial portrait"] },
  { name: "Y2K Glamour", icon: "✦", desc: "Luxury Y2K fashion, warm flash photography, tropical nightlife.", keywords: ["Y2K glam editorial", "gold jewelry", "warm flash photography", "bohemian fabrics", "non-AI-looking cinematography"] },
  { name: "Poolside Muse", icon: "🕶️", desc: "Sun-soaked old-Hollywood glamour, silver sequins, golden pools.", keywords: ["silver sequin bikini", "oversized sunglasses", "infinity pool", "golden sunset reflections"] },
  { name: "Ice Queen Muse", icon: "❄️", desc: "Cool dominance, baby-blue fur, diamonds, winter wealth.", keywords: ["baby-blue fur coat", "platinum-blonde waves", "diamond earrings", "porcelain skin"] },
  { name: "Angel Haze", icon: "🐚", desc: "Angel-wing neon haze, wet platinum hair, violet dreamscape.", keywords: ["glowing white angel wings", "wet platinum hair", "purple-blue neon haze", "glitter makeup", "35mm dream blur"] },
  { name: "Architectural Muse", icon: "🏛️", desc: "Modern couture in minimalist architecture, museum aesthetics.", keywords: ["modern couture", "minimalist architecture", "clean lines", "museum aesthetics", "soft natural light", "understated luxury"] },
  { name: "Campus K-Style", icon: "🌸", desc: "K-pop idol off-duty, pastel cardigans, schoolyard chic.", keywords: ["pastel cardigan", "pleated skirt", "chunky loafers", "jacaranda blossoms"] },
  { name: "Seoul Morning", icon: "🌅", desc: "Minimal Seoul apartments, cozy duvets, coffee haze.", keywords: ["minimalist korean apartment", "tousled hair", "linen duvet", "steam rays"] },
  { name: "K-Street", icon: "🎤", desc: "Euphoria-inspired Y2K party glamour, neon nightclub haze.", keywords: ["Y2K glam", "purple tinsel curtains", "silver chainmail", "rhinestone makeup", "35mm flash photography"] },
  { name: "Cinematic Storytelling", icon: "🎬", desc: "Short films, narrative scenes, emotional visual worlds.", keywords: ["short film", "narrative scene", "emotional visual world", "cinematic storytelling", "character atmosphere"] },
  { name: "Minimalist Atmosphere", icon: "☁️", desc: "White-space dream, art-house minimalism, dreamcore.", keywords: ["White Space Dream", "art-house minimalism", "solitude", "dreamcore", "architectural emptiness"] }
];

const DIALOGUE_OPTIONS = ["🔇 No Dialogue", "🎙 Ambient Speech", "🗣 Character Dialogue", "📖 Narration", "🎧 Voiceover"];
const MUSIC_OPTIONS = ["🎵 No Music Reference", "🖤 Dark Synthwave", "⚡ Phonk", "🎡 Festival EDM", "💃 Latin Pop", "🎤 K-Pop", "🎹 Dream Pop", "🌴 Tropical House", "🎬 Cinematic Score"];
const OUTPUT_TYPE_OPTIONS = ["✨ Visualizer", "🎤 Music Video", "🎬 Short Film", "📸 Fashion Film"];

// A few golden style references used as few-shot guides (subset of the web app library).
const STYLE_REFERENCES = [
`Ultra-cinematic Poolside Muse visualizer inspired by retro Hollywood leisure campaigns and warm summer dreams.
A blonde subject lounging elegantly on a custom white leather daybed beside a pristine cliffside infinity pool at sunset.
Scene visuals:
• She wears a silver sequin bikini that throws glittering, dazzling reflections of sunlight onto her sun-kissed skin.
• A close-up of her wearing oversized black acetate sunglasses, the golden ocean horizon reflecting perfectly in her lenses.
• She slowly lifts an icy crystal glass of champagne, condensation droplets glistening in the warm direct sunlight.
Visual style: Vintage 35mm warm film saturation, intense anamorphic lens bloom, soft summer haze overlays.
Color palette: Warm liquid gold, reflective silver-chrome, deep ocean turquoise, and sand-white.
Mood: Carefree luxury, untouchable glamour, absolute peace.
Camera: Super slow-motion push-in, floating gently as if hovering above the pool.
Music style: Ambient lounge disco, vintage analog warm synthesizer pads, slow organic percussion.
Reference mood:
"A golden hour paradise where time stands completely still."`,
`Ultra-cinematic Ice Queen Muse visualizer inspired by vintage high-society campaigns and Winter Aspen luxury.
A platinum-blonde subject with structured vintage waves sitting in the back of a luxury limousine, staring directly through the tinted window.
Scene visuals:
• She is draped in a plush, luxurious baby-blue faux fur coat that catches soft ambient winter light.
• Large diamond cluster earrings shimmering under passing streetlights, cast against her flawless porcelain skin.
• Her manicured hand holding a crystal tumbler, ice cubes shifting slowly as she gazes with cool detachment.
Visual style: Ultra-sharp high-contrast detail, micro-mist atmosphere, cool diffused ring lighting.
Color palette: Pastel baby blue, platinum silver, diamond white, and deep cold graphite.
Mood: Aloof, detached, high-fashion winter wealth.
Camera: Slowly rotating horizontal dolly tracking her profile, soft zoom-in on the eyes.`
];

const SAFETY_BLOCK_REASONS = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "RECITATION"]);

// Builds the system + user prompt pair exactly like index.html does.
function buildPromptPayload({ roughInput, visualModel, dialogueMode, musicMode, outputType, presetModifier }) {
  const selectedStyle = STYLE_CATEGORIES.find(c => c.name === visualModel) || STYLE_CATEGORIES[0];
  const styleKeywords = selectedStyle.keywords.join(", ");
  const generationControls = {
    visualModel: selectedStyle.name,
    dialogueMode,
    musicMode,
    outputType
  };

  const systemPrompt = `You are an elite, award-winning fashion film Creative Director behind the visual styling of premium AI visualizers.
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
Reference mood:
"[A single artistic philosophical quote mapping to the scene's core essence]"

IMPORTANT RULES:
- Follow safety guidelines. Refuse or redirect requests involving graphic violence, self-harm, sexual exploitation, hate, harassment, illegal instructions, or other harmful content.
- If the user request is unsafe or sensitive, do not generate the cinematic prompt. Return a brief safety notice asking the user to revise the idea into a safe, non-graphic concept.
- Never use generic words like "beautiful", "high-quality", or "photorealistic". Use technical cinematic framing.
- Integrate the aesthetic language matching the selected visual category.
- Focus strictly on photographic atmosphere, textures, reflection refractions, and micro-motion.
- Dialogue is only allowed when the selected dialogue mode explicitly requests it.
- Music metadata should influence atmosphere, pacing, visual rhythm, editing style, and scene design. Do not generate lyrics or audio.
- If output type is Visualizer, keep it atmospheric with no storytelling unless the user explicitly asks.
- If output type is Music Video, allow performance scenes and rhythm-driven editing.
- If output type is Short Film, allow narrative structure and dialogue only when the dialogue mode permits it.
- If output type is Fashion Film, prioritize editorial styling, cinematography, wardrobe, pose language, and luxury campaign pacing.`;

  const examplesText = STYLE_REFERENCES.map((ref, i) => `
### EXAMPLE ${i + 1}:
Output Brief:
${ref}
`).join("\n");

  const userContent = `Convert this rough concept:
"${roughInput}"

Category chosen: ${selectedStyle.name}
Target keywords to naturally weave in: ${styleKeywords}

Generation controls:
${JSON.stringify(generationControls, null, 2)}

${presetModifier ? `MODIFIER DEMAND: Change the style of the prompt to match this request: "${presetModifier}"` : ""}

Use these high-quality visual briefs as your absolute style, structural, and pacing guides. Match their exact level of detail and formatting:
${examplesText}

Begin rewriting directly. No pre-text or greetings:`;

  return { systemPrompt, userContent };
}

// Export for module contexts (none currently), harmless otherwise.
if (typeof self !== "undefined") {
  self.STYLE_CATEGORIES = STYLE_CATEGORIES;
  self.DIALOGUE_OPTIONS = DIALOGUE_OPTIONS;
  self.MUSIC_OPTIONS = MUSIC_OPTIONS;
  self.OUTPUT_TYPE_OPTIONS = OUTPUT_TYPE_OPTIONS;
  self.SAFETY_BLOCK_REASONS = SAFETY_BLOCK_REASONS;
  self.buildPromptPayload = buildPromptPayload;
}
