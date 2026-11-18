# Handoff：效果展示区进度 —— cult-ui 组件已装完，展示页未开始

> 承接 `docs/handoffs/cult-ui-showcase.md`（原任务书，选型建议部分已过时，见下文 §3）。
> 组件安装与适配阶段已完成并本地提交；`/showcase` 页面、路由、首页入口卡片均未开始。
> 本文档假设接手对话没有上下文，读完即可继续开发。

## 1. 当前状态

- 工作树干净。本任务改动已本地提交 **`aa80526`（feat(showcase) 组件安装）**；其上可能叠加并行对话的提交（如 BlockNote 编辑器 `0f4038e`），git log 以实际为准。**没有 push，不要 push。**
- 该提交基线已验证 `CI=true pnpm type-check` 通过（2026-11-19 凌晨）。
- 已完成的内容全部落在三类改动：
  1. `src/components/ui/` 新增 9 个组件文件
  2. `src/index.css` 加了 1 处 `@custom-variant dark`
  3. 本 handoff 文档 + 原任务书顶部加了进度指针
- **package.json / components.json 完全没动，零新增依赖**（复用已有 framer-motion 12.38.0）。

## 2. 已完成：9 个组件（src/components/ui/）

| 文件 | 分组 | 用途 | 适配点 |
|---|---|---|---|
| `bg-animated-gradient.tsx` | 背景 | 动态渐变光斑（radial-gradient 动画） | 仅换 import |
| `grid-beam.tsx` | 背景 | canvas 网格光束，自带明暗调色板 | 无需适配（无 motion 依赖） |
| `bg-animated-fractal-dot-grid.tsx` | 背景 | 鼠标波纹点阵 | 仅换 import |
| `typewriter.tsx` | 文字 | 打字机 + 光标闪烁 | 光标 `bg-neutral-900`→`bg-foreground`（暗色页可见性） |
| `text-animate.tsx` | 文字 | 逐字入场动画（8 种预设） | 清理上游遗留未使用变量（`ctrls`/`isInView`，本仓 `noUnusedLocals` 会报错） |
| `shift-card.tsx` | 卡片 | hover 滑出内容卡 | `type MotionProps` 导入 |
| `folded-card.tsx` | 卡片 | 折角卡片复合组件 | `next/link` → `react-router` 的 `Link` |
| `dock.tsx` | 导航 | macOS Dock 放大交互 | `type MotionValue` 导入 |
| `dynamic-island.tsx` | 导航 | 灵动岛尺寸变形 | 仅换 import（`useWillChange` 在 framer-motion 12 存在） |

每个文件头部有一行 banner 注释记录 cult-ui 来源 URL，方便日后比对上游更新。

### 统一适配规则（未来装新组件照此办理）

1. `from "motion/react"` → `from "framer-motion"`。**不要安装 `motion` npm 包**（会产生双 motion 库进包）。
2. `next/link` → `react-router` 的 `Link`；`next/image` → 普通 `<img>`（本批未遇到）。
3. 接口类型导入必须加 `type` 修饰符（本仓 `verbatimModuleSyntax`：`MotionProps`、`HTMLMotionProps`、`MotionValue` 等）。
4. 检查 `noUnusedLocals`：上游常有注释掉的代码遗留未使用变量。
5. `"use client"` 指令在 Vite 下无害，保留（贴近上游、便于 diff）。

### 为什么没用 shadcn CLI

`npx shadcn add` 会自动安装 npm 依赖（即 `motion` 包），与本仓 framer-motion 策略冲突。实际安装方式：`curl https://www.cult-ui.com/r/<name>.json` → 取 `files[].content` → 按上述规则转换后写入 `src/components/ui/<name>.tsx`。组件注册表共 307 项，清单在 `https://www.cult-ui.com/r/registry.json`。

## 3. 关键技术结论（已验证，不用重新调研）

