#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "请使用 sudo 运行。" >&2
  exit 1
fi

mode="${1:-}"
case "$mode" in
  runtime|release) ;;
  *) echo "用法: sudo trpg-content-source runtime|release" >&2; exit 2 ;;
esac

snippet_dir="/etc/nginx/snippets"
active="${snippet_dir}/trpg-content-active.conf"
target="${snippet_dir}/trpg-content-${mode}.conf"
previous=""

restore_previous() {
  if [[ -n "$previous" ]]; then
    ln -sfn "$previous" "$active"
  else
    rm -f "$active"
  fi
}

if [[ ! -f "$target" ]]; then
  echo "缺少配置: $target" >&2
  exit 1
fi

if [[ -L "$active" ]]; then
  previous="$(readlink "$active")"
elif [[ -e "$active" ]]; then
  echo "$active 不是符号链接，停止切换。" >&2
  exit 1
fi

ln -sfn "$target" "$active"
if ! nginx -t; then
  restore_previous
  echo "Nginx 校验失败，已恢复原内容来源。" >&2
  exit 1
fi

if ! systemctl reload nginx; then
  restore_previous
  nginx -t
  systemctl reload nginx
  echo "Nginx 重载失败，已恢复原内容来源。" >&2
  exit 1
fi
echo "content_source=${mode}"
