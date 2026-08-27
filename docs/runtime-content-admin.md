# 内容后台

- 地址：`https://issane.cn/admin/content`
- 登录：现有 KP Token。
- 图片：上传后使用 `/content-assets/...`。
- ZIP：`manifest.json + blog/ + wiki/ + uploads/`，格式版本 `1`；仅接受正文文件和常见栅格图片，导入时校验目录、索引与引用关系。
- 备份：后台“备份”页导出 ZIP。
- 回退：`sudo trpg-content-source release`
- 恢复运行时内容：`sudo trpg-content-source runtime`

## QQ Chatbot 相关路径

- Wiki 记忆读取：`WIKI_ENTRIES_DIR=/var/www/trpg-content/wiki/entities/entries`
- NPC 私有记忆：`NPC_ROOT_DIR=/var/www/trpg-ai-gateway/shared/npcs`
- 对话运行时记忆：`CHAT_MEMORY_ROOT_DIR=/var/www/trpg-ai-gateway/shared/chat-memory`
- QQ 到 PL 映射：`/etc/trpg-ai/qq-chatbot.players.json`
- Gateway 环境文件：`/home/ubuntu/trpg-ai-gateway.env`

`CONTENT_ROOT_DIR` 只放博客和 Wiki 内容；`.chatbot add-memory` 写入 `NPC_ROOT_DIR`，不要写入 `CONTENT_ROOT_DIR`。