- **原任务书选型部分过时**：cult-ui 没有 aurora background / particles / spotlight / letter reveal / shimmer text / spotlight card。本批替代：`bg-animated-gradient` + `bg-animated-fractal-dot-grid` + `grid-beam`（背景）、`text-animate`（逐字动画）、`folded-card`（卡片）。跳过的高颜值组件及原因：`border-beam-card`（要 npm `border-beam` 包）、`halo-*` 系列（要 `@base-ui/react`）、`hero-*`（要 `@paper-design/shaders-react`）、three.js 系（重依赖）。
- **暗色作用域方案**：`src/index.css` 的 `.dark { --background: ... }` 是普通 class 选择器，页面根容器加 `className="dark"` 即可让整棵子树拿到暗色 token，与全局 ThemeProvider（`src/components/theme-provider.tsx`，往 `documentElement` 加 `light`/`dark`，defaultTheme="system"）互不干扰。展示页用这个方案做独立深色风。
- **index.css 已补 `@custom-variant dark (&:where(.dark, .dark *));`**（`@import "tailwindcss"` 之后）。原因：本仓原有 23 处 `dark:` 工具类在 Tailwind 4 下默认跟随 OS 偏好而非 ThemeProvider 的 class，属于潜在不一致；cult-ui 组件（shift-card、dock、text-animate）也依赖该变体。若明天验收发现某页在「OS 暗色 + 站点亮色」下外观变化，属于该修复的正确副作用，不是回归。
- **tsconfig 严格度**：`strict` + `noUnusedLocals` + `noUnusedParameters` + `verbatimModuleSyntax`（见 §2 适配规则 3/4）。
- 仓库已有全局 `overflow-x: hidden`（html/body/#root）与 `prefers-reduced-motion` 全局降级（index.css），对动效组件是兜底但**不能当作 390px 溢出的借口**，内容仍要按 ≤358px 可用宽度设计。

## 4. 剩余工作（按顺序做）

### 4.1 展示页 `src/pages/ShowcaseTab/`

- `index.tsx`：页面骨架。根容器 `className="dark min-h-screen bg-background text-foreground"`。
- **自带头部/页脚**（不套 TabLayout/SiteFrame）：头部放「← 返回首页」（`Link to="/"`）+ 页面标题「效果展示」；页脚必须含备案号 `沪ICP备2025112187号-2`（链接 `https://beian.miit.gov.cn/`，与 `SiteFrame.tsx` 一致，主站是备案站点）。
- **sticky 锚点导航**：背景 / 文字 / 卡片 / 导航 四个分组锚点。
- **可扩展结构**（原任务书硬要求，未来变素材库）：分组用数据驱动的 sections 注册表（`{ id, title, description, component }` 数组），新增演示 = 加一条 + 一个 demo 文件，不要写成一次性 JSX。
- demos 建议放 `src/pages/ShowcaseTab/demos/`，按分组一个文件：`BackgroundDemos.tsx` / `TextDemos.tsx` / `CardDemos.tsx` / `NavDemos.tsx`。
- 用户可见文案中文，代码标识英文。

### 4.2 各组件演示要点（逐个 gotcha，已预研）

