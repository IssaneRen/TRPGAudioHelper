#!/usr/bin/env bash
# 直连部署：本地构建 → scp 上传 → 服务器切换 current 软链（约 2-3 分钟，替代 30 分钟的 GitHub Actions）
#
# 用法：
#   SERVER_HOST=<服务器IP> SERVER_USER=ubuntu scripts/deploy-direct.sh
# 或在 scripts/deploy.local.conf 中配置（该文件已 gitignore，不会入库）：
#   SERVER_HOST=1.2.3.4
#   SERVER_USER=ubuntu
#
# 前提：本机 ~/.ssh/id_rsa 已被服务器 authorized_keys 接受（即 Termius 使用的同一把密钥）。
# 首次部署仍建议走一次 GitHub Actions，让服务器完成 nginx 配置与目录初始化。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_CONF="$REPO_ROOT/scripts/deploy.local.conf"

if [[ -f "$LOCAL_CONF" ]]; then
  # shellcheck disable=SC1090
  source "$LOCAL_CONF"
fi

SERVER_HOST="${SERVER_HOST:?请设置 SERVER_HOST（环境变量或 scripts/deploy.local.conf）}"
SERVER_USER="${SERVER_USER:?请设置 SERVER_USER}"
SSH_PORT="${SSH_PORT:-22}"
APP_ROOT="${APP_ROOT:-/var/www/trpg-helper}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
SKIP_BUILD="${1:-}"

STAMP="$(date '+%Y%m%d-%H%M%S')"
TARBALL="trpg-helper-dist-${STAMP}.tar.gz"

echo "==> 目标服务器 ${SERVER_USER}@${SERVER_HOST}:${SSH_PORT}"

if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
  echo "==> 本地构建（含 Wiki/Blog 索引生成）"
  cd "$REPO_ROOT"
  CI=true pnpm install --frozen-lockfile >/dev/null
  CI=true pnpm build
else
  echo "==> 跳过构建（使用现有 dist/）"
  cd "$REPO_ROOT"
  test -f dist/index.html || { echo "dist/ 不存在，请先构建" >&2; exit 1; }
fi

echo "==> 打包 dist/"
tar -C dist -czf "$TARBALL" .

echo "==> 上传"
scp -P "$SSH_PORT" "$TARBALL" "${SERVER_USER}@${SERVER_HOST}:/tmp/${TARBALL}"

echo "==> 服务器端解压并切换软链"
ssh -p "$SSH_PORT" "${SERVER_USER}@${SERVER_HOST}" bash -s <<REMOTE
set -eu
RELEASE_DIR="${APP_ROOT}/releases/${STAMP}"
mkdir -p "\$RELEASE_DIR"
tar -xzf "/tmp/${TARBALL}" -C "\$RELEASE_DIR"
rm -f "/tmp/${TARBALL}"
test -f "\$RELEASE_DIR/index.html" || { echo "发布目录缺少 index.html" >&2; exit 1; }
ln -sfn "\$RELEASE_DIR" "${APP_ROOT}/current"
# 清理旧发布，保留最近 ${KEEP_RELEASES} 个
ls -1dt "${APP_ROOT}/releases/"*/ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
echo "已上线: \$(readlink ${APP_ROOT}/current)"
REMOTE

rm -f "$TARBALL"
echo "==> 完成。无需重启 nginx（静态文件经 current 软链即时生效）。"
