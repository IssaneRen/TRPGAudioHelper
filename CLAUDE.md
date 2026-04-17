# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **DAG visualization**: React Flow handles the clue network graph — nodes are clues, edges are relationships, acquired clues are visually dimmed
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

## 团队工作流

当用户说 **"专家登场"** 或 **"开始团队工作"** 时，按 `.claude/skills/team-leader-work.md` 中定义的多 Agent 工作流执行：实习生并行调研 → 主对话整合 → 技术专家评审 → 不通过则重试（最多 3 轮）。

## Documentation

- `user_request.md` — Original user requirements
- `docs/dev-log.md` — AI development log (time, agent, work content)
- `docs/business.md` — Business logic & code location index
- `docs/tech-decisions.md` — Technical decisions record (ADR format)
- `docs/reports/` — Team workflow reports
- Keep documentation updated as features are implemented
