# 隐藏工作台

- 地址：`https://issane.cn/workbench`。主站不提供入口；进入后需要现有 KP Token。
- 今日总览：真实记录统计、快速记任务、按截止日期与进行状态排序的下一步、最近作品和精选工作流。首次进入不写入虚构记录。
- 计划看板：待开始 / 进行中 / 已完成三列，支持搜索、今天 / 本周剩余 / 逾期筛选与直接切换状态。
- 学习笔记：厂商、模型、适用工作、工作流与提示词。支持追加带日期的实践记录、标记掌握和创建实践作品草稿。
- 工作流模板：跑团纪实、6 镜 AI 漫剧、生图配方、短篇写作、HTML 互动信件、HyperFrames 视频。每份包含四个步骤、提示词、参考链接和作品骨架；可一键加入学习笔记与四步计划，或只创建作品草稿。AI 提示词需在用户自己的工具中执行。
- 作品：AI 漫剧、跑团 Log、AI 生图、AI 小说、自写小说和 HTML。草稿只允许 KP 读取；发布后在 `/portfolio/<id>` 公开。作品正文支持 Markdown；HTML 使用无同源权限的沙箱 iframe 预览。
- 导入导出：工作台 v1 JSON 包含以上全部数据。导入替换整份工作台数据；先导出备份。下载文件是明文。
- 图片可用 Markdown 的 `![说明](图片URL)` 展示；MP4/WebM/Ogg 视频可用 `[视频标题](视频URL)` 直接播放。站内上传图片属于现有内容系统，请同时从 `/admin/content` 导出 ZIP；完整迁移时先导入内容 ZIP，再导入工作台 JSON。外部媒体 URL 的远端文件需自行备份。

## 编辑与保存

编辑器内的修改点击「保存到工作台」后提交；快速记任务、改状态、启动模板直接更新工作台。更新后自动串行同步服务器，右上角区分等待保存 / 保存中 / 已保存 / 同步失败。保存期间继续编辑会进入下一次保存，不会被旧响应覆盖。同步失败保留页面数据，可重试或先导出备份。关闭含未提交编辑的抽屉会提示；关闭含未同步数据的页面也会提示。

作品须在编辑器选择「公开发布」并点击「保存并公开发布」才会公开；原有公开作品也在明确保存后更新。学习记录转为作品时只创建正文骨架，不把私人实践笔记带入公开正文。

## 设计参考与验证

- [小红书](https://www.xiaohongshu.com/explore)：实看网页版的固定导航、分类标签、封面卡片，借鉴到工作流模板和创作空间；未复制笔记或用户素材。
- [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)：借鉴按状态组织、筛选视图与模板启动。
- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)：2026-09-29 GitHub API 查询为 131,385 Star；读取 skill 并执行 design-system 与 React 栈检索。采用轻量交互、状态可读性、焦点与响应式规范；不采用与工作台不符的营销落地页建议。
- 同时应用 frontend-design skill。深绿侧栏、暖白工作区、分类型封面，不增加 UI 运行时依赖。
- 逻辑回归：`pnpm exec tsx scripts/verification/workbench.verify.ts`。覆盖日期边界、下一步排序、六个模板实例化、重复 ID 与非法备份。

## HTML 直接发布

在作品编辑器选择「HTML 作品」，粘贴完整 HTML，预览，保存草稿；需要公开时改为「发布」并保存。发布通过 gateway 运行时数据生效，不需要重新部署静态站点。HTML 内需要的图片可引用已上传的 `/content-assets/...` URL。

[HyperFrames](https://github.com/heygen-com/hyperframes) 使用 HTML、CSS、媒体和可 seek 的动画制作视频。其 lint、preview、render 生成 MP4 的流程与本站 HTML 页面发布分开：工作台保存和展示 HTML，不在服务器上运行 HyperFrames 渲染命令。

## 存储与安全

- Gateway `GET/PUT /api/admin/workbench` 使用现有 KP Token 鉴权；写入请求限制 2 MiB。
- 计划、学习记录和全部作品保存在 `WORKBENCH_ROOT_DIR/workbench.v1.enc.json`，使用 AES-256-GCM；密钥通过 HKDF 从服务器现有 `TOKEN_HASH_PEPPER` 派生。更换该 pepper 前须导出工作台，旧密钥丢失后无法解密。
- 公共 `GET /api/portfolio` 和 `GET /api/portfolio/:id` 只返回已发布作品；列表不返回正文。草稿不会进入静态站点构建包。
- 封面图片沿用现有内容后台上传，图片 URL 本身是公开资源；不要上传尚需保密的图片。Token 鉴权与数据加密是两层不同保护。
- 部署时 `WORKBENCH_ROOT_DIR` 指向 gateway `shared/workbench`，不放在 release 内；目录与加密文件应由服务账号持有。备份该目录时也应保留 `TOKEN_HASH_PEPPER` 的恢复能力。
