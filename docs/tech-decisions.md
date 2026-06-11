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

## TD-023: AI NPC 对话身份与记忆隔离

- **日期**：2026-06-11
- **状态**：已确定

### 背景

AI NPC 对话需要按 NPC + PL 隔离，并避免前端继续用明文 `pl.xxx` 作为可信身份来源。

### 决策

- 主仓前端只保存 token；刷新后通过 `POST /api/session` 重建内存 session
- `trpg-ai-gateway` 使用 token 哈希 + `TOKEN_HASH_PEPPER` 鉴权，所有受保护接口走 `Authorization: Bearer <token>`
- NPC 私有上下文放在子仓 `data/npcs/<npcId>/ai-context.json`，公开 Wiki JSON 不承载 DeepSeek 专用设定
- 聊天运行时记忆写入 `CHAT_MEMORY_ROOT_DIR/<npcId>/players/<plId>/`，不进入 Git，不写 release 目录
- KP token 只返回 `isKeeper: true`，不默认代入任一 PL 的 NPC 私聊

### 后续关注

- Wiki/Blog 静态 JSON 仍不是服务端过滤后的真保密数据；若需要强保密，应单独迁移为服务端 Wiki API

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

## TD-017: TAB2 创建/编辑模式 — React Flow onConnect + 双击编辑

- **日期**：2026-04-19
- **状态**：已确定

### 背景

用户需要在TAB2中自定义创建模组线索图，包括添加节点、拖拽连线、编辑节点/边、删除操作。

### 决策

- 使用 React Flow 原生 `onConnect` 回调实现拖拽连线（Handle mousedown即开始）
- `onNodeDoubleClick` / `onEdgeDoubleClick` 实现双击编辑
- 节点上显示"+"按钮，点击后弹出对话框确认后添加新节点+自动连边
- 编辑/展示两种模式通过工具栏 Switch 切换，非路由切换
- 新建模组自动创建"模组开始"初始节点
- 使用 `crypto.randomUUID()` 生成 ID（不引入 nanoid）

### 后续关注

- 大规模图编辑的性能
- 移动端编辑体验

---

## TD-018: 图片节点 — Canvas压缩 + WebP + base64

- **日期**：2026-04-19
- **状态**：已确定

### 背景

用户希望线索节点可以附带图片，支持上传和展示模式下放大查看。

### 决策

- 图片通过 Canvas API 压缩到 600x600，质量 0.7，WebP 格式
- 存储为 base64 data URL，内嵌在 ClueNodeData.imageData 字段
- 上传限制 10MB（压缩前），压缩后约 50-100KB
- 展示模式双击图片节点打开 ImagePreviewDialog 全屏预览
- localStorage 存储使用 try-catch 防止溢出

### 后续关注

- 大量图片节点可能超出 localStorage 5-10MB 限制
- 后续可考虑迁移到 IndexedDB 存储图片

---

## TD-019: 音效键盘 — Web Audio API + CSS 3D Transform

- **日期**：2026-04-19
- **状态**：已确定

### 背景

新增"音效键盘"Tab，模拟物理键盘3D效果，按键触发音效，用于喜剧控场。

### 决策

- **3D效果**：CSS `perspective: 1000px` + `rotateX(12deg)` + Framer Motion 按下动画
- **音频播放**：Web Audio API (AudioContext)，预加载解码为 AudioBuffer，播放延迟 <10ms
- **默认音效**：OscillatorNode 程序化生成（不同频率/波形），用户可上传替换
- **回车停止**：维护 activeSources 数组，Enter 时全部 `.stop()`
- **存储**：音频映射存 localStorage（含 base64 音频数据），导入导出为 JSON 文件
- **响应式**：三档尺寸（桌面48px/平板40px/手机34px），prefers-reduced-motion 降级

### 后续关注

- 合成默认音效较简陋，后续可引入真实音效文件
- iOS Safari AudioContext 需用户交互才能 resume
- 移动端软键盘不触发 keydown，需用触摸备选

---

## TD-020: 四Tab导航布局

- **日期**：2026-04-19
- **状态**：已确定

### 背景

新增音效键盘 Tab，原有三Tab变为四Tab。

### 决策

- 路由：`/` (Profile) → `/module-tool` (ModuleTool) → `/soundboard` (Soundboard) → `/blog` (Blog)
- 桌面端顶部4个NavLink，移动端底部4个Tab
- Blog 路径不变（`/blog`），仅导航位置从第3移到第4

### 后续关注

- 移动端4Tab底部导航是否拥挤，可能需要"更多"折叠

---

