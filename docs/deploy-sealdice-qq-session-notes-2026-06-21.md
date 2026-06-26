# 海豹骰 QQ 部署现场记录（2026-06-21）

本文记录本次在腾讯云 Ubuntu 服务器部署海豹骰 + NapCat 时的实际问题与处理结果。主操作手册见 [deploy-sealdice-qq.md](deploy-sealdice-qq.md)。

## 目标

- 在同一台服务器上新增海豹骰 QQ 服务。
- 不影响现有 `issane.cn`、`www.issane.cn`、`ai.issane.cn`。
- 使用 Docker Compose 管理海豹与 NapCat。
- 海豹 WebUI 通过 `dice.issane.cn` 暴露。
- NapCat WebUI 不公网暴露，只通过 Termius/SSH 本地端口转发访问。

## 最终端口与连接

| 项目 | 值 |
| --- | --- |
| 部署目录 | `/opt/sealdice-dice` |
| 海豹 WebUI | `127.0.0.1:13211 -> 3211` |
| NapCat WebUI | `127.0.0.1:16099 -> 6099` |
| 海豹访问地址 | `https://dice.issane.cn` |
| NapCat 本地访问 | `http://127.0.0.1:16099`，通过 Termius Local Port Forwarding |
| 海豹连接 NapCat | `ws://napcat:1234` |

## 遇到的问题

### 1. 服务器没有 Docker

现象：

```text
Command 'docker' not found
curl: (7) Failed to connect to 127.0.0.1 port 13211
```

判断：容器还没有启动，`13211` 没有服务监听。根因是服务器未安装 Docker。

处理：安装 Docker 官方源与 Compose 插件。

### 2. 默认 apt 源没有 `docker-compose-plugin`

现象：

```text
E: Unable to locate package docker-compose-plugin
```

判断：Ubuntu 默认源没有 Docker Compose v2 插件包，需要添加 Docker 官方 APT 源。

处理：添加 Docker 官方 GPG key 与 apt source 后安装：

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 3. Docker 官方源 GPG key 没识别

现象：

```text
NO_PUBKEY 7EA0A9C3F273FCD8
The repository 'https://download.docker.com/linux/ubuntu jammy InRelease' is not signed.
```

判断：APT 源已经写入，但 key 文件格式或引用方式不对。

处理：删除旧的 Docker source/key，重新用 `gpg --dearmor` 写入 `/etc/apt/keyrings/docker.gpg`，再重新 `apt update`。

### 4. NapCat 镜像拉取超时

现象：

```text
failed to resolve reference "docker.io/mlikiowa/napcat-docker:latest"
i/o timeout
```

判断：服务器访问 Docker Hub 不稳定。

处理：配置 Docker Hub registry mirror 后重试。NapCat 镜像随后成功拉取。

### 5. 海豹 GHCR 镜像拉取慢

现象：

```text
ghcr.io/sealdice/sealdice:edge Pulling
```

长时间无明显进度。

判断：`ghcr.io` 不走 Docker Hub mirror，国内服务器可能较慢。

处理：先直接单独拉官方镜像：

```bash
sudo docker pull ghcr.io/sealdice/sealdice:edge
```

结果：官方镜像成功下载。

注意：尝试过的 DaoCloud GHCR 代理对该镜像返回 `403 Forbidden`，不可用。不要继续使用以下错误镜像名：

```text
ghcr.m.daocloud.io/sealdice/sealdice:edge
m.daocloud.io/ghcr.io/sealdice/sealdice:edge
```

### 6. Compose 镜像名被多次替换改乱

现象：

```text
m.daocloud.io/m.daocloud.io/registry.cncfstack.com/ghcr.io/sealdice/sealdice:edge: not found
```

判断：前面多次 `sed` 替换镜像源后，`docker-compose.yml` 中的海豹镜像名被叠加污染。

处理：把 `sealdice` 服务的 `image` 改回：

```yaml
image: ghcr.io/sealdice/sealdice:edge
```

并确认：

```bash
grep image docker-compose.yml
```

期望：

```text
image: ghcr.io/sealdice/sealdice:edge
image: mlikiowa/napcat-docker:latest
```

### 7. Termius 端口转发类型

问题：Termius 里有 `Local`、`Remote`、`Dynamic` 三种 Port Forwarding，不确定选哪个。

结论：选择 `Local`。

配置：

```text
Local port: 16099
Destination host: 127.0.0.1
Destination port: 16099
```

作用：让本地浏览器访问 `http://127.0.0.1:16099`，实际转发到服务器内部的 NapCat WebUI。

注意：`Agent Forwarding` 不是这个功能，它是 SSH key agent 转发。

### 8. NapCat WebUI token invalid

现象：

```text
token invalid
提示：请从 NapCat 启动日志中查看登录密钥
```

判断：当前 NapCat 版本或初始化状态不使用固定默认 token。

处理：

```bash
cd /opt/sealdice-dice
sudo docker compose logs --tail=200 napcat
```

从日志中复制 token / 登录密钥，填入 NapCat WebUI。

### 9. `curl -I https://dice.issane.cn` 返回 405

现象：

```text
HTTP/2 405
allow: OPTIONS, GET
```

判断：`curl -I` 发的是 `HEAD` 请求，海豹 WebUI 只允许 `GET/OPTIONS`。这不是反代故障。

验证方式：

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://dice.issane.cn
```

期望返回 `200`。

### 10. 海豹“账号登录”含义

问题：海豹 WebUI 里的“账号登录/新增账号”是什么意思。

结论：这里不是 WebUI 登录账号，而是给海豹添加 QQ 机器人账号。

填写：

```text
账号类型：QQ(onebot11正向WS)
账号：骰娘 QQ 号，即 .env 里的 ACCOUNT
连接地址：ws://napcat:1234
访问令牌：留空
```

`ws://napcat:1234` 中的 `napcat` 是 Docker Compose service 名，不是公网域名。不要填 `127.0.0.1`。

### 11. NapCat 是否会常驻

结论：会。Compose 中配置了：

```yaml
restart: unless-stopped
```

含义：

- 服务器重启后自动拉起。
- Docker 服务重启后自动拉起。
- 容器异常退出后自动重启。
- 手动 `docker compose stop` 或 `docker compose down` 后不会自动恢复，直到再次执行 `docker compose up -d`。

## 当前维护命令

```bash
cd /opt/sealdice-dice
sudo docker compose ps
sudo docker compose logs --tail=120 sealdice
sudo docker compose logs --tail=120 napcat
sudo docker compose restart
```

更新：

```bash
cd /opt/sealdice-dice
sudo docker compose pull
sudo docker compose up -d
```

检查端口：

```bash
sudo ss -tulpen | grep -E ':(13211|16099)\b'
```

`13211` 和 `16099` 应只监听在 `127.0.0.1`。
