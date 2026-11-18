# Handoff：网站新增「效果展示」入口（cult-ui 组件演示）

> 目标：在网站上做一个 UI 效果展示区，先用 [cult-ui](https://github.com/nolly-studio/cult-ui) 的组件铺一批演示；未来会扩展成素材库。
> 本文档假设接手的对话没有任何上下文。

## 1. 项目背景（30 秒版）

- 站点：`https://www.issane.cn/`，前端全部在主仓 `D:\workplace\LuciusVibeCoding\TRPGAudioHelper`
- 技术栈：React 19 + Vite 6 + Tailwind CSS 4 + React Router v7 + shadcn 风格组件（`components.json` 已存在）+ Framer Motion 12 + pnpm
- 路由结构见 `src/App.tsx`：`/` = `src/pages/PersonalSite/HomePage.tsx`（浅色编辑风、四个入口卡片 01-04）；`/trpg` = 跑团站（暗色克苏鲁风）；`/portfolio` = 作品集（暗色粗野风）
- 用户已确认：入口加在**首页**（首页定位就是简单入口页）

## 2. 用户需求原文

1. 给网站增加一些入口，做一些 UI 效果展示，未来也会有素材库
2. 先把 https://github.com/nolly-studio/cult-ui 里的一些效果 UI 内容「画出来」（做演示页）
3. 希望在单独对话中操作（即本任务）

> 附加背景：用户已同意「个人介绍 /profile 全占位页、作品集 /portfolio 近空页做减法并入首页」。本任务动 HomePage.tsx 时**只加第 5 张入口卡片，不要动其他卡片**——profile/portfolio 的收敛是另一个待办，不要顺手重构。

## 3. cult-ui 要点

- 定位：150+ 免费动画组件，MIT，shadcn 注册表模式 —— CLI 把源码复制进项目，代码归项目所有
- 依赖：Tailwind CSS v4（与本仓一致）+ Motion（framer-motion/motion）+ shadcn token
- 安装：`npx shadcn@latest add https://www.cult-ui.com/r/<name>.json`，或在 `components.json` 注册命名空间后 `npx shadcn@latest add @cult-ui/<name>`
- 官网每个文档页 URL 加 `.md` 可得纯 markdown（适合 AI 阅读）；有 llms.txt

## 4. 建议实施路径

1. **路由与入口**
   - `src/App.tsx` 增加 lazy 路由 `/showcase`（沿用现有 `lazy()` + `Suspense` 模式）
   - `src/pages/PersonalSite/HomePage.tsx` 入口列表增加第 5 张卡片：「效果展示 · 前端动效与组件演示。」路径 `/showcase`（对照现有 01-04 卡片结构）
2. **演示页骨架** `src/pages/ShowcaseTab/`（或 PersonalSite 下，看风格归属，建议独立深色风格）
   - 每个组件一个 section：标题 + 组件实例 + 一行中文说明
   - 顶部做一个锚点导航（sticky 目录）
3. **组件选型**（首批建议 8 个左右，视觉冲击优先，安装后按实际效果取舍）：
   - 背景/氛围：aurora background、particles、spotlight
   - 文字：typewriter、letter reveal（或 shimmer text）
   - 卡片：spotlight card、shift card、folded card
   - 导航：dock、dynamic-island
   - 完整列表见官网 components 页（每个 URL 加 .md 可读文档）
4. **适配注意（重要）**
   - cult-ui 部分组件是 Next.js 写法（`next/image`、`next/link`、`"use client"`），本仓是 Vite + React Router：`next/image`→普通 `<img>`、`next/link`→`<Link>`；`"use client"` 指令在 Vite 下无害可留
   - motion 包：优先 `framer-motion`（本仓已装 12.x）；组件若 import 自 `motion/react` 也可，需确认安装 `motion`
   - Tailwind 4：cult-ui 就是 v4 目标，token 一般直接可用；个别组件若依赖 `tailwindcss-animate` 等插件需检查
   - 展示页用懒加载，避免动效组件进主包
5. **验收**
   - 首页出现第 5 张入口卡片且不破坏现有排版
   - `/showcase` 每个演示可交互、无控制台报错
   - 移动端（390px）不横向溢出
   - `CI=true pnpm type-check` 通过

## 5. 硬性约束

- 用户可见文案中文；代码标识/文件名英文（AGENTS.md）
- **不要 push master**（push 触发 GitHub Actions 全量部署）；改动只做本地提交
- pnpm 安装用 `CI=true pnpm install`
- 主站是备案站点，页脚备案号在 `src/components/TabLayout.tsx`（PersonalSite 有自己的页脚，见 `SiteFrame.tsx`）；新页面不套 TabLayout 时注意自带头部/页脚一致性
- 未来素材库方向：本路由设计成可扩展分区（背景/文字/卡片/导航分组），不要写成一次性页面

## 6. 相关上下文

- 2026-11-18 本次会话已完成：仓库清理 134 个 AI 过程产物、内容后台批量删除功能（网关 DELETE 接口 + 前端勾选）、博客编辑器 BlockNote handoff（见 `docs/handoffs/blog-editor-blocknote.md`）
- 线上体验分析结论：站点四种视觉语言并存（首页浅色 / trpg 克苏鲁暗色 / portfolio 粗野 / workbench studio 风）；showcase 页风格可以自由，但首页入口卡片的样式必须与现有 4 张一致