## TD-021: 工具箱世界 Wiki 采用静态词条架构

- **日期**：2026-05-27
- **状态**：已确定

### 背景

用户希望在第二个 TAB「工具箱」中新增一个“世界 wiki”功能，用于给 PL 在跑完之后回顾人物、地点、事件、模组信息；同时要求词条内容继续走静态文件链路，后续仅修改 wiki 内容时不需要重新 build 网站，并且要支持按 PL 解锁部分黑框信息。

### 决策

- **路由位置**：作为工具箱子路由新增 `/tools/world-wiki` 与 `/tools/world-wiki/:entryId`
- **静态数据**：底层实体数据库放在 `public/wiki/entities/*.json`，由 `scripts/generate-wiki-index.ts` 生成 `public/wiki/index.json`
- **唯一键策略**：人物、PL、模组、地点、事件统一使用稳定 key；页面显示名可改，但内部跳转与权限判断不依赖显示文本
- **部署策略**：扩展 `deploy-content.yml`，将 `public/wiki/**` 与 `public/blog/**` 一并作为“静态内容快速部署”路径；主 `deploy.yml` 对 `public/wiki/**` 做 `paths-ignore`
- **UI 方向**：参考 Wikipedia 的信息架构（检索首页 + 词条详情 + 信息框 + 关联词条），但视觉继承站点现有的古卷 / 克苏鲁主题变量
- **隐藏档案机制**：改为结构化 JSON 标签，支持 `secret-panel`（整段）与 `secret-inline`（句子/短语）两级遮罩，根据玩家唯一键决定是否解锁；未解锁时点击 toast 提示
- **PL 状态**：沿用博客已使用的 `blog-pl-name` localStorage 键，但在 wiki 内解析为玩家唯一键后再参与权限判断
- **目标用户**：world wiki 明确服务于 PL 的跑后回顾和战报跳转，不承担 GM 备团后台职责

### 后续关注

- 若后续需要让博客正文通过名字自动解析为 wiki 链接，可继续利用 `index.json.lookup` 做自动引用转换
- 若 wiki 词条数量继续增长，可继续细分 `public/wiki/entities/` 的实体表（例如独立 events / locations 文件），但唯一键策略保持不变

---

## TD-022: 世界 Wiki 词条拆分为单文件，并提供 dev-only 管理台

- **日期**：2026-05-27
- **状态**：已确定

### 背景

`public/wiki/entities/entries.json` 在词条数量增长后会迅速变长，不利于按条维护、review diff 和冲突处理；同时，结构化 `content` 手写 JSON 嵌套层级较深，后续需要一个仅作者自己可用的维护入口，降低 ref / secret 标签的编辑成本。

### 决策

- **词条拆分**：将单文件 `public/wiki/entities/entries.json` 迁移为目录 `public/wiki/entities/entries/{entryId}.json`
- **索引生成**：`scripts/generate-wiki-index.ts` 通过 `scripts/wiki-data.ts` 读取目录、校验引用并生成 `public/wiki/index.json`
- **前端加载**：Wiki 首页继续读取 `index.json`；详情页改为按 `entryId` 懒加载 `public/wiki/entities/entries/{entryId}.json`
- **共享校验层**：抽出 `scripts/wiki-data.ts` 作为 Node 侧的唯一数据入口，供生成脚本和 dev-only 写盘接口复用
- **管理台形态**：新增 `/admin/wiki`，仅在 `import.meta.env.DEV` 下注册路由；生产构建不包含该页面
- **写盘方式**：通过 Vite 插件 `scripts/wiki-admin-plugin.ts` 的 `apply: "serve"` 中间件提供 `POST /__wiki-admin/save-entry`，写回单条 JSON 后立即重生 `index.json`
- **编辑体验**：Phase 2a 提供元数据表单 + `content` JSON 编辑 + 引用/权限模板辅助 + 实时预览；Phase 2b 已补齐 block 级可视化编辑器，并保留原始 JSON 面板作为兜底修复入口；当前还支持复制 block/token/list item，以及根据正文 `ref` 同步维护 `relatedEntryIds`

### 后续关注

- 首次部署后需确认 `deploy-content.yml` 对 `public/wiki/entities/entries/` 子目录的同步结果
- 若将来需要跨设备远程编辑，应优先评估 GitHub 编辑 / Decap / Sveltia 等 git-based 方案，而不是在生产环境暴露写接口
- 若词条数量持续增长，可继续增强 block 编辑器的人机工效（批量操作、自动维护 `relatedEntryIds`、更细的 token 工具栏），而不是重新回退到纯 JSON 文本框

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
