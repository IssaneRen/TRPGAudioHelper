---
name: trpg-content-terminology
description: |
  TRPG 内容术语与数据模型：战役/模组/场景/战报的区别，及本仓库落盘规则。
  所有写模组介绍、战报、评测的 Agent 必须先读本文。
---

# TRPG 内容术语（本项目强制）

## 1. 概念层级（从大到小）

| 中文 | 英文常见 | 定义 | 本仓库 `modules.json` |
|------|----------|------|------------------------|
| **规则系统** | Rule System | COC7、D&D5e 等 | `ruleSystem` |
| **战役** | Campaign | 多篇**场景**共享同一主线、角色可延续、建议按序跑的**系列** | 多条 `module.*` 共用同一 `campaign` 字符串；**不**单独占一条“整战役”模组 |
| **模组集** | Collection / Anthology | 同一出版社系列、故事弱关联或独立 | `collection`（如「密斯卡托尼克河流域新传」） |
| **场景 / 模组（单篇）** | Scenario / Adventure / Module | **一次（或连续几次团）可跑完的一篇**冒险；列表里的一行 | 一条 `module.*`，有独立 `id`、`displayName` |
| **场次 / 战报** | Session / Report | 某团**某次实际开跑**的记录 | `report.*` 词条 + 博客 `wikiEntryId` |
| **设定词条** | Wiki Entry | 人物、地点、事件等世界观 | `category: character \| location \| ...` |

### 易错对照（必须避免）

| 错误 | 正确 |
|------|------|
| 把「苦痛三圣母」整战役写成 **1 条** module | 战役名写入 `campaign`；**每一篇场景各 1 条** module（共 3 条主场景，尾声可选第 4 条） |
| 把战役当成 `collection` | `collection` 是出版系列；**跨篇主线**用 `campaign` |
| 把模组介绍写成 KP 备团指南 | 写 **PL/读者视角**：我怎么看、适合谁、跑前须知；KP 操作细节不进本站 |
| 战报正文写进 `module.*` | 战报只在 `report.*` |
| 模组介绍绑 `report.*` | 模组用 `module.*` 或仅 `modules.json` |

## 2. 战役 vs 模组集 vs 单篇

```text
战役 campaign: "苦痛三圣母"
├── module....house-of-shadows      ← 场景 1（列表里单独一张卡）
├── module....desert-of-sighs       ← 场景 2
├── module....river-of-tears        ← 场景 3
└── module....final-cut（可选）     ← 尾声，篇幅短，可标 duration 较短

模组集 collection: "密斯卡托尼克河流域新传"
├── module....midnight-web          ← 各篇独立，无强制顺序
├── module....wasted-youth
└── ...
```

**判定口诀**：

- 问「要不要按 1→2→3 跑、角色延续？」→ 是 → **战役** + 多篇 module  
- 问「只是同一本书系列？」→ **模组集** + 多篇 module  
- 问「一次团能跑完吗？」→ 一条 module  

## 3. 「苦痛三圣母 / 苦痛三姐妹」事实（调研摘要）

| 项 | 内容 | 来源 |
|----|------|------|
| 英文名 | *Our Ladies of Sorrow* | Kevin Ross, MRP 2009 |
| 中文常见译名 | 苦痛三圣母、苦痛三姐妹 | 社群译名 |
| 时代 | **现代美国**（CoC Now / 现世代） | 官方简介、R'lyeh Reviews |
| 结构 | 3 篇主场景 + 1 篇尾声 *The Final Cut* | [edwebb](http://www.edwebb.net/cthulhu/publications/?id=464)、R'lyeh Reviews |
| 篇 1 | *House of Shadows* / 暗影之屋 — 公寓闹鬼 | Mater Tenebrarum |
| 篇 2 | *Desert of Sighs* / 叹息沙漠 — 莫哈韦失踪 | Mater Suspiriorum |
| 篇 3 | *River of Tears* / 泪之河 — 洪水小镇 La Llorona | Mater Lachrymarum |
| 基调 | 鬼故事、心理恐怖；**默认不涉及克苏鲁神话**（可后期叠 Hecate/Nyarlathotep 层） | R'lyeh Reviews、Fandom |
| 推荐人数 | 3–5 人（作者建议小车） | Flames Rising 书评 |

**专有名词不清时**：必须 WebSearch 英文原名 + 中文译名，禁止凭印象编造剧情细节。

## 4. 本站「模组介绍」正文规范（非备团）

模组详情页展示的是 **KP/PL 读者的导读**，不是守密人手册。

### 必须包含的区块（按顺序）

1. **【简介】** — 无剧透梗概（时代、地点类型、恐怖类型）  
2. **【我怎么看】** — 第一人称主观：亮点、气质、和典型克苏鲁官模的差异  
3. **【适合谁来玩】** — 人数性格、能否接受现代/鬼故事/情绪恐怖  
4. **【跑之前需要知道什么】** — 给 **玩家** 的知情同意（敏感内容、节奏、是否依赖前篇）  
5. **:::spoiler … :::** — **跑后剧透黑框**（见下）

### 禁止出现

- 「备团」「线索梳理」「KP 应」「守密人准备」「带团节奏」作为主内容  
- 关键 NPC 真名、真相、结局、反派身份（除非放在 spoiler 内）  
- 把三篇战役合并成一篇介绍  

### 黑框剧透语法（写入 `description` 字段）

```text
:::spoiler 跑后剧透 · 未跑勿读
仅放置跑团后才应知道的信息：真相、反转、姐妹身份、牺牲选项等。
:::
```

前端会渲染为深色边框区域；Agent 不得把剧透写在黑框外。

## 5. 与 Skills 的对应

| 任务 | Skill |
|------|--------|
| 查术语 / 判断战役结构 | 本文 + `research-trpg-sources` |
| 写模组导读正文 | `write-module-intro` |
| 润色语气 | `polish-article`（`contentType: module-intro`） |
| 写入 modules.json | `update-article-for-architecture` |

## 6. 不确定时

- 先查 `public/wiki/entities/modules.json` 已有战役范例：`campaign: "奈亚拉托提普的面具"`（长战役单条 profile 仅为占位，**新战役不要模仿单条占整战役**）  
- 问用户：尾声是否单独建 module、是否已跑过可写「本团」剧透  
