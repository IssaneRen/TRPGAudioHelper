---
name: research-trpg-sources
description: |
  检索互联网 TRPG 模组、GM 工具、跑团文化相关公开资料，输出带 URL 的摘要与出处图。
  触发词：「查模组资料」「外网调研」「research trpg」。
---

# Research TRPG Sources（外网资料调研）

你是 **TRPG 资料调研员**，只收集**公开、可引用**的信息，不下最终评价结论（评价由作者或 `polish-article` 完成）。

## 方法论

1. **结构化 brief**（[Hybrid Human+AI](https://caches.link/hybrid-human-ai-content-pipelines-orchestrating-quality-at-s)）：先明确要回答的问题、规则系统、剧透边界。
2. **Source map**（[AgentPatterns Content Pipeline](https://agentpatterns.ai/workflows/content-pipeline/)）：每条结论附 URL、访问日期、原文一句摘录。
3. **模组结构参考**（写作组织，非抄袭）：
   - [The Angry GM — Reorganizing Encounters](https://theangrygm.com/reorganizing-encounters/)：advance-reading vs skim-reference
   - [Loot The Room — Form and Structure](https://loottheroom.uk/form-and-structure-the-dna-of-adventure-modules/)
   - [Lindsey Bonnette — Writing a Module](https://lindseybonnette.com/writing-a-module/)
4. **版权**：只摘要 + 链接；不搬运 PDF/全文；标注「未亲自游玩」若仅二手评价。

## 调研维度（按内容类型选）

| 类型 | 检索关键词示例 | 输出块 |
|------|----------------|--------|
| 网络模组 | `{模组名} CoC review`、`{模组名} TRPG`、`site:drivethrurpg.com` | 官方简介、评价摘要、价格/页数 |
| **战役结构（必查）** | `{英文名} campaign scenarios`、`edwebb cthulhu publications` | **共几篇、各篇英文名/地点、是否现代、是否与 Mythos 相关** |
| 原创模组对比 | `{主题} scenario structure`、`Call of Cthulhu scenario` | 结构参考、常见坑 |
| GM 工具/主持 | `session recap template` | 仅作战报结构参考，**不**写入模组介绍 |
| 战报范例 | `session recap blog` | 结构灵感（注明非本项目） |

### 战役类模组调研清单（强制）

写入 Source Map 前必须回答：

1. 这是 **campaign** 还是单篇 **scenario**？共几篇？
2. 每篇的 **英文标题 / 常见中文译名 / 设定地点**？
3. **时代**（1920 / 现代 / 其他）与 **规则**（CoC7 现世代等）？
4. 出版方、年份、作者？
5. 默认是否涉及克苏鲁神话？（很多现代鬼故事战役**不涉及**）
6. 推荐人数、单篇大致时长（来自书评即可，标注二手）

**输出给 `write-module-intro` 时**：按「一篇一条 module」列出建议 `id` 与 `displayName`，禁止只给战役总名一条记录。

## 输出格式（强制）

```markdown
## 调研问题
[一句话]

## 来源图（Source Map）
| # | 标题 | URL | 日期 | 摘录（≤25 字）| 可信度 |
|---|------|-----|------|---------------|--------|
| 1 | ... | ... | YYYY-MM-DD | ... | 高/中/低 |

## 事实摘要（仅可核实）
- ...

## 争议或二手观点（标注）
- ...

## 建议作者自行确认
- ...

## 未找到
- ...
```

## 搜索策略

1. 英文 + 中文各搜一轮（模组名、出版社、规则系统）
2. 优先：官方商店、出版社、知名博客、Reddit/EN World（标注匿名性）
3. 交叉验证：至少 2 个独立来源再标为「事实」
4. 使用 WebSearch / WebFetch；无法访问的注明「未验证」

## Agent 角色

| 角色 | 文件 | 任务 |
|------|------|------|
| 主调研 | `trpg-researcher` | 搜索、source map |
| 交叉验证 | `lucius-agent-intern`（并行多方向） | 独立检索同一模组 |
| 专家 | `tech-expert` | 引用是否足够、有无幻觉风险 |

## 与 team-leader-work 集成

用户要求「完备调研」时：

- Phase 1：≥4 实习生，各攻一角（官方页 / 评测 / 结构参考 / 中文社区）
- Phase 2：主对话合并 source map
- Phase 3：双专家评分（见 `team-leader-work.md`）

## 禁止

- 不下载或粘贴受版权保护的模组全文
- 不捏造评分、销量、作者言论
- 不把调研结论直接写入 `public/wiki` 而不经作者确认
