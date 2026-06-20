# Veo 3 Prompt Studio — MCP Server

Exposes the shared `core/` director engine as [Model Context Protocol](https://modelcontextprotocol.io)
tools, so the same Veo 3 prompt architecture works across Claude Desktop, Claude Code, Cursor,
and any other MCP client — from one implementation.

## Tools

- **`list_visual_models`** — returns the visual models and generation controls.
- **`compose_veo3_prompt`** — assembles the Creative Director system + user prompt for a rough
  idea and returns it for the host model to execute. No API key needed; the host LLM writes the brief.
- **`generate_veo3_prompt`** — calls Gemini directly and returns the finished brief. Requires
  `CREATIVE_API_KEY` in the environment.

All tools accept: `idea` (required), and optional `visualModel`, `dialogueMode`, `musicMode`,
`outputType`, `aspectRatio`, `duration`, `negativePrompt`, `modifier`.

## Install

```bash
cd mcp-server
npm install
```

## Connect

**Claude Code:**
```bash
claude mcp add veo3-prompt-studio -- node /absolute/path/to/veo3_prompt_improver/mcp-server/index.mjs
```

**Claude Desktop** — add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "veo3-prompt-studio": {
      "command": "node",
      "args": ["/absolute/path/to/veo3_prompt_improver/mcp-server/index.mjs"],
      "env": { "CREATIVE_API_KEY": "your_gemini_key_optional" }
    }
  }
}
```

`CREATIVE_API_KEY` is optional — omit it and use `compose_veo3_prompt` to have the host model
write the brief; set it to enable `generate_veo3_prompt`.

## Note

This server imports `../core/director.mjs`, so it stays in lockstep with the web backend and the
generated browser clients. Keep it inside the repo (or vendor `core/` alongside it).
