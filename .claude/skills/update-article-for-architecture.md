---
name: update-article-for-architecture
description: |
  按 TRPGLuciusHelper 架构更新博客/Wiki：frontmatter、index、moduleIds、players、剧透门。
  触发词：「更新博客配置」「接架构」「sync blog wiki」。
---

# Update Article for Architecture（结合项目架构更新文章）

你是**内容架构师**，负责让文稿符合仓库数据模型与路由，**不负责**大段文笔润色（见 `polish-article`）。

## 必读文件

- `.cursor/rules/blog-post-modes.md`
- `public/blog/index.json`、`public/blog/posts/*.md`
- `public/wiki/index.json`、`public/wiki/entities/entries/*.json`
- `public/wiki/entities/modules.json`、`public/wiki/entities/players.json`
- `scripts/wiki-data.ts`、`scripts/generate-blog-index.ts`
- `src/pages/BlogTab/index.tsx`（剧透蒙层：`report.*` + `players`）

## 四类内容的架构操作

### 1. 战报

| 项 | 要求 |
|----|------|
| 博客 | `renderMode: wiki`，`wikiEntryId: report.<slug>` |
| 词条 | `category: "report"`，`moduleIds: ["module.profile.xxx"]` |
| `players` | frontmatter 数组，元素为 `pl.xxx` |
| 禁止 | `wikiEntryId` 指向 `module.*`；战报长文只放 module 词条 |

**操作清单**：

1. 新建/更新 `public/wiki/entities/entries/report.<id>.json`
2. 新建/更新 `public/blog/posts/<slug>.md`（壳 + frontmatter）
3. 运行 `pnpm generate:wiki` 与 `pnpm generate:blog`（如项目有）
4. 确认 `relatedEntryIds` 不含会导致校验失败的 id

### 2. 原创模组介绍 / 网络模组收录

| 项 | 要求 |
|----|------|
| 权威元数据 | `modules.json` 中 `id`、`displayName`、`summary`、`tags` 等 |
| **战役** | 同一 `campaign` 字符串；**每场景一条** `module.*`；禁止一条描述整战役 |
| **模组集** | 用 `collection`，无强制顺序；勿与 `campaign` 混用 |
| `description` | 必含【简介】【我怎么看】【适合谁来玩】【跑之前需要知道什么】；剧透仅 `:::spoiler` |
| 深度设定 | 可选 `module.*` 词条 `category: module` |
| 博客 | 多为 `markdown`，可 `wikiEntryId: module.*` 内嵌 |

**id 命名建议**：`module.campaign.<slug>.<part-slug>`，例如 `module.campaign.sorrow.house-of-shadows`。

### 3. 网络模组评测

- 仅 `public/blog/posts/*.md`，`renderMode` 省略或 `markdown`
- `index.json` 登记：title、date、tags、summary、cover
- 无 `wikiEntryId` 除非要内嵌世界设定

### 4. 原创故事 / 随笔

- 同评测；无 `players`、无剧透门

## frontmatter 参考（博客）

```yaml
---
title: "标题"
date: "2026-05-28"
tags: ["战报", "克苏鲁"]
summary: "一句话摘要"
cover: "/blog/covers/xxx.jpg"
renderMode: wiki          # 战报必填
wikiEntryId: report.xxx   # 战报必填
players:                  # 战报：参与 PL 的 pl.xxx
  - pl.leina
  - pl.adam
---
```

## 剧透蒙层（事实，实现于 BlogTab）

- 条件：`renderMode === wiki` && `wikiEntryId.startsWith("report.")` && 当前 PL ∉ `post.players` && 未确认
- 架构师须保证 `players` 与 `report` 词条 `playerIds` 语义一致（前者控制蒙层，后者为词条元数据）

## Agent 角色

| 角色 | 文件 | 任务 |
|------|------|------|
| 架构 | `content-architect` | index、frontmatter、关联 id |
| Wiki 校验 | `wiki-validator` | `generate:wiki`、schema、lookup 冲突 |
| 技术评审 | `tech-expert` | 边界情况、XSS、性能 |
| Git | `git-reviewer` | 变更集与 commit 格式 |

## 工作步骤

1. 识别内容类型 → 选上表分支
2. 列出将创建/修改的文件路径
3. 应用变更 → 运行 `pnpm generate:wiki` && `pnpm build`
4. 输出 **架构变更说明**（供 dev-log / business.md 同步）

## 禁止

- 不把战报正文写入 `module.*` 的 `content`
- 不把 `players` 写成显示名或角色名
- 不跳过 `generate:wiki` 直接改 `public/wiki/index.json` 手搓
