#!/usr/bin/env python3
"""Render stable CoC7 character-card share images with pure Python drawing."""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import textwrap
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


CARD_SIZE = (1200, 1800)
SHELL_NAME = "card_shell.png"
AVATAR_FRAME_NAME = "avatar_frame.png"

INK = (43, 34, 28)
MUTED = (108, 93, 73)
FAINT = (208, 190, 152)
RED = (118, 39, 35)
DARK_RED = (82, 28, 28)
GOLD = (176, 137, 77)
PAPER = (233, 224, 202)
PAPER_DARK = (215, 197, 160)
PANEL = (247, 240, 224)
PANEL_ALT = (242, 233, 211)
WHITE = (255, 250, 238)


ATTRIBUTES = [
    ("STR", "力量"),
    ("CON", "体质"),
    ("SIZ", "体型"),
    ("DEX", "敏捷"),
    ("APP", "外貌"),
    ("INT", "智力"),
    ("POW", "意志"),
    ("EDU", "教育"),
]

DERIVED_STATS = [
    ("hp", "生命值 HP"),
    ("mp", "魔法值 MP"),
    ("san", "理智值 SAN"),
    ("luck", "幸运 LUCK"),
    ("mov", "移动力 MOV"),
    ("db", "伤害加值 DB"),
    ("build", "体格 BUILD"),
    ("dodge", "闪避 Dodge"),
    ("siz", "体型 SIZ"),
]

CLASSIC_1920S_SKILLS = [
    "会计",
    "人类学",
    "估价",
    "考古学",
    "魅惑",
    "攀爬",
    "信用评级",
    "克苏鲁神话",
    "乔装",
    "闪避",
    "汽车驾驶",
    "电气维修",
    "话术",
    "格斗",
    "射击",
    "急救",
    "历史",
    "恐吓",
    "跳跃",
    "母语",
    "法律",
    "图书馆使用",
    "聆听",
    "锁匠",
    "机械维修",
    "医学",
    "博物学",
    "导航",
    "神秘学",
    "操作重型机械",
    "外语",
    "说服",
    "驾驶",
    "心理学",
    "精神分析",
    "骑术",
    "妙手",
    "侦查",
    "潜行",
    "生存",
    "游泳",
    "投掷",
    "追踪",
    "艺术/手艺",
    "科学",
]

MODERN_SKILLS = [
    "会计",
    "人类学",
    "估价",
    "考古学",
    "魅惑",
    "攀爬",
    "计算机使用",
    "信用评级",
    "克苏鲁神话",
    "乔装",
    "闪避",
    "汽车驾驶",
    "电气维修",
    "电子学",
    "话术",
    "格斗",
    "射击",
    "急救",
    "历史",
    "恐吓",
    "跳跃",
    "母语",
    "法律",
    "图书馆使用",
    "聆听",
    "锁匠",
    "机械维修",
    "医学",
    "博物学",
    "导航",
    "神秘学",
    "操作重型机械",
    "外语",
    "说服",
    "驾驶",
    "心理学",
    "精神分析",
    "妙手",
    "侦查",
    "潜行",
    "生存",
    "游泳",
    "投掷",
    "追踪",
    "艺术/手艺",
    "科学",
]


def load_character(path: str) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as file:
        data = json.load(file)
    return normalize_character(data)


