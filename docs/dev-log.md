# 开发记录

> 记录每次 AI 辅助开发的工作内容，便于追溯进度和上下文衔接。

## 记录格式

| 时间 | Agent | 分支 | 内容 | 涉及文件 |
|------|-------|------|------|----------|
| 时间戳 | 执行者角色 | Git 分支 | 工作内容摘要 | 主要变更文件 |

Agent 角色：`团队负责人` / `实习生` / `技术专家` / `git-reviewer` / `用户`

---

## 2026-04

### 2026-04-15

| 时间 | Agent | 分支 | 内容 | 涉及文件 |
|------|-------|------|------|----------|
| 22:50 | 实习生 x4 | master | 并行调研：Vite6+React19+TS初始化、TailwindCSS4+Shadcn配置、React Router v7三Tab布局、文档结构设计 | — |
| 23:10 | 团队负责人 | master | 整合调研结论，初始化项目骨架：配置文件、三Tab路由、响应式布局、文档结构 | package.json, vite.config.ts, tsconfig*.json, eslint.config.js, src/**, docs/** |
| 23:30 | 技术专家 x2 | master | 评审项目初始化方案（专家A: 82分通过，专家B: 88分通过） | — |
| 23:40 | 团队负责人 | master | 修复专家反馈：CLAUDE.md补充lib/目录、package.json添加engines、NotFound改用Link、添加.node-version | CLAUDE.md, package.json, NotFound.tsx, .node-version |

### 2026-04-16

| 时间 | Agent | 分支 | 内容 | 涉及文件 |
|------|-------|------|------|----------|
| 00:10 | 团队负责人 | master | Node.js 升级到 v20.20.2（nvm-windows），pnpm install + build 验证通过，dev server 启动成功 | .npmrc, package.json |

### 2026-04-17

| 时间 | Agent | 分支 | 内容 | 涉及文件 |
|------|-------|------|------|----------|
| — | 实习生 3号 | master | 调研 Shadcn/ui 安装流程、组件推荐、暗色模式方案 | — |
| — | 技术专家 A+B | master | 评审技术选型方案（各 72 分，条件通过）。反馈：Framer Motion 控制使用范围、Shadcn 精简到 10 组件、必须加 Zod 校验 | — |
| — | 团队负责人 | master | **迭代1**: 安装 framer-motion/react-flow/lucide-react/zod/react-markdown/sonner/cva，初始化 Shadcn/ui (11组件)，实现暗色模式 ThemeProvider + ModeToggle，动画化 TabLayout | package.json, components.json, src/components/theme-provider.tsx, src/components/mode-toggle.tsx, src/components/TabLayout.tsx, src/components/ui/\*.tsx, src/main.tsx, src/index.css |
| — | 团队负责人 | master | **迭代2**: TAB1 ProfileTab 完整实现 — 个人介绍编辑、模组卡片 CRUD、状态筛选、弹窗动画、JSON 导入导出 (Zod 校验) | src/pages/ProfileTab/index.tsx, ProfileEditor.tsx, ModuleDialog.tsx, src/stores/use-profile-store.ts, src/utils/json-io.ts, src/types/index.ts |
| — | 团队负责人 | master | **迭代3**: TAB2 ModuleToolTab (React Flow DAG 线索可视化 + 自定义节点/边动画) + TAB3 BlogTab (Markdown 渲染 + 文章列表) | src/pages/ModuleToolTab/index.tsx, ClueNode.tsx, AnimatedEdge.tsx, src/stores/use-clue-store.ts, src/pages/BlogTab/index.tsx |
| — | 团队负责人 | master | 代码分割优化：lazy import + Suspense，首屏从 278KB 降至 ~142KB | src/App.tsx |
| — | 团队负责人 | master | 撰写 MVP v1.0 团队工作报告 | docs/reports/2026-04-17-mvp-v1-report.md |
| — | 用户 | master | **反馈5条**: (1) DAG 需多对多关系 (2) 发现机制改为点击边 (3) 一键排版 (4) UI 太丑需美化 (5) 克苏鲁风格 | — |
| — | 团队负责人 | master | 更新 CLAUDE.md 强制开发日志规则，更新 user_request.md 记录新需求，补全历史开发日志 | CLAUDE.md, user_request.md, docs/dev-log.md |
| — | 团队负责人 | master | **DAG重构**: 多对多示例模组(9节点12边)、边触发发现机制、节点直接发现弹窗、类型重命名(acquired→discovered)、Zod schema同步更新 | src/types/index.ts, src/stores/use-clue-store.ts, src/pages/ModuleToolTab/index.tsx, ClueNode.tsx, AnimatedEdge.tsx, DirectDiscoverDialog.tsx, src/utils/json-io.ts |
| — | 团队负责人 | master | **一键排版**: 安装 @dagrejs/dagre，实现 getAutoLayout (TB方向 dagre 布局)，ModuleToolTab 添加排版按钮 | src/utils/auto-layout.ts, src/pages/ModuleToolTab/index.tsx, package.json |
| — | 团队负责人 | master | **克苏鲁主题**: 重写 index.css — 泛黄古卷浅色 + 深渊暗色双主题，Cinzel+Noto Serif SC 字体，噪点纹理背景，暗角效果，幽光动画，DAG节点改为绿紫金色系 | src/index.css, src/components/TabLayout.tsx, src/pages/ModuleToolTab/ClueNode.tsx |
| — | 团队负责人 | master | 更新 docs/tech-decisions.md (TD-007~TD-010)，docs/business.md 完整更新，docs/dev-log.md 同步 | docs/* |

### 2026-04-18

| 时间 | Agent | 分支 | 内容 | 涉及文件 |
|------|-------|------|------|----------|
| — | 实习生 x5 | master | 并行调研：(1)特殊发现取消bug分析 (2)越级指向+有环图可行性 (3)克苏鲁图片资源方案 (4)整体UI花哨化方案 (5)dagre/ReactFlow有环图技术验证 | — |
| — | 技术专家 x2 | master | 评审整合方案（专家A: 82分通过，专家B: 78分通过）。关键反馈：环形边Handle方向、handleNodeClick三种情况、弹窗简化、prefers-reduced-motion | — |
| — | 团队负责人 | master | **需求1**: 修复特殊发现无法取消bug — Store新增cancelDirectDiscovery、handleNodeClick支持三种情况（未发现/特殊发现/边触发发现） | use-clue-store.ts, ModuleToolTab/index.tsx |
| — | 团队负责人 | master | **需求2+3**: 越级指向示例(+3边)+有环图支持 — demoData新增e13-e15(含环形边n9→n1)、auto-layout添加acyclicer:greedy、ClueNode增加左右Handle | use-clue-store.ts, auto-layout.ts, ClueNode.tsx |
| — | 团队负责人 | master | **需求4+5**: UI花哨化 — 新增CSS动画(glow-pulse/float/rune-spin)、eldritch-card/nav-glow-line/profile-hero/blog-card样式类、SVG符文装饰、DAG节点核心线索发光、prefers-reduced-motion | index.css, TabLayout.tsx, ProfileTab/index.tsx, BlogTab/index.tsx, ClueNode.tsx |
| — | 团队负责人 | master | Zod schema添加passthrough()、tech-decisions更新(TD-005/TD-009/TD-011)、business.md同步、dev-log记录 | json-io.ts, docs/* |
| — | 用户 | master | **反馈5条(Round2)**: (1)密室-日记边未显示(localStorage缓存) (2)边需要方向箭头 (3)箭头连接节点边缘 (4)节点收起/展开 (5)Tab1需Apple风格滚动页 | — |
| — | 团队负责人 | master | **边显示修复+方向箭头**: localStorage版本控制(DATA_VERSION强制刷新旧数据)、MarkerType.ArrowClosed单向箭头、getSmoothStepPath替代getBezierPath | use-clue-store.ts, AnimatedEdge.tsx, ModuleToolTab/index.tsx |
| — | 团队负责人 | master | **节点收起/展开**: BFS收集下游未发现节点(visited Set防死循环)、hasChildren计算、收起/展开按钮、节点四方向Handle(Top/Bottom/Left/Right) | ClueNode.tsx, ModuleToolTab/index.tsx |
| — | 团队负责人 | master | **Tab1 Apple风格重做**: 7段长滚动页(Hero视差/关于我/数据统计/跑团理念/模组库/免责声明/联系方式)、useScroll+useTransform视差、whileInView滚动触发动画、虚假文案填充 | ProfileTab/index.tsx |
| — | 团队负责人 | master | 修复构建错误：移除未使用的Eye导入、ease类型添加as const | ProfileTab/index.tsx |
| — | 技术专家 A | master | 审查收起/展开功能(42分): 死循环防护OK，但展开逻辑复用getDownstreamUndiscovered有缺陷、多父节点冲突、边发现隐藏节点不一致 | — |
| — | 技术专家 B | master | 审查Tab1 Apple风格(72分): ::before伪元素冲突bug、联系卡片溢出、标题字号过大、缺少useReducedMotion、冗余font-heading内联 | — |
| — | 团队负责人 | master | **修复专家A反馈**: 新增getDownstreamHidden(展开时按hidden属性恢复)、边发现自动取消隐藏节点 | ClueNode.tsx, ModuleToolTab/index.tsx |
| — | 团队负责人 | master | **修复专家B反馈**: profile-hero改用background多层叠加、联系卡片加flex-wrap、标题text-3xl→sm:text-5xl→md:text-6xl、min-h-[50vh] sm:min-h-[70vh]、useReducedMotion全局动效降级、移除冗余font-heading内联 | index.css, ProfileTab/index.tsx |
