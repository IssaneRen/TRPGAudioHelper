# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

TRPGLuciusHelper - A TRPG (Tabletop RPG) assistant web application for managing modules, clue visualization, and personal blog. Runs locally or on a server, targeting macOS/Windows/Android/iOS via responsive web.

## Tech Stack

- **Framework**: React 19 + TypeScript (strict mode)
- **Build Tool**: Vite 6
- **UI**: Shadcn/ui + Tailwind CSS 4
- **Routing**: React Router v7
- **Graph Visualization**: React Flow (DAG clue network with drag, zoom, edge annotation)
- **Markdown**: react-markdown or MDX for blog content
- **Data**: localStorage + JSON import/export
- **Package Manager**: pnpm

## Common Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (Vite)
pnpm build            # Production build
pnpm preview          # Preview production build locally
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript type checking (tsc --noEmit)
```

## Architecture

```
src/
  components/       # Shared UI components (Shadcn/ui based)
    ui/             # Shadcn/ui generated components
  pages/            # Top-level tab pages
    ProfileTab/     # TAB1 - Personal intro & module links
    ModuleToolTab/  # TAB2 - Module clue DAG visualization
    BlogTab/        # TAB3 - Blog & articles
  hooks/            # Custom React hooks
  lib/              # Third-party library wrappers (cn, etc.)
  stores/           # State management (local storage sync)
  types/            # TypeScript type definitions
  utils/            # Utility functions (JSON import/export, etc.)
  assets/           # Static assets
```

### Key Design Decisions

- **Three-tab layout**: ProfileTab, ModuleToolTab, BlogTab as core navigation
- **JSON import/export**: TAB1 and TAB2 data can be exported as JSON and imported on another device, enabling cross-device migration without a backend
- **DAG visualization**: React Flow handles the clue network graph — nodes are clues/items, edges are relationships (many-to-many). Discovery is triggered by clicking edges (relationships), which marks both connected nodes as discovered. Direct node click is a special case requiring supplementary explanation.
- **Visual style**: Cthulhu/cosmic horror aesthetic — dark theme priority, eerie fonts, muted greens/purples
- **No backend required**: All data persists in localStorage; the app is a pure SPA

## Language & Communication

- All user-facing text, comments in code, and commit messages should be in **Chinese (中文)**
- Code identifiers (variable names, function names) remain in **English**

## Git Commit 规范

格式：`[类型: 分支名: 简要描述]`

- `feat` — 新功能
- `fix` — Bug 修复
- `chore` — 构建、依赖、配置等杂项
- `refactor` — 重构
- `docs` — 文档变更
- `style` — 代码格式
- `test` — 测试

示例：`[feat: main: 添加模组线索DAG可视化功能]`

## Agents

- `.claude/agents/git-reviewer.md` — 代码审查与提交助手
- `.claude/agents/intern.md` — 实习生，熟悉项目代码，执行基础任务
- `.claude/agents/tech-expert.md` — 技术专家，保持怀疑，审视架构与质量
- `.claude/agents/module-analyst.md` — 模组分析师，拆解线索、节点、依赖关系
- `.claude/agents/rules-arbiter.md` — 规则律者，严格裁定 TRPG 规则与边界情况
- `.claude/agents/strict-story-scorer.md` — 严格的剧情打分玩家，从玩家视角压测剧情
- `.claude/agents/module-optimizer.md` — 模组修改优化师，把分析结论转成可执行改稿

## TRPG Skill Suite

- `.claude/skills/trpg-document-reader.md` — 读取 PDF / Word，提取文本、表格、图片与版式
- `.claude/skills/pdf-decomposer.md` — 将 PDF 拆成章节、节点和依赖图
- `.claude/skills/resource-channel-curator.md` — 维护互联网资料渠道和来源分级
- `.claude/skills/trpg-rules-analyst.md` — 研究 TRPG 规则并输出可执行裁定
- `.claude/skills/module-clue-analyst.md` — 整理模组线索、时间线与依赖关系
- `.claude/skills/plot-foreshadowing-architect.md` — 优化剧情、伏笔和回收节奏
- 文档处理统一通过 `scripts/trpg-workflow.ps1`，先 `inspect` 再 `read`，最后 `decompose`

## 团队工作流

当用户说 **"专家登场"** 或 **"开始团队工作"** 时，按 `.claude/skills/team-leader-work.md` 中定义的多 Agent 工作流执行：实习生并行调研 → 主对话整合 → 技术专家评审 → 不通过则重试（最多 3 轮）。
当任务属于 TRPG 规则、模组或剧情分析时，优先组合使用上面的 skill / agent 角色，再决定是否启用团队工作流。

## Documentation

- `user_request.md` — Original user requirements
- `docs/dev-log.md` — AI development log (time, agent, work content)
- `docs/business.md` — Business logic & code location index
- `docs/tech-decisions.md` — Technical decisions record (ADR format)
- `docs/reports/` — Team workflow reports
- `docs/skills/trpg-suite-workflow.md` — Canonical TRPG document workflow
- Keep documentation updated as features are implemented

## 强制规则（MUST）

### 开发日志必须实时更新

**每次完成任何代码变更后，必须立即更新 `docs/dev-log.md`**。这是不可跳过的硬性规则。

- 每个迭代/功能完成后，追加一行日志记录
- 格式：`| 时间 | Agent | 分支 | 内容 | 涉及文件 |`
- 不允许攒多个变更后再统一写日志
- 如果忘记了，在下一次操作前必须先补全

### 文档同步更新

每次功能实现或架构变更后，必须同步更新以下文档（如涉及）：
- `docs/business.md` — 业务逻辑变更
- `docs/tech-decisions.md` — 新的技术决策
- `user_request.md` — 用户需求变化
