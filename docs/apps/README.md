# 网页应用维护

[正式应用目录](https://issane.cn/apps/)的页面由主站 React 路由提供。应用各自独立构建，统一存放在 TRPGAudioHelper 仓库。

| 要做的事 | 开发位置 |
| --- | --- |
| 修改目录里的应用名称、顺序、图标或占位 | [应用目录配置](../../src/pages/AppsDirectory/index.tsx) |
| 修改「阅读·书」的页面、交互或数据 | [apps/xinzhi-reader/](../../apps/xinzhi-reader/) |
| 修改阅读器首页标题、副标题、署名 | [FlowPage.tsx](../../apps/xinzhi-reader/src/pages/FlowPage.tsx) |
| 修改阅读器网页及手机桌面图标 | [public/](../../apps/xinzhi-reader/public/) 下的 `reading-*.png`，引用见应用的 `index.html` 和 `public/manifest.json` |
| 开发「写作·笔」或「美学·画」 | 两项现在只有目录占位；正式开发时为各自新增 `apps/<英文短名>/` |

## 从哪里开始

1. 目标仓库为 `git@github.com:IssaneRen/TRPGAudioHelper.git`。本机主仓路径为 `/Users/hongfei_ren/workspace/lucius_vibe_coding/TRPGAudioHelper`。
2. 先检查 `git status` 和已有 worktree，再执行 `git fetch origin`，从最新 `origin/master` 建工作分支。保留主工作区已有改动。
3. 旧 `lucius_reading/` 目录只作参考。阅读器后续改动都在 TRPGAudioHelper 的 `apps/xinzhi-reader/` 进行。

目录里的可用应用包含 `href`、`icon` 和 `summary`。占位项保留名称与 `letter`，页面会显示「未开放」，不生成链接。新增真实应用时，在 `apps/<英文短名>/` 保留依赖锁文件和 `build` 命令，配置 Vite base、路由 basename 和 PWA 路径，再把入口加到目录。根 [build-apps.mjs](../../scripts/build-apps.mjs) 会把子应用产物放入 `dist/apps/<英文短名>/`。

## 构建、发布和验证

- 只改阅读器时，可在 `apps/xinzhi-reader/` 运行 `npm ci`、`npm run build`。同时改目录和阅读器时，在仓库根运行 `pnpm install --frozen-lockfile`、`pnpm build`。临时预览用完即停。
- `master` 推送目前会触发全量发布，目录和子应用路径还会触发静态覆盖发布。仅在用户授权上线时推送会触发发布的分支。
- 目录和现有子应用的静态改动可以合成一个版本。已获上线授权并且本地构建通过后，可在本次推送的最新提交注明 `[skip ci]`，确认远端 `master` 是预期提交，再从 `master` 手动触发一次 [Deploy static overlay](https://github.com/IssaneRen/TRPGAudioHelper/actions/workflows/deploy-static-overlay.yml)。它会一起发布主站入口、静态资源和 `apps/`，沿用现有 Nginx 配置。涉及 Nginx 或 HTTPS 配置时，先核对现网及 [全量发布配置](../../.github/workflows/deploy.yml)。
- 如果本次原定使用 SSH 直传，但遇到认证失败、主机校验失败或权限不足，立即暂停，报具体错误并等用户答复。改用 GitHub Actions 或重新尝试其他认证方式须获得用户授权。
- 发布后打开正式 `/apps/`，点击应用卡并刷新子页。注意线上 `/apps/` 由主站处理，仅上传静态 `/apps/index.html` 无法替代主站路由。验证桌面和手机显示，检查图标与清单文件的 MIME 类型，并用阅读器 HTML 的 `app-version` 与本次发布提交核对。文档提交不需要触发站点发布。

阅读器的备份、存储和回滚细节见[阅读·书维护说明](xinzhi-reader.md)。
