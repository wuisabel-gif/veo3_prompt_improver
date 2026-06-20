# Veo 3 Prompt Studio — Claude Skill

A [Claude skill](https://docs.claude.com/en/docs/claude-code/skills) that turns rough ideas into
structured, ultra-cinematic Veo 3 prompts. Same Creative Director system, 12 visual models, and
controls as the rest of this project — packaged so Claude can use it directly, no code or API key.

## Install

Copy the `veo3-director/` folder into a skills directory:

- **Per project:** `.claude/skills/veo3-director/`
- **All projects (user-level):** `~/.claude/skills/veo3-director/`

```bash
cp -r claude-skill/veo3-director ~/.claude/skills/
```

Restart Claude Code (or reload skills). It activates automatically when you ask for a Veo 3 /
cinematic video prompt, or invoke it explicitly.

## Use

> Write me a Veo 3 prompt: a girl dancing alone in a neon-lit Seoul apartment at dawn, K-Street, 9:16, music video

Claude will pick (or use) the visual model, apply the controls, and output the brief in the exact
director format — including `Technical specs` (aspect ratio + duration) and an `Avoid` line when you
give a negative prompt.

## Files

- `veo3-director/SKILL.md` — the skill (frontmatter + Creative Director instructions, models,
  controls, and a golden reference).
