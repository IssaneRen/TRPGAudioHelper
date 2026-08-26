#!/usr/bin/env bash
set -euo pipefail

source_root="/var/www/trpg-helper/current"
content_root="/var/www/trpg-content"
upload_root="/home/ubuntu/public_files/gate/trpg-content"
stamp="$(date -u '+%Y%m%dT%H%M%SZ')"

if [[ ! -d "${source_root}/blog" || ! -d "${source_root}/wiki" ]]; then
  echo "当前 release 缺少 blog 或 wiki。" >&2
  exit 1
fi

mkdir -p "$content_root" "$upload_root" "${content_root}/backups"

for name in blog wiki; do
  target="${content_root}/${name}"
  if [[ -e "$target" ]]; then
    echo "保留已有目录: $target"
    continue
  fi
  stage="${content_root}/.${name}.migration-${stamp}"
  cp -a "${source_root}/${name}" "$stage"
  mv "$stage" "$target"
  echo "已复制: ${source_root}/${name} -> $target"
done

blog_count="$(find "${content_root}/blog/posts" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')"
wiki_count="$(find "${content_root}/wiki/entities/entries" -maxdepth 1 -type f -name '*.json' | wc -l | tr -d ' ')"
echo "blog_posts=${blog_count}"
echo "wiki_entries=${wiki_count}"
