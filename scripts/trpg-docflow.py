#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
import textwrap
import zipfile
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Iterable
from xml.etree import ElementTree as ET
import zlib


W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


@dataclass
class Block:
    type: str
    text: str
    location: str
    level: int | None = None
    table_rows: list[list[str]] | None = None


@dataclass
class DocumentModel:
    kind: str
    source: str
    title: str | None
    metadata: dict[str, Any]
    blocks: list[Block]


def eprint(*args: Any) -> None:
    print(*args, file=sys.stderr)


def read_bytes(path: Path) -> bytes:
    return path.read_bytes()


def detect_kind(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return "pdf"
    if suffix == ".docx":
        return "docx"
    if suffix == ".doc":
        return "doc"
    return "unknown"


def decode_pdf_string_literal(raw: bytes) -> str:
    if raw.startswith(b"\xfe\xff"):
        try:
            return raw[2:].decode("utf-16-be", errors="replace")
        except Exception:
            pass
    if raw.startswith(b"\xff\xfe"):
        try:
            return raw[2:].decode("utf-16-le", errors="replace")
        except Exception:
            pass

    out = bytearray()
    i = 0
    while i < len(raw):
        ch = raw[i]
        if ch == 0x5C:  # backslash
            i += 1
            if i >= len(raw):
                break
            nxt = raw[i]
            if nxt in b"nrtbf()\\":
                mapping = {
                    ord("n"): b"\n",
                    ord("r"): b"\r",
                    ord("t"): b"\t",
                    ord("b"): b"\b",
                    ord("f"): b"\f",
                    ord("("): b"(",
                    ord(")"): b")",
                    ord("\\"): b"\\",
                }
                out.extend(mapping[nxt])
            elif nxt in (0x0D, 0x0A):
                if nxt == 0x0D and i + 1 < len(raw) and raw[i + 1] == 0x0A:
                    i += 1
            elif 48 <= nxt <= 55:
                digits = [nxt]
                for _ in range(2):
                    if i + 1 < len(raw) and 48 <= raw[i + 1] <= 55:
                        i += 1
                        digits.append(raw[i])
                    else:
                        break
                out.append(int(bytes(digits), 8))
            else:
                out.append(nxt)
        else:
            out.append(ch)
        i += 1

    for encoding in ("utf-8", "cp1252", "latin-1"):
        try:
            return out.decode(encoding)
        except Exception:
            continue
    return out.decode("latin-1", errors="replace")


def decode_pdf_hex_literal(raw: bytes) -> str:
    hex_text = re.sub(rb"\s+", b"", raw)
    if len(hex_text) % 2 == 1:
        hex_text += b"0"
    try:
        data = bytes.fromhex(hex_text.decode("ascii", errors="ignore"))
    except Exception:
        return ""
    if data.startswith(b"\xfe\xff"):
        try:
            return data[2:].decode("utf-16-be", errors="replace")
        except Exception:
            pass
    if data.startswith(b"\xff\xfe"):
        try:
            return data[2:].decode("utf-16-le", errors="replace")
        except Exception:
            pass
    for encoding in ("utf-8", "cp1252", "latin-1"):
        try:
            return data.decode(encoding)
        except Exception:
            continue
    return data.decode("latin-1", errors="replace")


def decode_pdf_token(token: bytes) -> str:
    token = token.strip()
    if not token:
        return ""
    if token.startswith(b"(") and token.endswith(b")"):
        return decode_pdf_string_literal(token[1:-1])
    if token.startswith(b"<") and token.endswith(b">"):
        return decode_pdf_hex_literal(token[1:-1])
    return token.decode("latin-1", errors="replace")


def decode_pdf_text_stream(data: bytes) -> str:
    text_chunks: list[str] = []

    token_re = re.compile(
        rb"(?s)(\[(?:.*?\])\s*TJ|\((?:\\.|[^()\\])*?\)\s*Tj|<[^<>]*?>\s*Tj|\((?:\\.|[^()\\])*?\)\s*'|\((?:\\.|[^()\\])*?\)\s*\"|T\*|Td|TD|ET)"
    )

    for match in token_re.finditer(data):
        token = match.group(1)
        if token in (b"T*", b"Td", b"TD", b"ET"):
            if text_chunks and not text_chunks[-1].endswith("\n"):
                text_chunks.append("\n")
            continue
        if token.startswith(b"[") and token.rstrip().endswith(b"TJ"):
            array_part = token[: token.rfind(b"]") + 1]
            string_tokens = re.findall(rb"\((?:\\.|[^()\\])*?\)|<[^<>]*?>", array_part)
            line = "".join(decode_pdf_token(t) for t in string_tokens)
            if line:
                text_chunks.append(line)
            continue
        if token.startswith(b"(") or token.startswith(b"<"):
            op = token.rsplit(None, 1)[-1]
            content = token[: token.rfind(op)].rstrip()
            line = decode_pdf_token(content)
            if line:
                text_chunks.append(line)
            if op in (b"'", b'"'):
                text_chunks.append("\n")
    text = "".join(text_chunks)
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_pdf_stream_bytes(obj_body: bytes) -> list[bytes]:
    streams: list[bytes] = []
    search_from = 0
    while True:
        stream_idx = obj_body.find(b"stream", search_from)
        if stream_idx == -1:
            break
        endstream_idx = obj_body.find(b"endstream", stream_idx)
        if endstream_idx == -1:
            break
        stream_start = stream_idx + len(b"stream")
        if obj_body[stream_start:stream_start + 2] == b"\r\n":
            stream_start += 2
        elif obj_body[stream_start:stream_start + 1] in (b"\r", b"\n"):
            stream_start += 1
        stream_data = obj_body[stream_start:endstream_idx]
        streams.append(stream_data)
        search_from = endstream_idx + len(b"endstream")
    return streams


def maybe_decompress_pdf_stream(obj_body: bytes, stream_data: bytes) -> bytes:
    if b"/FlateDecode" in obj_body:
        for wbits in (zlib.MAX_WBITS, -zlib.MAX_WBITS):
            try:
                return zlib.decompress(stream_data, wbits)
            except Exception:
                continue
    return stream_data


def parse_pdf_objects(raw: bytes) -> dict[int, bytes]:
    object_map: dict[int, bytes] = {}
    obj_re = re.compile(rb"(?s)(\d+)\s+(\d+)\s+obj\b(.*?)endobj")
    for match in obj_re.finditer(raw):
        obj_num = int(match.group(1))
        body = match.group(3).strip()
        object_map[obj_num] = body
    return object_map


def parse_ref(body: bytes, key: bytes) -> int | None:
    match = re.search(rb"/" + key + rb"\s+(\d+)\s+\d+\s+R", body)
    if match:
        return int(match.group(1))
    return None


def parse_ref_list(body: bytes, key: bytes) -> list[int]:
    match = re.search(rb"/" + key + rb"\s*\[(.*?)\]", body, re.S)
    if not match:
        single = parse_ref(body, key)
        return [single] if single is not None else []
    refs = [int(m.group(1)) for m in re.finditer(rb"(\d+)\s+\d+\s+R", match.group(1))]
    return refs


def extract_pdf_page_order(object_map: dict[int, bytes]) -> list[int]:
    catalog_ref = None
    for obj_num, body in object_map.items():
        if b"/Type /Catalog" in body:
            catalog_ref = obj_num
            break
    if catalog_ref is None:
        return sorted(
            [obj_num for obj_num, body in object_map.items() if b"/Type /Page" in body and b"/Type /Pages" not in body]
        )
    pages_root = parse_ref(object_map[catalog_ref], b"Pages")
    if pages_root is None:
        return sorted(
            [obj_num for obj_num, body in object_map.items() if b"/Type /Page" in body and b"/Type /Pages" not in body]
        )

    ordered: list[int] = []
    seen: set[int] = set()

    def walk(node: int) -> None:
        if node in seen:
            return
        seen.add(node)
        body = object_map.get(node, b"")
        if b"/Type /Page" in body and b"/Type /Pages" not in body:
            ordered.append(node)
            return
        if b"/Type /Pages" in body:
            for kid in parse_ref_list(body, b"Kids"):
                walk(kid)

    walk(pages_root)
    if ordered:
        return ordered
    return sorted(
        [obj_num for obj_num, body in object_map.items() if b"/Type /Page" in body and b"/Type /Pages" not in body]
    )


def extract_pdf_pages(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    raw = read_bytes(path)
    object_map = parse_pdf_objects(raw)
    page_order = extract_pdf_page_order(object_map)

    pages: list[dict[str, Any]] = []
    for index, obj_num in enumerate(page_order, start=1):
        body = object_map.get(obj_num, b"")
        content_refs = parse_ref_list(body, b"Contents")
        content_texts: list[str] = []
        warnings: list[str] = []
        for ref in content_refs:
            cbody = object_map.get(ref)
            if cbody is None:
                warnings.append(f"缺失内容对象 {ref}")
                continue
            streams = extract_pdf_stream_bytes(cbody)
            if not streams:
                continue
            for stream in streams:
                decoded = maybe_decompress_pdf_stream(cbody, stream)
                try:
                    content_texts.append(decode_pdf_text_stream(decoded))
                except Exception as exc:
                    warnings.append(f"内容流解析失败: {exc}")
        page_text = "\n\n".join(t for t in content_texts if t)
        if not page_text:
            warnings.append("未提取到可见文本，可能是扫描件或未支持的编码")
        pages.append(
            {
                "page": index,
                "object": obj_num,
                "text": page_text,
                "warnings": warnings,
            }
        )

    metadata = {
        "object_count": len(object_map),
        "page_count": len(pages),
    }
    return pages, metadata


def clean_text(s: str) -> str:
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def parse_docx_paragraph_text(elem: ET.Element) -> str:
    parts: list[str] = []
    for node in elem.iter():
        if node.tag == W_NS + "t" and node.text:
            parts.append(node.text)
        elif node.tag == W_NS + "tab":
            parts.append("\t")
        elif node.tag in (W_NS + "br", W_NS + "cr"):
            parts.append("\n")
        elif node.tag == W_NS + "lastRenderedPageBreak":
            parts.append("\n[[PAGE_BREAK]]\n")
    return clean_text("".join(parts))


def parse_docx_table(tbl: ET.Element) -> list[list[str]]:
    rows: list[list[str]] = []
    for row in tbl.findall(".//" + W_NS + "tr"):
        cells: list[str] = []
        for cell in row.findall(W_NS + "tc"):
            paras = [parse_docx_paragraph_text(p) for p in cell.findall(".//" + W_NS + "p")]
            cell_text = clean_text("\n".join([p for p in paras if p]))
            cells.append(cell_text)
        if cells:
            rows.append(cells)
    return rows


def parse_docx(path: Path) -> tuple[list[Block], dict[str, Any], str | None]:
    with zipfile.ZipFile(path) as zf:
        document_xml = zf.read("word/document.xml")
        root = ET.fromstring(document_xml)
        body = root.find(W_NS + "body")
        if body is None:
            raise ValueError("DOCX 缺少 body")

        rels = {}
        try:
            rels_xml = ET.fromstring(zf.read("word/_rels/document.xml.rels"))
            for rel in rels_xml.findall(R_NS + "Relationship"):
                rels[rel.attrib.get("Id", "")] = rel.attrib.get("Target", "")
        except KeyError:
            pass

        blocks: list[Block] = []
        para_index = 0
        table_index = 0
        for child in list(body):
            if child.tag == W_NS + "p":
                para_index += 1
                text = parse_docx_paragraph_text(child)
                if not text:
                    continue
                style_elem = child.find(".//" + W_NS + "pStyle")
                style = style_elem.attrib.get(W_NS + "val") if style_elem is not None else None
                level = None
                if style:
                    m = re.search(r"Heading(\d+)", style, re.I)
                    if m:
                        level = int(m.group(1))
                blocks.append(Block(type="paragraph", text=text, location=f"段落 {para_index}", level=level))
            elif child.tag == W_NS + "tbl":
                table_index += 1
                rows = parse_docx_table(child)
                text_rows = [" | ".join(row) for row in rows]
                blocks.append(
                    Block(
                        type="table",
                        text="\n".join(text_rows),
                        location=f"表格 {table_index}",
                        table_rows=rows,
                    )
                )
            else:
                continue

        image_count = sum(1 for target in rels.values() if "image" in target.lower())
        title = None
        try:
            core_xml = ET.fromstring(zf.read("docProps/core.xml"))
            title_elem = core_xml.find("{http://purl.org/dc/elements/1.1/}title")
            if title_elem is not None and title_elem.text:
                title = title_elem.text.strip()
        except KeyError:
            pass

        metadata = {
            "paragraph_count": para_index,
            "table_count": table_index,
            "image_count": image_count,
            "relationship_count": len(rels),
            "has_comments": "word/comments.xml" in zf.namelist(),
            "has_footnotes": "word/footnotes.xml" in zf.namelist(),
            "has_endnotes": "word/endnotes.xml" in zf.namelist(),
        }
        return blocks, metadata, title


def build_docx_nodes(blocks: list[Block]) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    current = {
        "id": 1,
        "title": "文档起始",
        "level": 0,
        "locations": [],
        "body": [],
    }

    def flush() -> None:
        nonlocal current
        if current["body"] or current["locations"]:
            current["summary"] = summarize_text("\n".join(current["body"]))
            nodes.append(current)
        current = {
            "id": len(nodes) + 1,
            "title": "未命名段落",
            "level": 0,
            "locations": [],
            "body": [],
        }

    for block in blocks:
        if block.level is not None and block.level <= 2 and block.type == "paragraph":
            if current["body"] or current["locations"]:
                flush()
            current["title"] = block.text[:120]
            current["level"] = block.level
            current["locations"].append(block.location)
            current["body"].append(block.text)
            continue

        if not current["body"] and block.type == "paragraph":
            current["title"] = block.text[:120]
        current["locations"].append(block.location)
        if block.type == "table":
            current["body"].append("[表格]")
            current["body"].append(block.text)
        else:
            current["body"].append(block.text)

    if current["body"] or current["locations"]:
        flush()
    return nodes


def looks_like_heading(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if len(stripped) > 90:
        return False
    if re.match(r"^(chapter|part|section|act|scene|episode)\b", stripped, re.I):
        return True
    if re.match(r"^\d+(\.\d+)*[).]?\s+\S+", stripped):
        return True
    alpha = sum(ch.isalpha() for ch in stripped)
    if alpha >= 6 and stripped == stripped.upper():
        return True
    if re.match(r"^[IVXLCM]+\.\s+\S+", stripped):
        return True
    return False


def split_paragraphs(text: str) -> list[str]:
    parts = [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]
    return parts


def build_pdf_nodes(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    def start_node(title: str, page_no: int) -> dict[str, Any]:
        return {
            "id": len(nodes) + 1,
            "title": title,
            "pages": [page_no],
            "body": [],
        }

    for page in pages:
        paragraphs = split_paragraphs(page["text"])
        for para in paragraphs:
            lines = [ln.strip() for ln in para.splitlines() if ln.strip()]
            candidate = lines[0] if lines else para.strip()
            if looks_like_heading(candidate):
                if current is not None:
                    current["summary"] = summarize_text("\n\n".join(current["body"]))
                    nodes.append(current)
                current = start_node(candidate, page["page"])
                current["body"].append(para)
                continue

            if current is None:
                current = start_node(f"第 {page['page']} 页", page["page"])
            elif page["page"] not in current["pages"]:
                current["pages"].append(page["page"])
            current["body"].append(para)

        if not paragraphs and current is not None and page["page"] not in current["pages"]:
            current["pages"].append(page["page"])

    if current is not None:
        current["summary"] = summarize_text("\n\n".join(current["body"]))
        nodes.append(current)
    return nodes


def summarize_text(text: str, limit: int = 180) -> str:
    cleaned = clean_text(text)
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "…"


def build_model(path: Path) -> DocumentModel:
    kind = detect_kind(path)
    if kind == "docx":
        blocks, metadata, title = parse_docx(path)
        metadata["source_kind"] = "docx"
        return DocumentModel(kind="docx", source=str(path), title=title, metadata=metadata, blocks=blocks)
    if kind == "pdf":
        pages, metadata = extract_pdf_pages(path)
        blocks: list[Block] = []
        for page in pages:
            text = page["text"]
            blocks.append(Block(type="page", text=text, location=f"第 {page['page']} 页"))
        metadata["source_kind"] = "pdf"
        metadata["pages"] = pages
        return DocumentModel(kind="pdf", source=str(path), title=None, metadata=metadata, blocks=blocks)
    raise ValueError(f"不支持的文件类型: {path.suffix}")


def model_to_read_markdown(model: DocumentModel) -> str:
    lines: list[str] = []
    lines.append(f"# 文档阅读报告")
    lines.append("")
    lines.append(f"- 来源: `{model.source}`")
    lines.append(f"- 类型: `{model.kind}`")
    if model.title:
        lines.append(f"- 标题: {model.title}")
    lines.append(f"- 元数据: `{json.dumps(model.metadata, ensure_ascii=False)}`")
    lines.append("")

    if model.kind == "pdf":
        pages = model.metadata.get("pages", [])
        for page in pages:
            lines.append(f"## 第 {page['page']} 页")
            if page.get("warnings"):
                lines.append("")
                for warning in page["warnings"]:
                    lines.append(f"- 警告: {warning}")
            lines.append("")
            page_text = page.get("text", "").strip()
            lines.append(page_text if page_text else "_未提取到文本_")
            lines.append("")
    else:
        for block in model.blocks:
            if block.type == "table":
                lines.append(f"## {block.location}")
                lines.append("")
                lines.append(block.text or "_空表格_")
                lines.append("")
            else:
                heading = block.text[:80].replace("\n", " ")
                if block.level is not None and block.level <= 3:
                    lines.append(f"## {heading}")
                else:
                    lines.append(f"### {block.location}")
                lines.append("")
                lines.append(block.text)
                lines.append("")
    return "\n".join(lines).strip() + "\n"


def model_to_decompose_markdown(model: DocumentModel) -> str:
    lines: list[str] = []
    lines.append("# 拆解报告")
    lines.append("")
    lines.append(f"- 来源: `{model.source}`")
    lines.append(f"- 类型: `{model.kind}`")
    if model.title:
        lines.append(f"- 标题: {model.title}")
    lines.append("")

    if model.kind == "docx":
        nodes = build_docx_nodes(model.blocks)
    else:
        pages = model.metadata.get("pages", [])
        nodes = build_pdf_nodes(pages)

    lines.append("## 节点表")
    lines.append("")
    lines.append("| ID | 标题 | 位置 | 摘要 |")
    lines.append("| --- | --- | --- | --- |")
    for node in nodes:
        if model.kind == "docx":
            location = ", ".join(node.get("locations", []))
            summary = node.get("summary", "")
        else:
            location = ", ".join([f"第 {p} 页" for p in node.get("pages", [])])
            summary = node.get("summary", "")
        title = str(node.get("title", "")).replace("|", "\\|")
        summary = str(summary).replace("|", "\\|")
        lines.append(f"| {node['id']} | {title} | {location} | {summary} |")

    lines.append("")
    lines.append("## 原始块")
    lines.append("")
    for idx, block in enumerate(model.blocks, start=1):
        lines.append(f"### 块 {idx}")
        lines.append(f"- 类型: `{block.type}`")
        lines.append(f"- 位置: {block.location}")
        if block.level is not None:
            lines.append(f"- 层级: `{block.level}`")
        lines.append("")
        lines.append(block.text if block.text else "_空_")
        lines.append("")

    return "\n".join(lines).strip() + "\n"


def model_to_json(model: DocumentModel) -> str:
    payload = {
        "kind": model.kind,
        "source": model.source,
        "title": model.title,
        "metadata": model.metadata,
        "blocks": [asdict(block) for block in model.blocks],
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def inspect_file(path: Path) -> dict[str, Any]:
    kind = detect_kind(path)
    info: dict[str, Any] = {
        "source": str(path),
        "kind": kind,
        "exists": path.exists(),
        "size": path.stat().st_size if path.exists() else None,
        "python": sys.version.split()[0],
    }
    if kind == "pdf":
        info["parser"] = "pure-python-best-effort"
        info["supports"] = ["text", "pages", "basic streams", "decomposition"]
    elif kind == "docx":
        info["parser"] = "zip+xml"
        info["supports"] = ["paragraphs", "tables", "styles", "images(rels)", "simple headings"]
    else:
        info["parser"] = "unsupported"
    return info


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="TRPG 文档工作流")
    sub = parser.add_subparsers(dest="command", required=True)

    for name in ("inspect", "read", "decompose"):
        cmd = sub.add_parser(name)
        cmd.add_argument("input", type=Path)
        cmd.add_argument("--format", choices=("md", "json"), default="md")

    args = parser.parse_args(argv)

    if args.command == "inspect":
        data = inspect_file(args.input)
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0

    if not args.input.exists():
        eprint(f"文件不存在: {args.input}")
        return 1

    try:
        model = build_model(args.input)
    except Exception as exc:
        eprint(f"解析失败: {exc}")
        return 2

    if args.command == "read":
        output = model_to_read_markdown(model) if args.format == "md" else model_to_json(model)
    else:
        output = model_to_decompose_markdown(model) if args.format == "md" else model_to_json(model)

    sys.stdout.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
