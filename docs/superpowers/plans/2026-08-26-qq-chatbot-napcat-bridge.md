# QQ Chatbot NapCat Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a QQ `.chatbot` command path that reuses the existing web AI chat prompt, NPC memory, PL-private memory, and chat history without breaking SeaDice/NapCat.

**Architecture:** SeaDice receives QQ messages through the existing NapCat connection and owns the `.chatbot` command. The SeaDice JS plugin calls new internal-only AI Gateway endpoints; Gateway resolves QQ sender to `playerId`, resolves NPC name to `npcId`, reuses the current `buildNpcPrompt` + `appendChatTurn` flow, and writes memory only under configured runtime data roots. Public web `/api/chat` remains token-based and unchanged.

**Tech Stack:** SeaDice JS plugin runtime, Node.js HTTP server in `trpg-ai-gateway`, TypeScript, Vitest, existing file-based NPC/chat memory.

**Spec:** User request in current task; data separation facts from `docs/runtime-content-admin.md`, `docs/tech-decisions.md#TD-023`, and historical task `codex://threads/01a033dd-007a-75a2-a519-9605bec3fb50`.

## Global Constraints

- Do not change existing web chat identity rules: public `/api/chat` must continue rejecting client-submitted `playerId`.
- Do not make KP token act as a PL in public web chat.
- Do not read runtime Wiki content from parent Git `public/wiki`; Gateway must keep using configured `WIKI_ENTRIES_DIR`.
- Do not write chat history or QQ-added memory into frontend release directories.
- Do not store AI keys, SeaDice tokens, QQ ids, or internal secrets in Git.
- Keep `trpg-ai-gateway/` ignored by the parent Git repository.
- SeaDice and NapCat must remain compatible: no second NapCat listener is required for MVP.

---

## Current Structure Check

- Web chat endpoint: `trpg-ai-gateway/src/server.ts` `POST /api/chat`.
- Web chat memory: `CHAT_MEMORY_ROOT_DIR/<npcId>/players/<playerId>/full_log.log` and `current_context.md` in `trpg-ai-gateway/src/memory/chat-memory.ts`.
- NPC profile and memory: `NPC_ROOT_DIR/<npcId>/npc.json`, `common-memory.md`, `players/<playerId>.memory.md` in `trpg-ai-gateway/src/memory/npc-memory.ts`.
- Wiki memory source: `WIKI_ENTRIES_DIR/<fileName>.json` in `trpg-ai-gateway/src/memory/wiki-memory.ts`.
- Runtime content separation: `CONTENT_ROOT_DIR` and `CONTENT_UPLOAD_ROOT_DIR` are already runtime paths; Nginx can switch release/runtime content through `trpg-content-source`.
- Identity decision: `docs/tech-decisions.md` TD-023 says frontend stores only token and chat memory is runtime, not Git.

Important implication: QQ entry must not call `/api/chat` with a synthetic `playerId`. It needs an internal Gateway endpoint that resolves QQ user ids server-side.

## Commit Sequence

### Commit 1: Add Internal QQ Chatbot Config And Resolvers

**Commit message:** `feat(gateway): add qq chatbot identity resolvers`

**Files:**
- Create: `trpg-ai-gateway/src/qq/qq-chatbot-types.ts`
- Create: `trpg-ai-gateway/src/qq/qq-chatbot-resolver.ts`
- Create: `trpg-ai-gateway/src/qq/qq-chatbot-resolver.test.ts`
- Modify: `trpg-ai-gateway/src/memory/npc-memory.ts`

**Interfaces:**
- Produces:
  - `QqChatbotPlayerMap`
  - `QqChatbotOptions`
  - `resolveQqPlayerId(options, qqUserId): string`
  - `resolvePlayerIdByName(records, input): string`
  - `resolveNpcProfileByName(npcRootDir, input): Promise<NpcProfile>`
- Extends `NpcProfile` with optional:
  - `aliases?: string[]`
  - `portraitFiles?: string[]`

**Design:**
- `qqUserId -> playerId` comes from a JSON file loaded by Gateway config later.
- NPC matching uses only `NPC_ROOT_DIR` profiles:
  - exact `npc.id`
  - exact `displayName`
  - exact `aliases[]`
- Do not use parent Git `public/wiki/index.json` for NPC matching.
- If multiple NPCs match the same name, throw a clear conflict error.

**Test cases:**
- Resolve QQ user id to PL id.
- Reject unmapped QQ user id.
- Resolve NPC by `id`, `displayName`, and alias.
- Reject ambiguous NPC aliases.
- Reject path traversal input like `../char.claire`.

