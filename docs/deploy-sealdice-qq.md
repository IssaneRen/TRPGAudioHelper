# 海豹骰 QQ 服务同机部署手册

## 当前服务器服务与端口

| 服务 | 域名 | 端口/路径 | 说明 |
| --- | --- | --- | --- |
| Nginx | `issane.cn`、`www.issane.cn`、`ai.issane.cn` | `80`、`443` | 统一公网入口 |
| TRPG Helper 主站 | `issane.cn`、`www.issane.cn` | `/var/www/trpg-helper/current` | 静态站，无独立应用端口；由 GitHub Actions 管理 |
| AI Gateway | `ai.issane.cn` | `127.0.0.1:3001` | 已占用 |
| 预留服务位 | - | `3002` | 旧部署文档中的预留端口 |
| Vite 本地开发 | - | `8291` | 仅本地开发使用 |

本次新增服务规划：

| 服务 | 值 |
| --- | --- |
| 海豹 WebUI 域名 | `dice.issane.cn` |
| 海豹 WebUI 本机端口 | `127.0.0.1:13211 -> 3211` |
| NapCat WebUI 本机端口 | `127.0.0.1:16099 -> 6099` |
| 海豹连接 NapCat | `ws://napcat:1234` |
| 部署目录 | `/opt/sealdice-dice` |
| Nginx 配置 | `/etc/nginx/sites-available/sealdice-dice` |
| Nginx 日志 | `/var/log/nginx/sealdice-dice.access.log`、`/var/log/nginx/sealdice-dice.error.log` |

原则：不要占用 `80/443/3001/3002/8291`；NapCat 管理页不公网暴露，只通过 SSH/Termius 隧道访问。

官方参考：

- https://docs.sealdice.com/deploy/quick-start.html
- https://docs.sealdice.com/deploy/platform-qq.html
- https://docs.sealdice.com/deploy/platform-qq-docker.html

实际部署排障记录：[deploy-sealdice-qq-session-notes-2026-06-21.md](deploy-sealdice-qq-session-notes-2026-06-21.md)

---

## 操作手册

### 1. 解析域名并检查环境

在 DNSPod / 腾讯云 DNS 新增：

```text
dice.issane.cn A 你的服务器公网 IP
```

服务器执行：

```bash
dig +short dice.issane.cn
sudo ss -tulpen | grep -E ':(80|443|3001|3002|3211|6099|8291|13211|16099)\b' || true
docker --version
docker compose version
```

如果没有 Docker Compose：

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
sudo rm -f /etc/apt/sources.list.d/docker.list /etc/apt/sources.list.d/docker.sources
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
docker --version
docker compose version
```

### 2. 创建海豹 + NapCat Compose

```bash
sudo mkdir -p /opt/sealdice-dice
sudo chown "$USER:$USER" /opt/sealdice-dice
cd /opt/sealdice-dice
nano .env
```

`.env` 内容，替换 QQ 号：

```dotenv
ACCOUNT=123456789
NAPCAT_UID=1000
NAPCAT_GID=1000
```

创建 Compose：

```bash
nano docker-compose.yml
```

```yaml
name: sealdice-dice

services:
  sealdice:
    image: ghcr.io/sealdice/sealdice:edge
    container_name: sealdice-dice
    ports:
      - "127.0.0.1:13211:3211"
    volumes:
      - "./data:/data"
      - "./backups:/backups"
    networks:
      - sealdice_dice
    depends_on:
      - napcat
    restart: unless-stopped

  napcat:
    image: mlikiowa/napcat-docker:latest
    container_name: napcat-dice
    ports:
      - "127.0.0.1:16099:6099"
    volumes:
      - "./napcat/config:/app/napcat/config"
      - "./napcat/QQ_DATA:/app/.config/QQ"
      - "./data:/data"
      - "./backups:/backups"
    environment:
      - NAPCAT_UID=${NAPCAT_UID:-1000}
      - NAPCAT_GID=${NAPCAT_GID:-1000}
      - MODE=sealdice
      - ACCOUNT=${ACCOUNT}
    networks:
      - sealdice_dice
    mac_address: "02:42:ac:21:00:01"
    restart: unless-stopped

