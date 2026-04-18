# 业务文档

> 记录三个 Tab 的核心业务逻辑、组件结构和代码位置索引。随开发进展持续更新。

---

## TAB1 - 个人介绍与模组链接 (ProfileTab)

### 业务说明

- 展示个人介绍信息（昵称、简介）
- 管理模组列表（已备、待备、已带）+ 状态筛选
- 维护免责声明和跑团要求
- 支持 JSON 导入导出（Zod schema 校验）

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 页面入口 | `src/pages/ProfileTab/index.tsx` | Apple风格7段长滚动页（Hero视差 + 关于我 + 数据统计 + 跑团理念 + 模组库 + 免责声明 + 联系方式） |
| 资料编辑器 | `src/pages/ProfileTab/ProfileEditor.tsx` | 昵称/简介/免责声明编辑 |
| 模组弹窗 | `src/pages/ProfileTab/ModuleDialog.tsx` | 添加/编辑模组（Framer Motion 弹性动画） |
| 数据类型 | `src/types/index.ts` | ProfileData, Module, ModuleStatus |
| 状态管理 | `src/stores/use-profile-store.ts` | localStorage 同步 |
| 数据导出 | `src/utils/json-io.ts` | Zod 校验 + 5MB 限制 |
| Live2D 背景 | `src/pages/ProfileTab/Live2DBackground.tsx` | PixiJS + pixi-live2d-display 封装，鼠标追踪 + 点击互动 |

---

## TAB2 - 模组工具页面 (ModuleToolTab)

### 业务说明

- 有向图可视化线索网络（React Flow），支持有环图
- **多对多关系**：一个线索可引出多个线索，也可被多个线索引用；支持越级指向和环形关系
- **边触发发现机制**：点击边（关系）→ 标记边两端节点为已发现
- **节点直接发现**：特殊情况，需弹窗补充说明
- **取消特殊发现**：点击已特殊发现的节点可取消，若有已触发边则保持发现状态
- 已发现线索置灰处理
- 支持**一键排版**（从上到下层次布局，不改变发现状态）
- 支持拖拽、缩放、自定义模组上传
- 支持 JSON 导入导出

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 页面入口 | `src/pages/ModuleToolTab/index.tsx` | React Flow 容器 + 工具栏 |
| 自定义节点 | `src/pages/ModuleToolTab/ClueNode.tsx` | 分类色彩 + 弹性进入动画 + 置灰 + 收起/展开下游节点 |
| 自定义边 | `src/pages/ModuleToolTab/AnimatedEdge.tsx` | SmoothStep路径 + 方向箭头 + 虚线流动 + 关系标注 |
| 数据类型 | `src/types/index.ts` | ClueNodeData, ClueEdgeData, ModuleClueData |
| 状态管理 | `src/stores/use-clue-store.ts` | localStorage 同步 |

### 待开发

- [x] 多对多示例模组数据（含越级指向和环形边）
- [x] 边触发发现交互（点击边标记两端节点）
- [x] 节点直接发现 + 补充说明弹窗
- [x] 取消特殊发现（点击已特殊发现的节点）
- [x] 一键排版（dagre 布局，acyclicer: greedy 支持有环图）
- [x] 有环图支持
- [x] 方向箭头（MarkerType.ArrowClosed 单向箭头）
- [x] 节点收起/展开（BFS 下游未发现节点隐藏/显示，防死循环）
- [x] localStorage 版本控制（DATA_VERSION 强制刷新旧缓存数据）

---

## TAB3 - 博客与杂谈 (BlogTab)

### 业务说明

- 文章展示与更新
- 博客/杂谈分类切换（Tabs）
- Markdown 渲染（react-markdown + remark-gfm）
- 文章详情页

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 页面入口 | `src/pages/BlogTab/index.tsx` | 列表 + 详情 + Markdown 渲染 |

---

## 共享模块

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 路由配置 | `src/App.tsx` | React Router v7 + lazy import + Suspense |
| Tab 布局 | `src/components/TabLayout.tsx` | 动画化导航 + 毛玻璃效果 + layoutId |
| 暗色模式 | `src/components/theme-provider.tsx` | ThemeProvider (light/dark/system) |
| 主题切换 | `src/components/mode-toggle.tsx` | 太阳/月亮图标循环切换 |
| Toast 通知 | `src/components/ui/sonner.tsx` | Sonner 集成 |
| 工具函数 (cn) | `src/lib/utils.ts` | clsx + tailwind-merge |
| 全局样式 | `src/index.css` | Tailwind CSS 4 + Shadcn/ui 主题变量 + 动画 |
| Shadcn/ui 组件 | `src/components/ui/` | button, card, input, textarea, label, sonner, tabs, badge, switch, separator, skeleton |
| localStorage 状态 | `src/stores/` | use-profile-store, use-clue-store |
| JSON 导入导出 | `src/utils/json-io.ts` | Zod schema 校验 + 文件大小限制 |
| 类型定义 | `src/types/index.ts` | Profile, Module, ClueNode, ClueEdge, BlogPost, ExportData |
