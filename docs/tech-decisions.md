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

## TD-005: DAG 图可视化 — React Flow

- **日期**：2026-04-15
- **状态**：已确定

### 决策

选择 **React Flow**。TRPG 模组线索数量一般 10-100 个，React Flow 完全胜任且 React 原生集成。

### 后续关注

- 超过 100+ 节点时的性能表现
- 是否需要虚拟化或分区加载

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
