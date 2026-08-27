# QQ Chatbot SeaDice 插件

- 插件：`sealdice-plugins/qq-chatbot.js`
- 作用：让 QQ 里的 `.chatbot` 指令调用 AI Gateway，并复用网页端 NPC/PL 记忆。

## 指令

```text
.chatbot talk <NPC名> <对话内容>
.chatbot add-memory <NPC名> <公共记忆>
.chatbot add-memory <NPC名> <PL名或playerId> <专属记忆>
.chatbot add-memory-for <NPC名> <PL名或playerId> <专属记忆>
```

## 插件配置

- `gatewayUrl`：服务器上通常填 `http://127.0.0.1:3001`
- `internalToken`：必须和 AI Gateway 的 `QQ_CHATBOT_INTERNAL_TOKEN` 一致
- `minAdminPrivilege`：默认 `50`
- `imageBasePath`：可选；配置后会把 Gateway 返回的 `portraitFile` 拼成 CQ 图片消息

## 运行时文件

这些不要提交到 Git：

```text
/etc/trpg-ai/qq-chatbot.players.json
/home/ubuntu/trpg-ai-gateway.env
```
