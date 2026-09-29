import type { Learning, Plan, Work, WorkKind } from "./workbench-client";
import { makeId, newWork } from "./workbench-model";

export interface WorkflowTemplate {
  id: string; title: string; subtitle: string; category: string; duration: string;
  tone: string; mark: string; kind: WorkKind; tool: string; output: string;
  steps: string[]; prompt: string; source: { title: string; url: string }; body: string;
}

const htmlStarter = `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>一封来自夜里的信</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#172e29;color:#f5f0df;font-family:Georgia,"Songti SC",serif;min-height:100vh;display:grid;place-items:center;padding:28px}
main{max-width:640px;border-top:1px solid #8d9d88;padding:40px 0}small{letter-spacing:.25em;color:#d2dbb5}h1{font-size:clamp(34px,7vw,64px);font-weight:400;line-height:1.2}p{line-height:2;color:#d3d8c9}button{background:#dbedaf;color:#203b2b;border:0;border-radius:24px;padding:14px 24px;cursor:pointer}#letter{border-left:2px solid #dbedaf;padding-left:20px;margin-top:28px}
</style><main><small>ISSANE / STORY NO. 01</small><h1>一封来自<br>夜里的信。</h1><p>灯塔熄灭前，有人把这封没有署名的信，放在了你的门口。</p><button onclick="document.getElementById('letter').hidden=false;this.hidden=true">拆开这封信</button><p id="letter" hidden>如果你读到了这里，请记住：潮汐带走的，并不总是过去。<br>—— 在这里写下你的故事</p></main></html>`;

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "trpg-log", title: "把一场跑团，整理成故事", subtitle: "从混乱记录到可回看的冒险档案", category: "跑团记录", duration: "30–45 分钟", tone: "forest", mark: "LOG", kind: "trpg-log", tool: "你常用的文本模型", output: "一篇跑团纪实 + 待追踪线索清单",
    steps: ["准备原始 Log，统一角色名与时间顺序。", "提取场景、关键决定、判定结果与未解线索，保留原文依据。", "按场景整理纪实；不补写角色未说过的话和未发生的剧情。", "逐条核对事实，区分角色已知与 KP 秘密，再保存作品草稿。"],
    prompt: "请将以下跑团 Log 整理为纪实。先列出事件时间线、参与角色、关键判定和未解线索，再按场景写正文。每个关键事实保留原文索引。不要杜撰对话、动机或判定；不确定处标注待核实。将 KP 秘密单列，公开稿不得包含。\n\n【角色对照】\n【原始 Log】",
    source: { title: "Markdown 排版参考", url: "https://www.markdownguide.org/basic-syntax/" }, body: "# 本次冒险\n\n## 参与角色\n\n## 前情提要\n\n## 事件纪实\n\n## 已知线索\n\n## 尚未解开的问题\n"
  },
  {
    id: "comic", title: "做一支 6 镜头 AI 漫剧", subtitle: "先有可拍的分镜，再开始生图", category: "AI 漫剧", duration: "60–90 分钟", tone: "peach", mark: "CUT / 06", kind: "ai-comic", tool: "文本模型 + 你常用的图像 / 视频工具", output: "角色设定、6 镜分镜表与样片链接",
    steps: ["写一句话梗概：主角想要什么，又被什么阻碍。", "固定人物外观、服装与场景色板，生成角色参考图。", "拆成 6 镜：镜号、景别、动作、台词、时长与画面提示词。", "先做 1 镜检查人物一致性，再完成其余镜头并剪辑。"],
    prompt: "你是分镜助手。根据梗概制作 6 镜短片方案，按镜号、景别、主体动作、台词、时长、画面提示词输出表格。先给角色外观表，再在每一镜重复关键外观约束。镜头动作应可执行，最后一镜回应开头。不要直接生成视频。\n\n【梗概】\n【角色】\n【风格参考】",
    source: { title: "ComfyUI 开源工具", url: "https://github.com/Comfy-Org/ComfyUI" }, body: "# 短片标题\n\n## 一句话故事\n\n## 角色设定\n\n## 分镜\n\n| 镜号 | 景别 | 动作 | 台词 | 时长 |\n| --- | --- | --- | --- | --- |\n| 01 | | | | |\n\n## 成片\n\n在这里放入 MP4 链接。\n"
  },
  {
    id: "image", title: "建立自己的生图配方", subtitle: "保存有效变量，让下一张图可复现", category: "AI 生图", duration: "20–30 分钟", tone: "blue", mark: "FRAME", kind: "ai-image", tool: "你常用的生图工具", output: "一组对照图 + 可复用的提示词配方",
    steps: ["选择同一个主体，固定画幅、参考图和基础描述。", "每轮只改一个变量：构图、光线或材质。", "记录工具 / 模型版本、提示词和可用的种子参数。", "选出最佳结果，写下有效与无效的修改，整理成作品。"],
    prompt: "请把我的生图想法拆成主体、场景、构图、光线、材质、色彩六个部分。给一份基础提示词，再给三份仅改变光线的对照提示词。保持其余变量不变，不添加工具不支持的参数。\n\n【想法】\n【工具与版本】",
    source: { title: "ComfyUI 工作流文档", url: "https://docs.comfy.org/" }, body: "# 图像实验\n\n## 目标\n\n## 最终效果\n\n## 生成配方\n- 工具 / 模型：\n- 提示词：\n- 参数：\n\n## 对照与复盘\n"
  },
  {
    id: "novel", title: "写完一个有回响的短篇", subtitle: "从人物欲望到伏笔回收", category: "故事写作", duration: "45–60 分钟", tone: "sand", mark: "CHAPTER", kind: "novel", tool: "自己写作，可选文本模型辅助", output: "一篇短篇初稿 + 伏笔回收表",
    steps: ["确定人物欲望、代价，以及结尾必须发生的变化。", "安排 3 个场景，每个场景至少改变一条信息或关系。", "写出初稿，不在第一段反复停留；将待查资料用括号标记。", "回看伏笔、因果和人物选择，删去无作用的解释。"],
    prompt: "请担任严格的故事编辑。先检查以下故事的人物欲望、阻力、代价与结尾变化是否连贯；再列出伏笔与回收位置。只提出有原文依据的问题和具体修改建议，保留作者语气，不替换整篇。\n\n【故事正文】",
    source: { title: "Markdown 排版参考", url: "https://www.markdownguide.org/basic-syntax/" }, body: "# 故事标题\n\n## 第一幕\n\n## 第二幕\n\n## 第三幕\n"
  },
  {
    id: "html", title: "让一个想法在网页里发生", subtitle: "HTML 互动作品，预览后直接发布", category: "HTML 实验", duration: "20–40 分钟", tone: "ink", mark: "< / >", kind: "html", tool: "HTML / CSS / JavaScript", output: "一个可分享的独立互动页面",
    steps: ["从互动信件模板开始，替换标题、故事与按钮文案。", "把 CSS 和脚本写在同一份 HTML，媒体使用完整 URL。", "在预览中检查按钮、窄屏排版与文字可读性。", "在作品编辑器选择公开发布，再保存，获得作品链接。"],
    prompt: "请制作一份独立 HTML 互动叙事页面，CSS 与 JavaScript 内联。使用语义化按钮，支持键盘与移动屏幕；不依赖构建工具、父页面或本地文件。先展示一封未拆开的信，点击后揭示故事。\n\n【故事文本】\n【视觉方向】",
    source: { title: "MDN HTML 参考", url: "https://developer.mozilla.org/zh-CN/docs/Web/HTML" }, body: htmlStarter
  },
  {
    id: "hyperframes", title: "从 HTML 动画到短视频", subtitle: "用 HyperFrames 建立可复用的视频流程", category: "HTML 实验", duration: "45–90 分钟", tone: "violet", mark: "MOTION", kind: "ai-comic", tool: "HeyGen / HyperFrames", output: "动画工程 + 渲染后的 MP4 链接",
    steps: ["阅读 HyperFrames 官方 Quick Start，按当前文档建立本地工程。", "准备画幅、时长和素材，完成动画时间线。", "按官方命令检查、预览并渲染视频，检查音画与字幕。", "上传成片到你使用的媒体空间，把 MP4 链接写入作品正文。"],
    prompt: "请按 HyperFrames 当前官方文档帮我制作视频工程。先读取项目与文档，再确认画幅、时长、素材和时间线；完成后运行检查并预览。缺少素材时列出缺项，不虚构渲染成功。\n\n【视频主题】\n【画幅 / 时长】\n【已有素材】",
    source: { title: "HyperFrames 官方仓库", url: "https://github.com/heygen-com/hyperframes" }, body: "# 视频实验\n\n## 创作说明\n\n## 成片\n\n在这里粘贴你上传后的 MP4 链接。\n\n## 制作记录\n"
  }
];

export function startWorkflow(template: WorkflowTemplate): { learning: Learning; plans: Plan[] } {
  return {
    learning: { id: makeId(), title: template.title, vendor: "", model: template.tool.slice(0, 100), work: template.category, status: "learning", workflow: template.steps.map((step, i) => `${i + 1}. ${step}`).join("\n"), notes: `## 目标产出\n${template.output}\n\n## 提示词\n${template.prompt}\n\n## 参考\n${template.source.url}\n\n## 实践记录\n` },
    plans: template.steps.map((step, i) => ({ id: makeId(), title: `${template.title} · ${i + 1}/4`, detail: step, dueDate: "", status: i === 0 ? "doing" : "todo" }))
  };
}

export function workFromTemplate(template: WorkflowTemplate): Work {
  return { ...newWork(template.kind), title: template.title, summary: template.output, body: template.body };
}