**Steps:**
- [ ] Write resolver tests first.
- [ ] Add `aliases` and `portraitFiles` to `NpcProfile`.
- [ ] Implement resolver functions without touching server routes.
- [ ] Run `pnpm test -- src/qq/qq-chatbot-resolver.test.ts`.
- [ ] Run `pnpm type-check`.
- [ ] Commit only resolver files and the `NpcProfile` type change.

### Commit 2: Add Internal Gateway Endpoint For QQ Talk

**Commit message:** `feat(gateway): add internal qq chatbot talk endpoint`

**Files:**
- Modify: `trpg-ai-gateway/src/config.ts`
- Modify: `trpg-ai-gateway/src/config.test.ts`
- Modify: `trpg-ai-gateway/src/server.ts`
- Modify: `trpg-ai-gateway/src/server.test.ts`
- Create: `trpg-ai-gateway/src/qq/qq-chatbot-auth.ts`

**Interfaces:**
- Config additions:
  - `QQ_CHATBOT_INTERNAL_TOKEN`, optional; if absent, QQ endpoints return `404` or `403` and are effectively disabled.
  - `QQ_CHATBOT_PLAYER_MAP_FILE`, optional path to runtime JSON.
- Internal request:

```ts
interface QqChatbotTalkRequest {
  qqUserId: string;
  npc: string;
  message: string;
  groupId?: string;
  senderName?: string;
}
```

- Internal response:

```ts
interface QqChatbotTalkResponse {
  npcId: string;
  npcDisplayName: string;
  playerId: string;
  content: string;
}
```

**Endpoint:**

```text
POST /api/internal/qq-chatbot/talk
Header: x-trpg-internal-token: <QQ_CHATBOT_INTERNAL_TOKEN>
```

**Design:**
- Authenticate with `x-trpg-internal-token`, not public Bearer token.
- Resolve `qqUserId -> playerId` server-side.
- Resolve `npc -> npcId` from `NPC_ROOT_DIR`.
- Reuse the current chat logic:
  - `requireNpcAccess` equivalent with resolved player session.
  - `compressCurrentContextIfNeeded`.
  - `buildNpcPrompt`.
  - `provider.chat`.
  - `appendChatTurn`.
- Queue key remains `npcId + playerId`.
- Do not modify `/api/chat`.

**Test cases:**
- Missing or wrong internal token is rejected.
- Mapped QQ user can talk to allowed NPC.
- Talk appends to the same `CHAT_MEMORY_ROOT_DIR` files used by web chat.
- Locked NPC still rejects a mapped PL without access.
- Existing tests for `/api/chat` still pass.

**Steps:**
- [ ] Add config tests for optional token and player map path.
- [ ] Add server tests for the internal talk endpoint.
- [ ] Implement `qq-chatbot-auth.ts` as a tiny constant-time-ish exact token check; no secret logging.
- [ ] Implement route by extracting the existing `/api/chat` inner flow into a shared local helper inside `server.ts`.
- [ ] Run `pnpm test -- src/config.test.ts src/server.test.ts`.
- [ ] Run `pnpm type-check`.
- [ ] Commit Gateway code only.

### Commit 3: Add Admin Memory Append Endpoint

**Commit message:** `feat(gateway): add qq chatbot memory append endpoint`

**Files:**
- Create: `trpg-ai-gateway/src/memory/npc-memory-writer.ts`
- Create: `trpg-ai-gateway/src/memory/npc-memory-writer.test.ts`
- Modify: `trpg-ai-gateway/src/config.ts`
- Modify: `trpg-ai-gateway/src/config.test.ts`
- Modify: `trpg-ai-gateway/src/server.ts`
- Modify: `trpg-ai-gateway/src/server.test.ts`

**Interfaces:**
- Config addition:
  - `QQ_CHATBOT_ADMIN_QQ_IDS`, comma-separated QQ ids allowed to append memory.
- Internal request:

```ts
interface QqChatbotMemoryRequest {
  adminQqUserId: string;
  npc: string;
  text: string;
  player?: string;
}
```

- Behavior:
  - no `player`: append to `NPC_ROOT_DIR/<npcId>/common-memory.md`
  - with `player`: resolve by `playerId` or token record `displayName`, append to `NPC_ROOT_DIR/<npcId>/players/<playerId>.memory.md`

**Endpoint:**

```text
POST /api/internal/qq-chatbot/memory
Header: x-trpg-internal-token: <QQ_CHATBOT_INTERNAL_TOKEN>
```

**Design:**
- Server checks `adminQqUserId` against `QQ_CHATBOT_ADMIN_QQ_IDS`, even though SeaDice plugin also checks privilege.
- Append format is deterministic:

```md

## 2026-08-26T12:34:56.000Z QQ追加记忆

<text>
```

