// Minimal assertion suite for the core director engine. Run: npm test
import assert from "node:assert/strict";
import {
  buildPromptPayload,
  validateInput,
  VISUAL_MODELS,
  DIALOGUE_OPTIONS,
  ASPECT_RATIOS,
  DURATIONS,
} from "../core/director.mjs";

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };
const throws400 = fn => assert.throws(fn, e => e.status === 400);

test("rejects empty idea", () => throws400(() => validateInput({})));
test("rejects unknown visual model", () => throws400(() => validateInput({ idea: "x", visualModel: "Nope" })));
test("rejects unknown aspect ratio", () => throws400(() => validateInput({ idea: "x", aspectRatio: "4:5" })));

test("applies defaults", () => {
  const v = validateInput({ idea: "a quiet street" });
  assert.equal(v.visualModel, VISUAL_MODELS[0].name);
  assert.equal(v.dialogueMode, DIALOGUE_OPTIONS[0]);
  assert.equal(v.aspectRatio, ASPECT_RATIOS[0]);
  assert.equal(v.duration, DURATIONS[2]);
});

test("clamps overlong free text", () => {
  const v = validateInput({ idea: "x", modifier: "m".repeat(9999) });
  assert.ok(v.modifier.length <= 500);
});

test("builds prompt with selected controls woven in", () => {
  const { systemPrompt, userContent } = buildPromptPayload({
    idea: "a girl in neon rain",
    visualModel: "K-Street",
    outputType: "🎤 Music Video",
    aspectRatio: "9:16",
    duration: "8s",
    negativePrompt: "text, watermark",
  });
  assert.ok(systemPrompt.includes("Creative Director"));
  assert.ok(userContent.includes("K-Street"));
  assert.ok(userContent.includes("9:16"));
  assert.ok(userContent.includes("watermark"));
  assert.ok(userContent.includes("EXAMPLE 1"), "includes few-shot examples");
});

test("omits negative-prompt line when none given", () => {
  const { userContent } = buildPromptPayload({ idea: "a calm beach" });
  assert.ok(!userContent.includes("AVOID in frame"));
});

console.log(`\n${passed} core tests passed.`);
