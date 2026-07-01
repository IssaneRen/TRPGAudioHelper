---
name: convert-md-wiki
description: |
  将 TRPGAudioHelper Wiki Markdown 源文档转换为 public/wiki/entities/entries/*.json，或将单个 Wiki JSON 反向导出为可编辑 Markdown。使用场景：用户说“md 同步 wiki”“wiki md 转 json”“json 转 md 编辑”“加密字/加密块转换”“把 wiki 文档转成 JSON”。
---

# Convert MD Wiki

使用 `scripts/wiki-md-convert.mjs` 处理 Wiki Markdown 与 Wiki JSON 的互转。输出必须符合 `src/types/wiki.ts`。

## 固定规则

- 优先使用 `【加密字】...【/加密字】` 转为 `secret-inline`。
- 只有隐藏内容包含图片、列表、标题、长段落集合，或必须形成一个黑框预览时，才使用 `【加密块】...【/加密块】` 转为 `secret-panel`。
- 不把“PL 视角”“玩家可见”等出戏描述写进正文；用世界内记录和加密标记表达权限。
- 转换后运行 wiki 索引生成和类型检查。

## Markdown 头部字段

每个 Markdown 文件使用 YAML-like frontmatter：

```markdown
---
id: char.example
category: character
displayName: 示例人物
summary: 公开摘要
avatar: /wiki/characters/example.png
aliasNames: ["示例", "Example"]
playerIds: ["pl.xxt"]
relatedEntryIds: ["char.other"]
tags: ["pc"]
secretPlayerIds: ["pl.xxt"]
secretTitle: 已授权档案
secretHiddenMode: mask
wikiStatus: 待转换json
---
```

特殊字段：

- `wikiStatus`: `待转换json`、空、缺失都要转换；脚本转换后改为 `已转换为json`。
- `secretPlayerIds`: `【加密字】` 和 `【加密块】` 默认授权对象；空数组表示仅 KP/revealAll 可见。
- `secretTitle`: `secret-panel.title`，默认 `已授权档案`。
- `secretHiddenMode`: `mask` 或 `collapse`，默认 `mask`。
- `jsonPath`: 可选；覆盖默认输出 `public/wiki/entities/entries/{id}.json`。

## 正文语法

| Markdown | Wiki JSON |
| --- | --- |
| `# 标题` / `## 标题` | `heading` |
| 普通段落 | `paragraph.tokens` |
| `- 项目` | `list.items` |
| `> 引文` | `quote.tokens` |
| `![alt](/wiki/x.png)` | `image` |
| `[[显示名|entry.id]]` | `ref` token |
| `【加密字】文本【/加密字】` | `secret-inline` |
| `【加密块】...【/加密块】` | `secret-panel` |
| fenced `wiki-coc-sheet` JSON | `coc-sheet` |

## 命令

单个 Markdown 转 JSON：

```bash
node scripts/wiki-md-convert.mjs md-to-json --in public/wiki/entities/md/char.example.md
```

扫描目录，只转换 `wikiStatus` 不是 `已转换为json` 的文件：

```bash
node scripts/wiki-md-convert.mjs scan-md --dir public/wiki/entities/md
```

单个 JSON 导出为 Markdown：

```bash
node scripts/wiki-md-convert.mjs json-to-md \
  --in public/wiki/entities/entries/char.example.json \
  --out public/wiki/entities/md/char.example.md
```

## 验证

转换后运行：

```bash
./node_modules/.bin/tsx scripts/generate-wiki-index.ts
./node_modules/.bin/tsc --noEmit
```

如果 `tsx` 在沙箱中因 IPC pipe 报 `EPERM`，只对索引生成命令提升权限重跑。

## 反向编辑流程

1. 用户指定某个 JSON 想编辑时，运行 `json-to-md` 生成单个 MD。
2. 用户手工编辑 MD，并把 `wikiStatus` 改为 `待转换json`，或清空/删除。
3. 再运行 `md-to-json` 或 `scan-md` 写回 JSON。
4. 生成索引并检查类型。
