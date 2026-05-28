# 业务文档

> 记录三个 Tab 的核心业务逻辑、组件结构和代码位置索引。随开发进展持续更新。

---

## TAB1 - 个人介绍 (ProfileTab)

### 业务说明

- 静态展示个人信息，数据来自 `public/config/profile.json` 配置文件
- 7 段长滚动页：Hero视差 + 关于我 + 数据统计 + 跑团理念 + 模组库 + 免责声明 + 联系方式
- Live2D 角色背景（pixi.js + pixi-live2d-display）
- 无编辑功能，修改内容直接编辑 JSON 配置文件

### 配置文件字段

```json
{
  "name": "昵称",
  "subtitle": "副标题",
  "bio": "个人简介",
  "disclaimer": "免责声明",
  "live2dModelPath": "Live2D模型路径",
  "stats": [{ "label": "标签", "value": "数值", "icon": "图标名" }],
  "philosophies": [{ "title": "标题", "desc": "描述" }],
  "modules": [{ "id", "name", "status", "description", "playerCount", "duration", "tags" }],
  "contacts": [{ "label": "平台", "value": "联系方式" }]
}
```

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 页面入口 | `src/pages/ProfileTab/index.tsx` | fetch 配置文件 + 静态渲染 + 模块级缓存 |
| 配置文件 | `public/config/profile.json` | 所有展示数据的来源 |
| Live2D 背景 | `src/pages/ProfileTab/Live2DBackground.tsx` | PixiJS + pixi-live2d-display 封装 |

---

## TAB2 - 工具箱 (ToolboxTab)

### 业务说明

- 下拉菜单切换子工具（DropdownMenu）
- 嵌套路由：`/tools/battle`、`/tools/world-wiki`、`/tools/soundboard`、`/tools/module-clue`
- 各子工具 lazy 加载，独立生命周期

### 子工具

#### 模组工具 (ModuleToolTab)

- 有向图可视化线索网络（React Flow），支持有环图
- **双模式**：展示模式（边触发发现、节点收起展开）/ 编辑模式（CRUD操作）
- **多对多关系**：支持越级指向和环形关系
- **边触发发现机制**：点击边 → 标记边两端节点为已发现
- **创建自定义模组**：新建、添加节点、拖拽连线、双击编辑、删除
- **图片支持**：节点可上传图片（WebP压缩600px）
- 支持一键排版、JSON 导入导出

#### 音效键盘 (SoundboardTab)

- 3D模拟键盘UI（CSS perspective + transform）
- 键盘监听：26字母 + 空格 + 回车
- Web Audio API 音效播放，28种合成TRPG氛围音效
- 音效包导入（manifest.json + 音频文件）
- IndexedDB 存储音频数据

#### 模拟战斗 (BattlePlaceholder)

- 占位页面，功能开发中

#### 世界 Wiki (WorldWikiTab)

- 首页提供人物 / 地点 / 事件 / 模组四类词条的统一检索入口
- 面向 **PL 跑后回顾 / 战报超链接补读**，不是主持人备团后台
- 底层数据来自 `public/wiki/entities/*.json` 模拟数据库，人物 / PL / 模组均有唯一 key
- 词条正文已拆为 `public/wiki/entities/entries/{entryId}.json`，便于按条维护与减少冲突
- `scripts/generate-wiki-index.ts` 会从实体数据库生成 `public/wiki/index.json` 检索索引
- dev 环境额外提供 `/admin/wiki` 管理页，用于作者维护词条，不会进入生产构建
- 右上角支持“当前 PL”名称设置，复用博客同一 localStorage 键
- 前端展示名称以中文为主，内部跳转与权限判断全部走唯一 key
- 首页仍读取 `index.json`，详情页改为按 `entryId` 懒加载单条 JSON
- 支持两种隐藏档案标签：
  - `secret-panel`：整段 / 整块黑框遮罩
  - `secret-inline`：句子或短语级黑框遮罩