def normalize_character(data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("name"):
        raise ValueError("character JSON must include a non-empty 'name'")
    if not isinstance(data.get("attributes", {}), dict):
        raise ValueError("'attributes' must be an object")

    normalized = dict(data)
    normalized.setdefault("birth_date", "")
    normalized.setdefault("occupation", "")
    normalized.setdefault("birthplace", "")
    normalized.setdefault("residence", "")
    normalized.setdefault("native_language", "")
    normalized.setdefault("nationality", "")
    normalized.setdefault("era", "classic_1920s")
    normalized.setdefault("attributes", {})
    normalized.setdefault("derived", {})
    normalized.setdefault("skills", {})
    normalized.setdefault("items", [])
    normalized.setdefault("weapons", [])
    normalized.setdefault("notes", "")
    normalized.setdefault("notes_extra", "")
    normalized.setdefault("social", {})
    normalized.setdefault("avatar_path", "")
    normalized["attributes"] = _normalize_attribute_keys(normalized["attributes"])
    normalized["skills"] = _normalize_skills(normalized["skills"])
    normalized["derived"] = _normalize_derived(normalized)
    return normalized


def load_wiki_entry(path: str, project_root: str | None = None) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as file:
        entry = json.load(file)

    coc_data = _find_coc_data(entry.get("content", []))
    if not coc_data:
        raise ValueError("wiki entry does not contain a coc-sheet block")

    facts = {item.get("label"): item.get("value", "") for item in entry.get("facts", []) if isinstance(item, dict)}
    root = Path(project_root) if project_root else Path(path).resolve().parents[4]
    avatar = str(coc_data.get("avatar", ""))
    avatar_path = ""
    if avatar:
        avatar_path = str((root / "public" / avatar.lstrip("/")).resolve())

    character = {
        "name": entry.get("displayName") or facts.get("姓名") or entry.get("id"),
        "birth_date": facts.get("出生年月日") or facts.get("出生年份", ""),
        "occupation": facts.get("职业", ""),
        "birthplace": facts.get("出生地") or facts.get("故乡", ""),
        "residence": facts.get("居住地") or facts.get("住地", ""),
        "native_language": facts.get("母语", ""),
        "nationality": facts.get("目前国籍") or facts.get("国籍", ""),
        "era": coc_data.get("era") or _guess_era(entry),
        "attributes": coc_data.get("attributes", {}),
        "derived": coc_data.get("derived") or coc_data.get("attributes", {}),
        "skills": coc_data.get("skills", {}),
        "items": _extract_wiki_items(entry),
        "weapons": coc_data.get("weapons", []),
        "notes": _extract_wiki_notes(entry, max_paragraphs=4),
        "notes_extra": entry.get("summary", ""),
        "avatar_path": avatar_path,
        "social": {
            "name": "白羽档案馆",
            "handle": "社媒账号: @baiyu_trpg",
            "channel": "频道/群组: 请替换为公开入口",
        },
    }
    return normalize_character(character)


def get_skill_template(era: str = "classic_1920s") -> list[str]:
    normalized = (era or "classic_1920s").lower()
    if normalized in {"modern", "present", "now", "contemporary"}:
        return list(MODERN_SKILLS)
    return list(CLASSIC_1920S_SKILLS)


def render_card(
    character: dict[str, Any],
    output_path: str,
    assets_dir: str | None = None,
    project_root: str | None = None,
    reference_image: str | None = None,
) -> None:
    assets = Path(assets_dir) if assets_dir else Path(__file__).resolve().parent / "assets"
    character = normalize_character(character)
    image = _load_shell(assets)
    draw = ImageDraw.Draw(image)
    fonts = _FontSet(assets)

    _draw_dynamic_name(draw, fonts, character)
    _draw_dynamic_basic(draw, fonts, character)
    _draw_dynamic_attributes(draw, fonts, character)
    _draw_dynamic_derived(draw, fonts, character)
    _draw_dynamic_skills(draw, fonts, character)
    _draw_dynamic_items(draw, fonts, character)
    _draw_dynamic_story(draw, fonts, character)
    _draw_avatar(image, character, assets, project_root, reference_image)
    _draw_dynamic_footer(image, draw, fonts, character, assets)

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "PNG")


class _FontSet:
    """Pixel-sized Chinese font set."""

    def __init__(self, assets: Path) -> None:
        self.small = _load_font(assets, 12)
        self.medium = _load_font(assets, 16)
        self.medium_bold = _load_font(assets, 16, bold=True)
        self.large = _load_font(assets, 24)
        self.large_bold = _load_font(assets, 24, bold=True)
        self.xlarge = _load_font(assets, 32)
        self.xlarge_bold = _load_font(assets, 32, bold=True)


