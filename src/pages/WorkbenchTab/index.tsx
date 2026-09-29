import { useRef, useState } from "react";
import { Link } from "react-router";
import { Dialog } from "radix-ui";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronRight, Circle, CloudCheck, CloudUpload, Copy, Download, ExternalLink, FileCode2, FolderOpen, Layers3, LayoutDashboard, ListTodo, Loader2, LockKeyhole, LogOut, Plus, Search, Sparkles, Upload, X } from "lucide-react";
import { useAiSession } from "@/features/ai/use-ai-session";
import { useWorkbench } from "@/features/workbench/use-workbench";
import type { Learning, Plan, Work, WorkbenchData } from "@/features/workbench/workbench-client";
import { focusPlans, kindLabel, learningLabels, localDate, matchesDate, newLearning, newPlan, newWork, parseBackup, planLabels, workKinds, type DateFilter } from "@/features/workbench/workbench-model";
import { startWorkflow, workflowTemplates, workFromTemplate, type WorkflowTemplate } from "@/features/workbench/workbench-templates";
import { EntryEditor, type Entry } from "./EntryEditor";
import "./workbench.css";
import "./studio.css";

type Section = "home" | "plans" | "learning" | "library" | "works" | "backup";
const navigation = [
  { id: "home", label: "今日总览", icon: LayoutDashboard },
  { id: "plans", label: "计划看板", icon: ListTodo },
  { id: "learning", label: "学习笔记", icon: BookOpen },
  { id: "library", label: "工作流模板", icon: Layers3 },
  { id: "works", label: "创作空间", icon: FolderOpen },
  { id: "backup", label: "数据备份", icon: ArrowDownToLine },
] as const;
const headings: Record<Section, [string, string]> = {
  home: ["把想法，慢慢做成作品。", "计划、学习、创作，在这里接着往前走。"],
  plans: ["每一步，都看得见。", "整理待办、推动进度，把完成的事情好好收起来。"],
  learning: ["学过的，变成自己的。", "留下工具、方法与实践记录，下次从这里开始。"],
  library: ["找个起点，开始动手。", "六份可复用的创作流程，附步骤、提示词和产出模板。"],
  works: ["你的创作，正在发生。", "收集故事、图像与实验，从第一稿到公开发布。"],
  backup: ["让每一份积累，都能带走。", "导出完整记录，或从以前的备份恢复工作台。"],
};

export default function WorkbenchTab() {
  const auth = useAiSession();
  const [tokenInput, setTokenInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setLoginError(""); setLoggingIn(true);
    try { const session = await auth.login(tokenInput); if (!session.isKeeper) { auth.logout(); setLoginError("需要 KP Token 才能进入私人工作台。"); } }
    catch { setLoginError("登录失败，请检查 Token 和网络连接。"); }
    finally { setLoggingIn(false); }
  }
  if (auth.session?.isKeeper) return <Workspace key={auth.token} token={auth.token} logout={auth.logout} />;
  return <main className="studio studio-login"><section className="studio-login-story"><Link to="/" className="studio-brand"><span className="studio-monogram">i.</span><span>ISSANE<small>PERSONAL STUDIO</small></span></Link><p className="studio-kicker">A PLACE FOR YOUR NEXT IDEA</p><h1>让想法有个落脚点。<br /><em>让创作有下一步。</em></h1><p>写下计划，试一种新方法，<br />把练习留成自己的作品。</p><div className="studio-login-samples"><div><ListTodo /><strong>安排今天</strong><span>计划与行动看板</span></div><div><Layers3 /><strong>动手实践</strong><span>六份创作工作流</span></div><div><FolderOpen /><strong>留下作品</strong><span>从草稿到公开分享</span></div></div></section><section className="studio-login-panel"><form onSubmit={login}><LockKeyhole size={25} /><p className="studio-kicker">YOUR PRIVATE SPACE</p><h2>回到工作台</h2><p>使用 KP Token 进入你的私人创作空间。</p><label>KP Token<input type="password" autoComplete="current-password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="输入你的 KP Token" /></label><button className="studio-button studio-primary" disabled={auth.loading || loggingIn || !tokenInput.trim()}>{auth.loading || loggingIn ? "正在验证…" : "进入工作台"}<ArrowRight size={17} /></button>{(loginError || auth.error) && <p className="studio-error" role="alert">{loginError || auth.error}</p>}<small><LockKeyhole size={13} />私人记录加密保存，作品由你决定是否公开。</small></form></section></main>;
}

