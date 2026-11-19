# 白羽 · Web 阅读空间

给自己和朋友使用的浏览器阅读空间：**收藏 → 阅读 → 划线 → 写想法 → 回顾**。

- 无广告、无账号、无推荐流
- 所有文章、划线、想法、阅读进度只保存在当前浏览器
- 手机与桌面各自有一套舒服的交互，而不是简单把页面缩小
- 没有服务端，打开即用

> 界面语言与信息结构致敬新枝 App（杭州新枝科技有限公司）。本项目不是官方版本，示例文章与订阅源均为本地演示内容。

---

## 运行

```bash
npm install
npm run dev
```

打开终端里显示的地址即可。本应用配置了 `base: /apps/xinzhi-reader/`，开发与预览地址都是 `http://localhost:5173/apps/xinzhi-reader/`。手机与电脑在同一局域网时，可以直接访问 `Network` 那一行的地址（例如 `http://192.168.x.x:5173/apps/xinzhi-reader/`）。

类型检查与生产构建：

```bash
npm run typecheck   # 当前 npm test 也等价于类型检查
npm run build
npm run preview
```

> 使用 History 路由。若部署到纯静态托管，需要把未知路径重写至 `index.html`。Nginx 示例见 [deploy/nginx.conf.example](./deploy/nginx.conf.example)。

## 已经实现

### 阅读流

- 阅读流首页：今日日期、暂存箱 / 已归档 / 批注 / 订阅概览
- 继续阅读、随手翻阅、按标签筛选
- 桌面端侧栏 + 右侧「今日回顾 / 最近十四天」；移动端底部标签栏 + 悬浮收集按钮

### 沉浸阅读器

- 纸感 / 纯白 / 夜间三种纸色
- 宋体 / 黑体、字号 15–26px、三档行距、三档版心
- 滚动进度保存与恢复、顶部进度线、剩余时间
- 目录、自动隐藏工具栏、阅读中的段落朗读（Web Speech API）
- 文章结尾归档与返回
- 选中文字后的浮条：四色划线、复制、写想法、生成摘录图片

### 划线、想法与回顾

- 划线锚点保存在段落级文本偏移上，刷新后仍然准确
- 边注式「想法」直接出现在原文对应段落下方，点开即可修改
- 批注页支持「全部 / 有想法 / 纯划线」和按颜色筛选
- 每日回顾：纸卡、笔记、原文跳转、左右滑动 / 键盘翻页
- 高亮被点击后可直接换色、写想法、删除

### 收集与整理

- 文字摘录：粘贴文本，支持标题、引用、列表（Markdown）
- 链接收藏：保存 URL 与备注（Web 版不抓取外部正文）
- **本地文件导入**：`.txt` / `.md` / `.html` / `.pdf` / `.epub`，支持多文件与拖拽
- 标签、订阅、已归档
- 全局搜索（文章正文、划线、想法）
- 数据导出 / 导入备份、合并导入、恢复示例内容

### 本地优先

- `localStorage` 持久化，无网络请求、无广告脚本
- 导出为 JSON，换设备时可手动迁移
- 设置里可完全恢复为初始示例内容

## 快捷键

| 快捷键 | 操作 |
| --- | --- |
| `⌘ K` / `Ctrl K` / `/` | 搜索 |
| `N` | 收集 |
| `Esc` | 关闭浮层 / 返回 |
| `⌘ ↵` | 保存想法 / 放进暂存箱 |
| `←` `→` | 回顾页翻卡 |

## 技术

- React 19 + TypeScript + Vite
- Zustand（持久化到 localStorage）
- 手写 CSS 设计系统：纸色、发丝线、宋体展示字、极弱纸纹
- 无 UI 框架、无图表库、无追踪脚本

主要目录：

```
src/
  components/       应用外壳、浮层、阅读器控件
  data/seed.ts      本地示例文章 / 订阅 / 批注
  lib/              存储、选择器、文本解析、文件导入、摘录卡片
  pages/            阅读流、订阅、标签、批注、回顾、阅读器
  styles/global.css 设计系统与响应式样式
```

## 数据来源（三种方式）

### 1. 手动收集

「收集 → 文字摘录」直接粘贴文本或 Markdown；「收藏链接」保存 URL + 备注。全部本地处理。

### 2. 本地文件导入（纯前端，部署后即可用）

「收集 → 本地文件」支持拖拽或多选：

| 格式 | 还原效果 |
| --- | --- |
| `.epub` | 最好。按章节/段落/列表结构化还原，取书名与作者 |
| `.md` | 好。标题、引用、列表；首行标题可自动作为文章标题 |
| `.html` | 好。按 p/h1-6/blockquote/li 结构提取 |
| `.txt` | 中等。按空行 + 缩进 + 短行启发式合并段落；自动识别 GBK 编码 |
| `.pdf` | 尽力还原。pdf.js 提取文字后重排段落；扫描件会明确提示无法提取 |

