# 奈面序章转录进度

- 来源 PDF：`/Users/hongfei_ren/Documents/personal/战役：奈亚拉托提普的面具/奈亚拉托提普的面具v1.0.pdf`
- 当前已处理范围：PDF 第 1-95 页，序章截止页。
- Canonical 转录结构：`reports/naimen-prologue/pdf-extract/prologue-pages.json`
- 已删除中间截图：`reports/naimen-prologue/pdf-extract/pages/`
- 已删除重复导出物：
  - `reports/naimen-prologue/pdf-extract/prologue-pages.md`
  - `reports/naimen-prologue/pdf-extract/text/`
- 删除原因：序章页已完成结构化文字提取；PNG 截图约 135M，Markdown 与逐页 txt 可由 JSON 再生成，均不适合直接提交。
- 临时导出方法：
  - Markdown：`node scripts/export-pdf-transcript.mjs reports/naimen-prologue/pdf-extract/prologue-pages.json --format md --out /tmp/naimen-prologue.md`
  - 逐页文本：`node scripts/export-pdf-transcript.mjs reports/naimen-prologue/pdf-extract/prologue-pages.json --format text --out /tmp/naimen-prologue-text`
- 后续接续点：第 96 页之后暂未主动转录；只有当序章线索明确指向后续章节时，再按具体章节/页段补充提取。
- 当前线索整理产物：`trpg-ai-gateway/data/module-clues/naimen-prologue/clues.json`
