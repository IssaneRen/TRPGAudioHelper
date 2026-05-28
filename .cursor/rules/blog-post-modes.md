## 博客文章的两种渲染模式（必须遵守）

本项目的博客文章（`public/blog/posts/*.md`）按 **frontmatter** 的 `renderMode` 分为两类。两类文章的“正文结构”和“允许写法”不同，禁止混用。

### 1) 普通文章（`renderMode: "markdown"`，默认）

- **渲染方式**：`react-markdown` 渲染 Markdown 文本。
- **适用场景**：教程/杂谈/推荐类文章等。
- **正文约束**：
  - 以 Markdown 为主（标题、段落、列表、引用、图片）。
  - **不要依赖 HTML 交互**（例如 `<details>`、复杂内联样式等），不同浏览器/渲染器表现不一致且可能被过滤。
  - 站内跳转请用 Markdown 链接（如 `/tools/soundboard`）。

### 2) 战报/词条型文章（`renderMode: "wiki"`）

- **渲染方式**：博客详情页 **不渲染 Markdown 正文**，而是 **内嵌 Wiki 词条渲染器**（复用 `/tools/world-wiki` 的 `WikiContentRenderer`）。
- **必须字段**：
  - `wikiEntryId`: string —— 绑定要展示的 Wiki 词条 id（对应 `public/wiki/entities/entries/{wikiEntryId}.json`）。
- **适用场景**：战报、跑团记录、需要二级隐藏/引用跳转/PL 权限的内容。
- **正文约束**：
  - Markdown 正文仅作为兜底说明文字，不保证展示；核心内容必须写入对应的 Wiki 词条 `content`。
  - 图片必须以 **public 绝对路径** 形式落盘并在 Wiki 的 `image` block 中引用（如 `/blog/images/...`、`/wiki/images/...`）。
  - **不要把战报绑定到模组介绍词条**。战报应绑定到独立的 `report` 词条。

### 2.1) 模组 与 战报 的关系（必须区分）

- **模组（`category: "module"`）**：
  - 表示模组本体、设定导读、背景阅读建议、相关地点/事件入口。
  - 是“可复用”的内容，不对应某一次具体游玩。
- **战报（`category: "report"`）**：
  - 表示某一次具体游戏的场次记录。
  - 关注“这次是谁跑的、发生了什么、留下了哪些跑后截图/花絮/隐藏内容”。
- **一对多关系**：
  - 一个模组可以有多条战报。
  - 战报应通过 `moduleIds` / `relatedEntryIds` 指回所属模组，而不是反过来把战报正文塞进模组词条里。

### 4) PL 输入与匹配规则（必须精确）

- **唯一 key 优先**：前台“设置 PL”输入框建议直接填 `pl.xxx`（例如 `pl.cici`）。
- **允许显示名/别名**：也可以填 `displayName` / `aliases`，但必须是**完全匹配**；不会做包含/模糊匹配。
- **自动收敛**：如果你输入的是显示名/别名，系统会自动保存为对应的 `pl.xxx`，避免后续改名导致失效。
- **可输入列表**：弹窗会列出当前 `public/wiki/entities/players.json` 里所有可用的 `pl.xxx`，点击即可自动填入。

### 4.1) 博客 frontmatter 的 players 字段规范（必须用唯一 key）

- `public/blog/posts/*.md` 的 frontmatter `players` 字段必须填写 **PL 唯一 key**（例如：`["pl.cici", "pl.leina"]`）。
- 禁止填写角色名或显示名（例如 `"Allen"`, `"阿甘"` 或 `"Cici"`），否则会导致“我跑过的”筛选与权限解锁在不同页面表现不一致。

### 3) 图片与内容复用原则

- **战报的图片与图文结构**：优先放进 Wiki 词条（`image` block + `secret-panel`），从而同时在：
  - Wiki 页面（`/tools/world-wiki/...`）
  - 博客内嵌页面（`renderMode: "wiki"`）
 里一致展示。

