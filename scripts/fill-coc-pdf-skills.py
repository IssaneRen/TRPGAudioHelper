#!/usr/bin/env python3
from __future__ import annotations

import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path("E:/TRPG")
OUT_SUFFIX = "_skills_filled"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def find_input_paths() -> tuple[Path, Path]:
    card_dir = next(p for p in ROOT.iterdir() if p.name.startswith("C"))
    pdf = next(
        p
        for p in card_dir.iterdir()
        if p.suffix.lower() == ".pdf"
        and p.name.startswith("CoC_")
        and "KP" in p.name
        and "backUP" not in p.name
        and OUT_SUFFIX not in p.stem
    )
    xlsx = next(
        p
        for p in card_dir.iterdir()
        if p.name.endswith("CY23.2.xlsx") and not p.name.startswith("~$")
    )
    return pdf, xlsx


def load_sheet1_values(xlsx: Path) -> tuple[dict[str, str], dict[str, str]]:
    with zipfile.ZipFile(xlsx) as zf:
        shared: list[str] = []
        shared_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        for si in shared_root.findall("m:si", NS):
            shared.append(
                "".join(
                    t.text or ""
                    for t in si.iter(
                        "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"
                    )
                )
            )

        sheet = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))
        values: dict[str, str] = {}
        formulas: dict[str, str] = {}
        for cell in sheet.findall(".//m:c", NS):
            ref = cell.attrib.get("r")
            if not ref:
                continue
            cell_type = cell.attrib.get("t")
            v = cell.find("m:v", NS)
            f = cell.find("m:f", NS)
            inline = cell.find("m:is", NS)
            value = ""
            if cell_type == "s" and v is not None:
                value = shared[int(v.text or "0")]
            elif cell_type == "inlineStr" and inline is not None:
                value = "".join(
                    t.text or ""
                    for t in inline.iter(
                        "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"
                    )
                )
            elif v is not None:
                value = v.text or ""
            values[ref] = value
            if f is not None:
                formulas[ref] = f.text or ""
        return values, formulas


def cell_value(values: dict[str, str], formulas: dict[str, str], ref: str) -> str:
    formula = formulas.get(ref, "")
    if ref == "J29" and "DEX" in formula:
        return "1/2DEX"
    if ref == "J49" and formula == "AG5":
        return "EDU"
    raw = values.get(ref, "")
    if raw == "":
        return "0"
    try:
        number = float(raw)
        if number.is_integer():
            return str(int(number))
    except ValueError:
        pass
    return raw


def normalize_name(name: str, sub: str = "") -> str:
    name = name.replace(" Ω", "").strip()
    if name == "格斗：" and sub:
        return f"格斗（{sub}）"
    if name == "射击：" and sub:
        return f"射击（{sub}）"
    if name.endswith("："):
        return f"{name[:-1]}①"
    return name


def build_skill_rows(xlsx: Path) -> tuple[list[tuple[str, str]], list[tuple[str, str]]]:
    values, formulas = load_sheet1_values(xlsx)

    left: list[tuple[str, str]] = []
    for row in range(16, 50):
        name = values.get(f"F{row}", "")
        if not name or name.startswith("技艺"):
            continue
        name = normalize_name(name, values.get(f"H{row}", ""))
        left.append((name, cell_value(values, formulas, f"J{row}")))

    right: list[tuple[str, str]] = []
    for row in range(16, 49):
        name = values.get(f"AB{row}", "")
        if not name:
            continue
        name = normalize_name(name, values.get(f"AD{row}", ""))
        right.append((name, cell_value(values, formulas, f"AF{row}")))

    if len(left) > 33 or len(right) > 33:
        raise ValueError(f"skill rows exceed PDF grid: left={len(left)} right={len(right)}")
    return left, right


def pdf_escape_text(text: str) -> str:
    # Existing page resources include /KSPF9 as SimSun with GBK-EUC-H encoding.
    return text.encode("gbk").hex().upper()


def text_width(text: str, fontsize: float) -> float:
    width = 0.0
    for ch in text:
        width += fontsize * (1.0 if ord(ch) > 127 else 0.52)
    return width


def add_text(
    commands: list[str],
    text: str,
    cell_left: float,
    cell_right: float,
    baseline_y: float,
    fontsize: float,
    color: tuple[float, float, float] = (0.10, 0.10, 0.10),
) -> None:
    x = (cell_left + cell_right - text_width(text, fontsize)) / 2
    commands.append(
        "q\n"
        "BT\n"
        f"/KSPF9 {fontsize:.2f} Tf\n"
        f"{color[0]:.3f} {color[1]:.3f} {color[2]:.3f} rg\n"
        f"1 0 0 1 {x:.3f} {baseline_y:.3f} Tm\n"
        f"<{pdf_escape_text(text)}> Tj\n"
        "ET\n"
        "Q\n"
    )


def add_cover(commands: list[str], x: float, y: float, w: float, h: float) -> None:
    # Tiny covers only remove earlier bad manual text artifacts.
    commands.append(f"q\n1 1 1 rg\n{x:.3f} {y:.3f} {w:.3f} {h:.3f} re\nf\nQ\n")


