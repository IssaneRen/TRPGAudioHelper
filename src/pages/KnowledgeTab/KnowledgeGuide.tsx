import { useEffect, useRef, useState } from "react";

// 引导仅展示操作说明。每一步对应界面上的真实按钮，资料由维护者亲自填写和保存。
const steps = [
  { title: "建立世界观", body: "用左栏的「新建世界观」给你的世界取名。每个世界观都有自己的文章、关系和索引。" },
  { title: "写第一篇文章", body: "选择「新建文章」，选模组或设定，填写标题和 Markdown 正文。保存后可以在编辑和阅读之间切换。" },
  { title: "加入人物与线索", body: "可为文章选择人物 Wiki。把你确认可检索的引文写入私人原稿，在来源栏注明出处。保存两篇文章后，就能用关系图连接它们。" },
  { title: "预览并发布", body: "打开「公开版」，填写你想分享的正文和摘要，先预览再发布。发布完成后可把作品链接发给读者。" },
];

export function KnowledgeGuide({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);

  // 使用浏览器的原生模态窗口，打开时聚焦引导，按 Escape 可退出。
  useEffect(() => { dialog.current?.showModal(); }, []);

  return <dialog ref={dialog} className="knowledge-dialog" aria-labelledby="knowledge-guide-title" onCancel={onClose}>
    <div className="kb-row kb-between">
      <span className="kb-muted">操作引导 · {step + 1}/{steps.length}</span>
      <button type="button" onClick={onClose}>关闭</button>
    </div>
    <h2 id="knowledge-guide-title">{steps[step].title}</h2>
    <p>{steps[step].body}</p>
    <div className="kb-row kb-between">
      <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0}>上一步</button>
      <button type="button" className="kb-primary" onClick={() => step === steps.length - 1 ? onClose() : setStep(step + 1)}>
        {step === steps.length - 1 ? "开始使用" : "下一步"}
      </button>
    </div>
  </dialog>;
}
