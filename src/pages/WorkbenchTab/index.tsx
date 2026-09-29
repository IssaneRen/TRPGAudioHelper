import { useEffect, useState } from "react";
import { Link } from "react-router";
import { WorkMarkdown } from "@/features/workbench/WorkMarkdown";
import { Download, ExternalLink, LockKeyhole, Plus, Save, Upload } from "lucide-react";
import { useAiSession } from "@/features/ai/use-ai-session";
import { uploadContentImage } from "@/features/content-admin/content-admin-client";
import { readWorkbench, saveWorkbench, type Learning, type Plan, type Work, type WorkbenchData, type WorkKind } from "@/features/workbench/workbench-client";
import "./workbench.css";

type Section = "plans" | "learning" | "works" | "backup";
const blank: WorkbenchData = { version: 1, plans: [], learning: [], works: [] };
const kinds: Array<[WorkKind, string]> = [["ai-comic", "AI 漫剧"], ["trpg-log", "跑团 Log"], ["ai-image", "AI 生图"], ["ai-novel", "AI 小说"], ["novel", "自写小说"], ["html", "HTML 作品"]];
const kindLabel = (kind: WorkKind) => kinds.find(([id]) => id === kind)?.[1] ?? kind;
const makeId = () => crypto.randomUUID().replace(/-/g, "");

