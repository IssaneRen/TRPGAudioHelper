# apps/xinzhi-reader · 阅读·书

给自己和朋友使用的个人 Web 阅读空间：收藏、沉浸阅读、划线批注、每日回顾。
私人文件仍只存本机。服务器书库位于 Gateway 私有数据目录，手机和电脑使用 KP 凭据登录后可读；两类书共用阅读器，划线、进度、归档仍按设备保存。

## 对话式上架（维护者）

1. 在仓库外下载有公开再发布权的完整原文件，在本地确认章节完整、可正常导入；记录授权依据。链接必须是普通访问者可打开的原文件地址，不得使用临时签名、带凭据的链接、购买页或介绍页。只有链接没有正文时，跳过。不同语言分开审核。
2. 在仓库根运行 `node scripts/reader-book.mjs review 文件 原文件HTTPS链接 "书名（语言）"`。只读本地文件，不下载、不入库。向用户逐本展示原链接、实际大小（KB/MB）、SHA-256、来源与使用依据，并说明仅 KP 可读。等用户逐本确认，不以要求搜索或实现功能代替批准。
3. 只对已批准项运行 `node scripts/reader-book.mjs stage 文件 原文件HTTPS链接 "书名（语言）" 审核码`。文件、链接或书名改变均须重审。该命令只写本地书库，不上传。支持 TXT、MD、XHTML、PDF、EPUB，沿用本地解析上限；纯文本和 XHTML 使用 UTF-8。先验证实际正文和目录再发布。
4. 只把批准的目录经授权的 SSH 通道传至 Gateway 的私有 WORKBENCH_ROOT_DIR/reader-books/ 下；先用临时目录传完并校验，再重命名为 SHA-256。不要提交书目或正文进 Git，不要放入主站目录。无需因上下架而重新发布代码。锁定或刷新后须经身份校验才能再读取书目与正文；删除本机收藏不会删除服务器文件。

- 正式地址：<https://www.issane.cn/apps/xinzhi-reader/>
- 应用目录：<https://issane.cn/apps/>，入口和新增应用见[网页应用维护](README.md)。
- 源码位置：`apps/xinzhi-reader/`（**唯一开发位置**，独立 npm 项目，不进 pnpm workspace）
- 历史来源：`lucius_vibe_coding/lucius_reading`（已迁入本仓库，原目录仅作参考，勿再双向修改）

## 本地开发

```bash
cd apps/xinzhi-reader
npm ci
npm run dev        # http://localhost:5173/apps/xinzhi-reader/（已配置 base）
npm run typecheck  # npm test 等价
npm run build      # 产物在 apps/xinzhi-reader/dist/
npm run preview    # http://localhost:4173/apps/xinzhi-reader/
```

## 构建与部署

子应用通过 `scripts/build-apps.mjs` 挂进根构建：

- 根 `pnpm build` = 主站构建 + `node scripts/build-apps.mjs`
  （对每个 `apps/*/` 执行 `npm ci && npm run build`，并把产物复制到根 `dist/apps/<name>/`）
- 全量发布与静态覆盖发布都携带 `dist/apps/`，主站再发布会一并更新 `/apps/xinzhi-reader/`。

Nginx 路由（SPA fallback，位于 `.github/workflows/deploy.yml` 两份配置 heredoc 中）：

```nginx
location ~ ^/apps/(?<app_name>[^/?]+) {
    try_files $uri $uri/ /apps/$app_name/index.html;
}
```

deploy.yml 每次部署都会重新生成整份 Nginx 配置，此块已纳入版本管理；
**不要只在服务器上手改**，下次全量部署会被覆盖——要改就改 deploy.yml。

## 发布流程

按[网页应用维护](README.md)的发布流程执行。目录和阅读器可在同一次静态覆盖发布中上线。

## 确认线上版本

```bash
curl -s https://www.issane.cn/apps/xinzhi-reader/ | grep app-version
# <meta name="app-version" content="<GITHUB_SHA>"> 与推送的 commit SHA 一致即为本版
```

应用内「设置 → 关于」也会显示构建 SHA 前 7 位。

## 回滚

- 只回退阅读器时，在 Git 里回退相应改动，保留同版本中无关的主站改动，再按静态覆盖流程发布。
- 整站紧急回滚可由获授权的服务器维护者将 `current` 切回已验证的历史 release。先核对同版本中的主站及其他应用改动。

## 服务器目录

| 路径 | 内容 |
| --- | --- |
| `/var/www/trpg-helper/current/apps/xinzhi-reader/` | 当前线上版本的应用产物 |
| `/var/www/trpg-helper/releases/<SHA>/apps/xinzhi-reader/` | 历史版本（保留最近若干个） |

## 数据与备份

- 所有收藏、划线、想法、设置存于**浏览器 localStorage**（键 `xinzhi.web.v2`），按域名隔离。应用不内置演示内容，首次打开为空书架。
- 数据不跨设备同步，也不上传服务器；换设备用「设置 → 数据 → 导出/导入备份」（JSON）。
- 应用内「合并导入文章」支持 agent 产出的 JSON 批量追加，格式见 `apps/xinzhi-reader/README.md`。

## 已知边界

- 无后端：收藏链接不抓取网页正文；真实 RSS / 多端同步需要新增 API（设计见应用 README 路线图）。
- localStorage 容量约 5MB，单篇导入上限约 60 万字。
- 朗读（Web Speech）与剪贴板 API 需要安全上下文，HTTPS 下正常。
