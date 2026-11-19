# apps/xinzhi-reader · 阅读·书

给自己和朋友使用的个人 Web 阅读空间：收藏、沉浸阅读、划线批注、每日回顾。
纯前端 + 本地优先（localStorage），无后端、无广告、无追踪。

- 正式地址：<https://www.issane.cn/apps/xinzhi-reader/>
- 源码位置：`apps/xinzhi-reader/`（**唯一开发位置**，独立 npm 项目，不进 pnpm workspace）
- 历史来源：`lucius_vibe_coding/lucius_reading`（已迁入本仓库，原目录仅作参考，勿再双向修改）

## 本地开发

```bash
cd apps/xinzhi-reader
npm ci
npm run dev        # http://localhost:5173/apps/xinzhi-reader/（已配置 base）
npm run typecheck  # npm test 等价
npm run build      # 产物在 apps/xinzhi-reader/dist/
npm run preview    # http://localhost:4173/apps/xinzhi-reader/
```

## 构建与部署

子应用通过 `scripts/build-apps.mjs` 挂进根构建：

- 根 `pnpm build` = 主站构建 + `node scripts/build-apps.mjs`
  （对每个 `apps/*/` 执行 `npm ci && npm run build`，并把产物复制到根 `dist/apps/<name>/`）
- 因此 **deploy.yml（全量部署）和 deploy-direct.sh 每次发布都自动携带本应用**，
  主站再发布不会丢失 `/apps/xinzhi-reader/`。
- `deploy-static-overlay.yml` 的 paths 已包含 `apps/**`，打包清单已包含 `apps`，
  子应用单独改动走较快的 overlay 发布。

Nginx 路由（SPA fallback，位于 `.github/workflows/deploy.yml` 两份配置 heredoc 中）：

```nginx
location ~ ^/apps/(?<app_name>[^/?]+) {
    try_files $uri $uri/ /apps/$app_name/index.html;
}
```

deploy.yml 每次部署都会重新生成整份 Nginx 配置，此块已纳入版本管理；
**不要只在服务器上手改**，下次全量部署会被覆盖——要改就改 deploy.yml。

## 发布流程（最短路径）

```bash
# 在本仓库任意 worktree/主工作区改 apps/xinzhi-reader/** 后：
git add apps/xinzhi-reader && git commit -m "feat(xinzhi-reader): ..." && git push origin master
# GitHub Actions 自动构建并部署；watch 进度：
#   https://github.com/IssaneRen/TRPGAudioHelper/actions/workflows/deploy.yml
```

认证方式：GitHub Actions 使用仓库 Secrets（`SERVER_HOST` / `SERVER_USER` / `SSH_PRIVATE_KEY`），
本地不保存服务器凭据；本机 `~/.ssh/id_rsa` 当前**不被**服务器接受，直连部署（deploy-direct.sh）不可用。

## 确认线上版本

```bash
curl -s https://www.issane.cn/apps/xinzhi-reader/ | grep app-version
# <meta name="app-version" content="<GITHUB_SHA>"> 与推送的 commit SHA 一致即为本版
```

应用内「设置 → 关于」也会显示构建 SHA 前 7 位。

## 回滚

- 方式 A（推荐，无需 SSH）：`git revert <commit> && git push origin master`，等 Actions 重新部署。
- 方式 B（Termius SSH，即时）：服务器上执行
  `sudo ln -sfn /var/www/trpg-helper/releases/<旧版本SHA> /var/www/trpg-helper/current`
  （版本目录名 = 当时部署的 commit SHA，`ls /var/www/trpg-helper/releases/` 查看；
  本任务发布前的线上版本对应 master 提交 `5fa8f79`。）

## 服务器目录

| 路径 | 内容 |
| --- | --- |
| `/var/www/trpg-helper/current/apps/xinzhi-reader/` | 当前线上版本的应用产物 |
| `/var/www/trpg-helper/releases/<SHA>/apps/xinzhi-reader/` | 历史版本（保留最近若干个） |

## 数据与备份

- 所有收藏、划线、想法、设置存于**浏览器 localStorage**（键 `xinzhi.web.v1`），按域名隔离。
- 数据不跨设备同步，也不上传服务器；换设备用「设置 → 数据 → 导出/导入备份」（JSON）。
- 应用内「合并导入文章」支持 agent 产出的 JSON 批量追加，格式见 `apps/xinzhi-reader/README.md`。

## 已知边界

- 无后端：收藏链接不抓取网页正文；真实 RSS / 多端同步需要新增 API（设计见应用 README 路线图）。
- localStorage 容量约 5MB，单篇导入上限约 60 万字。
- 朗读（Web Speech）与剪贴板 API 需要安全上下文，HTTPS 下正常。
