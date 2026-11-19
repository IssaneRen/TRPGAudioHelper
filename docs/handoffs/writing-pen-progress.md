# 写作·笔 开发进度 handoff

> 本文档是「写作·笔」子应用开发的交接文档，随开发进展持续更新。
> 每次阶段性推进后更新「当前状态」，网络中断后新会话可据此继续。

## 任务来源

用户需求（2026-11-19）：

1. 在 https://www.issane.cn/apps 的「写作·笔」占位处提供真实应用入口。
2. 功能参考 nov-studio.com（笔随 Novel Studio）网页版与桌面版的功能集（注意：**功能对齐、设计原创**，不复制其文案、图片、代码、示例书内容）。
3. 重点：**任务/剧情关系图连线的 UI**（大纲矩阵 + 因果/呼应连线 + 关系图谱），以及线索（伏笔）体系。可视化方式参考小红书帖「小说创作工作台，人物伏笔不再乱」（结构化档案卡：头像 + 身份标签 + 一句话定位 + 查看档案；线索卡带「记录到的痕迹」「下一步」等结构）。
4. 编写内容支持导入/导出。
5. 每执行 30 分钟更新一次本 handoff；开发期间不打扰用户。
6. 在独立 worktree 开发，完成后清空 worktree；不得与 sess_1e6e755b（博客编辑器 BlockNote 改造，content-admin 方向）冲突。

## 架构事实（已确认）

- 仓库：`git@github.com:IssaneRen/TRPGAudioHelper.git`；本任务基于 `origin/master`（df67f97）建分支 `feat/writing-pen-app`。
- **Worktree 路径：`D:\workplace\LuciusVibeCoding\issane-writing`**（主仓在 TRPGAudioHelper，另一个会话在主仓工作，不要动主仓工作区）。
- 子应用模式：`apps/<英文短名>/` 独立 package.json + npm 锁文件（不进 pnpm workspace），根目录 `scripts/build-apps.mjs` 自动 `npm ci && npm run build` 并拷贝到 `dist/apps/<短名>/`。
- 目录页：`src/pages/AppsDirectory/index.tsx`，「写作·笔」目前是 `{ id: "writing", name: "写作·笔", letter: "笔" }` 占位；改为带 `href`/`icon`/`summary` 的正式项。
- 子应用 Vite 需配置 `base: "/apps/<短名>/"`，路由 basename 同步；构建脚本 `tsc --noEmit && vite build`；参考 apps/xinzhi-reader。
- 发布：主站全量部署（deploy.yml / deploy-direct.sh）会携带 apps/；也可在授权后走 GitHub Actions「Deploy static overlay」。**部署需用户授权**，SSH 直传失败时暂停等用户答复。
- 本应用名定为「写作·笔」，英文短名 `writing-pen`，URL `/apps/writing-pen/`。

## 竞品功能考察结论（nov-studio.com）

登录墙后的网页版无法直接进入；官网首页（含完整界面示意 mock）+ 更新记录页已覆盖功能面：

1. **写作界面**：章节目录（卷/章/字数）、正文编辑、搜索本书、今日目标 + 连续天数、专注模式、正文内设定名高亮、右栏五页签（提要/关联/伏笔/批注/检查）、出场人物卡（头像/身份/简介/别名）与关键地点卡。
2. **大纲**：剧情线 × 阶段矩阵；每行一条剧情线（彩色圆点），每列一个阶段（章节区间）；事件卡（章节区间、已写/待撰写字数、摘要）；卡间**曲线连线**标注「因果 / 呼应」；右栏事件详情（剧情线标签、出场人物、构思、本章细纲 checklist、钩子、关联列表含方向与类型）；三种视图（长卷/阶段/穿插）；待想卡（虚线占位）。
3. **设定台**：世界（地图/地点/势力/体系）、角色（人物：名册/关系/出场）、剧情（物件/历史）；人物卡有出场进度条（逐章出现块）、最近登场、未出场章数、关系数。
4. **地图编辑器**：图层/选择/地点/文字/线条/面/图案工具，缩放，导出。（本期简化：地点档案不做画布地图，列为后续版本。）
5. **其他**：伏笔线（设定台看全书伏笔，写作页可直接呼应/误导/揭晓）、总体构想、手记卡、取名骰子、检查（标点）、主题（液态玻璃·夜/日、现代白、夜间、暖纸）、灵感箱（回车存入）、云同步/备份 zip。
6. **不做**（与参考产品差异化或超范围）：会员/动态壁纸/宠物/钥匙串/Mac 更新器等桌面专属。

小红书视频参考（AI 小说创作工作台）：项目总览、世界观档案卡（地点档案/线索卡，含「记录到的痕迹」「下一步」）、人物小传卡、章节大纲（场景目标 + 悬念）、正文修订版本记录（v12.4/12.3… 每次保存留版本）。