def _load_font(assets: Path, size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        assets / ("NotoSerifSC-Bold.otf" if bold else "NotoSerifSC-Regular.otf"),
        assets / ("NotoSansSC-Bold.ttf" if bold else "NotoSansSC-Regular.ttf"),
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        path = str(candidate)
        if path and os.path.exists(path):
            try:
                return ImageFont.truetype(path, size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def _load_shell(assets: Path) -> Image.Image:
    shell_path = assets / SHELL_NAME
    if shell_path.exists():
        return Image.open(shell_path).convert("RGB").resize(CARD_SIZE)
    return _draw_python_shell(assets)


def _draw_python_shell(assets: Path) -> Image.Image:
    image = _paper_texture(CARD_SIZE[0], CARD_SIZE[1])
    draw = ImageDraw.Draw(image)
    fonts = _FontSet(assets)

    _decorated_border(draw)
    draw.text((88, 70), "coc7th人物卡 by 白羽", font=fonts.small, fill=INK)
    _draw_ornament(draw, (570, 84), 110)

    _panel(draw, (62, 150, 735, 255), radius=16, title="")
    _panel(draw, (62, 286, 384, 610), radius=14)
    _title_rule(draw, fonts, (62, 286, 384, 610), "基本背景块")
    for index, label in enumerate(["出生年月日", "职业", "出生地", "居住地", "母语", "目前国籍"]):
        y = 350 + index * 42
        draw.text((88, y), label, font=fonts.medium, fill=INK)
        _soft_input(draw, (196, y - 5, 354, y + 25), radius=7)

    _panel(draw, (398, 286, 766, 610), radius=14)
    _title_rule(draw, fonts, (398, 286, 766, 610), "属性值块")
    for index, (_key, label) in enumerate(ATTRIBUTES):
        x = 420 + (index % 4) * 83
        y = 355 + (index // 4) * 120
        _stat_box(draw, (x, y, x + 72, y + 86), label)

    _draw_avatar_frame(image, draw, (790, 42, 1128, 480), assets, reference_image=None)

    _panel(draw, (62, 625, 510, 990), radius=14)
    _title_rule(draw, fonts, (62, 625, 510, 990), "基本数值块")
    for index, (_key, label) in enumerate(DERIVED_STATS):
        x = 82 + (index % 3) * 136
        y = 695 + (index // 3) * 98
        accent = index < 3
        _stat_box(draw, (x, y, x + 118, y + 78), label, accent=accent)

    _panel(draw, (524, 625, 1138, 990), radius=14)
    _title_rule(draw, fonts, (524, 625, 1138, 990), "技能值块")
    _draw_empty_skill_grid(draw)

    _panel(draw, (62, 1010, 1138, 1205), radius=14)
    _title_rule(draw, fonts, (62, 1010, 1138, 1205), "随身物品行")
    _draw_item_guides(draw)

    _story_panel(draw, fonts, (62, 1230, 1138, 1734))
    _footer_info_panel(draw, fonts, (790, 1566, 1114, 1720))
    return image


def _paper_texture(width: int, height: int) -> Image.Image:
    rng = random.Random(19280621)
    image = Image.new("RGB", (width, height), PAPER)
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            drift = int(10 * math.sin((x + y) / 73) + 5 * math.sin(y / 31))
            noise = rng.randint(-9, 9)
            base = PAPER
            pixels[x, y] = tuple(max(0, min(255, channel + drift + noise)) for channel in base)
    return image.filter(ImageFilter.GaussianBlur(0.35))


def _decorated_border(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((18, 18, 1182, 1782), radius=8, outline=INK, width=2)
    draw.rounded_rectangle((34, 34, 1166, 1766), radius=4, outline=GOLD, width=2)
    for x, y, sx, sy in [(46, 46, 1, 1), (1154, 46, -1, 1), (46, 1754, 1, -1), (1154, 1754, -1, -1)]:
        arc_rect = (x - 28 * sx, y - 28 * sy, x + 28 * sx, y + 28 * sy)
        x0, y0, x1, y1 = arc_rect
        draw.arc((min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)), 0, 360, fill=GOLD, width=2)
        draw.line((x, y, x + 46 * sx, y), fill=GOLD, width=2)
        draw.line((x, y, x, y + 46 * sy), fill=GOLD, width=2)


def _panel(draw: ImageDraw.ImageDraw, rect: tuple[int, int, int, int], radius: int = 14, title: str | None = None) -> None:
    draw.rounded_rectangle(rect, radius=radius, fill=PANEL, outline=MUTED, width=2)
    inset = 8
    draw.rounded_rectangle(
        (rect[0] + inset, rect[1] + inset, rect[2] - inset, rect[3] - inset),
        radius=max(4, radius - 6),
        outline=FAINT,
        width=1,
    )


def _title_rule(draw: ImageDraw.ImageDraw, fonts: _FontSet, rect: tuple[int, int, int, int], title: str) -> None:
    x0, y0, x1, _ = rect
    center = (x0 + x1) // 2
    y = y0 + 24
    draw.line((x0 + 56, y + 15, center - 64, y + 15), fill=GOLD, width=1)
    draw.line((center + 64, y + 15, x1 - 56, y + 15), fill=GOLD, width=1)
    tw = draw.textlength(title, font=fonts.large)
    draw.text((center - tw / 2, y), title, font=fonts.large, fill=INK)


def _soft_input(draw: ImageDraw.ImageDraw, rect: tuple[int, int, int, int], radius: int) -> None:
    draw.rounded_rectangle(rect, radius=radius, fill=(244, 237, 220), outline=(220, 202, 166), width=1)


def _stat_box(draw: ImageDraw.ImageDraw, rect: tuple[int, int, int, int], label: str, accent: bool = False) -> None:
    outline = RED if accent else MUTED
    draw.rounded_rectangle(rect, radius=8, fill=PANEL_ALT, outline=outline, width=2 if accent else 1)
    draw.rounded_rectangle((rect[0] + 7, rect[1] + 7, rect[2] - 7, rect[3] - 7), radius=5, outline=FAINT, width=1)
    draw.text((rect[0] + 10, rect[1] + 11), label, font=_load_font(Path(__file__).resolve().parent / "assets", 14), fill=INK)
    value_rect = (rect[0] + 17, rect[1] + 43, rect[2] - 17, rect[3] - 11)
    _soft_input(draw, value_rect, radius=7)


def _draw_empty_skill_grid(draw: ImageDraw.ImageDraw) -> None:
    start_x, start_y = 548, 680
    cell_w, cell_h = 104, 34
    gap_x, gap_y = 12, 12
    for row in range(6):
        for col in range(5):
            x = start_x + col * (cell_w + gap_x)
            y = start_y + row * (cell_h + gap_y)
            draw.rounded_rectangle((x, y, x + cell_w, y + cell_h), radius=6, fill=PANEL_ALT, outline=MUTED, width=1)
            split = x + 72
            draw.line((split, y + 4, split, y + cell_h - 4), fill=FAINT, width=1)


def _draw_item_guides(draw: ImageDraw.ImageDraw) -> None:
    for index in range(5):
        y = 1068 + index * 28
        draw.polygon([(88, y), (93, y + 5), (88, y + 10), (83, y + 5)], fill=FAINT)
        draw.line((106, y + 8, 560, y + 8), fill=(218, 204, 176), width=1)
        draw.line((616, y + 8, 1096, y + 8), fill=(218, 204, 176), width=1)


def _story_panel(draw: ImageDraw.ImageDraw, fonts: _FontSet, rect: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = rect
    points = [
        (x0 + 24, y0),
        (x1 - 24, y0),
        (x1, y0 + 24),
        (x1, y1 - 24),
        (x1 - 24, y1),
        (x0 + 24, y1),
        (x0, y1 - 24),
        (x0, y0 + 24),
    ]
    draw.polygon(points, fill=PANEL)
    draw.line(points + [points[0]], fill=MUTED, width=2)
    draw.line((x0 + 24, y0 + 12, x1 - 24, y0 + 12), fill=FAINT, width=1)
    split_y = y0 + 215
    draw.line((x0 + 20, split_y, x1 - 370, split_y), fill=FAINT, width=2)
    _center_title(draw, fonts, "背景故事行", (x0, y0 + 18, x1, y0 + 52))
    _center_title(draw, fonts, "背景故事（补充）", (x0 + 80, split_y + 16, x1 - 360, split_y + 52))


def _footer_info_panel(draw: ImageDraw.ImageDraw, fonts: _FontSet, rect: tuple[int, int, int, int]) -> None:
    _panel(draw, rect, radius=12)
    _center_title(draw, fonts, "白羽档案馆", (rect[0], rect[1] + 8, rect[2], rect[1] + 38), font=fonts.large)
    for index in range(3):
        y = rect[1] + 58 + index * 28
        _soft_input(draw, (rect[0] + 24, y, rect[0] + 184, y + 20), radius=5)
    draw.rounded_rectangle((rect[2] - 122, rect[1] + 52, rect[2] - 28, rect[1] + 146), radius=4, outline=GOLD, width=2)


def _center_title(
    draw: ImageDraw.ImageDraw,
    fonts: _FontSet,
    text: str,
    rect: tuple[int, int, int, int],
    font: ImageFont.ImageFont | None = None,
) -> None:
    selected = font or fonts.large
    tw = draw.textlength(text, font=selected)
    y = rect[1] + (rect[3] - rect[1] - _font_height(selected)) / 2
    draw.text(((rect[0] + rect[2] - tw) / 2, y), text, font=selected, fill=INK)


def _draw_ornament(draw: ImageDraw.ImageDraw, center: tuple[int, int], width: int) -> None:
    cx, cy = center
    draw.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), outline=FAINT, width=2)
    draw.line((cx - width, cy, cx - 24, cy), fill=FAINT, width=2)
    draw.line((cx + 24, cy, cx + width, cy), fill=FAINT, width=2)
    draw.arc((cx - 70, cy - 36, cx - 20, cy + 16), 190, 350, fill=FAINT, width=2)
    draw.arc((cx + 20, cy - 36, cx + 70, cy + 16), 190, 350, fill=FAINT, width=2)


def _draw_avatar_frame(
    image: Image.Image,
    draw: ImageDraw.ImageDraw,
    rect: tuple[int, int, int, int],
    assets: Path,
    reference_image: str | None,
) -> None:
    frame_path = assets / AVATAR_FRAME_NAME
    if frame_path.exists():
        frame = Image.open(frame_path).convert("RGBA").resize((rect[2] - rect[0], rect[3] - rect[1]))
        image.paste(frame.convert("RGB"), (rect[0], rect[1]), frame)
        return
    if reference_image:
        frame = extract_avatar_frame(reference_image, rect_size=(rect[2] - rect[0], rect[3] - rect[1]))
        image.paste(frame.convert("RGB"), (rect[0], rect[1]), frame)
        return

    draw.rounded_rectangle(rect, radius=18, fill=DARK_RED, outline=GOLD, width=4)
    inset = 28
    draw.rounded_rectangle((rect[0] + inset, rect[1] + inset, rect[2] - inset, rect[3] - inset), radius=8, fill=PANEL, outline=GOLD, width=3)
    for sx, sy in [(1, 1), (-1, 1), (1, -1), (-1, -1)]:
        cx = rect[0] + inset if sx == 1 else rect[2] - inset
        cy = rect[1] + inset if sy == 1 else rect[3] - inset
        draw.polygon([(cx, cy), (cx + 38 * sx, cy), (cx, cy + 38 * sy)], fill=(127, 98, 58), outline=GOLD)


def extract_avatar_frame(reference_image: str, rect_size: tuple[int, int] = (338, 438)) -> Image.Image:
    source = Image.open(reference_image).convert("RGBA")
    width, height = source.size
    crop = source.crop((int(width * 0.64), int(height * 0.02), int(width * 0.96), int(height * 0.27)))
    frame = crop.resize(rect_size)
    transparent = Image.new("RGBA", rect_size, (0, 0, 0, 0))
    transparent.alpha_composite(frame)
    mask = Image.new("L", rect_size, 255)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((58, 60, rect_size[0] - 58, rect_size[1] - 60), radius=8, fill=0)
    transparent.putalpha(mask)
    return transparent


def _draw_dynamic_name(draw: ImageDraw.ImageDraw, fonts: _FontSet, character: dict[str, Any]) -> None:
    draw.text((88, 172), _fit_text(draw, str(character["name"]), fonts.xlarge_bold, 590), font=fonts.xlarge_bold, fill=INK)


def _draw_dynamic_basic(draw: ImageDraw.ImageDraw, fonts: _FontSet, character: dict[str, Any]) -> None:
    fields = [
        character.get("birth_date", ""),
        character.get("occupation", ""),
        character.get("birthplace", ""),
        character.get("residence", ""),
        character.get("native_language", ""),
        character.get("nationality", ""),
    ]
    for index, value in enumerate(fields):
        y = 350 + index * 42
        draw.text((204, y), _fit_text(draw, str(value or ""), fonts.medium, 140), font=fonts.medium, fill=INK)


def _draw_dynamic_attributes(draw: ImageDraw.ImageDraw, fonts: _FontSet, character: dict[str, Any]) -> None:
    attrs = character.get("attributes", {})
    for index, (key, _label) in enumerate(ATTRIBUTES):
        x = 420 + (index % 4) * 83
        y = 355 + (index // 4) * 120
        _draw_centered_value(draw, str(attrs.get(key, "")), (x + 17, y + 43, x + 55, y + 75), fonts.large_bold)


def _draw_dynamic_derived(draw: ImageDraw.ImageDraw, fonts: _FontSet, character: dict[str, Any]) -> None:
    derived = character.get("derived", {})
    attrs = character.get("attributes", {})
    values = {
        "hp": derived.get("hp", ""),
        "mp": derived.get("mp", ""),
        "san": derived.get("san", ""),
        "luck": derived.get("luck", attrs.get("POW", "")),
        "mov": derived.get("mov", ""),
        "db": derived.get("db", ""),
        "build": derived.get("build", ""),
        "dodge": derived.get("dodge", ""),
        "siz": derived.get("siz", attrs.get("SIZ", "")),
    }
    for index, (key, _label) in enumerate(DERIVED_STATS):
        x = 82 + (index % 3) * 136
        y = 695 + (index // 3) * 98
        _draw_centered_value(draw, str(values.get(key, "")), (x + 17, y + 43, x + 101, y + 67), fonts.medium_bold)


def _draw_dynamic_skills(draw: ImageDraw.ImageDraw, fonts: _FontSet, character: dict[str, Any]) -> None:
    skills = _ordered_skills(character)
    start_x, start_y = 548, 680
    cell_w, cell_h = 104, 34
    gap_x, gap_y = 12, 12
    for index, (name, value) in enumerate(skills[:30]):
        row = index // 5
        col = index % 5
        x = start_x + col * (cell_w + gap_x)
        y = start_y + row * (cell_h + gap_y)
        draw.text((x + 6, y + 8), _fit_text(draw, name, fonts.small, 62), font=fonts.small, fill=INK)
        draw.text((x + 78, y + 8), _fit_text(draw, str(value), fonts.small, 22), font=fonts.small, fill=RED)


def _draw_dynamic_items(draw: ImageDraw.ImageDraw, fonts: _FontSet, character: dict[str, Any]) -> None:
    entries: list[str] = []
    entries.extend(str(item) for item in character.get("items", []))
    for weapon in character.get("weapons", []):
        entries.append(f"{weapon.get('name', '-')} / {weapon.get('skill', '-')} / {weapon.get('damage', '-')}")
    text = "；".join(entries)
    _draw_wrapped(draw, text, (92, 1060), fonts.medium, width_px=960, max_lines=5, line_height=28)


def _draw_dynamic_story(draw: ImageDraw.ImageDraw, fonts: _FontSet, character: dict[str, Any]) -> None:
    text = str(character.get("notes", ""))
    extra = str(character.get("notes_extra", ""))
    _draw_wrapped(draw, text, (92, 1305), fonts.medium, width_px=980, max_lines=5, line_height=30)
    _draw_wrapped(draw, extra, (104, 1510), fonts.medium, width_px=610, max_lines=5, line_height=30)


def _draw_avatar(image: Image.Image, character: dict[str, Any], assets: Path, project_root: str | None, reference_image: str | None) -> None:
    draw = ImageDraw.Draw(image)
    frame_rect = (790, 42, 1128, 480)
    _draw_avatar_frame(image, draw, frame_rect, assets, reference_image)

    avatar_path = str(character.get("avatar_path", ""))
    avatar_file = Path(avatar_path) if avatar_path else None
    if avatar_path.startswith("/") and not (avatar_file and avatar_file.exists()):
        root = Path(project_root) if project_root else Path.cwd()
        avatar_path = str(root / "public" / avatar_path.lstrip("/"))
    if not avatar_path or not Path(avatar_path).exists():
        return

    avatar = Image.open(avatar_path).convert("RGB")
    target = (frame_rect[0] + 58, frame_rect[1] + 60, frame_rect[2] - 58, frame_rect[3] - 60)
    avatar = ImageOps.fit(avatar, (target[2] - target[0], target[3] - target[1]), method=Image.Resampling.LANCZOS, centering=(0.5, 0.25))
    image.paste(avatar, (target[0], target[1]))
    _draw_avatar_frame(image, ImageDraw.Draw(image), frame_rect, assets, reference_image)


def _draw_dynamic_footer(image: Image.Image, draw: ImageDraw.ImageDraw, fonts: _FontSet, character: dict[str, Any], assets: Path) -> None:
    social = character.get("social", {})
    lines = [
        social.get("name", "白羽档案馆"),
        social.get("handle", "社媒账号: @baiyu_trpg"),
        social.get("channel", "频道/群组: 填写公开入口"),
    ]
    x, y = 814, 1624
    for line in lines:
        draw.text((x, y), _fit_text(draw, str(line), fonts.small, 170), font=fonts.small, fill=INK)
        y += 26

    qr_path_value = social.get("qr_image", "")
    qr_path = Path(qr_path_value) if qr_path_value else assets / "qr.png"
    if qr_path.exists():
        qr = Image.open(qr_path).convert("RGB").resize((92, 92))
        image.paste(qr, (988, 1620))
    else:
        _draw_fake_qr(draw, 988, 1620, 92)


def _ordered_skills(character: dict[str, Any]) -> list[tuple[str, str]]:
    provided = character.get("skills", {})
    template = get_skill_template(character.get("era", "classic_1920s"))
    names: list[str] = []
    for name in provided.keys():
        if name not in names:
            names.append(name)
    for name in template:
        if name not in names:
            names.append(name)
    result: list[tuple[str, str]] = []
    for name in names:
        value = provided.get(name, "")
        result.append((name, str(value)))
    return result


def _normalize_attribute_keys(attributes: dict[str, Any]) -> dict[str, Any]:
    mapping = {
        "str": "STR",
        "con": "CON",
        "siz": "SIZ",
        "dex": "DEX",
        "app": "APP",
        "int": "INT",
        "pow": "POW",
        "edu": "EDU",
    }
    normalized: dict[str, Any] = {}
    for key, value in attributes.items():
        normalized[mapping.get(str(key).lower(), str(key).upper())] = value
    return normalized


def _normalize_skills(skills: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for name, value in skills.items():
        if isinstance(value, dict):
            base = int(value.get("base", 0) or 0)
            growth = int(value.get("growth", 0) or 0)
            normalized[name] = base + growth
        else:
            normalized[name] = value
    return normalized


def _normalize_derived(character: dict[str, Any]) -> dict[str, Any]:
    attrs = character.get("attributes", {})
    raw = dict(character.get("derived", {}))
    low = {str(k).lower(): v for k, v in raw.items()}
    hp = _pair_value(low.get("hp") or low.get("maxhp"), low.get("maxhp"))
    mp = _pair_value(low.get("mp") or low.get("maxmp"), low.get("maxmp"))
    san = _pair_value(low.get("san") or low.get("maxsan"), low.get("maxsan") or 99)
    return {
        "hp": hp,
        "mp": mp,
        "san": san,
        "luck": raw.get("luck", low.get("luck", "")),
        "mov": raw.get("mov", low.get("mov", "")),
        "db": raw.get("db") or raw.get("damageBonus") or low.get("damagebonus") or raw.get("build", ""),
        "build": raw.get("build") or raw.get("physique") or low.get("physique", ""),
        "dodge": raw.get("dodge", low.get("dodge", "")),
        "siz": raw.get("siz", attrs.get("SIZ", "")),
    }


def _pair_value(current: Any, maximum: Any = None) -> str:
    if current is None or current == "":
        return ""
    text = str(current)
    if "/" in text:
        return text
    if maximum is None or maximum == "":
        return text
    return f"{text}/{maximum}"


def _find_coc_data(blocks: Iterable[Any]) -> dict[str, Any] | None:
    for block in blocks:
        if not isinstance(block, dict):
            continue
        if block.get("type") == "coc-sheet":
            return block.get("cocData") or block.get("sheet") or {}
        nested = block.get("blocks") or block.get("children")
        if isinstance(nested, list):
            found = _find_coc_data(nested)
            if found:
                return found
    return None


def _extract_wiki_items(entry: dict[str, Any]) -> list[str]:
    facts = entry.get("facts", [])
    values = []
    for fact in facts:
        if isinstance(fact, dict) and fact.get("label") in {"宝物", "随身物品", "重要之物"}:
            values.append(str(fact.get("value", "")))
    return values


def _extract_wiki_notes(entry: dict[str, Any], max_paragraphs: int) -> str:
    paragraphs: list[str] = []
    for block in entry.get("content", []):
        if not isinstance(block, dict) or block.get("type") != "paragraph":
            continue
        text = _tokens_to_text(block.get("tokens", []))
        if text:
            paragraphs.append(text)
        if len(paragraphs) >= max_paragraphs:
            break
    return "\n".join(paragraphs)


def _tokens_to_text(tokens: list[Any]) -> str:
    parts: list[str] = []
    for token in tokens:
        if not isinstance(token, dict):
            continue
        if token.get("type") == "text":
            parts.append(str(token.get("text", "")))
        elif token.get("type") == "ref":
            parts.append(str(token.get("label", "")))
    return "".join(parts).strip()


def _guess_era(entry: dict[str, Any]) -> str:
    text = json.dumps(entry, ensure_ascii=False)
    if any(word in text for word in ["现代", "2009", "2026", "手机", "计算机"]):
        return "modern"
    return "classic_1920s"


def _draw_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    font: ImageFont.ImageFont,
    width_px: int,
    max_lines: int,
    line_height: int,
) -> None:
    if not text:
        return
    x, y = xy
    lines: list[str] = []
    for paragraph in text.splitlines():
        lines.extend(_wrap_by_pixels(draw, paragraph, font, width_px))
    for line in lines[:max_lines]:
        draw.text((x, y), line, font=font, fill=INK)
        y += line_height


def _wrap_by_pixels(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, width_px: int) -> list[str]:
    rough = max(8, width_px // max(10, _font_height(font)))
    result: list[str] = []
    for candidate in textwrap.wrap(text, width=rough, replace_whitespace=False):
        line = candidate
        while line and draw.textlength(line, font=font) > width_px:
            cut = len(line) - 1
            while cut > 0 and draw.textlength(line[:cut], font=font) > width_px:
                cut -= 1
            result.append(line[:cut])
            line = line[cut:]
        if line:
            result.append(line)
    return result or [text]


def _draw_centered_value(draw: ImageDraw.ImageDraw, text: str, rect: tuple[int, int, int, int], font: ImageFont.ImageFont) -> None:
    if not text:
        return
    selected = font
    if draw.textlength(text, font=font) > rect[2] - rect[0] - 4:
        selected = _load_font(Path(__file__).resolve().parent / "assets", 16, bold=True)
    tw = draw.textlength(text, font=selected)
    th = _font_height(selected)
    draw.text((rect[0] + (rect[2] - rect[0] - tw) / 2, rect[1] + (rect[3] - rect[1] - th) / 2), text, font=selected, fill=INK)


def _fit_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> str:
    if draw.textlength(text, font=font) <= max_width:
        return text
    suffix = "..."
    trimmed = text
    while trimmed and draw.textlength(trimmed + suffix, font=font) > max_width:
        trimmed = trimmed[:-1]
    return trimmed + suffix if trimmed else suffix


def _font_height(font: ImageFont.ImageFont) -> int:
    bbox = font.getbbox("国")
    return bbox[3] - bbox[1]


def _draw_fake_qr(draw: ImageDraw.ImageDraw, x: int, y: int, size: int) -> None:
    cell = size // 11
    for row in range(11):
        for col in range(11):
            finder = (row < 3 and col < 3) or (row < 3 and col > 7) or (row > 7 and col < 3)
            fill = INK if finder or (row * 7 + col * 5 + row * col) % 4 == 0 else WHITE
            draw.rectangle((x + col * cell, y + row * cell, x + (col + 1) * cell - 1, y + (row + 1) * cell - 1), fill=fill)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render a CoC7 character card image.")
    parser.add_argument("character_json", help="Path to character JSON or wiki entry JSON.")
    parser.add_argument("--out", default="output/card.png", help="Output PNG path.")
    parser.add_argument("--assets-dir", default=None, help="Optional assets directory containing fonts, avatar_frame.png, qr.png.")
    parser.add_argument("--project-root", default=None, help="Project root used to resolve wiki avatar paths.")
    parser.add_argument("--wiki-entry", action="store_true", help="Read input as a project wiki entry containing a coc-sheet block.")
    parser.add_argument("--era", choices=["classic_1920s", "modern"], default=None, help="Override skill template era.")
    parser.add_argument("--reference-image", default=None, help="Optional generated image used only to crop the decorative avatar frame.")
    parser.add_argument("--extract-avatar-frame", default=None, help="Crop avatar frame from reference image and save it to this PNG path.")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    if args.extract_avatar_frame:
        if not args.reference_image:
            raise SystemExit("--extract-avatar-frame requires --reference-image")
        output = Path(args.extract_avatar_frame)
        output.parent.mkdir(parents=True, exist_ok=True)
        extract_avatar_frame(args.reference_image).save(output, "PNG")
        print(output)
        return

    if args.wiki_entry:
        character = load_wiki_entry(args.character_json, project_root=args.project_root)
    else:
        character = load_character(args.character_json)
    if args.era:
        character["era"] = args.era
    render_card(character, args.out, args.assets_dir, args.project_root, args.reference_image)
    print(args.out)


if __name__ == "__main__":
    main()
