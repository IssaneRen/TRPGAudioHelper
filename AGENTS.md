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
- `check-server-logs` - Inspect server, Nginx, HTTPS, and AI Gateway logs without exposing secrets.

## Agents

- `module-analyst` - Decompose modules into scenes, clues, NPCs, locations, and dependencies.
- `rules-arbiter` - Adjudicate rules strictly and challenge weak interpretations.
- `strict-story-scorer` - Score story flow as a demanding player and identify frustration points.
- `module-optimizer` - Rewrite and refine modules while preserving intent and playability.

## Maintenance rules

- Keep user-facing prose in Chinese.
- Keep code identifiers, file names, and machine-readable keys in English.
- In wiki content, `magic-book` means an in-story fictional book or occult tome inside the setting. It must not be used for scenario books, rulebooks, sourcebooks, or real-world module publications.
- For `magic-book` entries, write the content as if composing the book, fragment, marginalia, catalog card, or redacted page itself. Do not treat the entry as an out-of-world book introduction.
- Wiki entries should preserve player immersion. Avoid meta-facing prose such as "PL 视角应该", "对 PL 来说", or "玩家可见层面"; rewrite it as in-world records, recollections, rumors, catalog notes, missing pages, or redacted passages.
- Use first-level hiding for readable-but-redacted wiki material: `secret-inline` for deity names, ritual names, and truth keywords; `secret-panel` / `hiddenMode: "mask"` for whole rumors or dossier blocks. These redactions protect mystery and prevent players from reading a wiki entry and immediately knowing the answer. Use `hiddenMode: "collapse"` only when the content should not appear in the public preview at all.
- When the suite changes, update the project report in `docs/reports/`.
- If a new skill becomes general-purpose, add it to the suite index before splitting it into a separate workflow.
- After editing `.claude/skills/`, run `scripts/sync-trpg-suite.ps1` so Codex receives the same skill markdown.

## Cross-tool notes

- Claude Code uses `.claude/skills/` and `.claude/agents/`.
- Cursor can read this file directly and can also use `.cursor/rules/` for reusable instructions.
- Codex should install the same skill markdown into `$CODEX_HOME/skills/` so the prompts are available outside this repository.
- The canonical document workflow is documented in `docs/skills/trpg-suite-workflow.md`.
