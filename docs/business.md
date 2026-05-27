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
- 词条索引来自 `public/wiki/index.json`
- 词条正文来自 `public/wiki/entries/*.md`，按需 fetch，支持静态内容快速部署
- 右上角支持“当前 PL”名称设置，复用博客同一 localStorage 键
- Markdown 内部链接支持站内跳转到其他 wiki 词条
- 支持 `[secret players="..."]...[/secret]` 隐藏档案块：按当前 PL 判断是否解锁；未解锁时显示黑色遮罩并点击 toast 提示

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 工具箱布局 | `src/pages/ToolboxTab/index.tsx` | DropdownMenu + Outlet |
| 世界 Wiki 入口 | `src/pages/WorldWikiTab/index.tsx` | 检索首页 + 词条详情 + PL 解锁逻辑 |
| Wiki 索引 | `public/wiki/index.json` | 世界词条元数据列表 |
| Wiki 词条目录 | `public/wiki/entries/` | Markdown 词条正文 |
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
- Markdown 渲染（react-markdown + remark-gfm）
- 模块级缓存（index 和 content 各自缓存）

### 添加新文章

1. 在 `public/blog/posts/` 下创建 `.md` 文件
2. 在 `public/blog/index.json` 中添加元数据条目

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 页面入口 | `src/pages/BlogTab/index.tsx` | 列表 + 详情 + fetch + 缓存 |
| 文章索引 | `public/blog/index.json` | 文章元数据列表 |
| 文章目录 | `public/blog/posts/` | Markdown 文章文件 |

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
