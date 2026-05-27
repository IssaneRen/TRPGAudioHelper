# TRPG 技能工作流

这份文档定义本仓库的文档处理、规则分析、模组拆解和剧情优化流程。

## 主流程

1. `inspect`：先确认文件类型、大小、可用解析能力。
2. `read`：先提取稳定文本，尽量保留页码、段落、表格和警告信息。
3. `decompose`：在读完以后再做结构拆解，输出节点、标题和原始块。
4. `analyze`：交给对应 agent 做规则判断、线索图整理或剧情打分。

## 统一命令

- `scripts/trpg-setup.ps1`
- `scripts/trpg-workflow.ps1 inspect <file>`
- `scripts/trpg-workflow.ps1 read <file>`
- `scripts/trpg-workflow.ps1 decompose <file>`
- 机器可读结果统一加 `-Format json`

## 技能分工

- `trpg-document-reader` 负责读取和整理原始内容。
- `pdf-decomposer` 负责把 PDF 转成节点表和结构图。
- `module-clue-analyst` 负责把模组整理成线索、时间线和依赖关系。
- `rules-arbiter` 负责把规则书整理成裁定和例外。
- `strict-story-scorer` 负责从玩家视角挑问题。
- `module-optimizer` 负责把分析结果改成可执行的修订稿。

## 失败策略

- 如果 PDF 是扫描件且当前环境无法 OCR，就先输出警告和页级结构，再交给 browser / 外部 OCR 处理。
- 如果 DOCX 内容复杂，先保留段落、表格和样式，不强行恢复 Word 的完整排版。
- 如果文档无法被当前解析器支持，先输出 `inspect` 结果，再决定是否使用备用工具。

## 维护约定

- 新增文档处理能力时，先补脚本，再补 skill 提示词，最后补入口文档。
- 任何新的解析器都要先支持 `inspect`，再支持 `read`，最后再支持 `decompose`。
- 任何新的输出字段都要保留原始位置，避免后续分析丢证据。