function Workspace({ token, logout }: { token: string; logout: () => void }) {
  const store = useWorkbench(token);
  const [section, setSection] = useState<Section>("home");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [editor, setEditor] = useState<Entry | null>(null);
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [capture, setCapture] = useState("");
  const [captureDate, setCaptureDate] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const now = new Date();
  const today = localDate(now);
  const data = store.data;
  function navigate(next: Section) { setSection(next); setFilter("all"); setQuery(""); setNotice(""); }
  function update(change: (current: WorkbenchData) => WorkbenchData) {
    store.change(change);
    setActionError("");
  }
  function commit(entry: Entry) {
    const item = entry.type === "works" ? { ...entry.item, updatedAt: new Date().toISOString() } : entry.item;
    update((current) => ({ ...current, [entry.type]: current[entry.type].some((row) => row.id === item.id) ? current[entry.type].map((row) => row.id === item.id ? item : row) : [...current[entry.type], item] }));
    setEditor(null); setNotice("已加入工作台。");
  }
  function removeEntry() {
    if (!editor) return;
    update((current) => ({ ...current, [editor.type]: current[editor.type].filter((row) => row.id !== editor.item.id) }));
    setEditor(null); setNotice("条目已删除。");
  }
  function quickPlan(event: React.FormEvent) {
    event.preventDefault(); if (!capture.trim()) return;
    const item = newPlan(capture.trim(), captureDate);
    update((current) => ({ ...current, plans: [...current.plans, item] }));
    setCapture(""); setNotice("计划已加入看板。");
  }
  function setPlanStatus(item: Plan, status: Plan["status"]) { update((current) => ({ ...current, plans: current.plans.map((row) => row.id === item.id ? { ...row, status } : row) })); }
  function beginWorkflow(item: WorkflowTemplate) {
    const result = startWorkflow(item);
    update((current) => ({ ...current, learning: [...current.learning, result.learning], plans: [...current.plans, ...result.plans] }));
    setTemplate(null); setDateFilter("all"); navigate("plans"); setNotice(`「${item.title}」已加入学习笔记，并创建了 4 个具体步骤。`);
  }
  function createFromLearning(item: Learning) {
    commit({ type: "learning", item });
    const draft = newWork(item.work.includes("生图") ? "ai-image" : item.work.includes("跑团") ? "trpg-log" : "novel");
    setEditor({ type: "works", item: { ...draft, title: `${item.title} · 实践作品`.slice(0, 200), summary: `关于「${item.title}」的一次实践。`, body: "# 实践作品\n\n## 作品内容\n\n## 创作说明\n" } });
    navigate("works");
  }
  function exportData() {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `issane-workbench-${today}.json`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("备份已导出，包含当前工作台中的全部记录。");
  }
  async function importData(file?: File) {
    if (!file || !data) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("备份超过 2 MB，无法导入。");
      const parsed = parseBackup(JSON.parse(await file.text()));
      if (!window.confirm(`将用备份中的 ${parsed.plans.length} 个计划、${parsed.learning.length} 条学习记录、${parsed.works.length} 个作品替换当前数据。请先导出当前备份。确认导入？`)) return;
      update(() => parsed); setNotice("备份已载入，正在同步。请等待右上角显示已保存。");
    } catch (err) { setActionError(err instanceof Error ? err.message : String(err)); }
  }
  async function copyPrompt(item: WorkflowTemplate) {
    try { await navigator.clipboard.writeText(item.prompt); setCopied(true); }
    catch { setActionError("未能访问剪贴板，请在提示词框中全选复制。"); }
  }
  if (!data) return <main className="studio studio-load"><div><span className="studio-monogram">i.</span><h1>{store.error ? "暂时无法打开工作台" : "正在打开你的工作台…"}</h1><p role="status">{store.error || "读取计划、学习笔记和作品"}</p>{store.error && <button className="studio-button studio-primary" onClick={store.retry}>重新读取</button>}</div></main>;
  const match = (...values: string[]) => values.join(" ").toLowerCase().includes(query.trim().toLowerCase());
  const plans = data.plans.filter((p) => match(p.title, p.detail) && matchesDate(p, dateFilter, now));
  const learning = data.learning.filter((p) => match(p.title, p.vendor, p.model, p.work, p.notes) && (filter === "all" || p.status === filter));
  const works = data.works.filter((p) => match(p.title, p.summary, kindLabel(p.kind)) && (filter === "all" || p.kind === filter || p.status === filter)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const templates = workflowTemplates.filter((p) => match(p.title, p.subtitle, p.category, p.tool) && (filter === "all" || p.category === filter));
  const focused = focusPlans(data.plans, now).slice(0, 4);
  const overdue = data.plans.filter((p) => matchesDate(p, "overdue", now)).length;
  const completed = data.plans.filter((p) => p.status === "done").length;
  const stats = [
    { label: "待推进计划", count: data.plans.length - completed, hint: overdue ? `${overdue} 项已逾期` : "给下一步留个位置", section: "plans" as const, icon: ListTodo },
    { label: "正在实践", count: data.learning.filter((p) => p.status === "learning").length, hint: `${data.learning.length} 条学习积累`, section: "learning" as const, icon: BookOpen },
    { label: "作品草稿", count: data.works.filter((p) => p.status === "draft").length, hint: `${data.works.filter((p) => p.status === "published").length} 件已公开`, section: "works" as const, icon: FileCode2 },
  ];
  function openTemplate(item: WorkflowTemplate) { setCopied(false); setTemplate(item); }
  function templateCard(item: WorkflowTemplate, compact = false) {
    return <button key={item.id} className={`studio-template ${compact ? "compact" : ""}`} onClick={() => openTemplate(item)}><div className={`studio-template-art tone-${item.tone}`}><span>{item.category}</span><strong>{item.mark}</strong><div className="studio-art-lines" aria-hidden="true"><i /><i /><i /></div><small>CREATIVE FIELD NOTES</small></div><div className="studio-template-copy"><div><span>{item.duration}</span><ArrowUpRight size={17} /></div><h3>{item.title}</h3><p>{item.subtitle}</p><small>4 个步骤 · 提示词 · 作品骨架</small></div></button>;
  }
  function workCard(item: Work) {
    return <button className="studio-work-card" key={item.id} onClick={() => setEditor({ type: "works", item })}><div className={`studio-work-cover tone-${workflowTemplates.find((p) => p.kind === item.kind)?.tone || "sand"}`}>{item.coverUrl ? <img src={item.coverUrl} alt="" loading="lazy" /> : <><span>{kindLabel(item.kind)}</span><strong>{item.title.slice(0, 28)}</strong><small>ISSANE / ORIGINAL WORK</small></>}<span className={`studio-work-state ${item.status}`}>{item.status === "draft" ? <LockKeyhole size={12} /> : <ExternalLink size={12} />}{item.status === "draft" ? "私密草稿" : "已公开"}</span></div><div className="studio-work-copy"><small>{kindLabel(item.kind)} · {item.updatedAt.slice(0, 10)}</small><h3>{item.title}</h3><p>{item.summary || "还没有简介，继续完善这个作品。"}</p><span>继续编辑 <ArrowRight size={14} /></span></div></button>;
  }
  const captureForm = <form className="studio-capture" onSubmit={quickPlan}><Plus size={18} aria-hidden="true" /><input aria-label="快速记录计划" maxLength={200} value={capture} onChange={(e) => setCapture(e.target.value)} placeholder="想到一件事？记下来，稍后开始…" /><input aria-label="快速计划截止日期" type="date" value={captureDate} onChange={(e) => setCaptureDate(e.target.value)} /><button className="studio-button studio-primary" disabled={!capture.trim()}>加入计划 <ArrowRight size={15} /></button></form>;
  const empty = (title: string, detail: string, action: string, click: () => void) => <div className="studio-empty"><span className="studio-empty-icon"><Sparkles size={22} /></span><h3>{title}</h3><p>{detail}</p><button className="studio-button" onClick={click}>{action}<ArrowRight size={15} /></button></div>;

  return <main className="studio studio-shell">
    <aside className="studio-sidebar"><Link to="/" className="studio-brand" onClick={(event) => { if (store.dirty && !window.confirm("还有内容未同步，仍要离开工作台？")) event.preventDefault(); }}><span className="studio-monogram">i.</span><span>ISSANE<small>PERSONAL STUDIO</small></span></Link><p className="studio-nav-label">我的工作台</p><nav aria-label="工作台导航">{navigation.map(({ id, label, icon: Icon }) => <button key={id} aria-current={section === id ? "page" : undefined} className={section === id ? "active" : ""} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{id === "library" && <small>6</small>}{id === "plans" && data.plans.length > completed && <small>{data.plans.length - completed}</small>}</button>)}</nav><div className="studio-sidebar-bottom"><div className="studio-side-note"><span>MAKE A LITTLE<br />SOMETHING, EVERY DAY.</span><p>不必一次完成。<br />今天往前走一点就好。</p></div><Link to="/portfolio" target="_blank"><ExternalLink size={16} />查看公开作品集</Link><button onClick={() => { if (!store.dirty || window.confirm("还有内容未同步到服务器。现在退出可能丢失修改，仍要退出？")) logout(); }}><LogOut size={16} />退出工作台</button><small><LockKeyhole size={12} />私人空间 · 加密存储</small></div></aside>
    <div className="studio-main"><header className="studio-topbar"><div className="studio-breadcrumb">工作台 <ChevronRight size={14} /><strong>{navigation.find((p) => p.id === section)?.label}</strong></div><div className={`studio-sync ${store.error ? "failed" : ""}`} role="status">{store.error ? <Circle size={14} /> : store.busy ? <Loader2 size={15} className="studio-spin" /> : store.dirty ? <CloudUpload size={16} /> : <CloudCheck size={16} />}<span>{store.error ? "同步失败" : store.busy ? "保存中…" : store.dirty ? "等待保存" : "已保存到服务器"}</span></div><Link className="studio-mobile-action" to="/portfolio" target="_blank" aria-label="查看公开作品集"><ExternalLink size={16} /></Link><button className="studio-mobile-action" aria-label="退出工作台" onClick={() => { if (!store.dirty || window.confirm("还有内容未同步，仍要退出？")) logout(); }}><LogOut size={16} /></button><span className="studio-avatar" aria-label="私人工作台">I</span></header>
      <div className="studio-content"><div className="studio-page-head"><div><p className="studio-kicker">{section === "home" ? now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" }) : `ISSANE / ${section.toUpperCase()}`}</p><h1>{headings[section][0]}</h1><p>{headings[section][1]}</p></div>{section === "plans" || section === "learning" || section === "works" ? <button className="studio-button studio-primary" onClick={() => setEditor(section === "plans" ? { type: "plans", item: newPlan() } : section === "learning" ? { type: "learning", item: newLearning() } : { type: "works", item: newWork() })}><Plus size={17} />{section === "plans" ? "新计划" : section === "learning" ? "写笔记" : "新作品"}</button> : section === "home" ? <button className="studio-button" onClick={() => navigate("library")}><Sparkles size={16} />找个创作灵感</button> : null}</div>
        {(store.error || actionError) && <div className="studio-banner studio-error" role="alert"><span>{store.error ? `保存未完成：${store.error}。当前修改仍保留在此页面。` : actionError}</span>{store.error && <><button onClick={store.retry}>重试同步</button><button onClick={exportData}>先导出备份</button></>}</div>}
        {notice && <div className="studio-banner" role="status"><CheckCircle2 size={16} /><span>{notice}</span><button aria-label="关闭提示" onClick={() => setNotice("")}><X size={15} /></button></div>}

        {section === "home" && <>
          <div className="studio-stats">{stats.map(({ label, count, hint, section: target, icon: Icon }) => <button key={label} onClick={() => navigate(target)}><span className="studio-stat-icon"><Icon size={20} /></span><div><span>{label}</span><strong>{String(count).padStart(2, "0")}</strong></div><small>{hint}<ArrowUpRight size={14} /></small></button>)}</div>
          {captureForm}
          <div className="studio-home-grid"><section className="studio-panel"><div className="studio-section-title"><h2>接下来做什么 <span>NEXT UP</span></h2><button onClick={() => navigate("plans")}>全部计划 <ArrowRight size={15} /></button></div>{focused.length ? <div className="studio-focus-list">{focused.map((item) => <div key={item.id}><button className="studio-check" aria-label={`完成计划：${item.title}`} onClick={() => setPlanStatus(item, "done")}><Circle size={21} /></button><button className="studio-focus-item" onClick={() => setEditor({ type: "plans", item })}><strong>{item.title}</strong><small className={item.dueDate && item.dueDate < today ? "overdue" : ""}>{item.dueDate ? item.dueDate < today ? `${item.dueDate} · 已逾期` : item.dueDate === today ? "今天截止" : `${item.dueDate} 截止` : "未设截止日期"} · {planLabels[item.status]}</small></button><ArrowUpRight size={16} /></div>)}</div> : <div className="studio-start"><div className="studio-start-symbol" aria-hidden="true">01<span>START SMALL</span></div><h3>{data.plans.length ? "这一轮，全部完成。" : "从一个小计划开始。"}</h3><p>{data.plans.length ? "留一点时间回看成果，或者开启下一个创作。" : "写下今天最想推进的事，或从工作流里带走四个明确的步骤。"}</p><button className="studio-button" onClick={() => setEditor({ type: "plans", item: newPlan("", today) })}>写下今天的计划 <Plus size={15} /></button></div>}</section>
          <section className="studio-feature"><div className="studio-feature-top"><span>本周可以试试</span><FileCode2 size={24} /></div><p className="studio-kicker">SMALL EXPERIMENT / 01</p><h2>一封信，<br />也能成为互动作品。</h2><p>从一个可运行的 HTML 模板开始。<br />改一段故事，预览，再分享给别人。</p><button onClick={() => { navigate("works"); setEditor({ type: "works", item: workFromTemplate(workflowTemplates[4]) }); }}>打开互动信件模板 <ArrowRight size={17} /></button><span className="studio-feature-index" aria-hidden="true">&lt;/&gt;</span></section></div>
          <div className="studio-section-title"><h2>把好方法，变成自己的 <span>WORKFLOW PICKS</span></h2><button onClick={() => navigate("library")}>全部 6 份工作流 <ArrowRight size={15} /></button></div><div className="studio-template-grid home">{workflowTemplates.slice(0, 3).map((item) => templateCard(item, true))}</div>
          <div className="studio-section-title"><h2>接着上次的创作 <span>YOUR WORKS</span></h2><button onClick={() => navigate("works")}>进入创作空间 <ArrowRight size={15} /></button></div>{data.works.length ? <div className="studio-work-grid">{[...data.works].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3).map(workCard)}</div> : <div className="studio-inline-empty"><FolderOpen size={24} /><div><strong>第一件作品，从这里开始。</strong><p>可以写故事、整理跑团记录，或粘贴一个 HTML 实验。</p></div><button className="studio-button" onClick={() => { navigate("works"); setEditor({ type: "works", item: newWork() }); }}>创建作品 <Plus size={15} /></button></div>}
        </>}

        {section !== "home" && section !== "backup" && <div className="studio-toolbar"><label className="studio-search"><Search size={17} /><input aria-label="搜索当前栏目" placeholder={section === "library" ? "搜索工作流、工具、创作方向…" : "搜索标题、内容或标签…"} value={query} onChange={(e) => setQuery(e.target.value)} />{query && <button aria-label="清空搜索" onClick={() => setQuery("")}><X size={15} /></button>}</label>{section === "plans" && <span className="studio-hint">已完成 {completed} / {data.plans.length}</span>}{section === "works" && <Link to="/portfolio" target="_blank">查看公开作品集 <ExternalLink size={14} /></Link>}</div>}
        {section === "plans" && <>
          <div className="studio-filters" aria-label="计划日期筛选">{([["all", "全部计划"], ["today", "今天"], ["week", "本周剩余"], ["overdue", `已逾期${overdue ? ` · ${overdue}` : ""}`]] as const).map(([key, label]) => <button key={key} aria-pressed={dateFilter === key} onClick={() => setDateFilter(key)}>{label}</button>)}</div>{captureForm}
          <div className="studio-board">{(["todo", "doing", "done"] as const).map((status) => <section className={`studio-column column-${status}`} key={status}><h2><span className="studio-dot" />{planLabels[status]}<small>{plans.filter((p) => p.status === status).length}</small><button aria-label={`新增${planLabels[status]}计划`} onClick={() => setEditor({ type: "plans", item: { ...newPlan(), status } })}><Plus size={16} /></button></h2>{plans.filter((p) => p.status === status).map((item) => <article className="studio-task" key={item.id}><button className="studio-task-open" onClick={() => setEditor({ type: "plans", item })}><span className="studio-task-kind">PERSONAL PLAN</span><h3>{item.title}</h3>{item.detail && <p>{item.detail}</p>}</button><div className="studio-task-footer"><span className={item.dueDate && item.dueDate < today && status !== "done" ? "overdue" : ""}>{item.dueDate || "未设日期"}</span><select aria-label={`${item.title}的状态`} value={status} onChange={(e) => setPlanStatus(item, e.target.value as Plan["status"])}>{Object.entries(planLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div></article>)}{!plans.some((p) => p.status === status) && <p className="studio-column-empty">{query || dateFilter !== "all" ? "没有符合筛选的计划" : status === "done" ? "完成的计划会留在这里" : status === "doing" ? "挑一件待办，开始推进" : "记下想做的下一件事"}</p>}<button className="studio-column-add" onClick={() => setEditor({ type: "plans", item: { ...newPlan(), status } })}><Plus size={15} />添加计划</button></section>)}</div>
        </>}
        {section === "learning" && <><div className="studio-filters">{[["all", "全部笔记"], ...Object.entries(learningLabels)].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>{learning.length ? <div className="studio-learning-grid">{learning.map((item) => <article className="studio-learning-card" key={item.id}><div><span className={`studio-badge badge-${item.status}`}>{learningLabels[item.status]}</span><BookOpen size={20} /></div><button className="studio-learning-open" onClick={() => setEditor({ type: "learning", item })}><h2>{item.title}</h2><p>{item.workflow || "写下你的方法，让下一次实践更轻松。"}</p></button><div className="studio-tags">{[item.vendor, item.model, item.work].filter(Boolean).map((tag, i) => <span key={i}>{tag}</span>)}</div><footer><button onClick={() => setEditor({ type: "learning", item })}>继续记录 <ArrowRight size={15} /></button><button aria-label={`将${item.title}标记为${item.status === "learned" ? "实践中" : "已掌握"}`} onClick={() => update((current) => ({ ...current, learning: current.learning.map((row) => row.id === item.id ? { ...row, status: row.status === "learned" ? "learning" : "learned" } : row) }))}><Check size={16} />{item.status === "learned" ? "再练一次" : "标记掌握"}</button></footer></article>)}</div> : empty(query || filter !== "all" ? "没有找到这类笔记" : "边做边学，留下第一条记录。", "可以从模板带入完整步骤和提示词，也可以记录自己的方法。", "浏览工作流模板", () => navigate("library"))}</>}
        {section === "library" && <><div className="studio-filters">{["all", ...new Set(workflowTemplates.map((p) => p.category))].map((category) => <button key={category} aria-pressed={filter === category} onClick={() => setFilter(category)}>{category === "all" ? "全部灵感" : category}</button>)}</div><div className="studio-library-note"><Sparkles size={16} /><span>选择一份工作流，带走步骤和提示词。预计时长仅供安排练习参考。</span></div>{templates.length ? <div className="studio-template-grid">{templates.map((item) => templateCard(item))}</div> : empty("没有匹配的工作流", "换一个关键词，或者查看所有创作方向。", "清除筛选", () => { setQuery(""); setFilter("all"); })}</>}
        {section === "works" && <><div className="studio-filters">{[["all", "全部作品"], ["draft", "私密草稿"], ["published", "已公开"], ...workKinds].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>{works.length ? <div className="studio-work-grid">{works.map(workCard)}</div> : empty(query || filter !== "all" ? "没有匹配的作品" : "你的第一件作品，还差一个开始。", "用模板搭好骨架，把注意力留给内容。HTML 模板可以直接预览和修改。", "从模板开始创作", () => navigate("library"))}</>}
        {section === "backup" && <div className="studio-backup-grid"><section className="studio-panel studio-backup-card"><span className="studio-empty-icon"><Download size={24} /></span><h2>带走你的全部积累</h2><p>导出计划、学习笔记、作品正文与媒体地址。文件为可读的 JSON，请妥善保管。</p><div className="studio-backup-counts"><span><strong>{data.plans.length}</strong>计划</span><span><strong>{data.learning.length}</strong>学习笔记</span><span><strong>{data.works.length}</strong>作品</span></div><button className="studio-button studio-primary" onClick={exportData}><Download size={16} />导出完整 JSON</button></section><section className="studio-panel studio-backup-card"><span className="studio-empty-icon"><Upload size={24} /></span><h2>从备份继续</h2><p>导入前会检查每条记录的结构，并显示条目数量。确认后替换整份工作台数据。</p><div className="studio-backup-warning">先导出当前数据，再导入旧备份，避免覆盖最近的积累。</div><input ref={importInput} type="file" accept="application/json,.json" hidden onChange={(e) => { void importData(e.target.files?.[0]); e.target.value = ""; }} /><button className="studio-button" disabled={store.busy} onClick={() => importInput.current?.click()}><Upload size={16} />选择 JSON 备份</button></section><section className="studio-backup-media"><LockKeyhole size={20} /><div><h3>关于图片与视频</h3><p>JSON 保存媒体地址，不包含图片、视频文件。站内图片请到 <Link to="/admin/content" target="_blank">内容后台</Link> 另行导出 ZIP；迁移时先恢复图片，再导入工作台 JSON。外部媒体需自行备份。</p></div></section></div>}
        <footer className="studio-page-footer"><span>ISSANE PERSONAL STUDIO</span><span>一点点积累，也会成为作品。</span></footer>
      </div>
    </div>
    {editor && <EntryEditor key={`${editor.type}-${editor.item.id}`} entry={editor} token={token} isNew={!data[editor.type].some((p) => p.id === editor.item.id)} onClose={() => setEditor(null)} onSave={commit} onDelete={removeEntry} onCreateWork={createFromLearning} />}
    <Dialog.Root open={Boolean(template)} onOpenChange={(open) => { if (!open) setTemplate(null); }}><Dialog.Portal><Dialog.Overlay className="studio-overlay" /><Dialog.Content className="studio studio-template-dialog">{template && <><div className={`studio-template-dialog-art tone-${template.tone}`}><span>{template.category} / {template.duration}</span><strong>{template.mark}</strong><Dialog.Close className="studio-icon" aria-label="关闭工作流"><X size={20} /></Dialog.Close></div><div className="studio-template-detail"><p className="studio-kicker">YOUR NEXT CREATIVE WORKFLOW</p><Dialog.Title>{template.title}</Dialog.Title><Dialog.Description>{template.subtitle}</Dialog.Description><div className="studio-output"><span>目标产出</span><strong>{template.output}</strong><small>工具：{template.tool}</small></div><h3>跟着这四步做</h3><ol className="studio-steps">{template.steps.map((step, i) => <li key={step}><span>{String(i + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol><div className="studio-section-title"><h3>带走这份提示词</h3><button onClick={() => void copyPrompt(template)}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "已复制" : "复制提示词"}</button></div><textarea className="studio-prompt" aria-label="工作流提示词" readOnly value={template.prompt} rows={7} /><a className="studio-source-link" href={template.source.url} target="_blank" rel="noreferrer">{template.source.title} <ExternalLink size={14} /></a><p className="studio-hint">工作台负责记录与发布；提示词需复制到你使用的 AI 工具中执行。</p></div><footer className="studio-template-actions"><button className="studio-button" onClick={() => { setEditor({ type: "works", item: workFromTemplate(template) }); setTemplate(null); navigate("works"); }}>只创建作品草稿</button><button className="studio-button studio-primary" onClick={() => beginWorkflow(template)}><Plus size={16} />开始实践 · 加入 4 步计划</button></footer></>}</Dialog.Content></Dialog.Portal></Dialog.Root>
  </main>;
}
