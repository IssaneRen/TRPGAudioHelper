# AI NPC 对话 V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 对话改造成按 NPC + PL 隔离、由服务端 token 鉴权并持久保存聊天上下文的 TRPG NPC 对话系统。

**Architecture:** 父工程保留静态 Wiki/Blog 展示，但登录入口改为 token session；`trpg-ai-gateway` 负责 token 校验、NPC 权限、prompt 组装、DeepSeek 调用和聊天运行时文件。DeepSeek 私有上下文放在子仓 NPC 私有数据中，不放公开 Wiki JSON。

**Tech Stack:** React 19 + TypeScript + Vite；Node HTTP server + TypeScript；OpenAI-compatible DeepSeek API；本地文件 JSON/Markdown/JSONL 运行时存储。

---

## Task 1: 基线与子仓同步

- [x] 读取 `manage-subrepositories` skill 与 `repo.json`。
- [x] 运行 `pnpm sync:subrepos`；sandbox 下失败后已按权限规则提升执行。
- [x] 确认父仓干净，子仓已有 `src/server.ts` / `src/server.test.ts` CORS 相关未提交改动，后续必须保留。

## Task 2: 子仓服务端鉴权与 API

- [x] 新增 token 哈希校验模块，支持高熵 token + `TOKEN_HASH_PEPPER` + `crypto.timingSafeEqual`。
- [x] 新增 `POST /api/session`，返回 `{ playerId, displayName, isKeeper }`。
- [x] 所有受保护接口只从 `Authorization: Bearer <token>` 派生身份；拒绝客户端提交 `playerId`。
- [x] 扩展 CORS：允许 `GET, POST, DELETE, OPTIONS` 与 `content-type, authorization`。
- [x] 新增 `GET /api/npcs`、`GET /api/chat/history?npcId=...`、`POST /api/chat`、`DELETE /api/chat/history`。
- [x] `supportedPlayerIds` 由服务端强校验；KP 不代入 PL，不默认读写玩家私聊记录。

## Task 3: 子仓 prompt、NPC 数据与运行时记忆

- [x] 新增可维护核心 NPC prompt 文件，内容为用户提供的 4 条规则。
- [x] 新增 NPC 私有 `ai-context.json` schema：语言习惯、既定事实、内心知道事实、对玩家态度。
- [x] 为 `char.constance-jefferies`、`char.jeremiah-moon`、`char.norbert-mckenzie` 建立 `npc.json` 与 `ai-context.json`。
- [x] 新增 `CHAT_MEMORY_ROOT_DIR`，运行时写入 `<root>/<npcId>/players/<plId>/status.md`、`full_log.log`、`current_context.md`。
- [x] `full_log.log` 使用结构化 JSONL，history 接口默认返回最近 100 条、上限 200。
- [x] 每次对话前检查 `current_context.md` 是否超过 10MiB，超过则调用 DeepSeek 总结覆盖；`full_log.log` 永不压缩。
- [x] 按 `npcId/playerId` 串行化写入、压缩和删除操作。

## Task 4: 主仓前端 token session 与 AI Chat

- [x] 抽取共享 AI Gateway client/session hook，前端只持久化 token，不持久化 `pl.xxx`。
- [x] Blog/WorldWiki 登录弹窗改为 token 输入，移除 `pl.cici` 示例和可用 PL key 列表。
- [x] `canRevealAllWikiSecrets` 改由 session `isKeeper` 驱动，旧 `blog-pl-name` 不再作为身份来源。
- [x] AI Chat 改为 NPC 下拉选择，进入 tab、切换 token、切换 NPC 时拉历史。
- [x] 未登录或无权限时显示指定提示；未登录时额外显示登录按钮。
- [x] 新对话调用 `POST /api/chat`，删除记录调用 `DELETE /api/chat/history` 并二次确认。

## Task 5: 服务器日志 skill 与文档

- [x] 新增 `.claude/skills/check-server-logs.md`。
- [x] 更新 `scripts/sync-trpg-suite.ps1` skill 白名单。
- [x] 更新 `CLAUDE.md` / `AGENTS.md` skill 索引。
- [x] 更新 `docs/reports/` 维护记录。
- [x] 视本机 `pwsh` 可用性同步到 Codex 技能目录；当前 `command -v pwsh` 无结果，已记录未执行。

## Task 6: 验证

- [x] 子仓 `pnpm test`。sandbox 下因 `listen EPERM 127.0.0.1` 失败；提升权限重跑通过，4 files / 17 tests passed。
- [x] 子仓 `pnpm type-check`。
- [x] 子仓 `pnpm build`.
- [x] 主仓 `pnpm type-check`。
- [x] 主仓 `pnpm build`。sandbox 下因 `tsx` IPC pipe 权限失败；提升权限后通过。
- [x] 检查前端文案不再出现 `pl.cici` 示例、可用 PL key 列表；历史数据、测试数据和文档计划中的引用不属于前端登录文案。
- [x] 检查父仓未跟踪 `trpg-ai-gateway/`；子仓提交 token 哈希，不提交 token 原文或运行时聊天文件。

## Execution Notes

- 真实 PL token 与 `TOKEN_HASH_PEPPER` 未写入仓库；仅 `trpg-ai-gateway/data/auth/token-hashes.json` 保存哈希。
- 本轮未迁移 Wiki/Blog 静态 JSON 到服务端过滤 API；隐藏内容仍依赖现有前端遮罩与 session 权限。
- 本机缺少 `pwsh`，未执行 `scripts/sync-trpg-suite.ps1` 同步 Codex 技能目录。
