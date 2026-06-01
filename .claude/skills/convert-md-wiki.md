---
name: convert-md-wiki
description: |
  Markdown 标准文与 TRPGAudioHelper Wiki JSON blocks 互转（有损可逆子集）。
  触发词：「md 转 wiki」「wiki 转 markdown」「格式互转」。
---

# Convert MD ↔ Wiki（格式互转）

你是 **Wiki 格式转换员**，在 Markdown 与 `WikiBlock[]` 之间转换，严格遵循 `src/types/wiki.ts`。

## 类型定义（事实）

### WikiBlock 类型

`heading` | `paragraph` | `list` | `quote` | `image` | `secret-panel` | `coc-sheet`

### WikiInlineToken 类型

`text` | `ref` | `secret-inline`

### 段落

- 纯文本标题：`heading` 用 `text` 字段
- 富文本：`paragraph` / `list` 用 `tokens` 或 `items[][]`

## Markdown → Wiki 映射规则

| Markdown | Wiki block | 备注 |
|----------|------------|------|
| `#`–`###` | `heading` + `text` | 去掉 `#` 前缀 |
| 普通段落 | `paragraph` + `tokens: [{type:"text", text:"..."}]` | `\n` 保留在 text 内，渲染器会转 `<br>` |
| `**bold**` | `text` token `bold: true` | |
| `~~strike~~` | `strikethrough: true` | |
| `- item` 列表 | `list` + `items` | 每项为 token 数组 |
| `> quote` | `quote` + `tokens` | |
| `![alt](src)` | `image` + `src`/`alt`/`caption` | src 建议 `/wiki/...` 或 `/blog/...` |
| `[[显示名\|entry.id]]` 或约定语法 | `ref` token | `entryId` + `label` |
| `:::secret pl.a,pl.b` … `:::` | `secret-panel` | 需 `playerIds`、`blocks` 嵌套 |
| CoC 卡 JSON 围栏 | `coc-sheet` | 谨慎，通常手建 |

### ref 约定语法（建议）

```markdown
[[金斯波特|loc.kingsport]]
[[噩梦事件|event.kingsport-nightmare-19281109]]
```

解析为：

```json
{ "type": "ref", "entryId": "loc.kingsport", "label": "金斯波特" }
```

### secret 约定语法（建议）

```markdown
:::secret pl.leina,pl.adam
仅参与者可见的正文。
:::
```

## Wiki → Markdown 映射规则

| Wiki | Markdown |
|------|----------|
| `heading` | `## {text}`（按层级可调整） |
| `paragraph.tokens` | 拼接 text/ref；ref → `[[label\|entryId]]` |
| `list` | `- ` 每行 |
| `quote` | `> ` |
| `image` | `![alt](src)` + 可选 caption 段落 |
| `secret-panel` | `:::secret pl.xxx` 块 + 警告注释 |
| `coc-sheet` | 不自动转，输出注释 `<!-- coc-sheet: manual -->` |

## 有损说明（必须在输出中声明）

| 特性 | MD→Wiki | Wiki→MD |
|------|---------|---------|
| `secret-inline` | 需自定义语法 | 转为 `(剧透)` 或保留注释 |
| `color` on text | 无标准 MD | 丢失或 HTML span |
| `hiddenMode` | 默认 `mask` | 注释标出 |
| 嵌套 `secret-panel` | 支持但复杂 | 展平为嵌套 `:::` |

## 工作模式

### A. 人工辅助（当前默认）

1. 读取源文件
2. 按上表输出目标格式 **完整文件**
3. 列出「需人工补全」项（playerIds、relatedEntryIds）
4. 提醒运行 `pnpm generate:wiki`

### B. 未来脚本（可选）

- 建议路径：`scripts/convert-wiki-md.ts`
- 输入：`--from md|wiki --in --out`
- 集成：`pnpm generate:wiki` 前校验

## Agent 角色

| 角色 | 文件 | 任务 |
|------|------|------|
| 转换 | `wiki-format-converter` | 执行映射、输出 JSON/MD |
| 校验 | `wiki-validator` | 对照 `scripts/wiki-data.ts` |
| 架构 | `content-architect` | 补全 index 元数据字段 |

## 示例（paragraph + ref）

**Markdown：**

```markdown
快速跳转：[[地点-金斯波特|loc.kingsport]] / [[噩梦事件|event.kingsport-nightmare-19281109]]
```

**Wiki：**

```json
{
  "type": "paragraph",
  "tokens": [
    { "type": "text", "text": "快速跳转：" },
    { "type": "ref", "entryId": "loc.kingsport", "label": "地点-金斯波特" },
    { "type": "text", "text": " / " },
    { "type": "ref", "entryId": "event.kingsport-nightmare-19281109", "label": "噩梦事件" }
  ]
}
```

## 禁止

- 不修改 `category` 语义（战报必须 `report`）
- 不 invent 不存在的 `entryId`（须查 `public/wiki/index.json` lookup）
- 转换后不跳过 wiki 生成校验
