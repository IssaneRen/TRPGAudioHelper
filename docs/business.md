# 业务文档

> 记录四个 Tab 的核心业务逻辑、组件结构和代码位置索引。随开发进展持续更新。

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
- **双模式**：展示模式（边触发发现、节点收起展开）/ 编辑模式（CRUD操作）
- **多对多关系**：一个线索可引出多个线索，也可被多个线索引用；支持越级指向和环形关系
- **边触发发现机制**：点击边（关系）→ 标记边两端节点为已发现
- **节点直接发现**：特殊情况，需弹窗补充说明
- **取消特殊发现**：点击已特殊发现的节点可取消，若有已触发边则保持发现状态
- **创建自定义模组**：新建模组（初始"模组开始"节点）、添加节点（"+"按钮+对话框）、拖拽连线、双击编辑、删除
- **图片支持**：节点可上传图片（WebP压缩600px），展示模式双击放大查看
- 已发现线索置灰处理
- 支持**一键排版**（从上到下层次布局，不改变发现状态）
- 支持拖拽、缩放、自定义模组上传
- 支持 JSON 导入导出

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 页面入口 | `src/pages/ModuleToolTab/index.tsx` | React Flow 容器 + 工具栏 + 模式切换(view/edit) |
| 自定义节点 | `src/pages/ModuleToolTab/ClueNode.tsx` | 分类色彩 + 图片缩略图 + "+"添加按钮 + 收起/展开 |
| 自定义边 | `src/pages/ModuleToolTab/AnimatedEdge.tsx` | SmoothStep路径 + 方向箭头 + 虚线流动 + 关系标注 |
| 节点编辑弹窗 | `src/pages/ModuleToolTab/NodeEditDialog.tsx` | 新增/编辑节点（名称/描述/分类/图片） |
| 边编辑弹窗 | `src/pages/ModuleToolTab/EdgeEditDialog.tsx` | 编辑关系描述 |
| 图片预览 | `src/pages/ModuleToolTab/ImagePreviewDialog.tsx` | 全屏图片放大预览 |
| 直接发现弹窗 | `src/pages/ModuleToolTab/DirectDiscoverDialog.tsx` | 特殊发现说明 |
| 图片压缩 | `src/utils/image-compress.ts` | Canvas压缩 + WebP格式 + 600px限制 |
| 数据类型 | `src/types/index.ts` | ClueNodeData(含imageData), ClueEdgeData, ModuleClueData |
| 状态管理 | `src/stores/use-clue-store.ts` | localStorage 同步 + CRUD方法 |

### 已完成功能

- [x] 多对多示例模组数据（含越级指向和环形边）
- [x] 边触发发现交互（点击边标记两端节点）
- [x] 节点直接发现 + 补充说明弹窗
- [x] 取消特殊发现
- [x] 一键排版（dagre 布局，acyclicer: greedy）
- [x] 有环图支持
- [x] 方向箭头（MarkerType.ArrowClosed）
- [x] 节点收起/展开（BFS + visited Set 防死循环）
- [x] localStorage 版本控制
- [x] 创建模式：新建模组、"+"添加节点、拖拽连线、双击编辑、Delete删除
- [x] 图片节点：上传/压缩/缩略图/放大预览

---

## TAB3 - 音效键盘 (SoundboardTab)

### 业务说明

- **3D模拟键盘UI**：CSS perspective + transform 实现3D效果
- **键盘监听**：26个字母 + 空格 + 回车，物理键盘按下对应按键高亮
- **音效播放**：Web Audio API (AudioContext)，每个按键触发对应音效
- **回车停止**：Enter 键停止中断所有正在播放的音效
- **默认音效**：OscillatorNode 合成的不同频率/波形音效
- **自定义上传**：每个按键可上传自定义音效（mp3/wav/ogg, <500KB）
- **导入导出**：JSON 配置文件包含按键映射和 base64 音频数据
- **视觉区分**：有绑定音效的按键深海绿发光，无绑定的置灰

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 页面入口 | `src/pages/SoundboardTab/index.tsx` | 主页面 + 状态管理 + 音效加载 |
| 3D键盘 | `src/pages/SoundboardTab/Keyboard3D.tsx` | 键盘容器 + QWERTY布局 |
| 单个按键 | `src/pages/SoundboardTab/Key3D.tsx` | 3D按键组件(memo) + 按下动画 |
| 布局配置 | `src/pages/SoundboardTab/keyboard-layout.ts` | QWERTY行配置 + key归一化 |
| 设置面板 | `src/pages/SoundboardTab/SoundSettings.tsx` | 侧栏面板 + 逐键上传/删除 |
| 音频管理 | `src/hooks/use-audio-manager.ts` | AudioContext封装 + 预加载 + 播放/停止 + 合成音效生成 |
| 键盘监听 | `src/hooks/use-keyboard-listener.ts` | keydown/keyup + 修饰键过滤 + repeat过滤 |
| 状态管理 | `src/stores/use-soundboard-store.ts` | localStorage 映射 + 导入导出 |
| 3D样式 | `src/index.css` | keyboard-3d-container, key-bound, key-unbound, 响应式 |

---

## TAB4 - 博客与杂谈 (BlogTab)

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
| 路由配置 | `src/App.tsx` | React Router v7 + lazy import + Suspense (4个Tab) |
| Tab 布局 | `src/components/TabLayout.tsx` | 4Tab动画化导航 + 毛玻璃效果 + layoutId |
| 暗色模式 | `src/components/theme-provider.tsx` | ThemeProvider (light/dark/system) |
| 主题切换 | `src/components/mode-toggle.tsx` | 太阳/月亮图标循环切换 |
| Toast 通知 | `src/components/ui/sonner.tsx` | Sonner 集成 |
| 工具函数 (cn) | `src/lib/utils.ts` | clsx + tailwind-merge |
| 全局样式 | `src/index.css` | Tailwind CSS 4 + Shadcn/ui 主题变量 + 动画 + 3D键盘 |
| Shadcn/ui 组件 | `src/components/ui/` | button, card, input, textarea, label, sonner, tabs, badge, switch, separator, skeleton |
| localStorage 状态 | `src/stores/` | use-profile-store, use-clue-store, use-soundboard-store |
| JSON 导入导出 | `src/utils/json-io.ts` | Zod schema 校验 + 文件大小限制 |
| 图片压缩 | `src/utils/image-compress.ts` | Canvas + WebP + 10MB上传限制 |
| 自动排版 | `src/utils/auto-layout.ts` | dagre布局 + acyclicer |
| 类型定义 | `src/types/index.ts` | Profile, Module, ClueNode, ClueEdge, BlogPost, ExportData |
