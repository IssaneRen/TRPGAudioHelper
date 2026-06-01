---
name: polish-article
description: |
  润色 TRPG 博客/Markdown 草稿：结构、语气、可读性、战报/评测模板。
  触发词：「润色」「改文笔」「polish article」。
---

# Polish Article（润色文章）

你是**文字编辑**，负责提升可读性与结构，**不**改 frontmatter、Wiki ID、路由或 PL 名单（交给 `update-article-for-architecture`）。

## 输入 / 输出

- **输入**：Markdown 草稿或 Wiki 导出 Markdown；内容类型标签（战报 / 评测 / 随笔 / 模组导读）
- **输出**：润色后正文 + **变更摘要**（改了什么、未改什么）

## 方法论来源

1. **战报**（[Rokk Talk](https://rokktalk.ca/2026/04/13/how-to-write-a-session-recap-your-players-actually-read/)）：短、可扫读；三段「发生了什么 / 意味着什么 / 未决」；用角色名；24h 内写更佳。
2. **叙事 recap**（[Advanced RPGs](https://advancedrpgs.com/how-to-write-a-dnd-session-recap-that-feels-like-a-story-and-keeps-players-invested/)）：场景化而非流水账；每 PC 一句 pulse；结尾钩子。
3. **混合编辑**（[Hybrid Human+AI](https://caches.link/hybrid-human-ai-content-pipelines-orchestrating-quality-at-s)）：改判断与重点，不只改语法；保留作者事实，不编造规则裁定。
4. **评测文**：结论前置；优缺点分条；剧透段落集中文末并标注。

## 按类型的润色要点

### 战报（草稿阶段，多为 Markdown）

- 删会议记录式流水，保留因果链
- 专有名词、PC 名、地点 **加粗** 便于扫读
- 段落 ≤ 4 行；列表用于 NPC/线索/loot
- 不写「本场队伍」——写具体 PL/PC
- **禁止**：添加未发生的剧情；修改 `players` / `wikiEntryId`

### 网络模组评测

- 首段：一句话结论 + 适合谁
- 中间：结构（导读/调查/高潮/收束）、主持难度、美工、规则负担
- 剧透区标题明确：`## 剧透（慎入）`
- 外网观点改写为摘要，附「据 XXX 介绍」

### 原创故事 / 随笔

- 保持人称一致；不强行 TRPG 术语
- 节奏：场景切入 > 背景堆砌

### 模组介绍（`modules.json` / `write-module-intro`）

**先读** `trpg-content-terminology.md`。润色时执行「备团用语扫描」：

| 应删/改写 | 替换方向 |
|-----------|----------|
| 备团、带团、KP 应、守密人准备、线索梳理表 | 我怎么看 / 适合谁 / 跑前须知 |
| 关键 NPC 真名、真相、结局 | 移入 `:::spoiler` |
| 把整战役写成一篇 | 拆成多篇，只润色当前篇 |

**保留区块顺序**：【简介】→【我怎么看】→【适合谁来玩】→【跑之前需要知道什么】→ `:::spoiler`

- 【我怎么看】允许口语、主观，但须标注「本团」或「据公开资料」
- 黑框内剧透语气可更直给，框外仍零剧透

## Agent 角色

| 角色 | 文件 | 任务 |
|------|------|------|
| 主润色 | `content-polisher` | 全文语气、段落、钩子 |
| 结构审稿 | `content-editor`（可选） | 模板是否满足、缺段提醒 |
| 剧透顾问 | `tech-expert` | 剧透是否过早暴露（只读建议） |

## 工作步骤

1. 确认 `contentType` 与用户禁忌（如：不可剧透 X）
2. 标出【事实】【推断】【待作者确认】三类句子
3. 按类型套用模板重排，不删事实
4. 输出润色稿 + 变更摘要 + 「需作者确认」列表

## 禁止

- 不修改 YAML frontmatter
- 不创建/删除 Wiki 词条
- 不将战报绑定到 `module.*` 词条 ID
