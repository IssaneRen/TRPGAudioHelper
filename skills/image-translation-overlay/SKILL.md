---
name: image-translation-overlay
description: Overlay translated text onto existing image artifacts by covering known source-text regions and drawing translated copy from a structured JSON spec. Use when Codex already knows or controls the original text, does not need OCR, and needs to create a translated reading copy of posters, newspapers, handouts, screenshots, or other text-heavy images.
---

# Image Translation Overlay

Use this skill to make a translated reading copy of an existing image when the source text is already known. Do not use OCR unless the user explicitly asks for OCR.

## Workflow

1. Collect source material.
   - Use the original image path.
   - Use the original text strings from the generated artifact, spec, HTML, or source document.
   - Translate the strings manually or with a language model, preserving meaning over word-for-word order.

2. Map text regions.
   - Identify a rectangle for each source text area: `[x, y, width, height]` in image pixels.
   - Keep the original image as the immersive version.
   - Make a separate reading-copy image with translated overlays.
   - Prefer coarse blocks over per-line boxes when the target language needs different line breaks.

3. Build an overlay spec.
   - Use `paperColor` or per-block `background` to cover the source text.
   - Use `font`, `fontSize`, `minFontSize`, `align`, `valign`, and `lineSpacing` to fit translated text.
   - Include `source` fields when useful for auditing, but render only `text`.

4. Render and inspect.
   - Run `scripts/overlay_translation.py`.
   - Verify the output image visually.
   - Check that translated text is legible, not clipped, and does not hide important non-text artwork.

## Script Quick Start

Create an overlay JSON:

```json
{
  "paperColor": "#eee5cf",
  "font": "/System/Library/Fonts/Hiragino Sans GB.ttc",
  "blocks": [
    {
      "box": [120, 80, 400, 60],
      "source": "Explorers Sought",
      "text": "招募探险家",
      "fontSize": 36,
      "align": "center",
      "style": "bold"
    }
  ]
}
```

Run:

```bash
python3 skills/image-translation-overlay/scripts/overlay_translation.py input.png overlay.json output.png
```

## Overlay Guidance

- Preserve the original image. Always save the translated reading copy as a new file.
- Use the image’s actual pixel dimensions when choosing coordinates.
- Keep background rectangles close to the original paper or panel color.
- For Chinese overlays, prefer a readable CJK font such as Hiragino Sans GB, STHeiti, Songti, or another available system font.
- Let the translated copy be practical: exact typographic fidelity is less important than readability at the table.
- If text does not fit, reduce the font size or split the block into shorter translation text.
