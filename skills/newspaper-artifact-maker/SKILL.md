---
name: newspaper-artifact-maker
description: Create historically grounded newspaper props and printable newspaper images from scenario briefs. Use when Codex needs to research real period news, write a diegetic newspaper article or classified notice, build a vintage newspaper layout as HTML/CSS, export PNG/PDF screenshots, or make TRPG handouts that mix fictional scenario hooks with verified real-world newspaper context.
---

# Newspaper Artifact Maker

Use this skill to make newspaper props that look like a real period artifact while keeping fictional scenario material clearly separated from verified historical news.

## Workflow

1. Parse the brief.
   - Identify the target date, city, language, newspaper title, fictional story hook, required dimensions, and output format.
   - If the user names a real publication, verify it existed on the target date.
   - If no title is specified, choose a real publication plausible for that place and date.

2. Research period facts.
   - Use primary or reputable secondary sources for real-world items.
   - Record source URL, date, and confidence for every non-fiction story.
   - Mark scenario material as fiction in internal notes, but keep the artifact itself diegetic.
   - Do not invent “real” filler news. If uncertain, use neutral advertisements, weather, shipping notices, theatre listings, or explicitly fictional classifieds.

3. Draft the page.
   - Put the user’s story where the reader will notice it: lead story, boxed advertisement, or editor’s notice.
   - Fill surrounding columns with real period events, dated near the requested issue.
   - Match vocabulary to the period, but keep text legible for modern players.
   - Avoid spoilers unless the user asks for Keeper-only material.

4. Build the artifact.
   - Prefer a deterministic HTML/CSS layout for text-heavy newspaper images.
   - Use `scripts/render_newspaper.py` when a structured spec is enough.
   - Use a custom HTML file only when the layout needs special composition.
   - Export with Playwright or browser screenshot at the requested pixel size.

5. Verify.
   - Inspect the rendered image visually.
   - Check that text does not overlap or disappear.
   - Confirm the masthead, issue date, and all non-fiction blurbs are source-backed.
   - Use an independent subagent reviewer for complex historical props or when the user asks for expert review.

## Script Quick Start

Create a JSON spec:

```json
{
  "title": "The Daily Express",
  "dateLine": "London, Monday, February 28, 1921",
  "price": "One Penny",
  "lead": {
    "headline": "Explorers Sought for Peruvian Antiquities Expedition",
    "kicker": "From Our London Correspondent",
    "body": ["Paragraph one.", "Paragraph two."]
  },
  "items": [
    { "headline": "London Conference Continues", "body": "Short real news item." }
  ],
  "classifieds": [
    "Passports arranged for South America. Apply by letter."
  ],
  "showSourcesInArtifact": false,
  "sources": [
    {
      "id": "source-id",
      "title": "Source title",
      "url": "https://example.com/source",
      "supports": "Which fact this source supports.",
      "confidence": "high"
    }
  ]
}
```

Run:

```bash
python3 skills/newspaper-artifact-maker/scripts/render_newspaper.py spec.json output.html
```

Then screenshot `output.html` with Playwright, the in-app browser, or another available browser automation tool. Keep `showSourcesInArtifact` false for immersive handouts unless the user explicitly wants visible citations on the image.

## Layout Guidance

- For 1920s London English papers, use a bold serif masthead, narrow justified columns, dense rules, small ads, and restrained ornament.
- Use `The Times`, `Daily Mail`, `Daily Express`, `Daily Herald`, or `Daily Sketch` only after checking the date and tone.
- Use page titles and headlines that sound like period journalism rather than modern marketing.
- For TRPG hooks, prefer notices, correspondent reports, society briefs, or museum/exploration columns.
- Keep the public artifact immersive. Put source notes outside the image, in an adjacent Markdown report or final answer.

## Source Discipline

Read `references/research-checklist.md` when the output mixes real history and fictional scenario content.
Read `references/webpage-automation.md` when browser automation, screenshots, or MCP/tool availability matter.
Read `references/jour-workbench-notes.md` when the user references `https://jour.yjykmedia.com/` or asks to replicate a newspaper workbench.
