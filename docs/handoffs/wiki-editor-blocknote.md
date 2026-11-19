# Handoff：内容后台 BlockNote 编辑器（一期博客 + 二期 Wiki）——已完成与交接

> 状态：**一期、二期均已完成并上线**（2026-11-20 凌晨）。本文档供后续会话接手：现状、设计决策、调试备忘、遗留事项。
> 配套阅读：`docs/handoffs/blog-editor-blocknote.md`（原始任务书，一期范围）。

## 1. 30 秒现状

- `/admin/content` 博客编辑器：**BlockNote 所见即所得**（Notion 式：大标题内联 + 元数据折叠 + id 自动生成），提交 `0f4038e`
- Wiki 编辑器：新增**「所见即所得」模式（默认）**，结构化表单 / 原始 JSON 保留为逃生舱，提交 `91fe169`（rebase 后；原始 `7b72a89`）
- 构建修复：并行会话 cult-ui 组件有 4 处 `tsc -b` 错误，已机械性修复，提交 `5fa8f79`
- 部署：直连部署 `releases/20261120-005417` 已上线并验证（admin chunk 含编辑器代码）；push 均已完成
- **存储格式与网关 API 零改动**：博客仍为 Markdown+frontmatter，Wiki 仍为 `WikiBlock[]` JSON；`trpg-ai-gateway` 本次未动

## 2. 代码地图（都在主仓）

| 文件 | 作用 |
|------|------|
| `src/features/editor/BlockNoteEditor.tsx` | 博客编辑器：受控封装（value=markdown 字符串），`tryParseMarkdownToBlocks` 导入 / `blocksToMarkdownLossy` 导出（0.57 起为**同步** API），200ms 防抖 + `lastSyncedRef` 防回环 + `useImperativeHandle` flush 句柄（保存前冲刷） |
| `src/features/wiki/wiki-blocknote-convert.ts` | 二期核心：`WikiBlock[]` ↔ BlockNote blocks **双向纯转换**。映射约定与规范化行为全部写在文件头注释 |
| `src/features/wiki/wiki-blocknote-convert.verify.ts` | 转换层回归：`pnpm test:wiki-convert`（tsx verify 脚本模式，主仓无 vitest） |
| `src/features/wiki/wiki-blocknote-schema.tsx` | 自定义 schema：`secretPanel`/`cocSheet` 块、`wikiRef`/`wikiSecret` 行内、`hexTextColor` 样式 + 编辑 UI（popover/chips）；`WikiEditorContext` 注入 players/entries 候选 |
| `src/features/editor/WikiBlockNoteEditor.tsx` | Wiki 所见即所得编辑器：受控封装（value=`WikiBlock[]`，JSON 快照比较防回环）+ slash 菜单插入项 |
| `src/features/editor/*.css` | 编辑器融入档案室纸面（透明背景、无边框）；行内编辑 popover 样式 |
| `src/pages/ContentAdminTab/index.tsx` | 博客区 Notion 式布局（标题内联、元数据折叠、id 自动生成 `slugifyBlogTitle`）；Wiki `wikiMode` 新增 `wysiwyg` 并默认 |
| `src/pages/ContentAdminTab/content-admin-model.ts` | 新增 `slugifyBlogTitle` |

### 关键设计决策（改代码前必读）

1. **转换层映射**（convert.ts 头注释为准）：heading→BN heading(level 2)；list 展开为连续 bulletListItem，回转时**连续 bullet/numberedListItem 合并回一个 wiki list**；secret-panel.blocks ↔ BN children 递归；cocData 整体 JSON 序列化进单个 string prop（propSchema 只支持标量）；playerIds 数组以逗号串存 prop。
2. **规范化（round-trip 稳定的代价，测试已固定）**：空字符串/空数组的可选字段回转时省略；BN 任意 level heading 回转丢弃 level；wiki image 的 `alt` 不保留（BN image 无对应 prop）；BN 独有块（checkListItem/codeBlock/table 等）回转**降级为 paragraph**（防丢数据）；非 secretPanel 块的子块回转拍平为其后兄弟块。
3. **编辑态 KP 全可见**：阅读端遮罩/权限（`WikiContentRenderer` 的 mask/collapse/playerIds 过滤）不进编辑器，编辑器只维护结构信息。**阅读端渲染器一行未动**。
4. **BlockNote 0.57 API 注意**：`createReactBlockSpec` 返回**工厂**，`BlockNoteSchema.create().extend({ blockSpecs })` 必须传调用结果（`secretPanelSpec()`），传工厂会破坏整个 schema 类型推断（表现为 props/content 全变 undefined 的诡异报错）；`updateInlineContent`/partial 参数也要带 `type` 字段；`editor.getTextCursorPosition().block.id` 才是 BlockIdentifier。
5. **主题固定 light**：content-admin 是固定纸色外观，不随根元素 dark class 变化，编辑器跟随系统暗色会在纸面上变黑底深字（一期踩过）。
6. **选块替换行为**：点击图片等 content:"none" 块选中后直接打字会**替换整块**（ProseMirror/Notion 通用行为，非 bug）。

