# 技术选型与决策记录

> 记录项目中的技术选型理由和关键技术问题的解决方案。每个决策用独立章节记录。

---

## TD-001: 前端框架 — React 19 + TypeScript

- **日期**：2026-04-15
- **状态**：已确定

### 背景

需要支持多平台（macOS/Windows/Android/iOS）的 Web 前端框架，核心功能包含 DAG 图可视化。

### 决策

选择 **React 19 + TypeScript (strict mode)**。核心原因：React Flow（DAG 可视化最佳方案）仅支持 React，且 React 生态最成熟。

### 后续关注

- React 19 Server Components 等新特性在纯 SPA 中暂无用武之地，无需引入

---

## TD-002: 构建工具 — Vite 6

- **日期**：2026-04-15
- **状态**：已确定

### 决策

选择 **Vite 6**。启动快、HMR 即时、React + TS 支持好。使用 `@vitejs/plugin-react` 插件。

---

## TD-003: UI 框架 — Tailwind CSS 4 + Shadcn/ui

- **日期**：2026-04-15
- **状态**：已确定

### 决策

- **Tailwind CSS 4**：CSS-first 配置，通过 `@tailwindcss/vite` 插件集成（无需 postcss.config.js）
- **Shadcn/ui**：组件源码复制到项目中，可深度定制。使用 `new-york` 风格

### 关键技术点

- v4 不再需要 `tailwind.config.js`，使用 CSS `@theme` 指令配置
- 颜色系统使用 oklch 色彩空间
- 动画库从 `tailwindcss-animate` 改为 `tw-animate-css`（待需要动画时引入）

---

## TD-004: 路由 — React Router v7

- **日期**：2026-04-15
- **状态**：已确定

### 决策

选择 **React Router v7 Declarative 模式**。纯 SPA 无需 SSR，使用 BrowserRouter + Routes + Route。

### 关键技术点

- v7 统一包名为 `react-router`（不再需要 `react-router-dom`）
- 使用 Layout Route（无 path 的 Route）+ `<Outlet />` 实现 Tab 布局
- NavLink 的 `end` 属性用于根路径精确匹配

---

## TD-005: 有向图可视化 — React Flow

- **日期**：2026-04-15（2026-04-18 更新：DAG→有向图，支持有环）
- **状态**：已确定

### 决策

选择 **React Flow**（@xyflow/react v12）。TRPG 模组线索数量一般 10-100 个，React Flow 完全胜任且 React 原生集成。

**支持有环图**：React Flow 原生支持任意图拓扑结构（包括有环图），dagre 布局通过 `acyclicer: 'greedy'` 配置处理环。业务上线索确实可能互相指向（如"符文笔迹与信件吻合"形成闭环线索链）。

### 后续关注

- 超过 100+ 节点时的性能表现
- 是否需要虚拟化或分区加载
- 大规模有环图的 dagre 布局质量

---

## TD-006: 数据持久化 — localStorage + JSON

- **日期**：2026-04-15
- **状态**：已确定

### 决策

纯前端 SPA，无后端。数据存储在 localStorage，通过 JSON 导入导出实现跨设备迁移。

### 后续关注

- localStorage 5-10MB 限制，模组数据量大时可能不够
- JSON 导入需做校验防止注入

---

## TD-007: 动画引擎 — Framer Motion

- **日期**：2026-04-17
- **状态**：已确定

### 背景

用户要求"复杂酷炫的动效"，需要页面切换、卡片交错进入、DAG 节点弹性动画等高级效果。

### 决策

选择 **Framer Motion**（~33KB gz）。覆盖 Tab 切换 layoutId 动画、列表 stagger、弹窗弹性动画、DAG 节点进入/hover 动画。CSS transitions 作为基础层处理简单 hover/过渡。

### 专家评审意见

两位专家均建议考虑 Auto Animate（3KB）替代，但用户明确要求酷炫动效，最终决定保留 Framer Motion 但限制使用范围。

---

## TD-008: 数据校验 — Zod

- **日期**：2026-04-17
- **状态**：已确定

### 决策

JSON 导入使用 **Zod** schema 校验，防止恶意数据注入。文件大小限制 5MB。

---

## TD-009: 发现机制 — 边触发 + 节点特殊触发 + 取消特殊发现

- **日期**：2026-04-17（2026-04-18 更新）
- **状态**：已确定

### 背景

用户反馈：发现线索不应该是直接点击节点，而是发现某个"关系"（边）。例如"阅读信件"这个动作发现了信件和线索的关联。后续发现特殊发现无法取消，增加了取消机制。

### 决策

- **主要交互**：点击边（关系）→ 标记边为已触发 → 自动标记边两端的节点为已发现
- **次要交互**：点击节点直接标记发现 → 弹窗要求补充说明
- **取消特殊发现**：点击已特殊发现的节点 → 直接取消（无需弹窗），若有已触发的边连接则保持发现状态
- 多对多关系：一个节点可有多条入边和出边

