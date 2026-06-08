---
name: manage-subrepositories
description: |
  父工程与独立子仓库联动管理。涉及 trpg-ai-gateway、AI Gateway、NPC 记忆、DeepSeek、自定义模型、父子工程综合读代码、子仓库 clone/rebase/update 时必须先读本文。
---

# 子仓库联动管理

## 固定入口

1. 先读父工程 `repo.json`。
2. 对任何涉及子仓库的任务，先运行：

```bash
pnpm sync:subrepos
```

3. 如果脚本提示 `remoteUrl` 为空，说明新 GitHub 仓库地址还未写入 `repo.json`；此时只能使用本地已有子仓库，不能自动 clone。
4. 如果子仓库存在但工作区 dirty，脚本会 fetch 但跳过 rebase；不要替用户清理或 reset。

## 阅读范围

- 父工程：React/Vite 静态站点、Wiki JSON、部署文档。
- 子仓库 `trpg-ai-gateway/`：AI Gateway、NPC/PL 记忆、prompt 组装、模型 provider、部署 secret 说明。
- 涉及 AI 对话、NPC 记忆、DeepSeek、自定义模型、安全部署时，必须综合阅读两个项目。

## 安全边界

- 父仓库必须继续忽略 `trpg-ai-gateway/`。
- 不要把子仓库源码加入父仓库提交。
- 不要提交 `.env`、`config.local.json`、API key、token。
- 前端不能持有模型 key；模型 key 只在服务器环境变量中读取。
