# 写作·笔 技术评审

> 评审结论先行：**通过**，按以下约束实施。

## 1. 技术选型

| 项 | 选择 | 理由 |
| --- | --- | --- |
| 构建 | Vite 8 + React 19 + TS（与 xinzhi-reader 同版本线） | 仓库既有子应用先例，工具链零新增 |
| 路由 | 不用路由库，顶层 `view` state 切换（写作/大纲/图谱/设定/灵感/统计） | 单页应用内部视图切换，无 URL 需求；base 已由 Vite 处理 |
| 状态 | Zustand（单个 store，persist 到 localStorage，key `writing-pen:v1:<bookId>` 多 key 分书） | xinzhi-reader 同款；避免引入 redux |
| 图谱/连线 | 手写 SVG + pointer events（无 reactflow/d3） | 依赖最少、可控性最高，节点数 <200 无性能问题 |
| 编辑器 | 受控 `<textarea>` + 防抖持久化 | 首期不做富文本，规避 contentEditable/BlockNote 复杂度（BlockNote 属另一会话范畴，勿混用） |
| 图标 | 内联 SVG 组件（约 12 个） | 不为 12 个图标引入 lucide（xinzhi-reader 用了 lucide，可选；先用内联保持零依赖，体积更小） |
| 样式 | 手写 CSS（CSS variables 主题），CSS Modules 可选 | 子应用独立，无 tailwind（主站 components.json 不适用于子应用） |

## 2. 与仓库集成点（最小侵入）

- 新增 `apps/writing-pen/`（独立 package.json + package-lock.json + vite.config.ts）。
- 主站仅改 `src/pages/AppsDirectory/index.tsx`：writing 占位 → 正式项 `href: "/apps/writing-pen/"`、icon、summary。
- 新增图标文件 `apps/writing-pen/public/pen-icon-192.png`（512 亦备）；构建产物自动含。
- `scripts/build-apps.mjs` 零改动（目录扫描式）。
- 根 `pnpm build` 会经 build-apps.mjs 顺带构建子应用 —— 需确认根 build script 已包含（xinzhi-reader 已接入，同机制）。
- 不触碰：content-admin、博客编辑器、Wiki、阅读器（避开 sess_1e6e755b 的工作面）。

## 3. 数据与持久化

- 每书一个 localStorage key：`writing-pen:book:<id>`；书架索引 `writing-pen:index`。
- 写入时机：编辑防抖 1s；结构性操作（增删改节点/事件）即时写入。Zustand persist 的 partialize 只存本书数据。
- 导出：`Blob` 下载 `书名.writing-pen.json`；Markdown 导出按卷/章拼接 + 档案附录。
- 导入：`<input type=file>` + JSON schema 校验（meta.app === 'writing-pen'，schema 1）→ 确认后整书写入。
- 容量护栏：单 key > 4MB 时在统计页提示导出备份。

## 4. 图谱连线实现要点

- 两层结构：`<div class=canvas>`（transform: translate/scale）内含 `<svg class=edges>` 与节点 `<div>` 层；边坐标 = 节点中心 + 锚点偏移。
- 拖拽：pointerdown 节点 → setPointerCapture → 移动 delta / zoom 换算；连线：锚点 pointerdown 进入 linking 状态，pointermove 画虚线预览，pointerup 落在节点上 → 打开类型选择 popover。
- 贝塞尔：`M x1,y1 C x1+dx,y1 x2-dx,y2 x2,y2`（dx = max(40, |x2-x1|*0.4)）；标签取曲线中点 `getPointAtLength(len/2)` 或近似 (x1+x2)/2。
- 事件卡矩阵连线同理，但坐标由 DOM getBoundingClientRect 相对矩阵容器计算，滚动/重排后重算（useLayoutEffect + ResizeObserver）。

## 5. 测试与验收（开发自测）

- `npm run typecheck`（tsc --noEmit）+ `npm run build`（子应用）；根 `pnpm build` 全量。
- 浏览器手工过 PRD 验收清单 8 条；用 browser-use 对 localhost preview 截图核对 UI 稿关键项（图谱连线、矩阵连线、导入导出）。
- 回归：主站 `pnpm build` 产物 dist/apps/writing-pen/ 存在；/apps/ 页面渲染正常。

## 6. 提交与发布顺序

1. worktree 内 feat 提交（子应用骨架 → 各模块 → 目录接入 → 文档）。
2. 本地构建 + 自测通过 → handoff 更新。
3. **征求用户授权部署**（deploy-direct.sh 直传或 GitHub Actions static overlay）；授权后部署并线上验证。
4. 验证通过 → 合并策略：fast-forward feat/writing-pen-app → master 推送（推送触发发布，需授权）→ 删 worktree 与分支。
