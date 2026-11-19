# 写作·笔 PRD（Pen Studio · Web）

> 版本 v1.0 · 2026-11-19 · 分支 feat/writing-pen-app
> 功能形态对齐「笔随 Novel Studio」等长篇小说写作软件的通用功能集，界面与文案全部原创。

## 0. 一句话定位

为长篇小说（也适配跑团模组创作）而生的**纯前端**写作工作台：章节、人物、地点、线索、大纲、关系图谱都在一个界面里，数据保存在浏览器本地并可随时导入/导出。

## 1. 范围与非目标

**本期范围（MVP，一个可上线的完整网页应用）**

- 书架：多作品管理、新建/删除/重命名、作品级统计。
- 写作：卷/章两级章节树、富文本轻量编辑器（纯文本 + 段落，首期不做斜体加粗工具条）、字数统计、今日目标、专注模式、正文内人物/地点名高亮。
- 右栏页签：提要（章节摘要）/ 关联（本章出场人物与地点）/ 线索（本章伏笔）/ 批注（行内备注列表）。
- 大纲：剧情线 × 阶段矩阵，事件卡；事件间连线（因果/呼应），右栏事件详情（细纲 checklist、出场、关联）。
- **关系图谱（本任务核心亮点）**：自由画布节点图，节点 = 人物/地点/势力/物件/线索/事件，边 = 关系（亲属/对立/师徒/成员/因果/呼应/伏笔→揭晓…），支持拖拽布点、曲线连线、边上标签、按类型过滤、点选高亮邻接。
- 设定台：人物（档案卡：头像色块/身份/简介/别名/出场条）、地点、势力、物件、线索（线索卡：状态 草埋/已呼应/已揭晓、埋设章、回收章、痕迹记录）。
- 灵感箱：随手记想法，可一键转事件/线索。
- 导入/导出：整书 JSON 导出与导入（含图谱坐标）、正文 Markdown 导出、示例书一键重置。
- 统计：今日/累计字数、连续天数、各章字数条形图。

**非目标（本期不做）**

- 账号/云同步/协作（纯本地）；移动端深度适配（桌面优先，浏览器可用即可）；AI 生成；地图画布编辑器；宠物/壁纸/取名骰子等扩展。

## 2. 核心用户流程

1. 打开 `/apps/writing-pen/` → 书架（首次有示例书《山海遗事》，原创示例）→ 进入作品。
2. 写作页：左侧章节树选章 → 中间正文编辑（自动保存，防抖 1s）→ 右栏看出场人物/线索/提要。
3. 大纲页：建阶段与剧情线 → 单元格落事件卡 → 卡详情里「连到另一张卡」选类型（因果/呼应）→ 矩阵上出现曲线连线。
4. 图谱页：从设定/大纲自动带出节点，也可手动加节点 → 拖拽布点 → 连线选关系类型 → 边渲染为带标签的曲线；过滤器按类型显隐；点节点高亮邻接子图。
5. 导出 JSON 备份 / 在另一台电脑导入恢复；正文导出 Markdown 归档。

## 3. 数据模型（导出格式即权威 schema）

```ts
Book {
  id, title, author, subtitle?, idea?,          // 总体构想
  volumes: [{ id, title, chapters: [{ id, title, summary?, content, annotations?: [{id, quote, note}], targetWords? }] }],
  outline: {
    stages: [{ id, name, chapterRange }],
    threads: [{ id, name, color }],
    events: [{ id, threadId, stageId?, title, summary?, chapterRange?, status: 'planned'|'written'|'tothink',
               checklist?: [{id, text, done}], hook?, thought?,
               cast?: string[] /*entityId*/, links: [{ id, from, to, type: 'cause'|'echo', note? }] }],
  },
  entities: [{ id, kind: 'person'|'place'|'faction'|'item'|'clue',
               name, role?, summary?, aliases?: [], color?, 
               presence?: string[] /*chapterId 出场*/,
               clue?: { status: 'planted'|'echoed'|'revealed', plantedIn?, resolvedIn?, traces: [text] },
               graph?: { x, y } }],
  entityLinks: [{ id, from, to, type: string /*亲属/对立/…自定义*/, note? }],
  ideas: [{ id, text, createdAt, used? }],
  stats: { history: { 'YYYY-MM-DD': words } },
  graphView?: { filter?: string[] },
  meta: { app: 'writing-pen', schema: 1, exportedAt }
}
```

## 4. 关系图谱连线 UI 细则（用户点名的重点）

- 画布：SVG 覆盖层 + HTML 节点层；平移（空白处拖拽）、缩放（Ctrl+滚轮 / 右下角控件）、网格底纹。
- 节点：圆角卡（色块首字 + 名称 + 类型角标），按 kind 着色；选中态描边；拖动更新 `entities[].graph`。
- 连线：三次贝塞尔曲线（横向出边锚点），路径中点挂胶囊标签（关系类型），支持双向/单向箭头；点击边可改类型/备注/删除。
- 高亮：点选节点 → 邻接边与邻居保持高亮，其余降透明度；类型过滤（图例 chips 多选）。
- 连线交互：从节点右侧锚点拖出 → 落到目标节点 → 弹类型选择（常用类型 chips + 自定义输入）。
- 数据持久：节点坐标、边全部入 JSON 导出。

## 5. 验收标准（自测清单）

1. `/apps/` 目录页出现「写作·笔」可点击卡片，进入不 404，刷新子页正常（Vite base 正确）。
2. 示例书可正常打开；新建书、删除书后 localStorage 状态正确。
3. 正文编辑自动保存；刷新后内容还在；字数统计正确。
4. 大纲矩阵：建阶段/剧情线/事件卡正常；连线（因果/呼应）绘制、点击边改类型、删除边正常。
5. 图谱：自动节点 + 手动节点；拖拽、连线、标签、过滤、邻接高亮全部可用；刷新后坐标保留。
6. 导出 JSON → 清空 localStorage → 导入，全书还原一致。
7. `tsc --noEmit` 与 `vite build` 通过；主站 `pnpm build` 通过（AppsDirectory 改动不破坏主站）。
8. 主站其他路由（/apps/、阅读器、博客）不受影响。

## 6. 风险与对策

- 浏览器容量限制（localStorage ~5MB）→ 单书文本上限提示 + 导出提醒；不做云端。
- 图谱性能 → 节点数 < 200 场景下 SVG 直接渲染足够；不做力导向布局（手动布点即产品特性）。
- 与另一会话冲突 → 全部改动限定在 worktree；主站侧仅改 `src/pages/AppsDirectory/index.tsx`（该文件另一会话不涉及）。
