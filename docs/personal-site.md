# 个人网站维护

## 页面分工

| 地址 | 内容 |
| --- | --- |
| `/` | 简约聚合首页、TRPG 迁移说明 |
| `/profile` | 公开个人介绍，支持浏览器打印 / 保存 PDF |
| `/trpg` | 原跑团主页 |
| `/trpg/tools/...` | 原工具箱、Wiki、模组、音效、AI 对话、仪表盘 |
| `/trpg/blog/...` | 原博客与文章 |
| `/workbench` | 原私人工作台，登录与保存方式不变 |
| `/portfolio` | 原公开作品集 |

旧 `/tools/...`、`/blog/...`、`/module-tool`、`/soundboard` 使用浏览器路由重定向，保留查询参数和 hash。旧博客文章另由 Nginx 内容片段做 301 跳转（保留查询参数），避免静态目录拦截；`index.json`、`posts`、`images` 不参与跳转。其他旧路径使用浏览器重定向。静态资源 `/blog/*.md`、`/wiki/...`、`/config/...` 及 `/api/...` 地址不变，避免破坏文章图片、音效、模型、存档和后台接口。开发用 Wiki 管理页为 `/trpg/admin/wiki`，生产环境仍不开放。

## 改介绍，不用编辑 HTML

编辑 `src/content/personal-profile.json`。这是公开页面唯一的个人资料源，随代码构建发布，不写入工作台的私密数据库。

| 字段 | 用途 |
| --- | --- |
| `name` / `alias` / `role` | 显示名、别名与技术定位 |
| `updatedAt` | 实际更新日期，格式 `YYYY-MM-DD` |
| `intro` | 简介段落数组 |
| `directions` | 技术方向，每项包含 `title`、`detail` |
| `practice` | 工作实践，每项包含 `title`、`period`、`summary` |
| `projects` | 个人项目，包含名称、说明、技术栈与链接 |
| `education` / `experience` | 教育 / 工作经历；空数组不显示栏目 |
| `links` | 公开链接，每项包含 `label`、`value`、`href` |

补充一条已确认的任职经历：

```json
{
  "organization": "可公开的公司名称",
  "title": "实际职位",
  "period": "YYYY.MM — YYYY.MM",
  "description": "本人负责的工作，最多两三句话。"
}
```

放进 `experience` 数组即可自动展示；不要把示例文字直接发布。教育经历使用同样的字段。未提供的日期可留空；删去不需要的条目即可。链接使用站内绝对路径或完整 `https://` 地址。

首页入口文字在 `src/pages/PersonalSite/HomePage.tsx` 的 `destinations` 数组；样式在同目录 `personal-site.css`。原跑团介绍继续使用 `public/config/profile.json`，与新的职业介绍互不覆盖。

## 本地预览与发布

```sh
pnpm dev
# 默认 http://localhost:8291/ 与 /profile
pnpm exec tsx scripts/verification/personal-site.verify.ts
pnpm build
```

只提交这次需要修改的文件。合入并推送 `master` 后，`Deploy static overlay` 会自动构建并部署首页、个人资料和路由改动。资料 JSON 被打包到版本化静态资源中，服务器没有第二份可编辑的个人资料数据库。日常修改无需登录服务器；需要检查服务器或回滚时优先使用 Termius。

Nginx 博客兼容规则维护在 `ops/content-admin/trpg-content-{runtime,release}.conf`，本次通过 Termius 备份原片段、校验并重载生效。此类服务器配置修改需完整部署或通过 Termius 同步；静态 overlay 只更新 HTML 与 assets。

现有 Nginx 的 SPA fallback（`try_files $uri /index.html`）支持新路径。部署后分别直接打开并刷新 `/profile`、`/trpg`、一条 Wiki 深链接和一篇博客，确认页面可用；再从旧链接验证跳转。

回滚内容优先 `git revert <对应提交>`，重新推送构建。紧急服务器回滚可在 Termius 中检查 `/var/www/trpg-helper/current` 指向和 `releases`，确认前一份完整 release 后切换 symlink。不要删除服务器现有内容目录或工作台数据。

## 简历导出

打开 `/profile` →「打印 / 保存 PDF」→ 浏览器选择“另存为 PDF”。打印样式隐藏站点导航、目录、操作按钮和备案页脚，保留正文。调整浏览器页边距即可控制分页。

## 2026-10-19 内容依据

- 显示名 `Issane / Lucius`：本人本次确认。
- 技术定位与工作实践：已完成的 2026-01-01 至 2026-10-15 本机 Git / Codex 全量盘点及代表提交核验，结合当前项目代码。公开页只写专业方向与本人参与事项，不搬运原始对话、内部路径、业务实验细节和量化收益。
- 教育背景：[GitHub 公开介绍](https://github.com/IssaneRen)写明 Tongji University / SSE undergraduate；据此只写学校和本科阶段专业，不推定毕业年份或已取得学位。
- GitHub 简介也提到 Intsig，但缺少任职日期及当前状态的确认，因此本版 `experience` 保持为空，不将历史简介自动写成当前任职。
- TRPG 与个人工作台：当前仓库实现与线上功能。
- LuciusGraphNpm：[公开 GitHub 项目](https://github.com/IssaneRen/LuciusGraphNpm)及置顶简介，仅描述 D3 可视化用途，不推定持续维护状态或用户规模。
- 排版参考：[北京交通大学教师个人页](https://faculty.bjtu.edu.cn/8530/)，借鉴清晰的简介与分节结构，不复用其人物信息、照片或履历。

后续工作台数据不会自动公开到 `/profile`。个人资料的公开更新通过这份 JSON 和 Git 提交进行，历史版本可追溯。