networks:
  sealdice_dice:
    driver: bridge
```

### 3. 启动并确认容器

```bash
cd /opt/sealdice-dice
docker compose up -d
docker compose ps
docker compose logs --tail=80 sealdice
docker compose logs --tail=80 napcat
curl -I http://127.0.0.1:13211
```

如果 `mlikiowa/napcat-docker:latest` 拉取超时，先配置 Docker Hub 镜像加速：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.m.daocloud.io"
  ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
sudo docker compose pull
sudo docker compose up -d
```

如果 `ghcr.io/sealdice/sealdice:edge` 拉取卡住，先等待或重试官方源：

```bash
cd /opt/sealdice-dice
sudo docker pull ghcr.io/sealdice/sealdice:edge
```

如果官方源长期不可用，可以临时使用可信度自行判断的第三方 GHCR 镜像代理；替换前先备份 `docker-compose.yml`。

### 4. 登录 NapCat QQ

用本地电脑开 SSH 隧道：

```bash
ssh -L 16099:127.0.0.1:16099 ubuntu@服务器公网IP
```

Termius 则配置 Local Port Forwarding：

```text
Local port: 16099
Destination host: 127.0.0.1
Destination port: 16099
```

本地浏览器打开：

```text
http://127.0.0.1:16099
```

登录页提示 `token invalid` 时，查看 NapCat 启动日志里的登录密钥：

```bash
cd /opt/sealdice-dice
sudo docker compose logs --tail=200 napcat
```

复制日志中显示的 token / 登录密钥，填入 NapCat WebUI 后扫码登录 QQ。

### 5. 配置 Nginx 与 HTTPS

```bash
sudo nano /etc/nginx/sites-available/sealdice-dice
```

先写 HTTP 反代：

```nginx
server {
    listen 80;
    server_name dice.issane.cn;

    access_log /var/log/nginx/sealdice-dice.access.log;
    error_log /var/log/nginx/sealdice-dice.error.log;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
    }

    location / {
        proxy_pass http://127.0.0.1:13211;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用：

```bash
sudo ln -sfn /etc/nginx/sites-available/sealdice-dice /etc/nginx/sites-enabled/sealdice-dice
sudo nginx -t
sudo systemctl reload nginx
```

签发 HTTPS：

```bash
sudo certbot --nginx -d dice.issane.cn
```

确认：

```bash
curl -I https://dice.issane.cn
sudo tail -n 50 /var/log/nginx/sealdice-dice.error.log
```

### 6. 在海豹里连接 QQ

打开：

```text
https://dice.issane.cn
```

先设置 WebUI 密码和 Master，然后：

```text
账号设置 -> 新增账号
账号类型：QQ(onebot11正向WS)
QQ 号：.env 里的 ACCOUNT
连接地址：ws://napcat:1234
```

注意：这里必须填 `ws://napcat:1234`，不要填 `127.0.0.1`。

### 7. 常用维护命令

```bash
cd /opt/sealdice-dice
docker compose ps
docker compose logs --tail=120 sealdice
docker compose logs --tail=120 napcat
docker compose restart
```

更新：

```bash
cd /opt/sealdice-dice
docker compose pull
docker compose up -d
```

备份：

```bash
cd /opt/sealdice-dice
tar -czf "$HOME/sealdice-dice-backup-$(date +%F-%H%M%S).tar.gz" data backups napcat .env docker-compose.yml
```

验收：

```bash
docker compose ps
curl -I http://127.0.0.1:13211
curl -I https://dice.issane.cn
sudo ss -tulpen | grep -E ':(13211|16099)\b'
```

`13211` 和 `16099` 应只监听在 `127.0.0.1`，不应监听在 `0.0.0.0`。
