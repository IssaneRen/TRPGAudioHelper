# 本地联调：主仓前端 + trpg-ai-gateway

本文只说明 localhost 调试方式，不复用生产 token、生产 `TOKEN_HASH_PEPPER` 或服务器 env。

## 现有部署配置如何工作

生产环境里实际有三份 GitHub Actions：

| 仓库 | Workflow | 触发 | 作用 |
|------|----------|------|------|
| 主仓 | `.github/workflows/deploy.yml` | `master`，但忽略 `public/blog/**` 与 `public/wiki/**` | 安装依赖、`pnpm build`、上传 `dist`，并重写静态站 Nginx 配置。`/config/runtime.json` 由 Nginx alias 到服务器文件。 |
| 主仓 | `.github/workflows/deploy-content.yml` | 只改 `public/blog/**` 或 `public/wiki/**` | 不重新 build，只把静态 Blog/Wiki 内容覆盖到当前 release。 |
| 子仓 | `trpg-ai-gateway/.github/workflows/deploy.yml` | `main` 或 `master` | `pnpm test`、`pnpm build`、打包 `dist/data/scripts/skills`，部署到 `/var/www/trpg-ai-gateway`，由 systemd 读取服务器 env 启动。 |

生产链路是：

```text
浏览器
  -> https://issane.cn
  -> /config/runtime.json 得到 https://ai.issane.cn
  -> https://ai.issane.cn
  -> Nginx 反代到 127.0.0.1:3001
  -> trpg-ai-gateway systemd 服务
```

本地不需要 Nginx，直接让 Vite 前端读取 `public/config/runtime.json`，再跨源请求本机 Gateway：

```text
浏览器
  -> http://localhost:5173
  -> /config/runtime.json 得到 http://127.0.0.1:3001
  -> http://127.0.0.1:3001
  -> pnpm dev 启动的 trpg-ai-gateway
```

## 关键依赖关系

- 前端不会直接知道 PL 身份，只保存登录 token。
- `POST /api/session` 由 Gateway 校验 token hash，返回 `playerId`、`displayName`、`isKeeper`。
- `GET /api/npcs` 根据 token 对应的 PL 和 NPC 的 `supportedPlayerIds` 过滤可见 NPC。
- `POST /api/chat` 会读取父仓 Wiki JSON、子仓 NPC 私有上下文和本地聊天记忆，然后调用 OpenAI-compatible 模型。
- KP token 可以查看 Wiki/Blog 隐藏内容，但 Gateway 的聊天接口禁止 KP 代入 PL 私聊；测试 AI 对话要用普通 PL token。

## 一次性本地配置

先准备子仓本地配置。以下示例使用假的本地 token `local-pl-leina-token`，授权为 `pl.leina`。这个 token 只用于本机，不要提交。

```bash
cd trpg-ai-gateway
pnpm install
mkdir -p .local
TOKEN_HASH_PEPPER=local-dev-pepper node scripts/generate-token-hashes.mjs '[{"playerId":"pl.leina","displayName":"本地莱纳","token":"local-pl-leina-token"}]' > .local/token-hashes.local.json
```

创建 `trpg-ai-gateway/config.local.json`：

```json
{
  "port": 3001,
  "allowedOrigin": "http://localhost:5173,http://127.0.0.1:5173",
  "wikiEntriesDir": "../public/wiki/entities/entries",
  "npcRootDir": "data/npcs",
  "chatMemoryRootDir": ".local/chat-memory",
  "tokenHashFile": ".local/token-hashes.local.json",
  "supportedPlayerIds": ["pl.leina"],
  "ai": {
    "baseUrl": "https://api.deepseek.com",
    "model": "deepseek-chat",
    "apiKeyEnv": "DEEPSEEK_API_KEY"
  }
}
```

说明：

- `config.local.json` 已被子仓 `.gitignore` 忽略。
- `.local/` 已被子仓 `.gitignore` 忽略，适合放本地 token hash 和聊天记忆。
- `TOKEN_HASH_PEPPER` 不在 `config.local.json`，必须通过环境变量提供。
- `allowedOrigin` 放在 `config.local.json` 后，启动 Gateway 时不需要再手写 `ALLOWED_ORIGIN=...`。
- 如果只调试登录、NPC 列表、历史记录，可以用占位 `DEEPSEEK_API_KEY`；真正发送 AI 消息时必须换成可用 key。

主仓已有 `public/config/runtime.json`：

```json
{
  "aiGatewayUrl": "http://127.0.0.1:3001"
}
```

这就是本地前端访问 Gateway 的地址。生产环境不会依赖这个文件内容，因为 Nginx 会把 `/config/runtime.json` alias 到服务器运行时配置文件。

## 启动顺序

终端 1：启动 Gateway。

```bash
cd trpg-ai-gateway
TOKEN_HASH_PEPPER=local-dev-pepper \
DEEPSEEK_API_KEY=dev-placeholder \
pnpm dev
```

如果要实际发起 AI 对话，把 `DEEPSEEK_API_KEY=dev-placeholder` 换成真实可用 key。

终端 2：启动主仓前端。

```bash
cd /path/to/TRPGAudioHelper
pnpm install
pnpm dev -- --port 5173
```

浏览器打开：

```text
http://localhost:5173
```

登录 token 输入：

```text
local-pl-leina-token
```

## 命令行校验

先确认 Gateway 能启动：

```bash
curl http://127.0.0.1:3001/health
```

校验本地 token：

```bash
curl -sS -X POST http://127.0.0.1:3001/api/session \
  -H 'Authorization: Bearer local-pl-leina-token' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

拉取当前 PL 可见 NPC：

```bash
curl -sS http://127.0.0.1:3001/api/npcs \
  -H 'Authorization: Bearer local-pl-leina-token'
```

如果这些命令通过，但浏览器失败，优先检查 `ALLOWED_ORIGIN` 是否和浏览器地址完全一致。`localhost` 和 `127.0.0.1` 是两个不同 origin。

## 常见问题

| 现象 | 优先检查 |
|------|----------|
| Gateway 启动时报 `Missing required config: ALLOWED_ORIGIN` | 启动命令没有带 `ALLOWED_ORIGIN`。 |
| Gateway 启动时报 `Missing required config: TOKEN_HASH_PEPPER` | 启动命令没有带本地 pepper，或 pepper 和生成 hash 时不一致。 |
| 登录 401 | token、`TOKEN_HASH_PEPPER`、`.local/token-hashes.local.json` 三者不匹配。重新生成本地 hash。 |
| 登录成功但 NPC 列表为空 | 当前 `playerId` 不在 NPC 的 `supportedPlayerIds` 中，或 `supportedPlayerIds` 没包含该 PL。 |
| 浏览器 CORS 报错 | `ALLOWED_ORIGIN` 未包含当前 Vite 地址，例如实际是 `http://localhost:8291`。 |
| `/api/chat` 报模型请求失败 | 占位 API key 只能调试登录/列表；发送聊天需要真实 OpenAI-compatible API key。 |
| 改了 `public/config/runtime.json` 但浏览器没变 | 前端代码用 `cache: "no-store"` 请求该文件；仍异常时硬刷新或检查 dev server 是否在正确主仓目录。 |

## 不要在本地联调中做的事

- 不要把生产 `TOKEN_HASH_PEPPER` 写入仓库文件。
- 不要提交明文 PL token。
- 不要把 `config.local.json`、`.env`、`.local/` 加入 Git。
- 不要把 `trpg-ai-gateway/` 加回父仓跟踪；它是独立子仓。
- 不要在本地直接改生产服务器的 `/var/www/trpg-helper-config/runtime.json` 来调试。