def build_overlay_stream(left: list[tuple[str, str]], right: list[tuple[str, str]]) -> bytes:
    top = 590.0
    bottom = 300.0
    rows = 33
    row_h = (top - bottom) / rows
    fontsize = 5.1
    y_offset = 1.25

    left_name = (15.0, 160.34)
    left_value = (160.34, 205.06)
    right_name = (300.50, 445.84)
    right_value = (445.84, 490.56)

    commands: list[str] = []
    # Existing hand-written attempts in the skill-name column rendered as stray Latin glyphs.
    add_cover(commands, 88.2, 440.7, 12.0, 7.0)
    add_cover(commands, 93.3, 502.6, 12.0, 7.0)

    for idx, (name, value) in enumerate(left):
        y_center = top - row_h * (idx + 0.5)
        baseline = y_center - y_offset
        add_text(commands, name, *left_name, baseline, fontsize)
        # Rows 1 and 3 were already hand-filled with correctly centered "5".
        if idx not in {0, 2}:
            add_text(commands, value, *left_value, baseline, fontsize)

    for idx, (name, value) in enumerate(right):
        y_center = top - row_h * (idx + 0.5)
        baseline = y_center - y_offset
        add_text(commands, name, *right_name, baseline, fontsize)
        add_text(commands, value, *right_value, baseline, fontsize)

    return "".join(commands).encode("ascii")


def extract_object(pdf_bytes: bytes, obj_num: int) -> bytes:
    match = re.search(rb"(?m)^%d\s+0\s+obj\b" % obj_num, pdf_bytes)
    if not match:
        raise ValueError(f"object {obj_num} not found")
    end = pdf_bytes.find(b"endobj", match.end())
    return pdf_bytes[match.end() : end]


def append_incremental_pdf(pdf_path: Path, overlay: bytes) -> Path:
    original = pdf_path.read_bytes()
    old_startxref_match = re.search(rb"startxref\s+(\d+)\s+%%EOF\s*$", original)
    if not old_startxref_match:
        raise ValueError("cannot find final startxref")
    old_startxref = int(old_startxref_match.group(1))

    trailer_match = re.search(rb"trailer\s*<<(.*?)>>\s*startxref\s+\d+\s+%%EOF\s*$", original, re.S)
    if not trailer_match:
        raise ValueError("cannot find final trailer")
    trailer_body = trailer_match.group(1)
    root_ref = re.search(rb"/Root\s+\d+\s+0\s+R", trailer_body).group(0)
    info_ref_match = re.search(rb"/Info\s+\d+\s+0\s+R", trailer_body)
    id_match = re.search(rb"/ID\s*\[[^\]]+\]", trailer_body, re.S)

    page = extract_object(original, 5).strip()
    updated_page = page.replace(b"/Contents 49 0 R", b"/Contents[49 0 R 50 0 R]")

    chunks: list[bytes] = []
    offsets: dict[int, int] = {}

    offsets[5] = len(original) + sum(len(c) for c in chunks)
    chunks.append(b"5 0 obj\n" + updated_page + b"\nendobj\n")

    stream_obj = (
        b"50 0 obj\n<< /Length "
        + str(len(overlay)).encode("ascii")
        + b" >>\nstream\n"
        + overlay
        + b"\nendstream\nendobj\n"
    )
    offsets[50] = len(original) + sum(len(c) for c in chunks)
    chunks.append(stream_obj)

    xref_start = len(original) + sum(len(c) for c in chunks)
    xref = (
        b"xref\n"
        b"5 1\n"
        + f"{offsets[5]:010d} 00000 n \n".encode("ascii")
        + b"50 1\n"
        + f"{offsets[50]:010d} 00000 n \n".encode("ascii")
    )

    trailer_parts = [b"<< /Size 51 ", root_ref]
    if info_ref_match:
        trailer_parts.extend([b" ", info_ref_match.group(0)])
    trailer_parts.extend([b" /Prev ", str(old_startxref).encode("ascii")])
    if id_match:
        trailer_parts.extend([b" ", id_match.group(0)])
    trailer_parts.append(b" >>")
    trailer = (
        b"trailer\n"
        + b"".join(trailer_parts)
        + b"\nstartxref\n"
        + str(xref_start).encode("ascii")
        + b"\n%%EOF\n"
    )

    out = pdf_path.with_name(pdf_path.stem + OUT_SUFFIX + pdf_path.suffix)
    out.write_bytes(original + b"".join(chunks) + xref + trailer)
    return out


def main() -> None:
    pdf, xlsx = find_input_paths()
    left, right = build_skill_rows(xlsx)
    overlay = build_overlay_stream(left, right)
    out = append_incremental_pdf(pdf, overlay)
    print(f"source_pdf={pdf}")
    print(f"source_xlsx={xlsx}")
    print(f"left_skill_rows={len(left)} right_skill_rows={len(right)}")
    print(f"output_pdf={out}")


if __name__ == "__main__":
    main()
