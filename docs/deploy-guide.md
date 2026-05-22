# 腾讯云轻量服务器部署指南

> 适用于：React + Vite 静态 SPA + 未来可能的多端口服务

## 总体架构

```
浏览器 → 域名(HTTPS) → 腾讯云轻量服务器(Nginx)
                                    ├── :80/443  → TRPG Helper (静态SPA)
                                    ├── :3001    → 未来服务A
                                    └── :3002    → 未来服务B
```

---

## 第一步：购买域名（约 30-60 元/年）

### 推荐域名注册商
- **腾讯云域名注册**（和服务器同平台，方便管理）
- 地址：https://dnspod.cloud.tencent.com/

### 操作步骤
1. 登录腾讯云控制台 → 搜索"域名注册"
2. 搜索你想要的域名（建议 .com 或 .cn）
3. 购买并完成**域名实名认证**（需身份证正面照片，1-3个工作日）

### 域名
- issane.cn

---

## 第二步：购买轻量应用服务器

### 推荐配置
- **产品**：腾讯云轻量应用服务器
- **地址**：https://cloud.tencent.com/product/lighthouse
- **配置**：2核 2G 内存 / 40-60GB SSD / 300-500GB月流量
- **系统镜像**：Ubuntu 22.04 LTS（或应用镜像选 Nginx）
- **地域**：上海/广州/北京（离你近的）
- **费用**：新用户活动价约 30-50 元/月，非活动约 45-65 元/月

### 购买后获得
- 公网 IP 地址（如 `43.xxx.xxx.xxx`）
- SSH 登录密码或密钥

---

## 第三步：ICP 备案（7-20 个工作日）

### 必须备案的原因
国内服务器绑定域名必须完成工信部 ICP 备案，否则无法解析。

### 备案流程
1. 腾讯云控制台 → 搜索"备案" → 开始备案
2. 填写信息：
   - 主办单位：个人
   - 域名：你买的域名
   - 服务器：选择刚购买的轻量服务器
3. 上传材料：身份证正反面照片
4. 腾讯云初审（1-2 工作日）
5. 提交管局审核（5-15 工作日）
6. 收到备案号短信 → 完成

### 备案期间可以做什么
- 用 IP 直接访问服务器（不需要域名）
- 在服务器上配置好 Nginx 和项目
- 等备案通过后再绑定域名和 HTTPS

---

## 第四步：服务器初始化配置

### SSH 登录服务器

```bash
ssh root@你的公网IP
```

### 安装基础软件

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Nginx
apt install -y nginx

# 安装 certbot（HTTPS 证书）
apt install -y certbot python3-certbot-nginx

# 安装 Node.js（可选，如果后续要跑 Node 服务）
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 开启防火墙
ufw allow 80
ufw allow 443
ufw allow 22
ufw enable
```

### 创建网站目录

```bash
mkdir -p /var/www/trpg-helper
chown -R www-data:www-data /var/www/trpg-helper
```

---

## 第五步：Nginx 配置

### 主配置文件

```bash
nano /etc/nginx/sites-available/trpg-helper
```

写入：

```nginx
server {
    listen 80;
    server_name 你的域名.com;  # 备案前先用 _ 或 IP

    root /var/www/trpg-helper;
    index index.html;

    # SPA 路由 fallback（React Router history 模式必须）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/trpg-helper /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # 删除默认站点
nginx -t  # 测试配置
systemctl reload nginx
```

---

## 第六步：部署项目文件

### 方法 A：手动上传（简单）

本地构建后 scp 上传：

```bash
# 本地执行
pnpm build
scp -r dist/* root@你的公网IP:/var/www/trpg-helper/
```

### 方法 B：GitHub Actions 自动部署（推荐）

在项目根目录创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Server

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Deploy to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "dist/*"
          target: "/var/www/trpg-helper"
          strip_components: 1
```

GitHub 仓库 Settings → Secrets 中添加：
- `SERVER_HOST`：你的服务器 IP
- `SSH_PRIVATE_KEY`：服务器 SSH 私钥

---

## 第七步：配置 HTTPS（备案通过后）

### DNS 解析

1. 腾讯云控制台 → 搜索"DNS 解析"
2. 添加记录：
   - 主机记录：`@` 和 `www`
   - 记录类型：A
   - 记录值：你的服务器公网 IP

### 申请 SSL 证书

```bash
# 在服务器上执行
certbot --nginx -d 你的域名.com -d www.你的域名.com
```

certbot 会自动：
- 申请 Let's Encrypt 免费证书
- 修改 Nginx 配置添加 HTTPS
- 设置自动续期（证书 90 天有效，自动续期）

验证自动续期：

```bash
certbot renew --dry-run
```

---

## 第八步：未来多服务扩展

### 方式一：Nginx 反向代理不同子路径

```nginx
# /etc/nginx/sites-available/trpg-helper 中追加

# 未来的 API 服务
location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# 另一个 Web 服务
location /app2/ {
    proxy_pass http://127.0.0.1:3002/;
}
```

### 方式二：子域名分服务

```nginx
# /etc/nginx/sites-available/api-service
server {
    listen 80;
    server_name api.你的域名.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
    }
}
```

需要为子域名单独申请 certbot 证书：
```bash
certbot --nginx -d api.你的域名.com
```

---

## 费用总结

| 项目 | 费用 | 周期 |
|------|------|------|
| 轻量服务器 | 30-65 元/月 | 月付/年付 |
| 域名 | 30-60 元/年 | 年付 |
| SSL 证书 | 免费 | Let's Encrypt |
| ICP 备案 | 免费 | 一次性 |
| **总计** | **约 50-80 元/月** | — |

---

## 常用运维命令

```bash
# 查看 Nginx 状态
systemctl status nginx

# 重启 Nginx
systemctl reload nginx

# 查看 Nginx 错误日志
tail -f /var/log/nginx/error.log

# 查看访问日志
tail -f /var/log/nginx/access.log

# 检查证书到期时间
certbot certificates

# 手动更新项目
cd /var/www/trpg-helper && rm -rf * && scp -r local:dist/* .
```

---

## 时间线估计

| 步骤 | 耗时 |
|------|------|
| 购买域名 + 实名认证 | 1-3 天 |
| 购买服务器 + 初始化 | 30 分钟 |
| 提交 ICP 备案 | 7-20 工作日 |
| 配置 Nginx + 部署项目 | 1 小时 |
| 备案通过后绑定域名 + HTTPS | 30 分钟 |
| **总计** | **约 2-3 周**（主要等备案） |

备案期间服务器已经可以用 IP 直接访问，不影响开发和测试。
