# Handoff：用 BlockNote 重做后台编辑器（Notion 式打字流）

> 目标：把 `/admin/content` 的博客编辑器从「Markdown textarea + 表单」换成 BlockNote 富文本编辑器。
> 本文档假设接手的对话没有任何上下文，按顺序读完即可开工。

## 1. 项目背景（30 秒版）

- 站点：`https://www.issane.cn/`（个人站 + `/trpg` 跑团站），**全部前端在主仓 `TRPGAudioHelper`**
- 主仓：`D:\workplace\LuciusVibeCoding\TRPGAudioHelper`（React 19 + Vite 6 + Tailwind 4 + React Router v7 + shadcn 风格组件，pnpm）
- 网关子仓：`TRPGAudioHelper\trpg-ai-gateway`（独立 Git 仓库，Node 原生 http 服务，**没有框架**，vitest）
- 内容数据不进 git：生产环境由网关服务写 `/var/www/trpg-content/`（blog = Markdown+frontmatter，wiki = 结构化 JSON blocks）

## 2. 现状与痛点

编辑入口 `https://www.issane.cn/admin/content`（源码 `src/pages/ContentAdminTab/index.tsx`）：

- 博客编辑 = 8 个表单字段 + 一个 Markdown textarea + react-markdown 预览（`content-split-editor` 区域）
- Wiki 编辑 = 结构化表单 **或手写原始 JSON**（`wikiMode: "structured" | "json" | "preview"`）
- 全站没有任何富文本编辑器依赖；用户（KP 本人）明确反馈：没有 Notion 那种「打字就能写」的爽感，表格太多

保存链路（不要动）：
`ContentAdminTab` → `src/features/content-admin/content-admin-client.ts`（`saveBlogDocument` = `PUT /api/admin/content/blog/:id`，Bearer KP token）→ 网关 `trpg-ai-gateway/src/server.ts` → `src/content/content-store.ts`（stage 目录 → 重建 index.json → 原子替换目录）→ `/var/www/trpg-content/blog/`。前端无构建期博客索引依赖（`pnpm generate:blog` 只影响本地 dev 数据）。

## 3. 方案：BlockNote

- 库：`@blocknote/react` + `@blocknote/mantine` + `@blocknote/core`（当前 0.55.x，MIT，React 19 官方支持）
- 选型理由：Notion 体验开箱即用（slash 菜单、拖拽手柄、占位符）、自定义 block/inlin API 成熟、自带 Markdown 导入导出
- 文档：<https://www.blocknotejs.org/docs>；markdown 导入 `editor.tryParseMarkdownToBlocks`，导出 `editor.blocksToMarkdownLossy`
- 备选已否决：Tiptap 裸用（UI 要自拼）、Milkdown（与 JSON 块模型不匹配）、Plate/Lexical（太重）、Novel（维护弱）

## 4. 任务拆解

### 一期：博客编辑器（本次范围）

1. 主仓安装依赖：`pnpm add @blocknote/react @blocknote/mantine @blocknote/core`
2. 新建 `src/features/editor/BlockNoteEditor.tsx`：受控封装（value=markdown 字符串，onChange=防抖导出 markdown），导入 BlockNote CSS（`@blocknote/mantine/style.css` 等），适配暗色（`theme` prop 接现有 next-themes）
3. 接入 `ContentAdminTab` 博客编辑：替换 `content-split-editor` 里的 Markdown textarea，保留「实时预览」列（可直接用编辑器本体替代预览列，二选一）；表单字段（标题/标签/可见 PL/关联 Wiki id）保留，它们是 frontmatter 元数据
4. 图片上传沿用现有 `uploadContentImage`（返回 `/content-assets/...` URL），在编辑器里插入 image block
5. 保存仍走 `saveBlogDocument`：编辑器 onChange 导出 markdown → 存 draft → 保存时 PUT。**不改变存储格式，无数据迁移**
6. 旧博文首次打开：用 `tryParseMarkdownToBlocks` 初始化编辑器内容

验收：新建/编辑/保存一篇博客全流程可用；frontmatter 字段不丢；`pnpm type-check` 过；生产保存路径回归测试一次（本地起网关）。

### 二期：Wiki 编辑器（另开任务，先不做）

- 难点是自定义 schema：wiki blocks（`src/types/wiki.ts`）里 `secret-panel`/`coc-sheet` 是自定义 block，`secret-inline`/`ref` 是自定义 inline；需要 BlockNote custom block + 双向转换层（wiki JSON blocks ↔ BlockNote blocks），存储仍是现有 JSON 格式
- 转换层是纯函数，先写单测再接 UI（模式参考 `trpg-ai-gateway/src/content/content-store.test.ts`）

## 5. 本地开发环境

```bash
# 主仓（端口 8291）
pnpm install && pnpm dev
# 网关（admin 页登录必须，端口 3001；public/config/runtime.json 已指向 127.0.0.1:3001）
cd trpg-ai-gateway && pnpm install && pnpm dev   # 具体脚本看子仓 package.json
```

- KP token 本地调试：子仓支持 `DEV_AUTH_BYPASS=1`（仅非生产，见 `src/config.ts` 的 `isDevAuthBypassEnabled`）
- 登录页在 `src/pages/ContentAdminTab/index.tsx` 的 `LoginGate`（`useAiSession`）

## 6. 硬性约束（来自 AGENTS.md / 用户习惯）

- 用户可见文案一律中文；代码标识/文件名英文
- 不要改存储格式与 API 契约（网关 `content-store.ts` 的序列化是唯一事实源）
- 不 push master（push 即触发 GitHub Actions 全量部署）；本次会话的所有改动都只本地提交
- pnpm install 需要 `CI=true`（否则无 TTY 会卡在确认删 node_modules）
- 改动完成后 `CI=true pnpm type-check`（主仓）+ `npx tsc --noEmit`（网关）
- 网关测试基线：`src/server.test.ts` 的 8 个 module-clue 测试在当前环境本来就 fail（历史环境问题），与你的改动无关

## 7. 2026-11-18 已完成的相关工作（不要重复做）

- 内容后台已有批量删除功能：网关 `DELETE /api/admin/content/blog|wiki/:id`（移入服务器 `trash/` 目录，返回悬空引用列表），前端列表支持勾选批量删除
- 仓库已清理 AI 过程产物（tmp/roots-analysis、user_request.md、docs/superpowers 等 134 个文件）
