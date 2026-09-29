# 隐藏工作台

- 地址：`https://issane.cn/workbench`。主站不提供入口；进入后需要现有 KP Token。
- 计划：标题、日期、状态和备注。
- AI 学习：厂商、模型、适用工作、工作流、学习记录和状态。可添加 HyperFrames 学习模板。
- 作品：AI 漫剧、跑团 Log、AI 生图、AI 小说、自写小说和 HTML。草稿只允许 KP 读取；发布后在 `/portfolio/<id>` 公开。作品正文支持 Markdown；HTML 使用无同源权限的沙箱 iframe 预览。
- 导入导出：工作台 v1 JSON 包含以上全部数据。导入替换整份工作台数据；先导出备份。下载文件是明文。

## HTML 直接发布

在作品编辑器选择「HTML 作品」，粘贴完整 HTML，预览，保存草稿；需要公开时改为「发布」并保存。发布通过 gateway 运行时数据生效，不需要重新部署静态站点。HTML 内需要的图片可引用已上传的 `/content-assets/...` URL。

[HyperFrames](https://github.com/heygen-com/hyperframes) 使用 HTML、CSS、媒体和可 seek 的动画制作视频。其 lint、preview、render 生成 MP4 的流程与本站 HTML 页面发布分开：工作台保存和展示 HTML，不在服务器上运行 HyperFrames 渲染命令。

## 存储与安全

- Gateway `GET/PUT /api/admin/workbench` 使用现有 KP Token 鉴权；写入请求限制 2 MiB。
- 计划、学习记录和全部作品保存在 `WORKBENCH_ROOT_DIR/workbench.v1.enc.json`，使用 AES-256-GCM；密钥通过 HKDF 从服务器现有 `TOKEN_HASH_PEPPER` 派生。更换该 pepper 前须导出工作台，旧密钥丢失后无法解密。
- 公共 `GET /api/portfolio` 和 `GET /api/portfolio/:id` 只返回已发布作品；列表不返回正文。草稿不会进入静态站点构建包。
- 封面图片沿用现有内容后台上传，图片 URL 本身是公开资源；不要上传尚需保密的图片。Token 鉴权与数据加密是两层不同保护。
- 部署时 `WORKBENCH_ROOT_DIR` 指向 gateway `shared/workbench`，不放在 release 内；目录与加密文件应由服务账号持有。备份该目录时也应保留 `TOKEN_HASH_PEPPER` 的恢复能力。
