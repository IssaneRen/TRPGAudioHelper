# Runtime Content Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a KP-only runtime CMS for blogs, Wiki entries, images, and ZIP backups without requiring Git deployment.

**Architecture:** Extend the existing AI Gateway with a file-backed content service and keeper-only routes. Add a standalone React admin route. Serve shared content through isolated Nginx aliases while retaining the release copy for rollback.

**Tech Stack:** React 19, TypeScript, Vite, Node HTTP, Vitest, fflate, Nginx, systemd.

**Spec:** `docs/superpowers/specs/2026-08-25-runtime-content-admin-design.md`

## Global Constraints

- Preserve unrelated dirty changes in both repositories.
- Reuse the current KP bearer token and require `isKeeper=true` on every admin endpoint.
- Never delete Git content or release directories.
- Use atomic file replacement and validate ZIP imports before switching content.
- Uploaded files live under `/home/ubuntu/public_files/gate/trpg-content`.

---

### Task 1: Gateway content store

**Files:**
- Create: `trpg-ai-gateway/src/content/content-types.ts`
- Create: `trpg-ai-gateway/src/content/content-store.ts`
- Create: `trpg-ai-gateway/src/content/content-store.test.ts`
- Modify: `trpg-ai-gateway/package.json`
- Modify: `trpg-ai-gateway/pnpm-lock.yaml`

**Interfaces:**
- Produces: `ContentStore`, `BlogPostDocument`, `WikiContentBundle`, ZIP import/export and image upload methods.

- [ ] Write tests proving blog index regeneration, Wiki validation, atomic saves, safe image names, ZIP round-trip, and rejection of `../`, symlink, unknown-root, oversized, and invalid JSON entries.
- [ ] Run `pnpm test -- src/content/content-store.test.ts` and confirm the tests fail because the store is missing.
- [ ] Implement the minimal file-backed store with `fflate`; preserve all current Wiki block/token fields as JSON.
- [ ] Re-run the focused tests and confirm they pass.

### Task 2: Keeper-only Gateway routes

**Files:**
- Modify: `trpg-ai-gateway/src/config.ts`
- Modify: `trpg-ai-gateway/src/config.test.ts`
- Modify: `trpg-ai-gateway/src/server.ts`
- Modify: `trpg-ai-gateway/src/server.test.ts`

**Interfaces:**
- Consumes: `ContentStore` from Task 1.
- Produces:
  - `GET /api/admin/content/overview`
  - `GET|PUT /api/admin/content/blog/:id`
  - `GET|PUT /api/admin/content/wiki/:id`
  - `POST /api/admin/content/images`
  - `GET /api/admin/content/export`
  - `POST /api/admin/content/import`

- [ ] Add config tests for `CONTENT_ROOT_DIR`, `CONTENT_UPLOAD_ROOT_DIR`, and size limits.
- [ ] Add route tests for missing token `401`, player token `403`, KP success, binary upload, ZIP download, and ZIP import.
- [ ] Run focused tests and confirm the new assertions fail.
- [ ] Implement route parsing, bounded binary-body reading, keeper checks, JSON/binary responses, and serialized writes.
- [ ] Re-run Gateway tests and type-check.

### Task 3: Admin client and standalone route

**Files:**
- Create: `src/features/content-admin/content-admin-client.ts`
- Create: `src/pages/ContentAdminTab/index.tsx`
- Create: `src/pages/ContentAdminTab/ContentGuide.tsx`
- Create: `src/pages/ContentAdminTab/content-admin.css`
- Modify: `src/App.tsx`
- Modify: `src/features/wiki/WikiBlockEditor.tsx`

**Interfaces:**
- Consumes: Task 2 APIs and existing `validateAiSession`, `WikiBlockEditor`, `WikiContentRenderer`.
- Produces: `/admin/content`.

- [ ] Add pure client/normalization tests where practical and verify failure first.
- [ ] Implement a full-screen token gate that rejects non-KP sessions.
- [ ] Implement blog list/editor/Markdown preview, Wiki list/structured editor/raw JSON/live preview, image upload and returned-URL insertion.
- [ ] Add the fixed right-side guide for every current Wiki block, token, and `hiddenMode`.
- [ ] Add ZIP export/import controls with explicit progress and result messages.
- [ ] Run parent type-check, build, and focused tests.

### Task 4: Deployment and reversible migration

**Files:**
- Create: `ops/content-admin/trpg-content-runtime.conf`
- Create: `ops/content-admin/trpg-content-release.conf`
- Create: `ops/content-admin/switch-content-source.sh`
- Create: `ops/content-admin/migrate-content.sh`
- Modify: `.github/workflows/deploy.yml`
- Modify: `trpg-ai-gateway/.github/workflows/deploy.yml`
- Create: `docs/runtime-content-admin.md`

**Interfaces:**
- Produces: `/var/www/trpg-content`, `/home/ubuntu/public_files/gate/trpg-content`, and `switch-content-source.sh runtime|release`.

- [ ] Write shell scripts with explicit paths, backups, staging, `nginx -t`, and rollback on validation failure.
- [ ] Validate scripts with `bash -n` and inspect generated Nginx config locally.
- [ ] Build both repositories locally.
- [ ] Copy current online `blog/` and `wiki/` into the shared content root without deleting source files.
- [ ] Deploy Gateway release, environment settings, frontend release, Nginx aliases, and switch script through the shared SSH session.
- [ ] Verify health, authentication, read/write smoke tests, image HTTPS access, ZIP round-trip, main blog/Wiki rendering, and `runtime -> release -> runtime` switching.
- [ ] Record only concise usage, ZIP layout, backup, and rollback commands in `docs/runtime-content-admin.md`.

### Task 5: Final verification

**Files:**
- Modify only files found defective by verification.

- [ ] Run `pnpm build` in the parent repository.
- [ ] Run `pnpm test && pnpm type-check && pnpm build` in `trpg-ai-gateway`.
- [ ] Confirm unrelated dirty files remain present and unmodified.
- [ ] Verify production Nginx and Gateway remain active and the old Git release still serves correctly when selected.
