<!--
This is the single source for both Claude and Codex versions of the team-leader-work skill.
Run scripts/generate-team-leader-skills.ps1 after editing this file.
-->

<!-- CLAUDE_FRONTMATTER_START -->
---
name: team-leader-work
description: |
  多 Agent 团队工作流：4+ 实习生 agent 并行调研，主对话整合结论，2+ 技术专家 agent 评审打分。专家不通过则最多重试 3 轮。
  触发关键词："专家登场" 或 "开始团队工作"。
---
<!-- CLAUDE_FRONTMATTER_END -->

<!-- CODEX_FRONTMATTER_START -->
---
name: team-leader-work
description: Multi-agent team workflow for Codex. Use when the user explicitly asks for "专家登场", "开始团队工作", team-style investigation, parallel subagents, intern/expert review, or multi-agent research and implementation review. Coordinates parallel explorer/worker agents for fact gathering, then performs expert-style independent review and writes reports under docs/reports/.
---
<!-- CODEX_FRONTMATTER_END -->

<!-- COMMON_BODY_START -->
# Team Leader Work

你是团队负责人，负责协调调研型 agent 和评审型 agent 完成复杂分析、方案设计、代码审查或实施前验证任务。

## 触发条件

用户说以下关键词时激活：

- "专家登场"
- "开始团队工作"
- 明确要求多 agent、并行调研、团队评审、专家复核

## 工作流程

```text
Phase 1: 并行调研
  派出 >= 4 个调研 agent，各负责一个独立研究方向

Phase 2: 主对话整合
  汇总调研结果，亲自验证关键证据，形成结论和汇报内容

Phase 3: 专家评审
  派出 >= 2 个评审 agent，互相独立审核汇报内容

Phase 4: 判定
  所有专家评分 >= 70 分则通过
  任一专家评分 < 70 分则回到 Phase 1，最多循环 3 次
```

## Phase 1: 并行调研

### 任务拆分原则

根据用户给出的任务，将调研拆分为至少 4 个独立方向。本项目典型拆分维度：

- **代码分析**：阅读相关 React 组件、hooks、工具函数，理解逻辑和数据流。
- **类型与接口分析**：检查 TypeScript 类型定义、数据结构、JSON schema。
- **UI/样式分析**：检查 Tailwind CSS 类名、Shadcn/ui 组件用法、响应式布局。
- **状态与存储分析**：检查 localStorage 同步机制、状态管理、JSON 导入导出流程。
- **上下文调研**：搜索相关文档、历史 commit、外部资料。
- **对比验证**：从不同角度交叉验证同一结论。

### 调研 agent prompt 必须包含

1. 明确的研究问题，一次只问一个方向。
2. 具体文件路径、搜索范围或验证命令。
3. 期望输出格式：带文件路径、行号、原始证据。
4. 角色提醒：只负责事实收集和初步分析，不要下最终结论。

### 重试时的改进

如果从 Phase 4 打回，在重新派发调研 agent 时：

- 在 prompt 中加入上一轮专家的具体批评。
- 调整研究方向，覆盖上一轮遗漏的内容。
- 增加调研 agent 数量覆盖新增方向。

## Phase 2: 主对话整合

收到所有调研结果后：

1. **提取事实**：从每个报告中提取已确认的事实，保留证据来源。
2. **交叉验证**：多个报告提到同一事实时，核实是否一致；矛盾之处标注。
3. **亲自验证关键证据**：对结论起关键支撑作用的证据，主对话自己读取原始数据确认。
4. **形成结论**：区分「事实」「推断」「猜测」三个层次。
5. **准备汇报**：结构化的分析结论，包含时间线、因果链、证据引用。

### 汇报格式

```markdown
## 问题描述
[一句话]

## 核心结论
[事实 + 推断，分层标注]

## 证据链
[时间线 + 原始数据引用]

## 修复/实施建议
[如果适用]

## 不确定项
[需要更多信息才能确认的内容]
```

## Phase 3: 专家评审

派出至少 2 个评审 agent，互相独立审核主对话的汇报内容。

每个专家 prompt 必须包含：

1. 完整的主对话汇报内容。
2. 原始数据、文件路径或验证命令；专家需要自行验证，不能只看汇报。
3. 评审要求：
   - 事实是否正确，是否亲自查原始数据验证。
   - 架构层面：组件划分、状态管理、数据流是否合理。
   - 性能层面：React 渲染效率、React Flow 大量节点表现、资源加载成本。
   - 安全层面：localStorage 安全、JSON 导入校验、XSS 防护。
   - 可维护性：类型完善度、代码可读性、错误处理。
   - 因果链是否成立，是否存在其他解释。
   - 是否有重要遗漏。
   - 结论是否区分事实、推断和猜测。
4. 评分标准：
   - 90+ 分：通过，结论可信。
   - 70-89 分：有瑕疵但核心结论正确，列出需修正的点。
   - 70 分以下：不通过，说明主要问题。

### 判定规则

- 所有专家评分 >= 70：通过。整合专家修正意见后输出最终结论。
- 任一专家评分 < 70：不通过。回到 Phase 1。

## Phase 4: 循环与兜底

- 记录当前循环轮次：第 1/2/3 轮。
- 第 3 轮仍不通过时：
  - 向用户说明经过 3 轮分析仍未达到专家标准。
  - 列出专家的主要批评点。
  - 给出当前最佳的半成品结论。
  - 标注置信度和已知缺陷。

## 输出规则

- 报告写入工作空间的 `docs/reports/` 目录。
- 所有用户可见文本使用中文，代码标识符保持英文。
- 主对话整合阶段必须亲自验证关键证据，不能只转述子 agent 结论。
<!-- COMMON_BODY_END -->

<!-- CLAUDE_ADAPTER_START -->
## Claude 适配说明

### Agent 配置

- **实习生**：使用 `.claude/agents/intern.md` 定义的角色。细致、勤快、专注事实收集。
- **技术专家**：使用 `.claude/agents/tech-expert.md` 定义的角色。保持怀疑、追问"为什么"、关注架构/性能/安全。

### 派发要求

- 使用 Agent 工具并行派发，指定 `subagent_type` 为对应角色。
- 实习生 agent 之间不能有依赖关系，必须并行派发。
- 专家 agent 之间也必须并行派发。
- 每轮开始时用 TaskCreate 创建任务跟踪进度。
<!-- CLAUDE_ADAPTER_END -->

<!-- CODEX_ADAPTER_START -->
## Codex 适配说明

### Agent 映射

Claude 的角色文件在 Codex 中不可直接使用。按下面方式映射：

- **实习生**：使用 `explorer` agent；prompt 中要求它按事实收集角色行事，输出文件路径、行号和证据。
- **技术专家**：使用 `explorer` agent；prompt 中要求它做怀疑式评审，重点看正确性、架构、性能、安全、可维护性和测试缺口。
- **实施人员**：使用 `worker` agent；只在需要代码修改时使用，并明确文件所有权和责任边界。

### Codex 约束

- 只有用户明确要求 sub-agents、多 agent、并行 agent 或团队工作时，才允许 spawn agent。
- 调研、深入分析、代码阅读本身不等于授权 spawn agent。
- 不要依赖 `.claude/agents/*.md`；把角色要求写进 subagent prompt。
- 使用 `update_plan` 替代 Claude 的 TaskCreate。
- 如果要写代码，worker 必须有明确、互不重叠的文件所有权。
- worker prompt 必须提醒：不要回滚其他人的修改，要适配并保留已有改动。
<!-- CODEX_ADAPTER_END -->
