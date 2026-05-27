# WikiAdminTab 与 Wiki 渲染器调研结论

## 现状

- 管理台当前同时存在三套编辑链路：元数据表单、`WikiBlockEditor` 可视化 block 编辑器、原始 JSON 文本兜底区。
- 真实保存时的数据源是 `contentText`（字符串），保存前 `JSON.parse` 得到 `content`。
- `WikiBlockEditor` 的 `onChange` 会直接 `setContentText(JSON.stringify(nextBlocks, null, 2))`，即“结构化编辑 -> JSON 字符串”。
- 阅读页已有一套本地 `WikiContentRenderer`，且与 `src/features/wiki/WikiContentRenderer.tsx` 逻辑重复。

## 建议方向（最小改动）

1. 统一“单一数据源”为 `contentBlocks: WikiBlock[]`。
2. 文本框改为“JSON 镜像编辑器”：
   - 文本框编辑时尝试 parse，成功即更新 `contentBlocks`；失败只记录错误，不覆盖 `contentBlocks`。
   - `contentBlocks` 改变时自动同步回格式化 JSON 字符串。
3. 可视化预览与阅读页共用 `src/features/wiki/WikiContentRenderer.tsx`，确保渲染一致。
4. COC 人物卡采用新 block：`type: "coc-sheet"`，由 renderer 解析 `block.sheet`（JSON 对象）渲染。

## COC 人物卡落点

- 最佳落点：`WikiContentRenderer` 的 block 分发层（`switch block.type` 分支）。
- 原因：
  - 可在管理台预览与阅读页同时复用。
  - 与已有 `heading/paragraph/list/quote/secret-panel` 同层，扩展成本最低。
  - 避免把业务组件塞到页面层，减少重复。

## 预计改动文件

- `src/types/wiki.ts`：扩展 `WikiBlock` 联合类型，新增 `coc-sheet` block 定义。
- `src/features/wiki/WikiContentRenderer.tsx`：新增 `coc-sheet` 渲染分支。
- `src/features/wiki/WikiBlockEditor.tsx`：新增 `coc-sheet` 编辑 UI（可先给 JSON textarea + 字段模板按钮）。
- `src/pages/WikiAdminTab/index.tsx`：
  - 引入 `contentBlocks` 作为单一真源。
  - 文本框与 block editor 的双向同步。
  - 预览继续使用 `WikiContentRenderer`（已在用）。
- `src/pages/WorldWikiTab/index.tsx`：移除本地 renderer，改为复用 `features/wiki/WikiContentRenderer`。

