---
name: blog-content-pipeline
description: |
  TRPG 博客内容总编排：原创模组介绍、战报、网络模组评测、原创故事随笔。
  串联 research-trpg → polish-article → convert-md-wiki → update-article-for-architecture。
  触发词：「写博客」「更新战报」「模组评测」「博客流水线」「blog pipeline」。
---

# Blog Content Pipeline（博客内容总编排）

你是博客内容生产线的**编排者**，不代替子 Skill 写正文，负责：识别内容类型、派发正确 Agent、保证校验门通过。

**动笔前必读**：`trpg-content-terminology.md`（战役/模组/战报层级）。

## 四类内容与存储（事实）

| 类型 | 主存储 | `renderMode` | Wiki | 关键约束 |
|------|--------|--------------|------|----------|
| 原创模组介绍 | `public/wiki/entities/modules.json`（**战役 = 多条 module，共用 `campaign`**） | 可选博客 markdown | 可选 `module.*` | **玩家向导读**，非 KP 备团；剧透进 `:::spoiler` 黑框 |
| 战报 | `public/wiki/entities/entries/report.*.json` | `wiki` | `category: report` | 博客 `wikiEntryId` 必须以 `report.` 开头 |
| 网络模组评测 | `public/blog/posts/*.md` | `markdown`（默认） | 通常无 | 标注规则系统、优缺点、剧透等级 |
| 原创故事/随笔 | `public/blog/posts/*.md` | `markdown` | 通常无 | 无 PL 剧透门 |

权威规则：`.cursor/rules/blog-post-modes.md`

## 标准流水线（参考业界混合人机 + Content CI）

```text
0. Brief（人）     → 类型、受众、剧透策略、关联 moduleId / PL
1. Research        → skill: research-trpg-sources（外网资料，仅摘要+链接）
2. Draft           → 人写初稿 或 Agent 按模板起草
3. Polish          → skill: polish-article（文风、结构、战报三段式）
4. Convert         → skill: convert-md-wiki（仅战报/需 Wiki 特性时）
5. Architecture    → skill: update-article-for-architecture（index、frontmatter、关联）
6. Validate        → pnpm generate:wiki && pnpm build；对照业务规则
7. Human gate      → 事实、剧透、PL 名单、图片版权
```

## Agent 角色分工

| 阶段 | 推荐 Agent | 职责 |
|------|------------|------|
| 外网调研 | `trpg-researcher` | 模组/GM 公开资料、出处列表 |
| 润色 | `content-polisher` | 可读性、语气、战报/评测结构 |
| 格式互转 | `wiki-format-converter` | Markdown ↔ Wiki JSON blocks |
| 架构落地 | `content-architect` | frontmatter、index、moduleIds、players |
| 校验 | `wiki-validator` + `tech-expert` | schema、剧透门、类型边界 |
| 提交前 | `git-reviewer` | 变更范围、commit 规范 |

## 派发规则

1. **先分类再派发**：不要对战报全文只做 Markdown 润色而忘记 Wiki 词条。
2. **并行**：Research 与 初稿整理可并行；Convert 必须在 Polish 定稿后（避免反复互转）。
3. **战报专用顺序**：Research（可选）→ Draft（Markdown 草稿）→ Polish → Convert → Architecture → Validate。
4. **评测/随笔**：Research → Polish → Architecture（无 Convert）。
5. **模组介绍**：Research → **`write-module-intro`** → Polish → Architecture（**战役每篇一条** modules.json）；博客文可选。

### 模组介绍子流水线（详解）

```text
Brief（篇名 / 战役名 / 是否已跑）
  → research-trpg-sources（必须输出：篇数、各篇英中名、时代、是否 Mythos）
  → write-module-intro（填【简介】【我怎么看】【适合谁】【跑前须知】+ spoiler）
  → polish-article（删备团用语、统一人称）
  → update-article-for-architecture（写入 modules.json，campaign 字段一致）
  → pnpm generate:wiki && pnpm build
  → 人工：本团剧透替换「据公开评测」表述
```

**UI**：模组详情页标题为「模组导读」；`:::spoiler` 渲染为黑框（`ModuleDescription`）。

## 战报写作模板（Rokk Talk 三段式 + 项目字段）

```markdown
## 发生了什么
（2–3 句，用 PC/PL 名，非「队伍」）

## 意味着什么
（1 句，当前 stakes）

## 未决线索
（钩子，指向下场）

---
frontmatter: players 必须为 pl.xxx；wikiEntryId: report.*
```

## 模组评测模板

- 元信息：规则系统、人数、时长、获取方式
- 无剧透导读 → 结构评价 → 亮点/短板 → 适合人群 → 剧透区（折叠或文末）
- 引用外网须附 URL，禁止大段转载

## 校验清单（Validate 阶段必做）

- [ ] `public/blog/index.json` 与 `posts/*.md` frontmatter 一致（或运行 `pnpm generate:blog`）
- [ ] `pnpm generate:wiki` 无报错
- [ ] 战报：`wikiEntryId` 为 `report.*`；`moduleIds` 在 report 词条内
- [ ] `players` 为 `pl.xxx`，非显示名/角色名
- [ ] 图片路径在 `public/` 下可访问
- [ ] `pnpm build` 通过

## 与 team-leader-work 的关系

- 大规模**调研/方案设计**（如新建整条流水线）：用 `team-leader-work`（≥4 实习生 + 双专家）。
- **单篇内容生产**：用本 Skill 按阶段调用子 Skill，不必每次启动全团队。

## 参考

- 调研报告：`docs/reports/2026-05-28-blog-content-workflow-research.md`
- 类型定义：`src/types/wiki.ts`
- Wiki 生成：`scripts/wiki-data.ts`
