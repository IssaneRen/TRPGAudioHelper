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

## 当前为样式预览

2026-10-19 按本人反馈撤下自行归纳的个人介绍、技术方向、工作实践、教育与项目内容。`/profile` 改为参考教师主页的照片/姓名横幅、基本信息及单栏分节。经历、作品、奖项等均使用明确的“待填写”占位。

资料源仍是 `src/content/personal-profile.json`，当前仅保留已确认的显示名，其他资料为空。空字段由页面显示占位文案，不代表真实履历。后续只根据本人提供或明确确认用于公开的文字填写；不要根据工作记录、GitHub 简介或对话自行总结后发布。

- `photo`：照片 URL，留空时显示照片占位。
- `role`：职位或身份。
- `contacts`：`label`、`value`。
- `intro`：本人确认的介绍段落。
- `education` / `experience`：`organization`、`title`、`period`、`description`。
- `directions`：`title`、`detail`。
- `projects`：`name`、`description`。
- `awards`：`period`、`title`、`description`。

样式：`src/pages/PersonalSite/profile-preview.css`。页面：同目录 `PersonalProfile.tsx`。参考 https://faculty.bjtu.edu.cn/8530/ 的版式，不使用其照片、校徽和人物内容。

## 本地预览与发布

在仓库根目录运行 `pnpm dev`，打开 `http://localhost:8291/profile`。运行 `pnpm build` 构建；检查通过后提交并推送 master，现有 `Deploy static overlay` 自动发布。

原跑团介绍仍使用 `public/config/profile.json`，与此处的个人资料分开维护。日常资料修改无需登录服务器。

Nginx 博客兼容规则位于 `ops/content-admin/trpg-content-{runtime,release}.conf`；本次迁移时已通过 Termius 备份并应用。配置修改需完整部署或通过 Termius 同步，静态 overlay 只更新 HTML 与 assets。
