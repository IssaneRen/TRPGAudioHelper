---
name: write-module-intro
description: |
  撰写本站模组介绍：玩家/读者视角，非 KP 备团；战役须拆成多篇 module。
  触发词：「写模组介绍」「模组导读」「更新模组列表」。
---

# Write Module Intro（模组介绍撰写）

撰写 `public/wiki/entities/modules.json` 中的 `summary` 与 `description`，或配套 Wiki `module.*` 词条。**必须先读** `trpg-content-terminology.md`。

## 写作立场（强制）

你是 **跑过或深入研究过的 TRPG 爱好者**，在给朋友推荐模组：

- 写「我怎么看」「推荐谁」「跑前要知情什么」  
- **不写** KP 备团清单、线索表、带团技巧、NPC 秘密（除非在剧透黑框内）  

若资料来自外网评测而非本团体验，须在【我怎么看】注明「以下基于公开资料/未跑团」。

## 战役类模组（如苦痛三圣母）

1. 确认共有几篇**可独立进列表的场景**  
2. **每一篇一条** `module.*` 记录，`campaign` 字段相同  
3. 每条 `displayName` 用篇名（如「暗影之屋」），**不要**用战役全名当唯一标题  
4. `summary` 一句话无剧透；跨篇依赖写在【跑之前需要知道什么】（如「建议先跑篇 1」）  
5. 战役级总评可简短重复在各篇【我怎么看】，或只在第一篇写「系列总评」  

## description 模板（复制填空）

```text
【简介】
（2–4 句，时代+地点类型+恐怖类型，零剧透）

【我怎么看】
（主观：氛围、和典型 CoC 官模差异、节奏、是否值得跑）

【适合谁来玩】
（人数、现代/鬼故事接受度、小车、情绪敏感）

【跑之前需要知道什么】
（给 PL：敏感内容、与前篇关系、规则版本、是否默认无神话）

:::spoiler 跑后剧透 · 未跑勿读
（真相、反派、结局走向——仅公开资料可写的才写，并标注来源）
:::
```

## summary 模板

≤ 80 字，无剧透，含规则与时代，例如：

> 现代美国鬼故事场景之一，公寓闹鬼开场；苦痛三圣母战役第一篇。

## 元数据字段

| 字段 | 说明 |
|------|------|
| `ruleSystem` | `COC7` + 在 tags 或描述中注明「现世代/现代」 |
| `playerCount` | 作者建议，如 `3-5` |
| `duration` | 单篇预估，如 `8-12h` |
| `campaign` | 战役中文名，多篇相同 |
| `collection` | 留空（除非同时属于某出版系列） |
| `tags` | `现代`、`战役`、`鬼怪`、`美洲` 等 |

## 工作流

```text
research-trpg-sources → 产出 Source Map
write-module-intro（本篇）→ 填模板
polish-article（contentType: module-intro）→ 润色
update-article-for-architecture → 写入 modules.json + generate:wiki
wiki-validator → 校验
```

## Agent

| 角色 | 职责 |
|------|------|
| `trpg-researcher` | 外网事实、篇名、时代、结构 |
| `content-polisher` | 语气、删备团用语 |
| `content-architect` | id 命名、`campaign` 分组、generate |
| `wiki-validator` | 构建与字段 |

## 自检（发表前）

- [ ] 若属战役，列表中是否出现 **多条** 而非一条大包  
- [ ] 正文无「备团」「KP 应」主导段落  
- [ ] 剧透仅在 `:::spoiler` 内  
- [ ] `campaign` 与 `collection` 未混用  
- [ ] 专有名词已与 Source Map 核对  