- Use `assertSafeSegment` for `npcId` and `playerId`.
- Limit `text` length to a fixed value such as 4000 characters.
- Use the existing `KeyedSerialQueue` with key `npc-memory:<npcId>` to prevent concurrent append interleaving.

**Data separation note:**
- This endpoint writes to `NPC_ROOT_DIR`. Production deployment must set `NPC_ROOT_DIR` to a persistent shared data directory if QQ-added memory should survive release switches.
- It must not write to `CONTENT_ROOT_DIR`, because Wiki/blog content and NPC private AI memory are different runtime domains.

**Test cases:**
- Non-admin QQ id is rejected.
- Admin appends common NPC memory.
- Admin appends PL-specific NPC memory.
- Player display name resolves to `playerId` through token records.
- Traversal in NPC/player input is rejected.

**Steps:**
- [ ] Write `npc-memory-writer.test.ts`.
- [ ] Implement append helpers.
- [ ] Add config parsing for admin QQ ids.
- [ ] Add server route tests.
- [ ] Implement endpoint.
- [ ] Run `pnpm test -- src/memory/npc-memory-writer.test.ts src/server.test.ts src/config.test.ts`.
- [ ] Run `pnpm type-check`.
- [ ] Commit Gateway code only.

### Commit 4: Add Optional Portrait Filename Matching

**Commit message:** `feat(gateway): return qq chatbot portrait hints`

**Files:**
- Create: `trpg-ai-gateway/src/qq/qq-chatbot-portrait.ts`
- Create: `trpg-ai-gateway/src/qq/qq-chatbot-portrait.test.ts`
- Modify: `trpg-ai-gateway/src/server.ts`
- Modify: `trpg-ai-gateway/src/server.test.ts`
- Modify: one example NPC JSON only if needed: `trpg-ai-gateway/data/npcs/char.example/npc.json`

**Interfaces:**
- `NpcProfile.portraitFiles?: string[]`
- Response extends:

```ts
interface QqChatbotTalkResponse {
  npcId: string;
  npcDisplayName: string;
  playerId: string;
  content: string;
  portraitFile?: string;
}
```

**Design:**
- AI may put one marker at the very start:

```text
【立绘: 尴尬.jpg】
正文……
```

- Gateway strips that first-line marker from `content`.
- Gateway returns `portraitFile` only if marker file name exactly matches `npc.json#portraitFiles`.
- Only allow simple image file names, not paths:
  - allowed: `尴尬.jpg`, `smile.png`
  - rejected/ignored: `../secret.jpg`, `/tmp/a.png`, `folder/a.png`
- The SeaDice plugin can later decide how to send the image.

**Why this preserves data separation:**
- The authoritative portrait manifest lives with the NPC profile under `NPC_ROOT_DIR`.
- It does not scan runtime wiki images or parent Git folders.
- Actual image delivery can be configured in the SeaDice plugin or future Gateway static route.

**Test cases:**
- Extract matching first-line portrait marker.
- Ignore unknown file name.
- Ignore unsafe path.
- Strip marker from returned content.

**Steps:**
- [ ] Write portrait tests.
- [ ] Implement marker parser.
- [ ] Add prompt instruction only for the QQ internal talk path, not global web chat.
- [ ] Add endpoint tests.
- [ ] Run `pnpm test -- src/qq/qq-chatbot-portrait.test.ts src/server.test.ts`.
- [ ] Run `pnpm type-check`.
- [ ] Commit Gateway code only.

### Commit 5: Add SeaDice `.chatbot` Plugin

**Commit message:** `feat(sealdice): add qq chatbot command plugin`

**Files:**
- Create: `sealdice-plugins/qq-chatbot.js`
- Create: `docs/qq-chatbot-sealdice.md`

**Command interface:**

```text
.chatbot talk <npc名字> <对话内容>
.chatbot add-memory <npc名字> <记忆内容>
.chatbot add-memory <npc名字> <pl名字或playerId> <记忆内容>
.chatbot help
```

**SeaDice plugin config:**
- `gatewayUrl`, default `http://127.0.0.1:3001`
- `internalToken`, no default in docs; user fills it in WebUI plugin config
- `minAdminPrivilege`, default `50`
- `imageBasePath`, optional local/public prefix used only when sending images becomes enabled

**Design:**
- Use SeaDice `seal.ext.newCmdItemInfo()` and `ext.cmdMap.chatbot`.
- Use `fetch` to call AI Gateway internal endpoints.
- `talk` is available to normal users if their QQ id is mapped server-side.
- `add-memory` requires `ctx.privilegeLevel >= minAdminPrivilege`.
- Keep parser simple and explicit:
  - first arg is subcommand
  - second arg is NPC name
  - remaining args form content
  - quoted text is optional, not required for MVP
- Reply format:

```text
【NPC显示名】
<content>
```

