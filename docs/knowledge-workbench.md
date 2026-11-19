# 世界观知识库

维护入口在 `/workbench/knowledge`，也可从已登录的工作台打开。空库提供可随时重开的四步引导。世界观、文章与关系由维护者创建。文章编辑使用 Markdown，「阅读」直接渲染当前编辑内容。

## 日常维护

- 世界观中的文章、关系、检索索引和 Agent 凭据存入该世界观的 SQLite。人物 Wiki 可按条目关联。要让 Agent 查到一段 Wiki 引文，先检查保密内容，将希望使用的片段和出处加入私人原稿。
- 「关系与索引」查看文章关系、切片数量和未关联文章。「检索」按当前世界观匹配标题、来源、章节和正文，并保留章节、来源与修订号。
- 「公开版」单独编辑公开标题、摘要和正文，预览后发布到 `/portfolio/:workId`。访客可直接阅读。修改原稿后，使用公开版重新发布需要公开的更新。
- 「导出世界观」下载当前世界观的文章和关系 JSON。导出包含私密正文，按机密资料保存。生产恢复使用下文的 SQLite 备份。

## Gateway 配置

启用知识库需要 Node.js 22.13 或更新版本，以及支持 FTS5 trigram 的 SQLite。使用与构建测试一致的 Node.js 22 补丁版本。在 Gateway 的服务器环境文件设置 `KNOWLEDGE_ROOT_DIR=/var/www/trpg-ai-gateway/shared/knowledge`。在本地联调使用独立临时目录。

目录归 Gateway 服务账户，目录权限建议 `0700`，发布归档、静态站目录和 Wiki 文件目录均使用各自路径。Gateway 启用后创建 `catalog.sqlite` 和 `worlds/`。完整备份覆盖目录数据库和所有世界观 SQLite，使用 SQLite 在线备份接口。整套恢复先停止写入，在隔离目录核对各库，再按运维流程切换。备份包含私密正文与凭据哈希，需要加密维护。部署顺序、上线记录和回滚规则见 [团队发布手册](release-workflow.md)。

## 外部 Agent 检索

本机工作区的 Agent 可直接在对话里按世界观查资料。用户指定世界观并提问，Agent 提取人名、地名或设定名，用以下命令检索，再根据片段回答并标出处。

```bash
node scripts/query-knowledge.mjs --worlds
node scripts/query-knowledge.mjs "白羽のcoc克苏鲁" "靛蓝"
```

本机命令默认读取 Gateway 的私有运行目录 `.local/knowledge-runtime/read-client.json`。远程 Agent 使用可达的 Gateway 地址和对应世界观的只读凭据，可通过 `KNOWLEDGE_READ_CONFIG` 指定自己的配置文件。配置用 `baseUrl` 记录服务基地址，`worlds` 用世界观名称关联 `id` 和 `token`。

如果这台机器重启，本机 Agent 可以在 Gateway 子仓库里使用 Node.js 22 执行 `node --env-file=.local/knowledge-runtime/gateway.env dist/server.js`。只做对话检索时，启动 Gateway 就可以查询原来的数据。

在世界观的「Agent 凭据」签发只读或读写凭据，用 `Authorization: Bearer <token>` 请求下列接口。签发后保存到外部执行环境，撤销后旧凭据失效。

| 方法与路径 | 用途 |
| --- | --- |
| `POST /api/knowledge/worlds/:worldId/search` | JSON 请求字段 `query` 与可选 `limit`。结果含 `documentId`、`chunkId`、`title`、`heading`、`excerpt`、`source` 和 `revision`。引用时用文章 ID 加修订号定位。 |
| `GET /api/knowledge/worlds/:worldId/documents/:id` | 读取该世界观下的一篇文章。 |
| `POST /api/knowledge/worlds/:worldId/documents` | 用读写凭据新增 Markdown 文章。 |
| `PUT /api/knowledge/worlds/:worldId/documents/:id` | 用读写凭据按当前 `revision` 更新。`409` 表示先读取最新版本，再合并后重试。 |

模型调用、文档抽取和 Embedding 在外部执行。首版提供 Markdown、SQLite 全文检索和手工关联。

## 从哪里读代码

前端是浏览器上的界面，后端是负责数据和权限的服务。这个项目的后端子仓库叫 `trpg-ai-gateway`，文档里常简称 Gateway。文件名和字段沿用英文，关键步骤在代码旁有中文注释。

| 想了解的问题 | 建议先读 |
| --- | --- |
| 登录之后怎样选择世界观、打开文章和开始检索？ | [知识库工作区](../src/pages/KnowledgeTab/index.tsx) |
| 为什么切到阅读还能保留正在写的字？公开正文怎么和原稿分开？ | [文章编辑器](../src/pages/KnowledgeTab/KnowledgeEditor.tsx) |
| 浏览器怎样把保存、检索和发布请求交给后端？ | [知识库请求封装](../src/features/knowledge/knowledge-client.ts) |
| 维护者、只读 Agent、可写 Agent 各能做什么？ | [知识库权限与接口](../trpg-ai-gateway/src/knowledge/knowledge-routes.ts) |
| 世界观文件怎么隔离？保存时怎样避免覆盖别人的修改？ | [知识库存储](../trpg-ai-gateway/src/knowledge/knowledge-store.ts) |
| 游客为什么可以直接读到发布的版本？ | [后端公开作品入口](../trpg-ai-gateway/src/server.ts)和[公开阅读页](../src/pages/PortfolioTab/index.tsx) |

以保存文章为例。编辑器把当前世界观、正文和读到的修订号一并交给后端。后端先核对权限，再打开该世界观的数据库。修订号仍一致时，正文和检索切片一起保存。收到 `409` 时，浏览器保留正在写的内容，供你检查服务器上的新版本。

| 代码里的词 | 中文意思 |
| --- | --- |
| `worldId`、`wikiId` | 世界观编号、人物 Wiki 条目编号。 |
| `saved`、`draft` | 已保存的原稿、浏览器里正在改的原稿。 |
| `revision`、`previousPublicationAt` | 原稿修订号、上次读到的公开版时间。保存与发布时用它们检查冲突。 |
| `publicDraft`、`publication` | 当前正在准备的公开稿、已经发布给游客看的版本。 |
| `chunk`、`excerpt` | 从正文切出的片段、某次搜索返回的片段原文。 |
| SQLite、FTS5、trigram | SQLite 是文件型数据库。FTS5 是它的全文搜索功能。trigram 用连续三个字符做索引，所以一两字人名单独查找。 |
| API、Token、Agent | API 是程序调用服务的入口。Token 是访问凭据。Agent 是在外部运行、可以调用这些入口的程序。 |
| RAG、Embedding | RAG 是先找资料，再把资料交给模型生成回答。Embedding 是把文字转成向量，供语义相似度搜索使用。当前知识库提供全文检索。 |
