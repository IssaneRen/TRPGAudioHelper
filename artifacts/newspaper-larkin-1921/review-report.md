# 审查记录：Daily Express 拉金招募报纸

## 第一轮专家审查

- 专家一评分：78/100，未通过。
- 专家二评分：72/100，未通过。
- 主要问题：`spec.sources` 为空；图片路径名为 `.png` 但文件实际是 JPEG；来源大量依赖百科且没有明确局限；渲染脚本会把字符串正文拆成单字符段落；CSS 两端对齐导致小标题和正文词距异常；skill 没有沉淀网页自动化和 `jour.yjykmedia.com` 调研结果。

## 已修复项

- `render_newspaper.py` 增加 `body_values()`，现在 `lead.body` 和普通条目 `body` 都可接受字符串或字符串数组。
- 来源数据改为默认审计用途，`showSourcesInArtifact` 为 `false` 时不会印到报纸图上。
- `spec.json` 补充结构化 `sources`，明确每条来源支持的事实和置信度。
- `sources.md` 重写，明确这是历史感重构、未直接访问原版付费报纸档案，并补充 BA 官方历史页与 legislation.gov.uk 候选核验。
- `references/webpage-automation.md` 记录可用的 Browser、Chrome、Computer Use、Playwright/webapp-testing、Figma 工具路径。
- `references/jour-workbench-notes.md` 记录 `jour.yjykmedia.com` 的功能、复杂度和可复刻范围。

## 第二轮待审查

- 重新生成 `newspaper.html`。
- 重新导出真 PNG，并用 `file` 验证格式。
- 进行第二轮专家审查，目标为 85/100 以上。

## 第二轮专家审查

- 专家一评分：88/100，通过。
- 专家二评分：87/100，通过。
- 共同结论：当前成果可作为“历史感重构道具”和可复用 skill 交付；不应表述为 1921-02-28 《Daily Express》原版复刻。
- 已验证项：`newspaper-full.png` 为真实 PNG；图像无明显文字重叠、截断或异常词距；`spec.sources` 已补齐；来源局限已写明；网页自动化与 `jour.yjykmedia.com` 调研已经沉淀进 skill references。
- 保留改进项：后续若追求档案级准确性，应补查 UK Press Online / British Newspaper Archive / British Library；若要产品化，应增加 JSON schema、测试样例和自动截图脚本。