## 本应用实现决策（详见 PRD）

- 单书 PWA，数据存 localStorage + 导入/导出 JSON（含 Markdown 导出正文）。
- 模块：书架（多书）、写作（章节树 + 编辑器 + 右栏）、大纲（矩阵 + 连线）、设定台（人物/地点/势力/物件/线索）、关系图谱（自由画布，本任务**核心亮点**）、灵感箱、统计。
- 关系图谱与大纲连线均为**手写 SVG 曲线**（不引重依赖），节点拖拽、边标签、类型过滤。

## 当前状态

- [x] Worktree 建立与架构研读
- [x] 竞品功能考察（官网 + 更新记录 + 小红书参考）
- [x] PRD / UI / 技术评审文档落盘 docs/apps/writing-pen/
- [x] 子应用脚手架与数据层（apps/writing-pen/，Zustand + localStorage 多 key 分书）
- [x] 六大视图全部完成（写作 / 大纲矩阵连线 / 关系图谱 / 设定台 / 灵感箱 / 统计）+ 导入导出
- [x] 子应用构建通过（tsc --noEmit + vite build，gzip 86KB）
- [x] /apps 目录接入（AppsDirectory writing 占位 → 正式项）
- [x] 主站 pnpm build 全量验证通过（build-apps 完成 writing-pen, xinzhi-reader）
- [x] **CDP 自动化自测 18/18 通过**（自测脚本 artifacts/selftest/cdp-driver.mjs，零依赖 Node 原生 WebSocket 驱动无头 Edge）
- [x] 自测发现并修复两处渲染缺陷：
  1. OutlineView useLayoutEffect 每渲染 setCardPos(新对象) → React #185 无限重渲染崩溃（已加浅比较守卫）
  2. GraphView 连线在 render 中读 DOM rect，读到提交前旧坐标 → 边坍缩不可见（positions 提交后补一轮渲染 + 事件节点改外圈布局）
- [x] docs/apps/README.md 表格补「写作·笔」行
- [ ] 部署（本地构建直传 issane.cn，用户已在任务中预授权「本地差不多了再部署」）
- [ ] 线上验证 + 推送 master（fast-forward，HEAD 带 [skip ci]）+ 清理 worktree

## 关键提交

- 43f0081 docs(writing-pen): PRD、UI 稿、技术评审与进度 handoff
- 5ea44c0 feat(writing-pen): 新增「写作·笔」子应用并接入 /apps 目录
- 1e3e70c fix(writing-pen): 修复大纲矩阵无限重渲染与图谱连线坐标滞后

## 给下一个会话的操作指引

1. `cd D:\workplace\LuciusVibeCoding\issane-writing`（worktree，分支 feat/writing-pen-app）。
2. 先读本文件与 docs/apps/writing-pen/PRD.md，再 `git log --oneline -5` 看进度。
3. 主仓 D:\workplace\LuciusVibeCoding\TRPGAudioHelper 属于另一会话（博客编辑器），**不要在那里提交**。
4. 自测脚本：`node artifacts/selftest/cdp-driver.mjs`（先启动 `node artifacts/selftest/static-server.mjs dist 4173`）。
5. 部署：`SERVER_HOST=issane.cn SERVER_USER=ubuntu scripts/deploy-direct.sh`（worktree 无 deploy.local.conf，需传环境变量）。SSH 认证失败即停，等用户答复（仓库规则）。
6. 部署后验证 issane.cn/apps/ 与 /apps/writing-pen/，再 `git push origin feat/writing-pen-app:master`（fast-forward；HEAD 提交注明 [skip ci]），最后 `git worktree remove ../issane-writing` 清场。

## 已知待打磨（自测后处理）

- 大纲连线坐标依赖 useLayoutEffect 每次渲染重测，行/列多时可能有微小滞后；可改惰性测量。
- 图谱中「事件」节点坐标不持久化（刷新后重新散布）——如需持久化可加 outline.events[].graph。
- 正文高亮目前只做右栏关联卡展示，编辑区内联高亮留待后续版本（避免 contentEditable 复杂度）。
- 未做移动端适配（桌面优先）。

## 给下一个会话的操作指引

1. `cd D:\workplace\LuciusVibeCoding\issane-writing`（worktree，分支 feat/writing-pen-app）。
2. 先读本文件与 docs/apps/writing-pen/PRD.md，再 `git log --oneline -5` 看进度。
3. 主仓 D:\workplace\LuciusVibeCoding\TRPGAudioHelper 属于另一会话（博客编辑器），**不要在那里提交**。
4. 提交信息用中文 feat/docs 前缀，遵循仓库习惯。
