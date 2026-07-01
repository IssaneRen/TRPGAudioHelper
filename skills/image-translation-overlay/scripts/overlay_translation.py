#!/usr/bin/env python3
"""Cover known text regions in an image and draw translated text."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


DEFAULT_FONT_CANDIDATES = [
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/Supplemental/Songti.ttc",
    "/System/Library/Fonts/HelveticaNeue.ttc",
]


def parse_color(value: str | None, fallback: str) -> tuple[int, int, int, int]:
    color = (value or fallback).strip()
    if color.startswith("#"):
        hex_value = color[1:]
        if len(hex_value) == 6:
            r = int(hex_value[0:2], 16)
            g = int(hex_value[2:4], 16)
            b = int(hex_value[4:6], 16)
            return (r, g, b, 255)
        if len(hex_value) == 8:
            r = int(hex_value[0:2], 16)
            g = int(hex_value[2:4], 16)
            b = int(hex_value[4:6], 16)
            a = int(hex_value[6:8], 16)
            return (r, g, b, a)
    raise ValueError(f"Unsupported color: {value!r}")


def find_font(path: str | None, size: int) -> ImageFont.FreeTypeFont:
    candidates = [path] if path else []
    candidates.extend(DEFAULT_FONT_CANDIDATES)
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default(size=size)


def text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> int:
    if not text:
        return 0
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in str(text).split("\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            lines.append("")
            continue
        current = ""
        for char in paragraph:
            candidate = current + char
            if current and text_width(draw, candidate, font) > max_width:
                lines.append(current.rstrip())
                current = char.lstrip()
            else:
                current = candidate
        if current:
            lines.append(current.rstrip())
    return lines


def line_height(font: ImageFont.ImageFont, spacing: float) -> int:
    bbox = font.getbbox("测Ay")
    return max(1, int((bbox[3] - bbox[1]) * spacing))


def fit_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font_path: str | None,
    start_size: int,
    min_size: int,
    max_width: int,
    max_height: int,
    spacing: float,
) -> tuple[ImageFont.ImageFont, list[str], int]:
    for size in range(start_size, min_size - 1, -1):
        font = find_font(font_path, size)
        lines = wrap_text(draw, text, font, max_width)
        height = line_height(font, spacing) * max(1, len(lines))
        if height <= max_height:
            return font, lines, line_height(font, spacing)
    font = find_font(font_path, min_size)
    return font, wrap_text(draw, text, font, max_width), line_height(font, spacing)


def draw_block(base: Image.Image, draw: ImageDraw.ImageDraw, block: dict[str, Any], defaults: dict[str, Any]) -> None:
    x, y, width, height = [int(value) for value in block["box"]]
    padding = int(block.get("padding", defaults.get("padding", 6)))
    background = block.get("background", defaults.get("paperColor", "#eee5cf"))
    fill = block.get("fill", defaults.get("inkColor", "#171512"))
    if block.get("cover", True):
        draw.rectangle([x, y, x + width, y + height], fill=parse_color(background, "#eee5cf"))

    text = str(block.get("text", ""))
    font_path = block.get("font", defaults.get("font"))
    font_size = int(block.get("fontSize", defaults.get("fontSize", 24)))
    min_size = int(block.get("minFontSize", defaults.get("minFontSize", 12)))
    spacing = float(block.get("lineSpacing", defaults.get("lineSpacing", 1.18)))
    align = block.get("align", defaults.get("align", "left"))
    valign = block.get("valign", defaults.get("valign", "top"))

    text_x = x + padding
    text_y = y + padding
    text_w = max(1, width - padding * 2)
    text_h = max(1, height - padding * 2)
    font, lines, leading = fit_text(draw, text, font_path, font_size, min_size, text_w, text_h, spacing)
    total_h = leading * len(lines)
    if valign == "middle":
        text_y += max(0, (text_h - total_h) // 2)
    elif valign == "bottom":
        text_y += max(0, text_h - total_h)

    color = parse_color(fill, "#171512")
    for line in lines:
        line_w = text_width(draw, line, font)
        if align == "center":
            line_x = text_x + max(0, (text_w - line_w) // 2)
        elif align == "right":
            line_x = text_x + max(0, text_w - line_w)
        else:
            line_x = text_x
        draw.text((line_x, text_y), line, font=font, fill=color)
        text_y += leading


def render(input_path: Path, spec_path: Path, output_path: Path) -> None:
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    image = Image.open(input_path).convert("RGBA")
    draw = ImageDraw.Draw(image)
    defaults = dict(spec)
    for block in spec.get("blocks", []):
        draw_block(image, draw, block, defaults)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(output_path)


def main() -> int:
    if len(sys.argv) != 4:
        print("Usage: overlay_translation.py input.png overlay.json output.png", file=sys.stderr)
        return 2
    render(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
