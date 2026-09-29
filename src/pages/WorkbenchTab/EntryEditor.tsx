import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Link } from "react-router";
import { ExternalLink, Eye, Save, Trash2, Upload, X } from "lucide-react";
import { uploadContentImage } from "@/features/content-admin/content-admin-client";
import { WorkMarkdown } from "@/features/workbench/WorkMarkdown";
import type { Learning, Plan, Work } from "@/features/workbench/workbench-client";
import { learningLabels, localDate, planLabels, workKinds } from "@/features/workbench/workbench-model";

export type Entry = { type: "plans"; item: Plan } | { type: "learning"; item: Learning } | { type: "works"; item: Work };
interface Props { entry: Entry; token: string; isNew: boolean; onClose: () => void; onSave: (entry: Entry) => void; onDelete: () => void; onCreateWork: (learning: Learning) => void; }

export function EntryEditor({ entry, token, isNew, onClose, onSave, onDelete, onCreateWork }: Props) {
  const [draft, setDraft] = useState<Entry>(entry);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [journal, setJournal] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const changed = JSON.stringify(draft) !== JSON.stringify(entry) || Boolean(journal.trim());
  useEffect(() => {
    if (!changed) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed]);
  function close() { if (!uploading && (!changed || window.confirm("编辑内容尚未保存，放弃本次修改？"))) onClose(); }
  function patch(value: Partial<Plan> | Partial<Learning> | Partial<Work>) {
    setDraft((current) => ({ ...current, item: { ...current.item, ...value } }) as Entry);
  }
  function withJournal(): Entry {
    return draft.type === "learning" && journal.trim() ? { ...draft, item: { ...draft.item, notes: `${draft.item.notes}\n\n### ${localDate()} 实践记录\n${journal.trim()}` } } : draft;
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.item.title.trim()) { setError("请填写标题。"); return; }
    if (draft.type === "works" && draft.item.coverUrl && !/^(https?:\/\/|\/content-assets\/)/i.test(draft.item.coverUrl)) { setError("封面请使用 http(s) 或站内 /content-assets/ 地址。"); return; }
    if (draft.type === "works" && draft.item.status === "published" && !draft.item.body.trim()) { setError("作品正文为空，请先补充内容再发布。"); return; }
    const next = withJournal();
    onSave({ ...next, item: { ...next.item, title: next.item.title.trim() } } as Entry);
  }
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setError("");
    try { const result = await uploadContentImage(token, file); patch({ coverUrl: result.url }); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setUploading(false); }
  }

  return <Dialog.Root open onOpenChange={(open) => { if (!open) close(); }}><Dialog.Portal>
    <Dialog.Overlay className="studio-overlay" />
    <Dialog.Content className={`studio studio-drawer ${draft.type === "works" ? "studio-drawer-wide" : ""}`}>
      <header className="studio-drawer-head"><div><p className="studio-kicker">{draft.type === "plans" ? "PLAN YOUR NEXT STEP" : draft.type === "learning" ? "LEARN BY MAKING" : "A WORK IN PROGRESS"}</p><Dialog.Title>{isNew ? "新建" : "编辑"}{draft.type === "plans" ? "计划" : draft.type === "learning" ? "学习记录" : "作品"}</Dialog.Title></div><button type="button" className="studio-icon" aria-label="关闭编辑器" onClick={close} disabled={uploading}><X size={20} /></button></header>
      <Dialog.Description className="studio-drawer-description">{draft.type === "works" ? "整理内容、检查预览，再决定是否公开。" : "写清下一步，给每一次实践留下记录。"}</Dialog.Description>
      <form onSubmit={submit} className="studio-entry-form">
        <div className="studio-form-scroll">
          <label>标题<input autoFocus required maxLength={200} value={draft.item.title} onChange={(e) => patch({ title: e.target.value })} placeholder="给这件事起一个明确的名字" /></label>
          {draft.type === "plans" && <>
            <div className="studio-fields"><label>截止日期<input type="date" value={draft.item.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} /></label><label>计划状态<select value={draft.item.status} onChange={(e) => patch({ status: e.target.value as Plan["status"] })}>{Object.entries(planLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
            <label>具体行动与完成标准<textarea rows={10} maxLength={100_000} value={draft.item.detail} onChange={(e) => patch({ detail: e.target.value })} placeholder="需要哪些材料？下一步做什么？做到什么程度算完成？" /></label>
            <p className="studio-hint">可以用 - [ ] 写下检查清单；日期会出现在今日总览和计划看板里。</p>
          </>}
          {draft.type === "learning" && <>
            <div className="studio-fields"><label>厂商<input maxLength={100} value={draft.item.vendor} onChange={(e) => patch({ vendor: e.target.value })} placeholder="如 OpenAI / Anthropic" /></label><label>工具 / 模型<input maxLength={100} value={draft.item.model} onChange={(e) => patch({ model: e.target.value })} placeholder="记录实际使用的工具与版本" /></label><label>适用工作<input maxLength={100} value={draft.item.work} onChange={(e) => patch({ work: e.target.value })} placeholder="如跑团记录 / 生图 / 写作" /></label><label>学习状态<select value={draft.item.status} onChange={(e) => patch({ status: e.target.value as Learning["status"] })}>{Object.entries(learningLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
            <label>可复用的工作流<textarea rows={7} maxLength={100_000} value={draft.item.workflow} onChange={(e) => patch({ workflow: e.target.value })} placeholder="按顺序记录输入、操作和检查标准" /></label>
            <label>提示词、参考与笔记<textarea rows={8} maxLength={100_000} value={draft.item.notes} onChange={(e) => patch({ notes: e.target.value })} /></label>
            <div className="studio-journal"><label>追加今天的实践记录<textarea rows={3} maxLength={5000} value={journal} onChange={(e) => setJournal(e.target.value)} placeholder="试了什么？哪里有效？下次改变什么？" /></label><small>保存时自动附上日期，追加到笔记末尾。</small></div>
            <button type="button" className="studio-button" onClick={() => { if (!draft.item.title.trim()) { setError("请先填写标题。"); return; } onCreateWork((withJournal() as { type: "learning"; item: Learning }).item); }}>保存记录并创建实践作品 <ExternalLink size={15} /></button>
          </>}
          {draft.type === "works" && <>
            <div className="studio-fields"><label>作品类型<select value={draft.item.kind} onChange={(e) => patch({ kind: e.target.value as Work["kind"] })}>{workKinds.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>可见范围<select value={draft.item.status} onChange={(e) => patch({ status: e.target.value as Work["status"] })}><option value="draft">私密草稿</option><option value="published">公开发布</option></select></label></div>
            {draft.item.status === "published" && <p className="studio-public-note">保存后，正文和封面会在公开作品集展示。请先确认已移除私人笔记与剧透。</p>}
            <label>作品简介<textarea rows={2} maxLength={2000} value={draft.item.summary} onChange={(e) => patch({ summary: e.target.value })} placeholder="用一两句话介绍这次创作" /></label>
            <label>封面地址<input maxLength={2000} value={draft.item.coverUrl} onChange={(e) => patch({ coverUrl: e.target.value })} placeholder="https:// 或 /content-assets/..." /></label>
            <input ref={fileInput} type="file" hidden accept="image/*" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
            <button type="button" className="studio-button" disabled={uploading} onClick={() => fileInput.current?.click()}><Upload size={15} />{uploading ? "图片上传中…" : "上传封面"}</button>
            <div className="studio-editor-tabs"><button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>编辑正文</button><button type="button" aria-pressed={preview} onClick={() => setPreview(true)}><Eye size={15} />预览效果</button>{!isNew && entry.type === "works" && entry.item.status === "published" && <Link to={`/portfolio/${draft.item.id}`} target="_blank">公开页面 <ExternalLink size={14} /></Link>}</div>
            {preview ? draft.item.kind === "html" ? <iframe className="studio-html" title="HTML 作品预览" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={draft.item.body} /> : <article className="prose studio-markdown"><WorkMarkdown body={draft.item.body || "暂无正文，返回编辑开始创作。"} /></article> : <label>{draft.item.kind === "html" ? "独立 HTML 源码" : "正文 · Markdown"}<textarea className="studio-source" rows={18} maxLength={500_000} value={draft.item.body} onChange={(e) => patch({ body: e.target.value })} placeholder={draft.item.kind === "html" ? "粘贴完整 HTML，CSS 与脚本可内联。" : "用 Markdown 写作，插入图片或 MP4 链接。"} /></label>}
          </>}
          {error && <p role="alert" className="studio-error">{error}</p>}
        </div>
        <footer className="studio-drawer-footer">{!isNew && <button type="button" className="studio-button studio-danger" disabled={uploading} onClick={() => { if (window.confirm("删除这个条目？删除后会同步到服务器。")) onDelete(); }}><Trash2 size={16} />删除</button>}<button type="button" className="studio-button" disabled={uploading} onClick={close}>取消</button><button className="studio-button studio-primary" disabled={uploading}><Save size={16} />{draft.type === "works" && draft.item.status === "published" ? "保存并公开发布" : "保存到工作台"}</button></footer>
      </form>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