## 3. 本地调试备忘（踩过的坑，下次直接用）

```bash
# 网关（DEVELOPMENT 全套环境变量，缺一会启动失败）
cd trpg-ai-gateway
PORT=3001 ALLOWED_ORIGIN=http://localhost:8291 \
CONTENT_ROOT_DIR="C:/Users/Lucius/AppData/Local/Temp/trpg-content-dev/content" \
CONTENT_UPLOAD_ROOT_DIR="C:/Users/Lucius/AppData/Local/Temp/trpg-content-dev/uploads" \
WIKI_ENTRIES_DIR=.local/wiki-entries NPC_ROOT_DIR=data/npcs \
CHAT_MEMORY_ROOT_DIR=.local/chat-memory \
MODULE_CLUE_CONTENT_ROOT_DIR=data/module-clues \
MODULE_CLUE_VISIBILITY_ROOT_DIR=data/module-clues \
AI_API_KEY_ENV=AI_API_KEY AI_BASE_URL=https://api.example.com/v1 \
AI_MODEL=deepseek-chat DEV_AUTH_BYPASS=1 DEV_IS_KEEPER=1 pnpm dev

# 前端
CI=true pnpm dev   # 8291，注意 listen 的是 localhost(IPv6)，curl 127.0.0.1 会 000
```

- `DEV_AUTH_BYPASS=1` 只免 token 校验，**必须加 `DEV_IS_KEEPER=1`** 才有管理员身份（登录框随便填，如 `dev-token`）
- `CONTENT_ROOT_DIR` **必须指到主仓外**（Vite watcher 锁目录句柄，Windows 下 content-store 的 rename 原子替换会 EPERM）；目录需预置 `blog/index.json`、`wiki/entities/{players,modules}.json`（`[]` 即可），否则 overview/PUT 报 ENOENT
- `MODULE_CLUE_VISIBILITY_ROOT_DIR` 必填（config 只回退到 `MODULE_CLUE_ROOT_DIR`，只设 CONTENT 那个会启动失败）
- Git Bash 下 curl 直发中文 JSON 会 GBK 乱码，用 `--data-binary @file.json`
- 浏览器自动化注意：IAB 的 Playwright locator click 在该环境经常超时，**evaluate 原生 `.click()` / native setter 注入最可靠**；点击图片等块后盲打会替换整块（见上），测试打字前先确认焦点在文本块

## 4. 验证清单（改完跑这些）

1. `pnpm test:wiki-convert`（转换层 round-trip）
2. `CI=true pnpm type-check`（tsc --noEmit）**和** `CI=true pnpm build`（tsc -b，更严格，两者都可能各自报错）
3. 本地起网关+前端，浏览器回归：老数据打开 → 打字 → 保存 → curl 服务器 JSON 比对 round-trip
4. 部署：`bash scripts/deploy-direct.sh`（约 2-3 分钟，构建+scp+软链切换；`--skip-build` 复用现有 dist）；push 会触发 GitHub Actions（30 分钟，产物一致）

## 5. 遗留事项 / 后续可做

- **coc-sheet 编辑仍是 JSON 弹层**（attributes/skills 没有结构化表单）；若要表单化，`CocDataEditPanel`（schema.tsx 内）是挂点
- **wikiSecret 的 playerIds 编辑**在行内 popover 里（`PlayerIdsEditPanel` 复用 `SelectionChips`）；若嫌行内 UI 拥挤可移到块级侧栏
- BN 工具栏（formatting toolbar）未定制：加粗/颜色等用 BN 默认 UI；wiki 特有的 ref/secret-inline 目前只能靠 `/` 菜单或既有内容修改，没有「选中文字转 ref」的快捷操作（可做 formatting toolbar 自定义按钮）
- slash 菜单实验中 `/` 输入曾残留在文档里（自动化测试副作用），人工操作无此问题
- 线上 `docs/handoffs/deploy.local.conf` 不存在，实际配置在 `scripts/deploy.local.conf`（gitignored，含 SERVER_HOST/SERVER_USER）
- 服务器网关仍为用户既有的 systemd `trpg-ai-gateway.service`（127.0.0.1:3001 + ai.issane.cn），**用户明确不要动这套**；nginx 的 `location = /config/runtime.json` alias 到 `/var/www/trpg-helper-config/runtime.json`，所以 release 里的该文件不影响线上
- 本地 fixture（含全块类型的回归词条 `entry.blocknote-regression`）在 `C:/Users/Lucius/AppData/Local/Temp/trpg-content-dev/`，临时目录可能被清理，seed 脚本内容可参考本文档第 3 节重建

## 6. 相关提交

- `0f4038e` 一期博客编辑器（BlockNote + Notion 式布局）
- `5fa8f79` 修复 cult-ui 组件的 `tsc -b` 构建阻塞（并行会话引入）
- `91fe169` 二期 Wiki 所见即所得（rebase 后；原始 `7b72a89`）
- 上线 release：`20261120-005417`（含并行会话的 apps/writing-pen 等全部代码）
