#!/usr/bin/env python3
"""Render a structured newspaper prop spec to a standalone HTML file."""

from __future__ import annotations

import html
import json
import sys
from pathlib import Path
from typing import Any


def esc(value: Any) -> str:
    return html.escape(str(value or ""), quote=True)


def paragraphs(values: list[str]) -> str:
    return "\n".join(f"<p>{esc(value)}</p>" for value in values if str(value).strip())


def body_values(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value]
    return []


def render_items(items: list[dict[str, Any]]) -> str:
    output: list[str] = []
    for item in items:
        output.append(
            "<article class=\"story\">"
            f"<h2>{esc(item.get('headline'))}</h2>"
            f"{paragraphs(body_values(item.get('body')))}"
            "</article>"
        )
    return "\n".join(output)


def render_classifieds(items: list[str]) -> str:
    if not items:
        return ""
    body = "".join(f"<li>{esc(item)}</li>" for item in items)
    return f"<section class=\"classifieds\"><h2>Small Advertisements</h2><ul>{body}</ul></section>"


def source_label(item: Any) -> str:
    if isinstance(item, dict):
        title = item.get("title") or item.get("id") or item.get("url") or "source"
        url = item.get("url")
        note = item.get("note")
        parts = [str(title)]
        if url:
            parts.append(str(url))
        if note:
            parts.append(str(note))
        return " - ".join(parts)
    return str(item)


def render_sources(items: list[Any]) -> str:
    if not items:
        return ""
    body = "".join(f"<li>{esc(source_label(item))}</li>" for item in items)
    return f"<aside class=\"sources\"><h2>Source Notes</h2><ol>{body}</ol></aside>"


def render(spec: dict[str, Any]) -> str:
    lead = spec.get("lead", {})
    css = r"""
:root {
  --paper: #efe4c8;
  --ink: #171512;
  --muted: #575047;
  --rule: #171512;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #2f2d29;
  color: var(--ink);
  font-family: Georgia, "Times New Roman", serif;
}
.page {
  width: 1080px;
  min-height: 1500px;
  padding: 54px 58px 64px;
  background:
    radial-gradient(circle at 20% 15%, rgba(255,255,255,.22), transparent 18%),
    linear-gradient(90deg, rgba(54,41,25,.06), transparent 18%, rgba(54,41,25,.05) 62%, transparent),
    var(--paper);
  box-shadow: 0 30px 70px rgba(0,0,0,.38);
}
.dateline, .deck, .price, .sources {
  color: var(--muted);
  font-size: 18px;
}
.masthead {
  display: grid;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 7px double var(--rule);
  text-align: center;
}
.masthead h1 {
  margin: 0;
  font-size: 88px;
  line-height: .9;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.masthead-row {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  padding: 5px 0;
  font-size: 16px;
  text-transform: uppercase;
}
.lead {
  padding: 22px 0 18px;
  border-bottom: 3px solid var(--rule);
}
.kicker {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
.lead h2 {
  margin: 0;
  font-size: 58px;
  line-height: .95;
  text-transform: uppercase;
}
.deck {
  margin: 10px 0 0;
  font-size: 23px;
  font-style: italic;
}
.columns {
  columns: 3 280px;
  column-gap: 28px;
  column-rule: 1px solid rgba(23,21,18,.55);
  padding-top: 18px;
  text-align: left;
}
.story {
  break-inside: avoid;
  margin: 0 0 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(23,21,18,.45);
}
.story h2, .classifieds h2, .sources h2 {
  margin: 0 0 7px;
  font-size: 24px;
  line-height: 1;
  text-transform: uppercase;
  text-align: left;
  word-spacing: 0;
}
p {
  margin: 0 0 9px;
  font-size: 18px;
  line-height: 1.23;
  text-align: left;
}
.classifieds {
  break-inside: avoid;
  border: 2px solid var(--rule);
  padding: 10px 12px;
  margin: 0 0 18px;
}
.classifieds ul {
  margin: 0;
  padding-left: 18px;
}
.classifieds li {
  margin-bottom: 7px;
  font-size: 16px;
  line-height: 1.18;
}
.sources {
  margin-top: 22px;
  padding-top: 10px;
  border-top: 1px dashed rgba(23,21,18,.5);
  font-family: system-ui, sans-serif;
  font-size: 12px;
}
.sources h2 { font-size: 13px; }
.sources ol { margin: 0; padding-left: 18px; }
@media print {
  body { background: white; }
  .page { box-shadow: none; }
}
"""
    body = f"""<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
  <title>{esc(spec.get('title', 'Newspaper Prop'))}</title>
  <style>{css}</style>
</head>
<body>
  <main class=\"page\">
    <header class=\"masthead\">
      <div class=\"masthead-row\"><span>{esc(spec.get('dateLine'))}</span><span>{esc(spec.get('price'))}</span></div>
      <h1>{esc(spec.get('title'))}</h1>
      <div class=\"masthead-row\"><span>{esc(spec.get('leftEar', 'Morning Edition'))}</span><span>{esc(spec.get('rightEar', 'London'))}</span></div>
    </header>
    <section class=\"lead\">
      <p class=\"kicker\">{esc(lead.get('kicker'))}</p>
      <h2>{esc(lead.get('headline'))}</h2>
      <p class=\"deck\">{esc(lead.get('deck'))}</p>
    </section>
    <section class=\"columns\">
      <article class=\"story\">{paragraphs(body_values(lead.get('body')))}</article>
      {render_items(spec.get('items', []))}
      {render_classifieds(spec.get('classifieds', []))}
    </section>
    {render_sources(spec.get('sources', [])) if spec.get('showSourcesInArtifact') else ''}
  </main>
</body>
</html>"""
    return body


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: render_newspaper.py spec.json output.html", file=sys.stderr)
        return 2
    spec_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    output_path.write_text(render(spec), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
