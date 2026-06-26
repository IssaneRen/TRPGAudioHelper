#!/usr/bin/env python3
"""Download Chinese fonts used by the CoC card renderer."""

from __future__ import annotations

import urllib.request
from pathlib import Path


ASSETS_DIR = Path(__file__).resolve().parent / "assets"
FONTS = {
    "NotoSerifSC-Regular.otf": "https://github.com/notofonts/noto-cjk/raw/main/Serif/OTF/SimplifiedChinese/NotoSerifCJKsc-Regular.otf",
    "NotoSerifSC-Bold.otf": "https://github.com/notofonts/noto-cjk/raw/main/Serif/OTF/SimplifiedChinese/NotoSerifCJKsc-Bold.otf",
}


def download_font(filename: str, url: str) -> Path:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    output = ASSETS_DIR / filename
    if output.exists() and output.stat().st_size > 100_000:
        return output

    request = urllib.request.Request(url, headers={"User-Agent": "TRPG-coc-card-renderer/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read()
    if len(data) < 100_000:
        raise RuntimeError(f"downloaded font looks too small: {filename}")
    output.write_bytes(data)
    return output


def main() -> None:
    for filename, url in FONTS.items():
        path = download_font(filename, url)
        print(path)


if __name__ == "__main__":
    main()
