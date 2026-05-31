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

### 2026-05-26

| 时间 | Agent | 分支 | 内容 | 涉及文件 |
|------|-------|------|------|----------|
| — | 团队负责人 | master | **Safari 博客详情闪烁修复**: 禁用 iOS/Safari 上 layoutId 共享布局动画（columns+fixed 定位不准），改用淡入缩放；列表选中项 invisible 防重影；桌面 Chrome 保留 layoutId | src/pages/BlogTab/index.tsx |

### 2026-05-27

| 时间 | Agent | 分支 | 内容 | 涉及文件 |
|------|-------|------|------|----------|
| — | 团队负责人 | master | **工具箱新增世界 Wiki**: (1) 新增 `/tools/world-wiki` 检索首页与详情页 (2) 工具浮窗插入第二项“世界 wiki” (3) 词条改为 `public/wiki/index.json + entries/*.md` 静态驱动 (4) 支持当前 PL 按钮与隐藏档案遮罩解锁 (5) 补充 Allen / 莱纳 / 甘、地点、事件、模组示例词条 (6) 扩展 deploy-content 工作流支持 wiki 内容免重建部署 (7) 同步更新业务/技术/需求文档与方案报告 | src/pages/WorldWikiTab/index.tsx, src/App.tsx, src/components/TabLayout.tsx, public/wiki/index.json, public/wiki/entries/*.md, .github/workflows/deploy-content.yml, .github/workflows/deploy.yml, docs/business.md, docs/tech-decisions.md, user_request.md, docs/reports/2026-05-27-world-wiki-plan.md |
| — | 团队负责人 | master | **世界 Wiki 二次重构**: (1) 改为 `public/wiki/entities/*.json` 模拟数据库并新增 `generate-wiki-index.ts` 自动生成索引 (2) 人物/PL/模组全部使用唯一 key，展示名与跳转解耦 (3) 页面用途文案改为给 PL 跑后回顾与战报补链使用 (4) 黑框权限升级为 `secret-panel` + `secret-inline` 两级 (5) 中文命名优先并补充唯一键信息展示 (6) 清理旧 markdown 词条并同步修正文档 | src/pages/WorldWikiTab/index.tsx, scripts/generate-wiki-index.ts, package.json, public/wiki/entities/*.json, public/wiki/index.json, docs/business.md, docs/tech-decisions.md, docs/dev-log.md, user_request.md, docs/reports/2026-05-27-world-wiki-plan.md |
| — | Cursor Agent | master | **世界 Wiki 搜索状态文案**: 搜索框下方空白区增加三种检索反馈（无关键词 / 有结果统计 / 空结果），并移除底部重复空态提示 | src/pages/WorldWikiTab/index.tsx, docs/dev-log.md |
| — | Cursor Agent | master | **世界 Wiki 搜索状态文案样式**: 检索反馈居中展示、字号加大，关键词与总数用 primary / font-heading 强调，内嵌轻量卡片与页面风格统一 | src/pages/WorldWikiTab/index.tsx, docs/dev-log.md |
| — | 团队负责人 | master | **Wiki 拆分与 Admin 调研**: 4 实习生并行调研 entries 拆分方案与 dev-only 可视化后台可行性，双专家交叉审核，报告落盘 | docs/reports/2026-05-27-wiki-split-admin-research.md, docs/dev-log.md |
| — | Cursor Agent | master | **世界 Wiki Phase 1 拆分落地**: 抽出共享 wiki 类型与 Node 校验工具，将 `entries.json` 迁移为 `entities/entries/{entryId}.json` 单文件目录，索引脚本改为目录读取，详情页改为按词条懒加载 | src/types/wiki.ts, scripts/wiki-data.ts, scripts/generate-wiki-index.ts, scripts/split-wiki-entries.ts, public/wiki/entities/entries/*.json, public/wiki/index.json, src/pages/WorldWikiTab/index.tsx, docs/business.md, docs/reports/2026-05-27-wiki-split-admin-research.md, docs/dev-log.md |
| — | Cursor Agent | master | **世界 Wiki Phase 2a 管理台 MVP**: 新增 dev-only `/admin/wiki` 词条管理页与 Vite 写盘接口，支持元数据编辑、content JSON 模板辅助、实时预览和保存后重生 index；同步补充 TD-022 与需求文档进度 | src/pages/WikiAdminTab/index.tsx, src/features/wiki/WikiContentRenderer.tsx, src/App.tsx, src/pages/WorldWikiTab/index.tsx, scripts/wiki-admin-plugin.ts, vite.config.ts, docs/business.md, docs/tech-decisions.md, user_request.md, docs/reports/2026-05-27-wiki-split-admin-research.md, docs/dev-log.md |
| — | Cursor Agent | master | **世界 Wiki Phase 2b 可视化编辑器**: 为 dev-only 管理台补齐 block 级递归编辑器，支持 token/list/secret-panel 的增删改排序，并将原始 content JSON 调整为兜底修复面板 | src/features/wiki/WikiBlockEditor.tsx, src/pages/WikiAdminTab/index.tsx, docs/business.md, docs/tech-decisions.md, user_request.md, docs/reports/2026-05-27-wiki-split-admin-research.md, docs/dev-log.md |
| — | Cursor Agent | master | **世界 Wiki 编辑体验增强**: block/token/list item 新增复制操作，管理台支持从正文 ref 反向同步 relatedEntryIds，进一步减少手动维护成本 | src/features/wiki/WikiBlockEditor.tsx, src/pages/WikiAdminTab/index.tsx, docs/business.md, docs/tech-decisions.md, user_request.md, docs/reports/2026-05-27-wiki-split-admin-research.md, docs/dev-log.md |
| — | Cursor Agent | master | **工具箱 Tab 顶栏抖动修复**: 根布局改为 `h-dvh` 固定视口高度，滚动下沉到 `main` 独立容器；全局与内容区启用 `scrollbar-gutter: stable`，顶栏右侧预留安全间距，避免子工具切换时滚动条出现/消失导致右上角闪烁 | src/components/TabLayout.tsx, src/index.css, docs/dev-log.md |
| — | Cursor Agent | master | **世界 Wiki 搜索栏折叠化**: 顶部改为单行折叠头 + 展开内容；搜索框回车后自动展开，详情页进入时默认收起，并在折叠态补充 0 结果轻提示，强化百科详情页观感 | src/pages/WorldWikiTab/index.tsx, docs/dev-log.md |
| — | Cursor Agent | master | **Wiki Admin 构建错误修复**: 修正 `advanced` 模式条件渲染的 JSX 父节点缺失问题，为并列 Card 增加 Fragment 包裹，恢复 CI / deploy 构建通过 | src/pages/WikiAdminTab/index.tsx, docs/dev-log.md |
| — | Cursor Agent | master | **博客内链到工具箱**: 在文章首段新增指向 `/tools/soundboard` 的站内跳转链接，便于读者直接打开音效键盘 | public/blog/posts/horror-sound-design.md, docs/dev-log.md |
| — | Cursor Agent | master | **模组数据统一补全**: 为模组实体补齐规则类型/人数/时长/战役/模组集/长简介字段，并新增“新手推荐”模组条目；同步把 ProfileTab 的模组引用改为稳定的 moduleId | public/wiki/entities/modules.json, public/config/profile.json, src/types/wiki.ts, docs/dev-log.md |
| — | Cursor Agent | master | **模组列表/详情/博客联动**: 改造模组列表页为预览卡+战役/模组集折叠分组，新增模组详情页路由；新手模组文章补充右上角入口并为每个模组名加可点击详情跳转 | src/pages/WorldWikiModulesTab.tsx, src/pages/WorldWikiModuleDetailTab.tsx, src/App.tsx, src/features/modules/ModulePreviewCard.tsx, public/blog/posts/beginner-modules.md, docs/dev-log.md |
| — | Cursor Agent | master | **Profile 模组区联动**: 首页个人介绍 Tab 的模组模块改为复用模组列表预览卡并支持点击进入详情页，底部增加“更多模组”按钮跳转到模组列表页 | src/pages/ProfileTab/index.tsx, src/features/modules/ModulePreviewCard.tsx, docs/dev-log.md |
| — | Cursor Agent | master | **模组规则与结构标签补全**: 将全部模组的规则类型统一为 COC7；并仅对可证实为非线性推进的《面具》追加“沙盒”结构标签，其余保持空缺避免误判 | public/wiki/entities/modules.json, docs/dev-log.md |
| — | Cursor Agent | master | **密斯卡托尼克河流域新传补全**: 依据魔都（cnmods）条目补齐系列 1-4、7 的模组信息，并用魔都简介/推荐语更新系列 5（永恒恶意）、6（夜战）的展示数据，统一归入同一模组集 | public/wiki/entities/modules.json, docs/dev-log.md |
| — | Cursor Agent | master | **构建失败修复**: 清理抓取魔都页面时落盘的外部前端 bundle 文件，避免 Tailwind 扫描到无效 url 导致 Vite 构建尝试解析不存在的图片资源 | .tmp/cnmods-index.js, .tmp/cnmods-1969.html, docs/dev-log.md |
| — | Cursor Agent | master | **Wiki/博客内容瘦身**: 模组仅保留“有战役/模组集”与“有些人油盐不进”，同步删除多余 module 词条文件；博客仅保留 4 篇并重命名战报标题，同时在模组列表页补齐“未分类”折叠标题与更清晰的列表边界 | public/wiki/entities/modules.json, public/wiki/entities/entries/*.json, src/pages/WorldWikiModulesTab.tsx, public/blog/posts/*.md, docs/dev-log.md |
| 16:10 | Cursor Agent | master | **Notion 战报同步（阶段1）**: 将 Notion 战报草稿改写为可发布博客正文，下载并管理相关图片到 `public/` 相对路径后改为本地引用 | public/blog/posts/mist-city-record.md, public/blog/images/report-20260524/*, docs/dev-log.md |
| 16:12 | Cursor Agent | master | **Wiki 玩家补全**: 为战报中出现的新 PC 补齐 PL 列表（Adam/Kiven/Leo），用于后续角色词条与权限系统引用校验 | public/wiki/entities/players.json, docs/dev-log.md |
| 16:14 | Cursor Agent | master | **Wiki 角色词条新增（Adam）**: 新增 Adam 角色词条并接入相关地点/事件关联，作为后续战报外链入口 | public/wiki/entities/entries/char.adam.json, docs/dev-log.md |
| 16:15 | Cursor Agent | master | **Wiki 角色词条新增（Kiven）**: 新增 Kiven 角色词条并补齐与同队角色/地点/事件的关联关系 | public/wiki/entities/entries/char.kiven.json, docs/dev-log.md |
| 16:16 | Cursor Agent | master | **Wiki 角色词条新增（Leo）**: 新增 Leo 角色词条并补齐与同队角色/地点/事件的关联关系 | public/wiki/entities/entries/char.leo.json, docs/dev-log.md |
| 16:18 | Cursor Agent | master | **金斯波特词条补遗**: 将 Notion “金斯波特”页的地图/扩展书截图落盘到 public 静态资源，并在地点词条中补充引用说明与关联角色 | public/wiki/entities/entries/loc.kingsport.json, public/wiki/images/kingsport/*, docs/dev-log.md |
| 16:20 | Cursor Agent | master | **PC 词条丰富（阿甘）**: 基于战报描述补充阿甘人物定位与别名，并保持既有事件链路不变 | public/wiki/entities/entries/char.gan.json, docs/dev-log.md |
| 16:22 | Cursor Agent | master | **PC 词条丰富（莱纳）**: 按战报口吻补充莱纳人物标签与队伍定位，并保持既有 ref/权限结构不变 | public/wiki/entities/entries/char.leina.json, docs/dev-log.md |
| 16:24 | Cursor Agent | master | **PC 词条丰富（Allen）**: 基于战报语境补充 Allen 的叙事定位描述，保持既有事件/地点引用不变 | public/wiki/entities/entries/char.allen.json, docs/dev-log.md |
| 16:25 | Cursor Agent | master | **金斯波特关联 PL 补齐**: 将战报中出现的 PL 追加到金斯波特地点词条，便于权限与筛选统一 | public/wiki/entities/entries/loc.kingsport.json, docs/dev-log.md |
| 16:31 | Cursor Agent | master | **战报文章改为 Wiki 内嵌渲染**: 博客详情页对 `renderMode: wiki` 的文章复用 Wiki 渲染器内嵌展示，并为战报 frontmatter 绑定 `wikiEntryId` | src/pages/BlogTab/index.tsx, scripts/generate-blog-index.ts, public/blog/posts/mist-city-record.md, docs/dev-log.md |
| 16:39 | Cursor Agent | master | **Wiki 支持图片块**: 新增 `image` block 类型并补齐渲染/校验/编辑器支持，使 Wiki 页面与博客内嵌均可展示本地图片 | src/types/wiki.ts, scripts/wiki-data.ts, src/features/wiki/WikiContentRenderer.tsx, src/features/wiki/WikiBlockEditor.tsx, docs/dev-log.md |
| 16:40 | Cursor Agent | master | **战报词条图文增强**: 在 `module.kingsport-city-in-the-mists` 词条中补充封面/招募图与跑后隐藏图组（对已参与 PL 可见），提升“绘声绘色”阅读体验 | public/wiki/entities/entries/module.kingsport-city-in-the-mists.json, docs/dev-log.md |
| 16:42 | Cursor Agent | master | **规则补充**: 记录博客 `renderMode: markdown/wiki` 两种文章结构差异与写法约束，避免战报误用 Markdown/HTML | .cursor/rules/blog-post-modes.md, docs/dev-log.md |
| 16:44 | Cursor Agent | master | **业务文档同步**: 在业务文档与项目约定中补充 BlogTab 的双渲染模式（markdown/wiki）与 `wikiEntryId` 绑定关系，减少误用 | docs/business.md, CLAUDE.md, docs/dev-log.md |
| 16:58 | Cursor Agent | master | **Wiki 增加战报类别**: 新增 `report` 词条分类，明确区分“模组设定页”与“具体场次战报页”，并同步到 Wiki 前台与管理台分类配置 | src/types/wiki.ts, src/pages/WorldWikiTab/index.tsx, src/pages/WikiAdminTab/index.tsx, docs/dev-log.md |
| 17:01 | Cursor Agent | master | **Blog 内嵌 PL 权限与图片尺寸优化**: 博客内嵌 Wiki 改为复用 `playerIdByName` 映射解锁当前 PL 内容；Wiki 图片统一限制最大显示宽度与高度，避免桌面端过大 | src/pages/BlogTab/index.tsx, src/features/wiki/WikiContentRenderer.tsx, docs/dev-log.md |
| 17:05 | Cursor Agent | master | **独立战报词条落地**: 新增 `report` 类战报词条并将博客绑定从模组页切换到战报页；模组词条回归“模组介绍/导读”，不再混入单场战报图片与过程 | public/wiki/entities/entries/report.mist-city-record-20260524.json, public/blog/posts/mist-city-record.md, public/wiki/entities/entries/module.kingsport-city-in-the-mists.json, docs/dev-log.md |
| 17:07 | Cursor Agent | master | **模组/战报概念补规约**: 在 rules、业务文档与项目约定中明确“模组是一类内容、战报是具体场次记录；一个模组可对应多条战报” | .cursor/rules/blog-post-modes.md, docs/business.md, CLAUDE.md, docs/dev-log.md |
| 17:09 | Cursor Agent | master | **战报拆分后构建校验**: 重新生成 wiki/blog 索引并通过生产构建，确认 `report` 词条接入后无类型错误与索引缺失 | public/wiki/index.json, public/blog/index.json, docs/dev-log.md |
| 17:13 | Cursor Agent | master | **战报补齐 Notion 正文文字**: 通过 Notion MCP 拉取战报页面正文，将“碎碎念/剧透提示/跑团过程记录”整理成 Wiki blocks 写入独立 `report` 词条（并吸收移除所有 `【to ai】` 指令） | public/wiki/entities/entries/report.mist-city-record-20260524.json, docs/dev-log.md |
| 17:18 | Cursor Agent | master | **战报归属修正 & PL 唯一键匹配**: 战报标题与关联模组修正为《夜战》；PL 输入升级为“唯一 key（pl.xxx）优先，精确匹配”，并在弹窗中展示可输入 key 列表；同时索引生成对 lookup 冲突做硬校验 | public/wiki/entities/entries/report.mist-city-record-20260524.json, public/blog/posts/mist-city-record.md, scripts/wiki-data.ts, src/pages/WorldWikiTab/index.tsx, src/pages/BlogTab/index.tsx, docs/dev-log.md |
| 17:21 | Cursor Agent | master | **PL 输入规则文档补全**: 补充“PL 唯一 key 精确匹配、自动收敛、可输入列表”规则到项目约束与业务文档，避免后续误用模糊匹配 | .cursor/rules/blog-post-modes.md, docs/business.md, docs/dev-log.md |
| 17:24 | Cursor Agent | master | **修复“我跑过的”筛选数据一致性**: 博客战报 frontmatter `players` 统一改为 PL 唯一 key（pl.xxx），并将筛选逻辑改为按 playerId 匹配，避免角色名/显示名混用导致匹配失败 | public/blog/posts/mist-city-record.md, src/pages/BlogTab/index.tsx, .cursor/rules/blog-post-modes.md, docs/business.md, docs/dev-log.md |
| 17:52 | Cursor Agent | master | **PL 弹窗去交互化 + Wiki 换行/emoji 修复**: PL 弹窗不再提供“点击自动填入”，仅展示可查询的 key 参考清单；Wiki 渲染将文本中的 `\\n` 转为换行，修复引用区换行滞后与 emoji 显示；战报开头新增金斯波特/噩梦事件快速跳转 | src/pages/WorldWikiTab/index.tsx, src/pages/BlogTab/index.tsx, src/features/wiki/WikiContentRenderer.tsx, public/wiki/entities/entries/report.mist-city-record-20260524.json, docs/dev-log.md |
| 18:33 | Cursor Agent | master | **战报博客剧透确认蒙层**: 对未参与当前战报的 PL，在 `report.*` 博客详情页先显示居中剧透确认蒙层；蒙层期间正文模糊遮罩且详情容器禁滚动，确认后放行、取消则返回列表；同步补充业务文档与规则说明 | src/pages/BlogTab/index.tsx, docs/business.md, .cursor/rules/blog-post-modes.md, docs/dev-log.md |