实现：`src/lib/importers.ts`。pdf.js 与 JSZip 都是**按需加载**（只在导入对应格式时才下载），CJK CMap 已放在 `public/pdfjs/cmaps/` 以支持无内嵌字体的中文 PDF。单篇上限约 60 万字（localStorage 容量所限）。

### 3. 让 agent 抓网页 → 合并导入 JSON

设置 → 数据 → **合并导入文章**。给 agent 的格式（只需要 title，其余可选）：

```json
{
  "articles": [
    {
      "title": "文章标题",
      "author": "作者",
      "source": "来源名",
      "url": "https://example.com/post",
      "tags": ["阅读"],
      "text": "正文纯文本或 Markdown，会自动分块"
    }
  ]
}
```

- `text` 会走 Markdown 分块；也可以直接给 `blocks`（结构见 `src/types.ts`）。
- 合并导入只追加、不覆盖现有数据；`id` 冲突会自动重新生成。
- 这是不加后端时「让 AI 帮你搬内容」的通道：让 agent 抓取网页正文，按此格式产出 JSON，导入即读。

### 关于「直接抓网页正文」

浏览器端受 CORS 限制，无法可靠抓取任意网站。要在部署的服务器上直接贴 URL 收藏，需要加一个小后端（见「路线图」）。

## 部署后能不能直接用？

| 功能 | 纯静态部署 |
| --- | --- |
| 阅读、划线、想法、回顾、搜索、朗读、摘录卡片 | ✅ |
| 文字 / 链接收集、本地文件导入（txt/md/html/pdf/epub） | ✅ |
| 合并导入 JSON（agent 搬运） | ✅ |
| 贴 URL 自动抓正文、真实 RSS 订阅、多端同步 | ❌ 需要后端 |

## 已知边界

- 订阅内容是本地示例，不连接 RSS / Newsletter 服务。
- 收藏链接不会抓取正文（需要后端，见路线图）。
- 朗读使用浏览器内置的 `speechSynthesis`，可用音色取决于系统。
- 数据存在浏览器里（按域名隔离），清理站点数据会丢失；请定期导出备份。
- PDF 段落还原是启发式的，复杂版式（多栏、表格）可能错位；长书建议 EPUB。

## 开发须知（别踩的坑）

- **划线锚点**：`Highlight.blockId + start/end` 基于 `block.text` 的纯文本偏移。文章创建后不要重排或重新生成 block id，否则已有划线会错位。
- **选区浮条调度**：`ReaderPage` 用 `pickSelectionRef + schedulePickSelection` 稳定调度（React onPointerUp/onTouchEnd + document selectionchange 兜底）。不要改回「在依赖 pickSelection 的 useEffect 里挂监听并在 cleanup 里 clearTimeout」的写法——阅读进度写入会让 effect 重建，从而吞掉选区检测。
- **阅读器滚动恢复**：恢复进度后要把 `lastScrollY.current` 设为当前 scrollTop，否则一打开就触发工具栏自动隐藏。
- **Zustand selector**：派生数组一律走 `src/lib/selectors.ts` 的 useMemo hooks，不要在组件里直接 `useStore(s => s.articles.filter(...))`。
- **主题预读脚本**：`index.html` 里有段内联脚本直接读 `localStorage['xinzhi.web.v1']` 防主题闪烁；改存储结构时要同步改它。
- **pdf.js worker**：`public/pdfjs/pdf.worker.min.mjs` 是模块 worker，Nginx 需要给 `.mjs` 正确的 JS MIME（示例配置已包含）。
- **存储上限**：localStorage 约 5MB，导入器限制了 60 万字；不要往里存 base64 图片。
- **路由**：History 模式，静态托管必须把未知路径回退到 `index.html`。

## 路线图（需要后端的部分）

1. **网页正文抓取**：`POST /api/parse { url }` → Readability 提取 → 转成 `Block[]` 返回。必须做 SSRF 防护（禁私网/回环/云元数据地址、限制重定向、超时与大小限制）、HTML sanitize。前端收集链接时可先降级为书签。
2. **真实 RSS**：Feed 增加 `url` / `lastFetchedAt`，服务端定时拉取写入文章。
3. **多端同步**：文章不可变 + highlight 用 UUID + note last-write-wins + 软删除；localStorage 继续作为离线缓存，保留 JSON 导出。
4. **浏览器扩展 / PWA Share Target**：一键收藏当前页面。

## 数据说明

- 存储键：`xinzhi.web.v1`
- 设置 → 数据 → 导出备份，可得到包含全部文章和批注的 JSON
- 设置 → 恢复示例内容，会清空当前数据并重新种入示例内容

## 数据说明

- 存储键：`xinzhi.web.v1`
- 设置 → 数据 → 导出备份，可得到包含全部文章和批注的 JSON
- 设置 → 恢复示例内容，会清空当前数据并重新种入示例内容