export default function WorkbenchTab() {
  const auth = useAiSession();
  const [inputToken, setInputToken] = useState("");
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState<WorkbenchData>(blank);
  const [loaded, setLoaded] = useState(false);
  const [section, setSection] = useState<Section>("plans");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!auth.session?.isKeeper || !auth.token) return;
    let active = true;
    readWorkbench(auth.token).then((result) => { if (active) { setData(result); setLoaded(true); setDirty(false); } }).catch((err) => { if (active) setError(String(err)); });
    return () => { active = false; };
  }, [auth.session?.isKeeper, auth.token]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setLoginError("");
    try {
      const session = await auth.login(inputToken);
      if (!session.isKeeper) { auth.logout(); setLoginError("需要 KP Token。"); }
    } catch { setLoginError("Token 无效或 gateway 不可用。"); }
  }
  if (!auth.session?.isKeeper) return <main className="wb-login"><form onSubmit={login}><LockKeyhole size={28} /><p className="wb-eyebrow">PRIVATE WORKBENCH</p><h1>工作台</h1><p>输入 KP Token 后读取私人计划、学习记录和作品草稿。</p><input type="password" autoComplete="current-password" value={inputToken} onChange={(event) => setInputToken(event.target.value)} placeholder="KP Token" /><button disabled={auth.loading || !inputToken.trim()}>进入工作台</button>{(loginError || auth.error) && <small role="alert">{loginError || auth.error}</small>}</form></main>;
  if (!loaded) return <main className="wb-login"><div className="wb-loading"><p className="wb-eyebrow">PRIVATE WORKBENCH</p><h1>{error ? "读取失败" : "正在读取工作台…"}</h1>{error && <><p role="alert">{error}</p><button onClick={() => window.location.reload()}>重试</button></>}</div></main>;

  const items = section === "plans" ? data.plans : section === "learning" ? data.learning : section === "works" ? data.works : [];
  const selected = items.find((item) => item.id === selectedId);
  function change(next: WorkbenchData) { setData(next); setDirty(true); setNotice(""); }
  function updatePlan(patch: Partial<Plan>) { change({ ...data, plans: data.plans.map((item) => item.id === selectedId ? { ...item, ...patch } : item) }); }
  function updateLearning(patch: Partial<Learning>) { change({ ...data, learning: data.learning.map((item) => item.id === selectedId ? { ...item, ...patch } : item) }); }
  function updateWork(patch: Partial<Work>) { change({ ...data, works: data.works.map((item) => item.id === selectedId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) }); }
  function add() {
    const id = makeId();
    if (section === "plans") change({ ...data, plans: [...data.plans, { id, title: "新计划", detail: "", dueDate: "", status: "todo" }] });
    if (section === "learning") change({ ...data, learning: [...data.learning, { id, title: "新学习记录", vendor: "", model: "", work: "", workflow: "", notes: "", status: "planned" }] });
    if (section === "works") change({ ...data, works: [...data.works, { id, title: "新作品", kind: "novel", summary: "", body: "", coverUrl: "", status: "draft", updatedAt: new Date().toISOString() }] });
    setSelectedId(id);
  }
  function addHtmlWorkflow() {
    const id = makeId();
    const item: Learning = { id, title: "HTML 直接发布与 HyperFrames", vendor: "HeyGen", model: "HyperFrames", work: "HTML 动画与视频", workflow: "1. 用 HTML / CSS / 媒体制作作品。\n2. 在工作台作品编辑器选择 HTML，粘贴源码并预览。\n3. 保存为草稿，确认效果后切换为发布并再次保存；作品立即通过 /portfolio/<id> 访问。\n4. 如需 MP4，按 HyperFrames 官方流程 lint、preview、render 后另行保存视频链接。", notes: "参考：https://github.com/heygen-com/hyperframes\n工作台发布 HTML 页面；HyperFrames 的视频渲染是另一步。", status: "planned" };
    change({ ...data, learning: [...data.learning, item] }); setSelectedId(id);
  }
  async function save(next = data) {
    setBusy(true); setError("");
    try { setData(await saveWorkbench(auth.token, next)); setDirty(false); setNotice("已加密保存到服务器"); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `issane-workbench-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  }
  async function importData(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as WorkbenchData;
      if (parsed.version !== 1 || !Array.isArray(parsed.plans) || !Array.isArray(parsed.learning) || !Array.isArray(parsed.works)) throw new Error("文件不是工作台 v1 备份");
      if (!window.confirm("导入会替换服务器上的全部工作台数据。请确认已导出当前备份。")) return;
      await save(parsed); setSelectedId("");
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }
  async function uploadCover(file?: File) {
    if (!file) return;
    setBusy(true);
    try { const result = await uploadContentImage(auth.token, file); updateWork({ coverUrl: result.url }); setNotice("图片已上传；请保存作品以记录封面地址"); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }
  function remove() {
    if (!selected || !window.confirm("删除此条目？保存后生效。")) return;
    if (section === "plans") change({ ...data, plans: data.plans.filter((item) => item.id !== selectedId) });
    if (section === "learning") change({ ...data, learning: data.learning.filter((item) => item.id !== selectedId) });
    if (section === "works") change({ ...data, works: data.works.filter((item) => item.id !== selectedId) });
    setSelectedId("");
  }

  return <main className="wb"><header className="wb-header"><div><p className="wb-eyebrow">ISSANE / PRIVATE SPACE</p><h1>工作台</h1></div><div className="wb-header-actions"><span>{dirty ? "有未保存修改" : "已同步"}</span><button onClick={() => void save()} disabled={busy || !dirty}><Save size={16} />保存全部</button><button className="wb-quiet" onClick={auth.logout}>退出</button></div></header>
    <nav className="wb-nav" aria-label="工作台栏目">{([ ["plans", "个人计划"], ["learning", "AI 学习"], ["works", "作品编辑"], ["backup", "导入导出"] ] as const).map(([id, label]) => <button key={id} className={section === id ? "active" : ""} onClick={() => { setSection(id); setSelectedId(""); }}>{label}</button>)}</nav>
    {(error || notice) && <p className={error ? "wb-alert" : "wb-notice"} role="status">{error || notice}</p>}
    {section === "learning" && <div className="wb-tip"><span>从 HTML 作品发布流程开始学习？</span><button onClick={addHtmlWorkflow}>添加 HyperFrames 学习模板</button><a href="https://github.com/heygen-com/hyperframes" target="_blank" rel="noreferrer">官方仓库 ↗</a></div>}
    {section === "backup" ? <section className="wb-backup"><p className="wb-eyebrow">PORTABLE ARCHIVE</p><h2>数据备份</h2><p>导出包含计划、学习记录和所有作品草稿的 JSON。下载文件是明文，请自行妥善保管。导入会先校验格式，再替换整份数据。</p><p>如果上传过站内图片，还需到 <Link to="/admin/content" target="_blank">内容后台</Link>导出 ZIP；完整迁移时先导入 ZIP，再导入此处的 JSON。外部媒体 URL 不包含在备份文件里。</p><div><button onClick={exportData}><Download size={16} />导出全部</button><label className="wb-upload"><Upload size={16} />导入 JSON<input type="file" accept="application/json,.json" onChange={(event) => { void importData(event.target.files?.[0]); event.target.value = ""; }} /></label></div></section> : <div className="wb-grid"><aside className="wb-list"><div className="wb-list-head"><h2>{section === "plans" ? "计划" : section === "learning" ? "学习档案" : "作品"}</h2><button onClick={add} aria-label="新建"><Plus size={17} /></button></div>{items.length === 0 && <p className="wb-empty">还没有条目，点击 + 新建。</p>}{items.map((item) => <button key={item.id} className={`wb-row ${selectedId === item.id ? "active" : ""}`} onClick={() => setSelectedId(item.id)}><strong>{item.title}</strong><small>{"kind" in item ? kindLabel(item.kind) : "vendor" in item ? `${item.vendor} · ${item.model}` : item.dueDate || "未设日期"}</small></button>)}</aside><section className="wb-editor">{!selected ? <div className="wb-placeholder"><p className="wb-eyebrow">SELECT AN ENTRY</p><h2>选择或新建条目</h2><p>工作台内容仅在你点击“保存全部”后写入服务器。</p></div> : section === "plans" ? <><p className="wb-eyebrow">PERSONAL PLAN</p><h2>编辑计划</h2><label>标题<input value={(selected as Plan).title} onChange={(e) => updatePlan({ title: e.target.value })} /></label><div className="wb-fields"><label>截止日期<input type="date" value={(selected as Plan).dueDate} onChange={(e) => updatePlan({ dueDate: e.target.value })} /></label><label>状态<select value={(selected as Plan).status} onChange={(e) => updatePlan({ status: e.target.value as Plan["status"] })}><option value="todo">待办</option><option value="doing">进行中</option><option value="done">完成</option></select></label></div><label>备注<textarea rows={12} value={(selected as Plan).detail} onChange={(e) => updatePlan({ detail: e.target.value })} /></label><button className="wb-danger" onClick={remove}>删除计划</button></> : section === "learning" ? <><p className="wb-eyebrow">AI LEARNING RECORD</p><h2>编辑学习档案</h2><label>主题<input value={(selected as Learning).title} onChange={(e) => updateLearning({ title: e.target.value })} /></label><div className="wb-fields"><label>厂商<input value={(selected as Learning).vendor} onChange={(e) => updateLearning({ vendor: e.target.value })} placeholder="OpenAI / Anthropic / Google" /></label><label>模型<input value={(selected as Learning).model} onChange={(e) => updateLearning({ model: e.target.value })} /></label><label>适用工作<input value={(selected as Learning).work} onChange={(e) => updateLearning({ work: e.target.value })} placeholder="写作 / 编程 / 生图" /></label><label>状态<select value={(selected as Learning).status} onChange={(e) => updateLearning({ status: e.target.value as Learning["status"] })}><option value="planned">待学习</option><option value="learning">学习中</option><option value="learned">已掌握</option></select></label></div><label>工作流步骤<textarea rows={8} value={(selected as Learning).workflow} onChange={(e) => updateLearning({ workflow: e.target.value })} /></label><label>学习记录与心得<textarea rows={8} value={(selected as Learning).notes} onChange={(e) => updateLearning({ notes: e.target.value })} /></label><button className="wb-danger" onClick={remove}>删除记录</button></> : <><p className="wb-eyebrow">PORTFOLIO STUDIO</p><h2>编辑作品</h2><label>标题<input value={(selected as Work).title} onChange={(e) => updateWork({ title: e.target.value })} /></label><div className="wb-fields"><label>类型<select value={(selected as Work).kind} onChange={(e) => updateWork({ kind: e.target.value as WorkKind })}>{kinds.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label>状态<select value={(selected as Work).status} onChange={(e) => updateWork({ status: e.target.value as Work["status"] })}><option value="draft">草稿 · 私密</option><option value="published">发布 · 公开</option></select></label></div><label>简介<textarea rows={3} value={(selected as Work).summary} onChange={(e) => updateWork({ summary: e.target.value })} /></label><label>封面 URL<input value={(selected as Work).coverUrl} onChange={(e) => updateWork({ coverUrl: e.target.value })} placeholder="https:// 或 /content-assets/..." /></label><label className="wb-upload wb-upload-inline"><Upload size={16} />上传封面图片<input type="file" accept="image/*" onChange={(e) => { void uploadCover(e.target.files?.[0]); e.target.value = ""; }} /></label><label>{(selected as Work).kind === "html" ? "HTML 源码（保存后直接上线，无需重新部署）" : "正文 Markdown（图片与视频链接可直接展示）"}<textarea className="wb-source" rows={18} value={(selected as Work).body} onChange={(e) => updateWork({ body: e.target.value })} /></label><div className="wb-preview-head"><h3>预览</h3>{(selected as Work).status === "published" && <Link to={`/portfolio/${selectedId}`} target="_blank">公开页面 <ExternalLink size={14} /></Link>}</div>{(selected as Work).kind === "html" ? <iframe title="HTML 作品预览" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={(selected as Work).body} className="wb-html-preview" /> : <article className="prose wb-markdown"><WorkMarkdown body={(selected as Work).body} /></article>}<button className="wb-danger" onClick={remove}>删除作品</button></>}</section></div>}
  </main>;
}
