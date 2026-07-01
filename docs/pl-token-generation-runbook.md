# PL Token 最短操作手册

目标：给新 PL 生成登录 token。明文 token 发给 PL，`tokenHash` 提交到 `trpg-ai-gateway` 子仓库。

## 1. 服务器生成

在服务器执行：

```bash
cd /var/www/trpg-ai-gateway/current

./scripts/print-player-token-record.sh \
  --env-file /home/ubuntu/trpg-ai-gateway.env \
  --player-id pl.xxt \
  --display-name xxt
```

终端会输出两段：

- `tokenHash` 对象：复制回本机，提交到 Git。
- 明文 token：私发给 PL，不提交。

## 2. 本机提交 hash

打开子仓库文件：

```text
trpg-ai-gateway/data/auth/token-hashes.json
```

把服务器输出的对象追加进数组。

校验：

```bash
cd trpg-ai-gateway
node -e "JSON.parse(require('fs').readFileSync('data/auth/token-hashes.json','utf8')); console.log('json ok')"
```

提交并 push：

```bash
git add data/auth/token-hashes.json
git commit -m "Add xxt token hash"
git push
```

GitHub Actions 会把子仓库的 `data/auth/token-hashes.json` 部署到服务器。

## 3. 发给 PL

只把服务器输出的明文 token 私发给对应 PL。

不要提交：

- 明文 token
- `TOKEN_HASH_PEPPER`
- 服务器 env 文件

## 4. 验证

部署完成后，用明文 token 调：

```bash
curl -sS -X POST https://ai.issane.cn/api/session \
  -H "Authorization: Bearer <明文token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

成功结果类似：

```json
{"playerId":"pl.xxt","displayName":"xxt","isKeeper":false}
```