---

## TD-010: 美术风格 — 克苏鲁/宇宙恐怖

- **日期**：2026-04-17
- **状态**：开发中

### 决策

整体视觉风格偏向克苏鲁/宇宙恐怖主题。暗色为主，配色使用墨绿、深紫、暗金等。字体考虑使用衬线字体增加古典感。

---

## TD-011: UI 装饰方案 — CSS/SVG 优先

- **日期**：2026-04-18
- **状态**：已确定

### 背景

用户要求整体页面更花哨，主页需要装饰性图片。

### 决策

采用 **CSS 装饰 + 内联 SVG** 优先方案，零外部图片依赖：
- CSS 渐变、发光边框、深渊阴影动画（eldritch-glow、abyss-shadow、glow-pulse）
- 内联 SVG 符文/几何图案作为角落装饰
- `prefers-reduced-motion` 媒体查询保护移动端性能
- AI 生图（Midjourney/SD）作为后续增强方案

### 后续关注

- 动画数量增加时的移动端帧率
- 后续 AI 生成图片的版权和格式优化

---

## TD-012: 边路径算法 — getSmoothStepPath

- **日期**：2026-04-18
- **状态**：已确定

### 背景

用户要求边箭头连接到节点边缘而非中心，且需要方向箭头。

### 决策

- 边路径从 `getBezierPath` 改为 `getSmoothStepPath`（borderRadius: 16），路径更贴合节点边缘
- 使用 `MarkerType.ArrowClosed` 添加单向箭头
- 节点增加四方向 Handle（Top/Bottom/Left/Right），支持多方向连线

---

## TD-013: 节点收起/展开 — BFS 下游收集

- **日期**：2026-04-18
- **状态**：已确定

### 背景

线索图节点较多时，用户需要收起未发现的下游线索以减少视觉干扰。图中存在环形边，收起/展开算法必须防止死循环。

### 决策

- BFS 遍历下游节点，使用 `visited Set` 防止有环图死循环
- 只收起**未发现**的下游节点，已发现的节点保持显示
- 通过 React Flow 的 `hidden` 属性控制节点/边的显示隐藏
- `hasChildren` 基于出边计算，有出边的节点显示收起/展开按钮

### 后续关注

- 多个父节点收起同一子节点时的交互一致性
- 收起状态与边触发发现的状态同步

---

## TD-014: Tab1 页面风格 — Apple 风格长滚动

- **日期**：2026-04-18
- **状态**：已确定

### 背景

用户要求 Tab1 更炫酷，类似 Apple 产品页的长滚动视差效果。

### 决策

- 7 段式长滚动页面：Hero（视差）→ 关于我 → 数据统计 → 跑团理念 → 模组库 → 免责声明 → 联系方式
- Hero 区域使用 `useScroll` + `useTransform` 实现视差滚动
- 各 section 使用 `whileInView` + variants（fadeInUp/fadeInLeft/fadeInRight/scaleIn）实现滚动触发动画
- oklch 渐变背景实现 section 间过渡
- Framer Motion variants 的 ease 值需使用 `as const` 断言以满足 TypeScript 严格类型

---

## TD-015: localStorage 数据版本控制

- **日期**：2026-04-18
- **状态**：已确定

### 背景

示例数据更新后，用户浏览器中的旧 localStorage 数据导致边标签全部显示为"关联"而非正确的 action 文本。

### 决策

- 引入 `DATA_VERSION` 常量，每次数据结构变更时递增
- `loadClueData()` 检查存储的版本号，不匹配则丢弃旧数据并加载新的 demoData
- 版本号与数据分别存储在 `STORAGE_KEY` 和 `STORAGE_KEY + "-version"` 中

---

## TD-016: Live2D Web 渲染 — pixi-live2d-display

- **日期**：2026-04-18
- **状态**：已确定

### 背景

用户希望在 ProfileTab Hero 区域展示 Live2D 角色立绘作为背景，支持鼠标追踪和点击互动。

### 决策

选择 **pixi-live2d-display@0.5.0-beta** + **pixi.js@7.4.3**。Cubism 4 完整支持、内置鼠标追踪和 hit detection、社区最成熟的 Web Live2D 方案。Cubism 4 Core SDK 通过 CDN script 标签引入。

备选方案 oh-my-live2d 更轻量但社区小、CubismSdkForWeb 官方 SDK 集成成本过高。

### 后续关注

- pixi-live2d-display 最后更新 2023 年底，PixiJS v8 不兼容，需关注社区 fork
- Live2D 模型替换为用户自有资源
- 移动端 WebGL 性能表现

---

## 模板

```
## TD-XXX: 标题

- **日期**：YYYY-MM-DD
- **状态**：调研中 / 已确定 / 已废弃

### 背景
[为什么需要做这个决策]

### 决策
[最终选择及核心理由]

### 后续关注
[需要持续观察的风险点]
```
