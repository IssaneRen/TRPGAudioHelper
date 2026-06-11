---
name: check-server-logs
description: 在服务器上排查 TRPG Helper 静态站点、Nginx、HTTPS 和 trpg-ai-gateway 服务日志。
---

# 查服务器日志

用于用户要求“查服务器日志”“看看线上为什么挂了”“AI Gateway 没响应”“Nginx 报错”等场景。

## 安全边界

- 不要把 API key、PL token、cookie、Authorization header 或完整请求体贴回聊天。
- 如日志中含有密钥、token 或玩家私聊内容，先打码再摘要。
- 不要执行破坏性命令，例如清空日志、删除 release、重启服务，除非用户明确要求。
- 优先只读命令：`status`、`journalctl`、`tail`、`nginx -t`、`curl /health`。

## 常用服务

- 静态站点目录：`/var/www/trpg-helper`
- AI Gateway 服务：`trpg-ai-gateway`
- AI Gateway 本地端口：`127.0.0.1:3001`
- Nginx 日志：`/var/log/nginx/access.log`、`/var/log/nginx/error.log`

## 排查顺序

1. 确认服务状态：

```bash
systemctl status nginx --no-pager
systemctl status trpg-ai-gateway --no-pager
```

2. 看最近错误：

```bash
journalctl -u trpg-ai-gateway -n 120 --no-pager
tail -n 120 /var/log/nginx/error.log
```

3. 看访问路径和状态码：

```bash
tail -n 120 /var/log/nginx/access.log
```

4. 检查 Nginx 配置与本地健康检查：

```bash
nginx -t
curl -sS http://127.0.0.1:3001/health
```

5. 如果是 HTTPS 问题：

```bash
certbot certificates
openssl x509 -in /etc/nginx/ssl/issane.cn/fullchain.crt -noout -dates
```

## 输出格式

回复用户时按下面结构：

```markdown
## 结论
[一句话说明最可能的问题]

## 证据
- [命令] [关键日志行摘要，敏感字段已打码]

## 下一步
- [只读确认或需要用户授权的操作]
```

## 常见判断

- `502 Bad Gateway`：优先看 `trpg-ai-gateway` 是否运行、Nginx upstream 是否指向正确端口。
- `CORS`：检查 `ALLOWED_ORIGIN` 和响应头是否包含当前域名。
- `401/403`：检查 token/session 相关日志，但不要输出 token 原文。
- `AI provider request failed`：检查模型 base URL、模型名、服务端环境变量和供应商响应摘要。