- If `portraitFile` exists and `imageBasePath` is configured, send image before text in the later implementation pass. MVP may return text-only with a visible marker suppressed by Gateway.

**Test/verification:**
- Run `node --check sealdice-plugins/qq-chatbot.js`.
- Manual SeaDice WebUI upload.
- In QQ:
  - `.chatbot help`
  - `.chatbot talk 康斯坦丝 你还记得我吗？`
  - `.chatbot add-memory 康斯坦丝 她记得墓园里的钟声。`

**Steps:**
- [ ] Create plugin with config registration.
- [ ] Implement help and argument parsing.
- [ ] Implement `talk` fetch.
- [ ] Implement privilege check and `add-memory` fetch.
- [ ] Run `node --check sealdice-plugins/qq-chatbot.js`.
- [ ] Commit plugin and concise docs.

### Commit 6: Runtime Deployment Docs And Server Config Notes

**Commit message:** `docs: document qq chatbot runtime deployment`

**Files:**
- Modify: `docs/deploy-sealdice-qq.md`
- Modify: `docs/runtime-content-admin.md`
- Modify: `trpg-ai-gateway/README.md`
- Optionally modify: `trpg-ai-gateway/skills/deploy-ai-gateway/SKILL.md`

**Document exact runtime files:**

```text
/etc/trpg-ai/qq-chatbot.players.json
/etc/trpg-ai/trpg-ai.env
/var/www/trpg-ai-gateway/shared/npcs
/var/www/trpg-ai-gateway/shared/chat-memory
```

**Example player map:**

```json
{
  "123456789": "pl.ddd",
  "987654321": "pl.leina"
}
```

**Example env:**

```bash
QQ_CHATBOT_INTERNAL_TOKEN=replace-with-long-random-token
QQ_CHATBOT_PLAYER_MAP_FILE=/etc/trpg-ai/qq-chatbot.players.json
QQ_CHATBOT_ADMIN_QQ_IDS=123456789
NPC_ROOT_DIR=/var/www/trpg-ai-gateway/shared/npcs
CHAT_MEMORY_ROOT_DIR=/var/www/trpg-ai-gateway/shared/chat-memory
WIKI_ENTRIES_DIR=/var/www/trpg-content/wiki/entities/entries
```

**Important notes:**
- `WIKI_ENTRIES_DIR` points to runtime content, not Git `public/wiki`.
- `NPC_ROOT_DIR` should be persistent if `.chatbot add-memory` is enabled.
- NapCat does not need a second connection for MVP; SeaDice receives commands through the existing NapCat link.
- Keep NapCat WebUI and SeaDice WebUI local-only as already documented.

**Steps:**
- [ ] Add concise deployment section.
- [ ] Add rollback note: disabling plugin or removing `QQ_CHATBOT_INTERNAL_TOKEN` disables QQ chatbot.
- [ ] Add verification curl for internal talk using a fake mapped QQ id on server.
- [ ] Commit docs only.

### Commit 7: Full Verification And Compatibility Pass

**Commit message:** `test: verify qq chatbot gateway integration`

**Files:**
- Modify only tests if earlier review finds gaps.
- No product code expected unless tests reveal a bug.

**Verification commands:**

```bash
cd trpg-ai-gateway
pnpm test
pnpm type-check
pnpm build
cd ..
node --check sealdice-plugins/qq-chatbot.js
```

**Manual compatibility checklist:**
- Existing web chat still works with PL token.
- `/api/chat` still rejects `playerId` in body.
- KP token still cannot directly chat through `/api/chat`.
- QQ talk writes to the same `CHAT_MEMORY_ROOT_DIR` path for the mapped PL.
- QQ add-memory writes to `NPC_ROOT_DIR`, not `CONTENT_ROOT_DIR`.
- SeaDice `.ra`, `.log`, `.pc`, and wallet plugin commands still work.
- NapCat still has one QQ connection; no extra OneBot bridge process required.

**Steps:**
- [ ] Run all automated commands.
- [ ] Review `git diff --stat` for accidental broad edits.
- [ ] Review `git diff --check`.
- [ ] Commit any missing tests only if needed.

## Review Gates

After each commit, check these before moving to the next:

- Does this commit have one clear responsibility?
- Can it be reverted without breaking unrelated features?
- Did it preserve runtime data separation?
- Did it avoid secrets in Git?
- Did it avoid changing SeaDice/NapCat deployment shape unless the commit is docs-only?

## Recommended Execution Order

1. Gateway pure resolvers.
2. Gateway internal talk.
3. Gateway memory append.
4. Portrait hints.
5. SeaDice plugin.
6. Runtime docs.
7. Final verification.

The only commit that touches SeaDice is Commit 5. The first four commits are server-side and testable without touching the live QQ bot.
