---
name: newspaper-artifact-maker
description: 从场景简报创建有历史依据的报纸道具和可打印报纸图片。当 Codex 需要调研真实年代新闻、撰写沉浸式报纸文章或分类广告、用 HTML/CSS 制作复古报纸版面、导出 PNG/PDF 截图，或制作混合虚构场景钩子与真实历史背景的 TRPG 手outs 时使用。
---

# 报纸道具制作器

使用这个 skill 制作看起来像真实年代物件的报纸道具，同时把虚构场景内容与已验证的历史新闻清楚地区分开。

## 工作流

1. 解析简报。
   - 确认目标日期、城市、语言、报纸标题、虚构故事钩子、所需尺寸和输出格式。
   - 如果用户指定真实报刊，先验证它在目标日期确实存在。
   - 如果用户没有指定标题，选择一个符合地点和年代的真实报刊。

2. 调研年代事实。
   - 真实世界条目优先使用一手资料或可靠二手资料。
   - 为每条非虚构新闻记录来源 URL、日期和置信度。
   - 在内部笔记中把场景材料标记为虚构，但报纸道具本身保持沉浸式。
   - 不要发明看似真实的填充新闻。如果不确定，使用中性的广告、天气、航运通告、剧院列表，或明确为虚构的分类广告。

3. 起草页面。
   - 把用户的故事放在读者会注意到的位置：头条、框选广告或编辑通告。
   - 用目标日期附近的真实年代事件填充周围栏目。
   - 词汇要贴近年代感，但仍要让现代玩家读得懂。
   - 除非用户要求 Keeper 专用内容，否则避免剧透。

4. 构建道具。
   - 文本密集型报纸图片优先使用确定性的 HTML/CSS 版面。
   - 结构化 spec 足够时，使用 `scripts/render_newspaper.py`。
   - 只有当版面需要特殊构图时，才创建自定义 HTML 文件。
   - 用 Playwright 或浏览器截图按请求像素尺寸导出。

5. 验证。
   - 目视检查渲染图片。
   - 确认文字没有重叠或消失。
   - 确认报头、刊期和所有非虚构短讯都有来源支撑。
   - 对复杂历史道具，或用户要求专家审查时，使用独立子 agent 复核。

## 脚本快速开始

创建 JSON spec：

```json
{
  "title": "The Daily Express",
  "dateLine": "London, Monday, February 28, 1921",
  "price": "One Penny",
  "lead": {
    "headline": "Explorers Sought for Peruvian Antiquities Expedition",
    "kicker": "From Our London Correspondent",
    "body": ["Paragraph one.", "Paragraph two."]
  },
  "items": [
    { "headline": "London Conference Continues", "body": "Short real news item." }
  ],
  "classifieds": [
    "Passports arranged for South America. Apply by letter."
  ],
  "showSourcesInArtifact": false,
  "sources": [
    {
      "id": "source-id",
      "title": "Source title",
      "url": "https://example.com/source",
      "supports": "Which fact this source supports.",
      "confidence": "high"
    }
  ]
}
```

运行：

```bash
python3 skills/newspaper-artifact-maker/scripts/render_newspaper.py spec.json output.html
```

然后用 Playwright、内置浏览器或其他浏览器自动化工具为 `output.html` 截图。除非用户明确要求在图片上显示引用，否则为了保持沉浸感，保持 `showSourcesInArtifact` 为 `false`。

## 版面指导

- 1920 年代伦敦英文报纸可使用粗重衬线报头、窄栏、密集分隔线、小广告和克制装饰。
- 只有在确认日期和语气合适后，才使用 `The Times`、`Daily Mail`、`Daily Express`、`Daily Herald` 或 `Daily Sketch`。
- 页面标题和新闻标题应像年代新闻，而不是现代营销文案。
- TRPG 钩子优先写成通告、通讯员报道、社交短讯或博物馆/探险栏目。
- 公开道具保持沉浸。来源说明放在相邻 Markdown 报告或最终回复里，不放进图片正文。

## 来源纪律

当输出混合真实历史与虚构场景内容时，阅读 `references/research-checklist.md`。
当需要浏览器自动化、截图或 MCP/工具可用性判断时，阅读 `references/webpage-automation.md`。
当用户提到 `https://jour.yjykmedia.com/` 或要求复刻报纸制作台时，阅读 `references/jour-workbench-notes.md`。