- **bg-animated-gradient**：组件是 `absolute inset-0`，父级必须 `relative` 且有固定高度。需要传 `gradients` 数组（每项 `{ stops: [{color, position}], centerX, centerY }`，百分数）和 `animationDuration`。
- **grid-beam**：`<GridBeam rows={3} cols={4} className="h-64 rounded-xl">内容</GridBeam>`，默认 `theme="dark"` 正好配暗色页。
- **bg-animated-fractal-dot-grid**：canvas 硬编码 `bg-gray-100` + multiply 混合，**天生浅色底组件**——演示放进浅色面板（如 `relative h-64 overflow-hidden rounded-xl bg-gray-100`）里，或自定义 `dotColor`/`glowColor`。同样需要 relative 定高父级。
- **typewriter**：props 必传 `texts: string[]`（循环文案）与 `delay`（秒），可选 `baseText`（先打完的底文案）。
- **text-animate**：`type` 8 种预设（fadeIn/fadeInUp/popIn/shiftInUp/rollIn/whipIn/whipInUp/calmInUp）。注意：**传入 className 会整体替换默认 className**（不是合并），若覆盖需自己补齐字号/颜色。默认带 `mt-10 px-8 py-5` 外边距，面板布局要预留。文案用短中文，避免 flex 行溢出。
- **shift-card**：固定宽 `w-[280px] md:w-[300px]`；slots：`topContent` / `topAnimateContent`（hover 出现）/ `middleContent` / `bottomContent`（hover 从底部滑出，高度动画到 194px）。
- **folded-card**：复合组件 `FoldedCard` + `FoldedCardFold` + `FoldedCardBorder` + `FoldedCardPreview` + `FoldedCardGrid` + `FoldedCardFooter` + `FoldedCardTitle/Badge/Description`；`FoldedCardLink` 基于 react-router `Link`。token 全走 `--card/--muted/--accent` 等，暗色子树内自动适配。
- **dock**：`<Dock>` 默认 `absolute bottom-4 left-3/4` —— 演示容器要 `relative` 且给足高度，建议传 `className="left-1/2"` 居中。`DockCard` 的 `id` 必须是**数字字符串**（内部 `parseInt`）；`DockCardInner` 必传 `src`（图片）——用内联 SVG data URI 即可，`children` 是点击弹跳时显示的图标。
- **dynamic-island**：`DynamicIslandProvider` 包 `DynamicIsland`（props: `id`）+ `DynamicContainer/DynamicTitle/DynamicDescription`，用 `useDynamicIslandSize()` 的 `setSize` 做按钮切换。**尺寸预设只用 ≤300px 宽的**（default/compact/compactLong/minimalLeading/minimalTrailing）；LONG/MEDIUM/compactMedium 宽 351–371px，390px 视口必溢出，不要进演示。

### 4.3 路由与入口

- `src/App.tsx`：仿现有模式加 `const ShowcaseTab = lazy(() => import("@/pages/ShowcaseTab"));`，`<Route path="showcase" element={<ShowcaseTab />} />` 放在 portfolio 路由附近（约 61 行后）。
- `src/pages/PersonalSite/HomePage.tsx`：`destinations` 数组加第 5 项 `{ number: "05", name: "效果展示", href: "/showcase", path: "/showcase", description: "前端动效与组件演示。" }`。**只加卡片，不要动现有 01-04**（profile/portfolio 收敛是另一个待办，别顺手重构）。

### 4.4 验收清单

- `CI=true pnpm type-check` 通过（真正起效的是 `tsc --noEmit`，CI 变量沿原任务书写法）
- `pnpm build` 通过（prebuild 会先跑 wiki/blog 索引生成，正常）
- 首页第 5 张卡片样式与现有 4 张一致（样式在 `personal-site.css` 的 `.personal-directory-*`，纯加数据即自动一致）
- `/showcase` 每个演示可交互、浏览器控制台无报错
- 390px 视口无横向溢出（重点盯 dynamic-island、dock）
- `dark:` 变体在展示页生效（shift-card/dock 的暗色阴影应出现）

## 5. 硬性约束（沿原任务书，不变）

- **不要 push master**（push 触发 GitHub Actions 全量部署），只做本地提交
- pnpm 安装用 `CI=true pnpm install`（本任务理论上不再需要装包）
- 用户可见文案中文；代码标识/文件名英文
- 未来素材库方向：路由与页面结构保持可扩展分区

## 6. 并行对话冲突注意

- 同时段另一对话在做博客编辑器 BlockNote（`docs/handoffs/blog-editor-blocknote.md`）。冲突面主要在配置文件：**package.json（对方可能加 BlockNote 依赖）、index.css**。若合并时冲突，保留双方新增部分即可，本任务改动极小且已提交，代码文件完全不重叠。
- 本任务已提交内容不含 package.json 变更；若明天需要装新依赖，先 `git pull`/看一眼最新 master 状态再动手。
