# TRPG Lucius Helper Agents

This repository is a TRPG assistant workspace. The project now includes a reusable skill suite and four role-based agents for document analysis, rules adjudication, module restructuring, and story review.

## Primary workflow

1. Read the relevant skill first.
2. Use the matching agent when the task needs a specialized review pass.
3. Keep evidence, page numbers, and source paths visible in outputs.
4. Prefer structured notes over free-form brainstorming when analyzing modules or rules.
5. Use `scripts/trpg-workflow.ps1` for document reading and decomposition before doing manual analysis.

## Skills

- `trpg-document-reader` - Read PDFs and Word files, extract text, tables, images, and layout cues.
- `pdf-decomposer` - Break PDFs into sections, nodes, and dependency maps.
- `resource-channel-curator` - Collect web resources from target locations and maintain a source registry.
- `trpg-rules-analyst` - Read rulebooks, normalize mechanics, and separate RAW / RAI / inference.
- `module-clue-analyst` - Read modules and turn them into clue graphs, timelines, and dependency chains.
- `plot-foreshadowing-architect` - Improve plotting, foreshadowing, reveals, and payoff structure.

## Agents

- `module-analyst` - Decompose modules into scenes, clues, NPCs, locations, and dependencies.
- `rules-arbiter` - Adjudicate rules strictly and challenge weak interpretations.
- `strict-story-scorer` - Score story flow as a demanding player and identify frustration points.
- `module-optimizer` - Rewrite and refine modules while preserving intent and playability.

## Maintenance rules

- Keep user-facing prose in Chinese.
- Keep code identifiers, file names, and machine-readable keys in English.
- When the suite changes, update the project report in `docs/reports/`.
- If a new skill becomes general-purpose, add it to the suite index before splitting it into a separate workflow.
- After editing `.claude/skills/`, run `scripts/sync-trpg-suite.ps1` so Codex receives the same skill markdown.

## Cross-tool notes

- Claude Code uses `.claude/skills/` and `.claude/agents/`.
- Cursor can read this file directly and can also use `.cursor/rules/` for reusable instructions.
- Codex should install the same skill markdown into `$CODEX_HOME/skills/` so the prompts are available outside this repository.
- The canonical document workflow is documented in `docs/skills/trpg-suite-workflow.md`.
