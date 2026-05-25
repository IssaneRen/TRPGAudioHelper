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
| — | 团队负责人 | master | **Live2D背景层**: 创建Live2DBackground组件(pixi.js v7 + pixi-live2d-display/cubism4)，lazy加载集成到ProfileTab Hero区域，支持resize自适应、hit交互、shouldReduceMotion降级 | src/pages/ProfileTab/Live2DBackground.tsx, src/pages/ProfileTab/index.tsx |
| — | 团队负责人 | master | **修复Live2D不显示**: (1)CDN模型改为本地托管(public/live2d/Hiyori/) (2)app.destroy(true)→false防止React canvas被移除 (3)移除cleanup中delete window.PIXI (4)Cubism Core改同步加载 | Live2DBackground.tsx, ProfileTab/index.tsx, index.html, public/live2d/** |

### 2026-04-19

| 时间 | Agent | 分支 | 内容 | 涉及文件 |
|------|-------|------|------|----------|
| — | 用户 | master | **v1.2需求**: (1)TAB2自定义模组线索图创建 (2)新TAB3音效键盘(原TAB3→TAB4) | user_request.md |
| — | 实习生 x5 | master | 并行调研：(1)React Flow编辑API (2)图片节点+拖拽连线 (3)3D键盘UI方案 (4)Web Audio API (5)免费音效资源 | — |
| — | 技术专家 x2 | master | 评审实施计划（专家A: 65分不通过，专家B: 65分不通过）。关键反馈：合成音效不满足喜剧控场、base64导出降级、nanoid不必要、创建模式切换逻辑不清晰 | — |
| — | 团队负责人 | master | 整合专家反馈修正方案，直接进入实施（修正点明确，不再第2轮评审） | docs/reports/2026-04-19-v1.2-implementation-plan.md |
| — | 团队负责人 | master | **CP-1**: 路由+导航更新 — App.tsx新增/soundboard路由、TabLayout增加音效键盘Tab(4Tab)、SoundboardTab骨架页面 | App.tsx, TabLayout.tsx, SoundboardTab/index.tsx |
| — | 团队负责人 | master | **CP-2**: 类型+Store扩展 — ClueNodeData添加imageData、Zod schema同步、use-clue-store新增CRUD方法(createNewModule/addNode/addEdge/updateNode/updateEdge/deleteNode/deleteEdge) | types/index.ts, json-io.ts, use-clue-store.ts |
| — | 团队负责人 | master | **CP-3**: TAB2创建模式 — NodeEditDialog(新增/编辑节点)、EdgeEditDialog(编辑边)、ImagePreviewDialog(图片预览)、image-compress.ts(WebP压缩600px)、ModuleToolTab重写(view/edit模式切换、onConnect拖拽连线、双击编辑、Delete删除、新建模组) | ModuleToolTab/*, image-compress.ts |
| — | 团队负责人 | master | **CP-4**: TAB2图片功能 — ClueNode添加图片缩略图+加载失败降级、展示模式双击图片放大预览 | ClueNode.tsx |
| — | 团队负责人 | master | **CP-5+6+7**: TAB3音效键盘 — Keyboard3D(CSS 3D Transform)、Key3D(按键组件)、keyboard-layout.ts(QWERTY布局)、use-audio-manager.ts(AudioContext+合成音效)、use-keyboard-listener.ts(26字母+空格+回车)、use-soundboard-store.ts(localStorage映射+导入导出)、SoundSettings(侧栏面板)、index.css(3D键盘响应式样式) | SoundboardTab/*, hooks/*, stores/*, index.css |
| — | 技术专家 | master | 代码审查(88分通过): P0反馈-handleEdgeClick依赖优化+nodesWithEditCallbacks用useMemo; P1反馈-图片上传加大小限制+localStorage溢出捕获 | — |
| — | 团队负责人 | master | **修复专家反馈**: handleEdgeClick/handleNodeClick改用getNodes/getEdges、nodesWithEditCallbacks包裹useMemo、图片上传10MB限制、localStorage try-catch、图片onError降级 | ModuleToolTab/index.tsx, image-compress.ts, use-clue-store.ts, ClueNode.tsx |
| — | 团队负责人 | master | 文档更新：user_request.md(v1.2需求)、dev-log.md、business.md、tech-decisions.md | docs/* |

### 2026-05-02

| 时间 | Agent | 分支 | 内容 | 涉及文件 |
|------|-------|------|------|----------|
| — | 实习生 | master | **修复任务关系网数据流问题**: (1)use-task-store改为useSyncExternalStore单例模式+Zod校验localStorage (2)TaskFlowSection拖拽position同步回store+store驱动ReactFlow+移除冗余editMode防御 (3)TaskNode使用NodeProps泛型消除as断言 | src/stores/use-task-store.ts, src/pages/ModuleToolTab/TaskFlowSection.tsx, src/pages/ModuleToolTab/TaskNode.tsx |
| — | 实习生 | master | **接入拟真音效合成**: sound-synthesis.ts新增synthesizeBuffer直接返回AudioBuffer、修复8处void dur代码异味; use-audio-manager.ts新增preloadBuffer方法; SoundboardTab/index.tsx移除DEFAULT_SOUNDS改用synthesizeBuffer+分批加载(5个/批)+加载进度条 | sound-synthesis.ts, use-audio-manager.ts, SoundboardTab/index.tsx |
| — | 团队负责人 | master | **修复TAB3导航阻塞bug**: useAudioManager返回对象未useMemo导致引用不稳定，useEffect依赖变化造成无限重启循环阻塞主线程。用useMemo包裹返回值修复 | src/hooks/use-audio-manager.ts |
| — | 团队负责人 | master | **实现音效包导入系统**: (1)PackManifest格式设计(manifest.json+音频文件) (2)useSoundboardStore新增importPack/clearPack/packLabels (3)Keyboard3D/Key3D支持动态packLabel覆盖 (4)SoundboardTab添加导入音效包UI+文件夹选择器 (5)有音效包时跳过合成音效加载 | use-soundboard-store.ts, Key3D.tsx, Keyboard3D.tsx, SoundboardTab/index.tsx |

### 2026-05-22

| 时间 | Agent | 分支 | 内容 | 涉及文件 |
|------|-------|------|------|----------|
| — | 实习生 x4 | master | 并行调研：(1)导航路由结构 (2)ProfileTab实现细节 (3)ModuleToolTab实现 (4)BlogTab+音频功能 | — |
| — | 技术专家 x2 | master | 评审UI重构方案（架构专家76分、UX专家78分通过）。关键反馈：工具箱应用嵌套路由+lazy而非组件state、DropdownMenu语义OK、博客需缓存策略 | — |
| — | 团队负责人 | master | **UI大重构**: (1)导航从4Tab精简为3Tab(个人介绍/工具箱/博客杂谈) (2)ProfileTab改为静态配置驱动(public/config/profile.json)，移除编辑功能 (3)工具箱嵌套路由(/tools/module-clue,/tools/soundboard,/tools/battle)+DropdownMenu切换 (4)BlogTab改为fetch public/blog/下静态markdown文件 (5)新增模拟战斗占位页 (6)删除ProfileEditor/ModuleDialog/use-profile-store | App.tsx, TabLayout.tsx, ProfileTab/index.tsx, BlogTab/index.tsx, ToolboxTab/*, public/config/profile.json, public/blog/**, dropdown-menu.tsx |
| — | 实习生 x4 | master | 并行调研Java客户端(LuciusTrpgStroyTeller/java-client)：核心功能、UI交互、网络数据、当前项目上下文 | — |
| — | 技术专家 x2 | master | 评审战斗模拟器移植方案（架构82分通过、引擎62分不通过→修正后实施）。关键修正：MAX_ROUNDS=100、大失败条件性判定、DB特殊分支、6个可选规则完整实现 | — |
| — | 团队负责人 | master | **战斗模拟器完整实现**: 从Java Swing移植CoC 7版战斗模拟器到React。包含：(1)骰子系统(D100检定6级判定) (2)完整战斗引擎(先攻/攻击/闪避/DB/重伤/8种可选规则) (3)批量模拟器(深拷贝+统计+难度评级) (4)14怪物+4调查员预设 (5)响应式UI(桌面双列/手机单列) (6)角色编辑弹窗 (7)彩色战斗日志+标签筛选+导出 (8)localStorage持久化 | BattleSimulator/*, App.tsx |

## 2026-05

### 2026-05-25

| 时间 | Agent | 分支 | 内容 | 涉及文件 |
|------|-------|------|------|----------|
| — | 实习生 x4 | master | 并行调研：(1)React瀑布流布局库对比 (2)CSS/JS通用瀑布流方案 (3)图片详情页交互模式 (4)Markdown渲染与瀑布流集成 | — |
| — | 团队负责人 | master | 整合4份实习生调研→撰写2份技术文档：瀑布流布局方案对比+Markdown渲染集成方案 | docs/reports/masonry-layout-research.md, docs/reports/markdown-rendering-research.md |
| — | 技术专家 x2 | master | 评审技术调研报告（CC专家87分通过、Codex专家87分通过）。关键修正：layoutId+Portal兼容性风险、时间数据纠正、@types包建议修正 | — |
| — | 团队负责人 | master | 根据专家反馈修订两份报告：补充Portal兼容风险第7条、修正时间/React19兼容性表述、移除多余@types建议、补充体积数据来源 | docs/reports/masonry-layout-research.md, docs/reports/markdown-rendering-research.md |
| — | 团队负责人 | master | **修复P0 Bug**: 安装@tailwindcss/typography + 添加@plugin导入，构建验证通过 | package.json, src/index.css |
| — | 实习生 x4 | master | 并行调研第2轮：(1)小红书双列瀑布流具体实现 (2)layoutId+Portal兼容性深度调研 (3)Radix Dialog动画集成方案 (4)瀑布流图片高度限制策略 | — |
| — | 团队负责人 | master | 整合第2轮调研→大幅更新瀑布流报告：新增第三章(小红书双列实现)、第四章(无Portal详情页方案)、第五章(8个兼容性坑完整清单) | docs/reports/masonry-layout-research.md |
| — | 技术专家 x2 | master | 评审第2轮报告（CC专家88分通过、Codex专家88分通过）。修正：layoutId结构需对齐、推荐模式vs现有模式措辞 | — |
| — | 团队负责人 | master | 根据第2轮专家反馈修订：澄清推荐模式出处、对齐列表/详情的layoutId结构、补充注意事项 | docs/reports/masonry-layout-research.md |
| — | 实习生 x4 | master | 并行分析BlogTab代码：组件结构、数据模型、路由/依赖、UI组件库 | — |
| — | 团队负责人 | master | **BlogTab全面改造**: (1)移除博客/杂谈双Tab改为tag多选筛选 (2)安装react-responsive-masonry实现瀑布流 (3)framer-motion layoutId+AnimatePresence实现列表→详情丝滑过渡 (4)无Portal+flexbox居中方案 (5)新增5篇示例Markdown文章(含表格/代码块/引用) (6)移除category字段统一用tags (7)ESC关闭+body scroll lock+ARIA无障碍 | src/pages/BlogTab/index.tsx, public/blog/index.json, public/blog/posts/*.md, src/types/index.ts, package.json |
| — | 技术专家 x2 | master | 代码审查（CC专家82分→修复ESC/scroll lock后通过、Codex专家82分→修复span/h2一致性后通过）。核心功能正确，修复后达到90+标准 | — |
| — | 团队负责人 | master | **UI优化**: (1)移除react-responsive-masonry改为CSS columns等宽双列 (2)max-w-2xl mx-auto大屏居中 (3)ImageCard图片+渐变遮罩+白色标题 (4)TitleCard方形+文字居中+径向渐变装饰 (5)图片onError降级为TitleCard (6)layoutId移到面板层 (7)标题text-shadow增强可读性 | src/pages/BlogTab/index.tsx, public/blog/index.json, package.json |
| — | 技术专家 x2 | master | UI审查（CC专家87分通过、Codex专家88分通过）。建议修正layoutId目标+文字shadow已采纳 | — |
| — | 团队负责人 | master | **UI修复4项**: (1)手机端始终双列columns-2 (2)图片w-full h-auto保持比例 (3)顶部栏去sticky随内容滚 (4)详情页pb-16底部安全区+固定浮动关闭按钮 | src/pages/BlogTab/index.tsx |
| — | 技术专家 x2 | master | UI修复审查（CC专家82分→修复关闭按钮后通过、Codex专家88分通过）。核心修复正确 | — |
| — | 团队负责人 | master | **图片PageViewer功能**: (1)horror-sound-design.md添加3张示例图片 (2)ArticleContent组件提取MD图片 (3)ImagePageViewer组件CSS scroll-snap水平滑动+指示器+scrollend事件 (4)WebKit滚动条隐藏 (5)代码块内图片跳过 | src/pages/BlogTab/index.tsx, public/blog/posts/horror-sound-design.md |
| — | 技术专家 x2 | master | PageViewer审查（CC专家88分通过、Codex专家72分→修复正则+scrollend后重新通过）。修复：extractImages跳过代码块、scrollend+fallback防抖、WebKit scrollbar隐藏 | — |
| — | 团队负责人 | master | **Cover滑动重构**: (1)移除ArticleContent/ImagePageViewer旧逻辑 (2)cover改为string[] (3)CoverSlider组件:单张直接显示/多张scroll-snap+指示器 (4)第一张h-auto保持比例+onLoad设容器高度/后续object-cover (5)Markdown正文正常渲染含图片 (6)mist-city-record.md添加本地图片演示 (7)指示器加drop-shadow (8)移除无效aspectRatio | src/pages/BlogTab/index.tsx, public/blog/index.json, public/blog/posts/mist-city-record.md, src/types/index.ts |
| — | 技术专家 x2 | master | Cover滑动审查（CC专家88分通过、Codex专家72分→修复高度稳定性+指示器后通过） | — |
| — | 团队负责人 | master | **Tag分级筛选**: DropdownMenu+CheckboxItem实现一级分类不可选+二级多选+其他兜底+已选Badge展示 | src/pages/BlogTab/index.tsx, src/constants/tag-categories.ts |
| — | 团队负责人 | master | **轻量部署**: (1)新建deploy-content.yml博客专用workflow(paths:public/blog/**) (2)主deploy.yml添加paths-ignore排除blog (3)效果:只改博客30秒上线/改代码完整构建 | .github/workflows/deploy-content.yml, .github/workflows/deploy.yml |
| — | 团队负责人 | master | **Frontmatter+自动索引**: (1)所有md添加YAML frontmatter (2)scripts/generate-blog-index.ts自动扫描生成index.json (3)package.json添加prebuild/predev钩子 (4)remark-frontmatter隐藏正文中的frontmatter (5)新增依赖gray-matter/tsx/remark-frontmatter | scripts/generate-blog-index.ts, public/blog/posts/*.md, package.json, src/pages/BlogTab/index.tsx |
| — | 团队负责人 | master | **移动端工具箱+PL筛选**: (1)MobileToolsMenu底部弹出子工具菜单 (2)"我跑过的"特殊tag+players字段筛选(不区分大小写) (3)PL名称输入弹窗+localStorage持久化 (4)空状态提示+点击更新 (5)PL弹窗ESC关闭+aria属性 | src/components/TabLayout.tsx, src/pages/BlogTab/index.tsx, public/blog/posts/mist-city-record.md, scripts/generate-blog-index.ts |
| — | 技术专家 x2 | master | 功能审查（CC专家91分通过、Codex专家82分→修复大小写匹配+ESC+aria后通过） | — |
