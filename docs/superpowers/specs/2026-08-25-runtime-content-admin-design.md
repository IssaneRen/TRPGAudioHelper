# 运行时内容后台设计

## 目标

在主站新增 `/admin/content`，复用现有 KP Token 登录；管理员可编辑博客 Markdown、完整 Wiki JSON、上传图片、导入/导出 ZIP。内容更新不再依赖 Git push。

## 架构

- 前端：React 管理页，登录前显示全屏遮罩；仅 `isKeeper=true` 可进入。
- API：扩展 `trpg-ai-gateway`，所有 `/api/admin/content/**` 接口强制 KP 鉴权。
- 内容：`/var/www/trpg-content/{blog,wiki,backups}`；图片写入 `/home/ubuntu/public_files/gate/trpg-content`。
- 发布：Nginx 将 `/blog/`、`/wiki/`、`/content-assets/` 映射到运行时目录；`/blog` 页面路由仍返回 SPA。
- 回退：保留 Git release 和原静态内容；服务器脚本可在 `runtime` 与 `release` 两种来源间切换。

## 内容能力

- 博客：编辑 id、标题、标签、封面、PL、渲染模式、关联 Wiki、时间与 Markdown 正文；保存后重建 `blog/index.json`。
- Wiki：编辑全部元数据与 `content`；支持 heading、paragraph、list、quote、image、secret-panel、coc-sheet，以及 text、ref、secret-inline；支持 `mask` / `collapse`。
- 右侧固定显示格式说明、示例 JSON 和实时预览。
- 图片：限制图片 MIME、扩展名和大小，生成安全文件名，返回 `/content-assets/...` URL。

## ZIP 格式

根目录包含 `manifest.json`、`blog/`、`wiki/`、`uploads/`。`manifest.json` 固定 `formatVersion: 1`。导入时拒绝路径穿越、符号链接、未知根目录、超限文件和无效 JSON；先解压到临时目录并完整校验，再备份当前内容并替换。

## 数据安全与回退

- 保存采用临时文件 + rename，并在改写前生成快照。
- 导入自动生成 ZIP 备份；失败不切换内容。
- 迁移只复制当前线上博客/Wiki，不删除 Git 内容或已有 release。
- Nginx 修改前备份，必须 `nginx -t` 成功才 reload。

## 验收

1. 非 KP 无法进入后台或调用内容 API。
2. 博客/Wiki 保存后无需 Git push 即可在主站读取。
3. 全部 Wiki block/token 与遮罩模式可编辑、预览。
4. 图片写入指定公共目录并可由 HTTPS 主站引用。
5. ZIP 可导出、导入并恢复同一批内容。
6. 一条命令可切回 Git release，现有服务健康。
