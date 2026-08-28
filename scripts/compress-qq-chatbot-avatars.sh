#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-/Users/hongfei_ren/Documents/personal/nya-mask-avatars}"
OUTPUT_DIR="${2:-/private/tmp/nya-mask-avatars-compressed}"
MAX_SIDE="${3:-900}"

if ! command -v sips >/dev/null 2>&1; then
  echo "sips not found. This script is intended to run on macOS." >&2
  exit 1
fi

if [ ! -d "$SOURCE_DIR" ]; then
  echo "source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

shopt -s nullglob
files=("$SOURCE_DIR"/*.png)
if [ "${#files[@]}" -eq 0 ]; then
  echo "no png files found in: $SOURCE_DIR" >&2
  exit 1
fi

echo "source: $SOURCE_DIR"
echo "output: $OUTPUT_DIR"
echo "max side: ${MAX_SIDE}px"
echo

for src in "${files[@]}"; do
  name="$(basename "$src")"
  out="$OUTPUT_DIR/$name"
  cp "$src" "$out"
  sips --resampleHeightWidthMax "$MAX_SIDE" "$out" >/dev/null

  before="$(stat -f%z "$src")"
  after="$(stat -f%z "$out")"
  before_kb=$(( (before + 1023) / 1024 ))
  after_kb=$(( (after + 1023) / 1024 ))
  printf '%s: %sKB -> %sKB\n' "$name" "$before_kb" "$after_kb"
done
