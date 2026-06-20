#!/usr/bin/env node
// Veo 3 Prompt Studio — MCP server.
// Exposes the shared core/director engine as MCP tools, so the same Veo 3
// prompt architecture works in Claude Desktop, Claude Code, Cursor, and any
// other MCP client. No API key required for prompt composition; if
// CREATIVE_API_KEY is set, the generate tool will also call Gemini directly.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  buildPromptPayload,
  VISUAL_MODELS,
  DIALOGUE_OPTIONS,
  MUSIC_OPTIONS,
  OUTPUT_TYPE_OPTIONS,
  ASPECT_RATIOS,
  DURATIONS,
  SAFETY_BLOCK_REASONS,
} from "../core/director.mjs";

const MODEL = process.env.CREATIVE_MODEL || "gemini-2.5-flash";
const API_KEY = process.env.CREATIVE_API_KEY;

const inputShape = {
  idea: z.string().min(1).describe("The rough concept to transform into a Veo 3 prompt."),
  visualModel: z.string().optional().describe(`Visual model. One of: ${VISUAL_MODELS.map(m => m.name).join(", ")}.`),
  dialogueMode: z.string().optional().describe(`Dialogue mode. One of: ${DIALOGUE_OPTIONS.join(", ")}.`),
  musicMode: z.string().optional().describe(`Music mode. One of: ${MUSIC_OPTIONS.join(", ")}.`),
  outputType: z.string().optional().describe(`Output type. One of: ${OUTPUT_TYPE_OPTIONS.join(", ")}.`),
  aspectRatio: z.string().optional().describe(`Aspect ratio. One of: ${ASPECT_RATIOS.join(", ")}.`),
  duration: z.string().optional().describe(`Clip duration. One of: ${DURATIONS.join(", ")}.`),
  negativePrompt: z.string().optional().describe("Elements to keep out of frame."),
  modifier: z.string().optional().describe("Extra styling demand to bend the prompt toward."),
};

async function callGemini({ systemPrompt, userContent }) {
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`);
  url.searchParams.set("key", API_KEY);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userContent }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Gemini returned ${response.status}`);
  const finishReason = data.candidates?.[0]?.finishReason;
  if (data.promptFeedback?.blockReason || SAFETY_BLOCK_REASONS.has(finishReason)) {
    throw new Error("Safety: the request was blocked as potentially sensitive. Please revise the idea.");
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

const server = new McpServer({ name: "veo3-prompt-studio", version: "1.0.0" });

server.tool(
  "list_visual_models",
  "List the available Veo 3 visual models and generation controls (visual models, dialogue/music/output options, aspect ratios, durations).",
  {},
  async () => ({
    content: [{
      type: "text",
      text: JSON.stringify({
        visualModels: VISUAL_MODELS.map(m => ({ name: m.name, desc: m.desc, keywords: m.keywords })),
        dialogueOptions: DIALOGUE_OPTIONS,
        musicOptions: MUSIC_OPTIONS,
        outputTypeOptions: OUTPUT_TYPE_OPTIONS,
        aspectRatios: ASPECT_RATIOS,
        durations: DURATIONS,
      }, null, 2),
    }],
  })
);

server.tool(
  "compose_veo3_prompt",
  "Assemble the Creative Director system + user prompt for a rough idea, WITHOUT calling any external model. Returns the composed instructions for the host model to execute. Use this to have the assistant itself write the cinematic Veo 3 brief.",
  inputShape,
  async (args) => {
    try {
      const { systemPrompt, userContent } = buildPromptPayload(args);
      return {
        content: [{
          type: "text",
          text: `Follow these Creative Director instructions exactly and output ONLY the finished Veo 3 brief.\n\n=== SYSTEM ===\n${systemPrompt}\n\n=== TASK ===\n${userContent}`,
        }],
      };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: err.message }] };
    }
  }
);

server.tool(
  "generate_veo3_prompt",
  "Generate a finished Veo 3 prompt by calling Gemini directly. Requires CREATIVE_API_KEY in the environment. If no key is set, use compose_veo3_prompt instead.",
  inputShape,
  async (args) => {
    if (!API_KEY) {
      return { isError: true, content: [{ type: "text", text: "CREATIVE_API_KEY is not set. Use compose_veo3_prompt to have the host model write the brief instead." }] };
    }
    try {
      const { systemPrompt, userContent } = buildPromptPayload(args);
      const text = await callGemini({ systemPrompt, userContent });
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: err.message }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("veo3-prompt-studio MCP server running on stdio");
