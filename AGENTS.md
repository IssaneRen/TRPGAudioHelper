# TRPG Lucius Helper Agents

This repository is a TRPG assistant workspace. The project now includes a reusable skill suite and four role-based agents for document analysis, rules adjudication, module restructuring, and story review.

## Primary workflow

1. Read the relevant skill first.
2. Use the matching agent when the task needs a specialized review pass.
3. Keep evidence, page numbers, and source paths visible in outputs.
4. Prefer structured notes over free-form brainstorming when analyzing modules or rules.
5. Use `scripts/trpg-workflow.ps1` for document reading and decomposition before doing manual analysis.

## 网页应用维护

- 阅读·书服务器书库仅 KP 登录可读；文件不得进入网站静态目录或代码仓库。发布前逐本在对话中发送书名、语言、来源与使用依据、原文件直链、实际大小（KB/MB）和 SHA-256，等用户明确批准。只收完整正文，不收链接占位、AI 示例、未经授权的译文或付费正文。书库审核与上线流程见 [阅读·书维护说明](docs/apps/xinzhi-reader.md)。

- 先同步最新 `origin/master`。`/apps/` 应用目录维护在 `src/pages/AppsDirectory/`，「阅读·书」源码在 `apps/xinzhi-reader/`。旧 `lucius_reading/` 仅作参考。
- 新增应用、日常构建和上线验收读 [网页应用维护](docs/apps/README.md)。提交与上线分别处理，推送会自动发布的分支前确认任务已授权上线。
- SSH 认证、主机校验或权限失败时，立即暂停发布，报告错误并等用户答复；改走 GitHub Actions 须用户明确授权。

## 世界观知识库

- 用户指定世界观请你查资料、回答或辅助创作时，用 `node scripts/query-knowledge.mjs --worlds` 核对名称。再用 `node scripts/query-knowledge.mjs "<世界观>" "<关键词>"` 读取该世界观的原文片段。
- 检索使用人物名、地点或设定名等短词，一个问题可分多次检索。答案标明条目或出处，资料缺失时如实说明。单次回答沿用用户指定的世界观范围。
- 知识条目只录入用户提交的正文，发布使用用户亲自写过或修改过的版本。演示检索使用已有资料。

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
- Wiki Markdown sources use `【加密字】...【/加密字】` for inline secrets and `【加密块】...【/加密块】` for block secrets. Prefer `加密字` / `secret-inline`; use `加密块` / `secret-panel` only for images, lists, headings, or large hidden sections that need a single masked block.
- When the suite changes, update the project report in `docs/reports/`.
- If a new skill becomes general-purpose, add it to the suite index before splitting it into a separate workflow.
- After editing `.claude/skills/`, run `scripts/sync-trpg-suite.ps1` so Codex receives the same skill markdown.

## Cross-tool notes

- Claude Code uses `.claude/skills/` and `.claude/agents/`.
- Cursor can read this file directly and can also use `.cursor/rules/` for reusable instructions.
- Codex should install the same skill markdown into `$CODEX_HOME/skills/` so the prompts are available outside this repository.
- The canonical document workflow is documented in `docs/skills/trpg-suite-workflow.md`.
