# CoC Card Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local/server Python CLI that renders consistent CoC character-card share images and documents the later SeaDice integration path.

**Architecture:** The renderer is a standalone Python module under `tools/coc-card-renderer/`. It reads one JSON character record, draws a 1400x2000 PNG using Pillow, and keeps visual assets/prompts beside the script. SeaDice integration remains research-only in this pass.

**Tech Stack:** Python 3, Pillow, standard-library `json`, `argparse`, `unittest`.

## Global Constraints

- User-facing prose is Simplified Chinese.
- Do not change unrelated historical code.
- Keep the first implementation runnable locally and on the server.
- Do not depend on `qrcode` yet; draw QR placeholder and social text blocks.

---

### Task 1: Renderer CLI

**Files:**
- Create: `tools/coc-card-renderer/render_coc_card.py`
- Create: `tools/coc-card-renderer/tests/test_render_coc_card.py`
- Create: `tools/coc-card-renderer/sample_character.json`

**Interfaces:**
- Produces: `load_character(path: str) -> dict`
- Produces: `render_card(character: dict, output_path: str, assets_dir: str | None = None) -> None`
- Produces: CLI `python render_coc_card.py sample_character.json --out output/demo.png`

- [ ] Write failing unittest that imports `render_coc_card`, renders sample data, and asserts output PNG exists with size `(1400, 2000)`.
- [ ] Run the unittest and verify it fails because the module does not exist.
- [ ] Implement `render_coc_card.py` with Pillow drawing helpers.
- [ ] Run the unittest and verify it passes.

### Task 2: Asset Prompt Pack

**Files:**
- Create: `tools/coc-card-renderer/assets/prompts.md`
- Create: `tools/coc-card-renderer/assets/.gitkeep`
- Create: `tools/coc-card-renderer/output/.gitkeep`
- Create: `tools/coc-card-renderer/README.md`

**Interfaces:**
- Produces prompt sections for background shell, icons, dividers, stamps, QR frame, and optional social footer.

- [ ] Add concise ChatGPT Image prompts.
- [ ] Document local and server usage.
- [ ] Document SeaDice phase-2 integration choices.

### Task 3: Verify

**Files:**
- Verify all files above.

- [ ] Run `python -m unittest discover -s tools/coc-card-renderer/tests -v`.
- [ ] Run sample CLI output to `tools/coc-card-renderer/output/demo.png`.
- [ ] Confirm PNG dimensions via Pillow.
