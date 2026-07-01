---
name: image-translation-overlay
description: 通过覆盖已知原文区域并按结构化 JSON spec 写入译文，为现有图片道具生成翻译阅读副本。当 Codex 已经知道或控制原文、不需要 OCR，并需要为海报、报纸、手out、截图或其他文字密集图片创建中文/其他语言阅读版时使用。
---

# 图片翻译覆盖

当原文已经已知时，使用这个 skill 为现有图片生成翻译阅读副本。除非用户明确要求 OCR，否则不要使用 OCR。

## 工作流

1. 收集源材料。
   - 使用原始图片路径。
   - 从生成道具的 spec、HTML、源文档或已有内容中获取原文字符串。
   - 手工或用语言模型翻译原文，优先保留含义，而不是逐字对应顺序。

2. 映射文本区域。
   - 为每个原文字区确定一个矩形：`[x, y, width, height]`，单位为图片像素。
   - 保留原图作为沉浸版。
   - 另存一张带译文覆盖的阅读副本。
   - 当目标语言需要不同换行时，优先使用较粗的文本块，而不是逐行小框。

3. 构建覆盖 spec。
   - 使用 `paperColor` 或每块的 `background` 覆盖原文。
   - 使用 `font`、`fontSize`、`minFontSize`、`align`、`valign` 和 `lineSpacing` 调整译文适配。
   - 需要审计时可以包含 `source` 字段，但渲染时只绘制 `text`。

4. 渲染并检查。
   - 运行 `scripts/overlay_translation.py`。
   - 目视检查输出图片。
   - 确认译文清晰、没有裁切，也没有遮住重要非文字图像。

## 脚本快速开始

创建覆盖 JSON：

```json
{
  "paperColor": "#eee5cf",
  "font": "/System/Library/Fonts/Hiragino Sans GB.ttc",
  "blocks": [
    {
      "box": [120, 80, 400, 60],
      "source": "Explorers Sought",
      "text": "招募探险家",
      "fontSize": 36,
      "align": "center",
      "style": "bold"
    }
  ]
}
```

运行：

```bash
python3 skills/image-translation-overlay/scripts/overlay_translation.py input.png overlay.json output.png
```

## 覆盖指导

- 保留原图。翻译阅读副本始终另存为新文件。
- 选择坐标时使用图片实际像素尺寸。
- 背景矩形尽量接近原始纸张或面板颜色。
- 中文覆盖优先使用可读的 CJK 字体，例如 Hiragino Sans GB、STHeiti、Songti 或其他可用系统字体。
- 阅读副本以实用为主：精确字体还原不如桌面阅读清楚重要。
- 如果文字放不下，降低字号或把译文拆成更短的块。