- 未解锁时点击黑框统一弹出 toast：`请探索更多故事解锁~`

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 工具箱布局 | `src/pages/ToolboxTab/index.tsx` | DropdownMenu + Outlet |
| 世界 Wiki 入口 | `src/pages/WorldWikiTab/index.tsx` | 检索首页 + 词条详情 + 唯一键映射 + PL 解锁逻辑 |
| Wiki 管理台（dev-only） | `src/pages/WikiAdminTab/index.tsx` | 词条元数据编辑、正文引用同步到 relatedEntryIds、block 级可视化编辑、content JSON 兜底面板、实时预览与保存 |
| Wiki Block 编辑器 | `src/features/wiki/WikiBlockEditor.tsx` | block / token / list / secret-panel 递归编辑器，支持复制/排序/删除 |
| Wiki 索引生成 | `scripts/generate-wiki-index.ts` | 校验实体引用并生成索引 / 名称映射 |
| Wiki 数据工具 | `scripts/wiki-data.ts` | 共享 JSON 读写、目录加载、引用校验、索引生成 |
| Wiki Admin Vite 插件 | `scripts/wiki-admin-plugin.ts` | dev-only 写盘接口 `POST /__wiki-admin/save-entry` |
| Wiki 索引 | `public/wiki/index.json` | 生成后的世界词条索引、玩家/模组与 lookup 映射 |
| Wiki 词条目录 | `public/wiki/entities/entries/` | 单词条 JSON 文件，详情页按 `entryId` 懒加载 |
| Wiki 实体库 | `public/wiki/entities/` | players / modules / entries 目录等模拟数据库 |
| 战斗占位 | `src/pages/ToolboxTab/BattlePlaceholder.tsx` | 敬请期待 |
| 模组工具入口 | `src/pages/ModuleToolTab/index.tsx` | React Flow + 双模式 |
| 自定义节点 | `src/pages/ModuleToolTab/ClueNode.tsx` | 分类色彩 + 图片 + 收起展开 |
| 自定义边 | `src/pages/ModuleToolTab/AnimatedEdge.tsx` | SmoothStep + 方向箭头 |
| 音效键盘入口 | `src/pages/SoundboardTab/index.tsx` | 3D键盘 + 音效管理 |
| 音效合成 | `src/pages/SoundboardTab/sound-synthesis.ts` | 28种Web Audio合成音效 |
| 音频管理 | `src/hooks/use-audio-manager.ts` | AudioContext封装 |
| 状态管理 | `src/stores/use-clue-store.ts` | 线索数据 localStorage |
| 状态管理 | `src/stores/use-soundboard-store.ts` | 音效映射 + IndexedDB |
| 状态管理 | `src/stores/use-task-store.ts` | 任务数据 localStorage |

---

## TAB3 - 博客杂谈 (BlogTab)

### 业务说明

- 文章列表从 `public/blog/index.json` 索引获取
- 文章内容从 `public/blog/posts/*.md` 按需 fetch
- 博客/杂谈分类切换（Tabs）
- **双渲染模式**：
  - `renderMode: "markdown"`（默认）：Markdown 渲染（react-markdown + remark-gfm）
  - `renderMode: "wiki"`：博客详情页不渲染 Markdown 正文，而是内嵌世界 Wiki 词条渲染器（复用 `WikiContentRenderer`），由 `wikiEntryId` 绑定词条
- **语义区分**：
  - `module` 词条：模组本体介绍、导读、关联地点/事件入口
  - `report` 词条：某一次具体游玩的场次战报；同一模组可挂多条战报
- **PL 匹配规则（精确）**：
  - 建议输入 `pl.xxx` 唯一 key（例如 `pl.cici`），用于“我跑过的”筛选与 Wiki/战报隐藏内容解锁
  - 也可输入显示名/别名，但必须完全匹配；系统会自动保存为对应的 `pl.xxx`，避免改名后失效
- 模块级缓存（index 和 content 各自缓存）

### 添加新文章

1. 在 `public/blog/posts/` 下创建 `.md` 文件
2. 填写 frontmatter（可选字段由 `scripts/generate-blog-index.ts` 生成到 `public/blog/index.json`）
   - 普通文章：不写 `renderMode` 或写 `renderMode: "markdown"`
   - 战报/词条型文章：写 `renderMode: "wiki"` + `wikiEntryId: "<entryId>"`
   - 若是战报，`wikiEntryId` 应指向独立 `report.*` 词条，而不是 `module.*` 词条
   - 若需要“我跑过的”筛选：frontmatter `players` 必须使用 PL 唯一 key（如 `pl.cici`），不要写角色名/显示名

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 页面入口 | `src/pages/BlogTab/index.tsx` | 列表 + 详情 + fetch + 缓存 |
| 文章索引 | `public/blog/index.json` | 文章元数据列表 |
| 文章目录 | `public/blog/posts/` | Markdown 文章文件 |
| Wiki 渲染器 | `src/features/wiki/WikiContentRenderer.tsx` | `renderMode: "wiki"` 时内嵌复用，用于战报/词条型文章 |

---

## 共享模块

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 路由配置 | `src/App.tsx` | React Router v7 + 嵌套路由 + lazy + Suspense (3 Tab + 工具子路由) |
| Tab 布局 | `src/components/TabLayout.tsx` | 3Tab 动画化导航 + 毛玻璃效果 |
| 暗色模式 | `src/components/theme-provider.tsx` | ThemeProvider (light/dark/system) |
| 主题切换 | `src/components/mode-toggle.tsx` | 太阳/月亮图标循环切换 |
| Toast 通知 | `src/components/ui/sonner.tsx` | Sonner 集成 |
| 工具函数 (cn) | `src/lib/utils.ts` | clsx + tailwind-merge |
| 全局样式 | `src/index.css` | Tailwind CSS 4 + 主题变量 + 动画 + 3D键盘 |
| Shadcn/ui 组件 | `src/components/ui/` | button, card, input, textarea, label, sonner, tabs, badge, switch, separator, skeleton, dropdown-menu |
| JSON 导入导出 | `src/utils/json-io.ts` | Zod schema 校验 |
| 图片压缩 | `src/utils/image-compress.ts` | Canvas + WebP |
| 自动排版 | `src/utils/auto-layout.ts` | dagre布局 |
| 类型定义 | `src/types/index.ts` | ClueNode, ClueEdge, BlogPost, ExportData 等 |
