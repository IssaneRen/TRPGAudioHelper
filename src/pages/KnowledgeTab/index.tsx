import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { BookOpen, ChevronLeft, CircleHelp, FilePlus, Network, Search } from "lucide-react";
import { useAiSession } from "@/features/ai/use-ai-session";
import {
  documentKinds, knowledgeErrorMessage, knowledgeClient, type AgentToken, type Graph, type Hit, type KnowledgeClient, type KnowledgeDocument, type World,
} from "@/features/knowledge/knowledge-client";
import { KnowledgeEditor } from "./KnowledgeEditor";
import { KnowledgeGraph } from "./KnowledgeGraph";
import { KnowledgeGuide } from "./KnowledgeGuide";
import { KnowledgeBackupImport } from "./KnowledgeBackupImport";
import "./knowledge.css";

// 私人入口复用工作台的 KP 登录。游客作品页由独立的作品集路由处理。
export default function KnowledgeTab() {
  const auth = useAiSession();
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState("");

  // 凭据变化时重新挂载工作区，旧会话的界面状态随之丢弃。
  if (auth.session?.isKeeper) return <KnowledgeWorkspace key={auth.token} token={auth.token} />;
  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const session = await auth.login(tokenInput);
      if (!session.isKeeper) { auth.logout(); setError("请输入维护者的 KP Token。"); }
    } catch { setError("维护者凭据校验失败。"); }
  }
  return <main className="knowledge kb-login">
    <form className="kb-panel kb-stack" onSubmit={login}>
      <Link to="/workbench"><ChevronLeft size={16} /> 返回工作台</Link>
      <h1>世界观知识库</h1>
      <label>KP Token<input required type="password" autoComplete="off" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} /></label>
      <button className="kb-primary" disabled={auth.loading}>进入知识库</button>
      {error && <p role="alert" className="kb-error">{error}</p>}
    </form>
  </main>;
}

function KnowledgeWorkspace({ token }: { token: string }) {
  const api = useMemo(() => knowledgeClient(token), [token]);
  const [worlds, setWorlds] = useState<World[]>();
  const [world, setWorld] = useState<World | null>(null);
  const [newWorld, setNewWorld] = useState(false);
  const [name, setName] = useState("");
  const [guide, setGuide] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savingWorld, setSavingWorld] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const items = await api.listWorlds();
    setWorlds(items);
    // 进入时打开第一个已有世界观。列表为空时显示引导与新建入口。
    setWorld((previous) => previous ?? items[0] ?? null);
    setError("");
  }, [api]);

  useEffect(() => {
    void load().catch((cause) => setError(knowledgeErrorMessage(cause)));
  }, [load]);

  function mayLeave() {
    // 原稿或公开稿有未保存内容时，离开当前文章需要维护者确认。
    return !dirty || window.confirm("当前文章有未保存的修改，确定离开吗？");
  }

  async function createWorld(event: FormEvent) {
    event.preventDefault();
    if (savingWorld || !mayLeave()) return;
    setSavingWorld(true);
    setError("");
    try {
      const result = await api.createWorld(name);
      setWorlds((previous) => [...(previous ?? []), result]);
      setDirty(false);
      setWorld(result);
      setNewWorld(false);
      setName("");
    } catch (cause) { setError(knowledgeErrorMessage(cause)); }
    finally { setSavingWorld(false); }
  }

  return <main className="knowledge kb-shell">
    <aside className="kb-sidebar">
      <Link to="/workbench" onClick={(event) => { if (!mayLeave()) event.preventDefault(); }}><ChevronLeft size={16} /> 返回工作台</Link>
      <div className="kb-brand"><BookOpen size={24} /><h1>世界观知识库</h1></div>
      <div className="kb-world-list" aria-label="选择世界观">
        {worlds?.map((item) => <button key={item.id} type="button" aria-pressed={item.id === world?.id} onClick={() => {
          if (item.id !== world?.id && mayLeave()) { setDirty(false); setWorld(item); }
        }}>{item.name}</button>)}
      </div>
      {!newWorld && worlds && <button type="button" onClick={() => setNewWorld(true)}>新建世界观</button>}
      {newWorld && <form className="kb-stack" onSubmit={createWorld}>
        <label>世界观名称<input autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <div className="kb-row"><button className="kb-primary" disabled={savingWorld || !name.trim()}>建立</button><button type="button" onClick={() => setNewWorld(false)}>取消</button></div>
      </form>}
      {worlds && <button type="button" onClick={() => { if (mayLeave()) setImporting(true); }}>导入世界观备份</button>}
      <button type="button" className="kb-guide-button" onClick={() => setGuide(true)}><CircleHelp size={17} /> 操作引导</button>
    </aside>
    <div className="kb-main">
      {error && <div className="kb-panel kb-stack"><p role="alert" className="kb-error">{error}</p>
        {!worlds && <button className="kb-start" type="button" onClick={() => void load().catch((cause) => setError(knowledgeErrorMessage(cause)))}>重试</button>}
      </div>}
      {!worlds && !error && <p>正在读取世界观…</p>}
      {worlds && !world && <section className="kb-empty kb-panel">
        <BookOpen size={31} /><h2>从一个世界观开始</h2>
        <p>把模组、人物与设定收进自己的资料库。</p>
        <div className="kb-row"><button className="kb-primary" type="button" onClick={() => setNewWorld(true)}>新建世界观</button>
          <button type="button" onClick={() => setGuide(true)}>跟随引导</button></div>
      </section>}
      {world && <WorldWorkspace key={world.id} world={world} api={api} onDirty={setDirty} mayLeave={mayLeave} />}
    </div>
    {guide && <KnowledgeGuide onClose={() => setGuide(false)} />}
    {importing && <KnowledgeBackupImport api={api} onClose={() => setImporting(false)} onImported={(result) => {
      setWorlds((previous) => [...(previous ?? []), result]);
      setDirty(false);
      setWorld(result);
      setImporting(false);
    }} />}
  </main>;
}

type Section = "articles" | "graph" | "search" | "tokens";

// 以世界观编号为 React 的 key。切换世界观会重建这里的文章、搜索、关系图和凭据界面。
function WorldWorkspace({ world, api, onDirty, mayLeave }: {
  world: World; api: KnowledgeClient; onDirty: (dirty: boolean) => void; mayLeave: () => boolean;
}) {
  const [graph, setGraph] = useState<Graph>();
  const [section, setSection] = useState<Section>("articles");
  const [editor, setEditor] = useState<{ key: string; document: KnowledgeDocument | null }>();
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadGraph = useCallback(async () => {
    // 文章目录与关系图共用一份文章摘要。保存文章或关系后从服务器刷新。
    setGraph(await api.graph(world.id));
  }, [api, world.id]);

  useEffect(() => {
    void loadGraph().catch((cause) => setError(knowledgeErrorMessage(cause)));
  }, [loadGraph]);

  async function openDocument(id: string) {
    if (opening || !mayLeave()) return;
    setOpening(true);
    setError("");
    try {
      const document = await api.read(world.id, id);
      onDirty(false);
      // 每次打开都创建新的编辑器状态，文章正文与修订号以刚读取的版本为准。
      setEditor({ key: crypto.randomUUID(), document });
      setSection("articles");
    } catch (cause) { setError(knowledgeErrorMessage(cause)); }
    finally { setOpening(false); }
  }

  function switchSection(next: Section) {
    if (next === section || !mayLeave()) return;
    onDirty(false);
    setEditor(undefined);
    setSection(next);
  }

  async function exportWorld() {
    setExporting(true);
    setError("");
    try {
      const data = await api.exportWorld(world.id);
      // 把服务返回的结构化数据做成浏览器下载。下载完释放临时链接。
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `knowledge-${world.id}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(knowledgeErrorMessage(cause)); }
    finally { setExporting(false); }
  }

  const filtered = (graph?.nodes ?? []).filter((item) => item.title.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()));
  return <div className="kb-stack">
    <header className="kb-world-header">
      <div><span className="kb-muted">当前世界观</span><h2>{world.name}</h2></div>
      <button type="button" disabled={exporting} onClick={() => void exportWorld()}>导出世界观</button>
    </header>
    <nav className="kb-tabs" aria-label="世界观功能">
      {([["articles", "文章", BookOpen], ["graph", "关系与索引", Network], ["search", "检索", Search], ["tokens", "Agent 凭据", null]] as const)
        .map(([id, text, Icon]) => <button type="button" key={id} aria-pressed={section === id} onClick={() => switchSection(id)}>{Icon && <Icon size={16} />}{text}</button>)}
    </nav>
    {error && <p role="alert" className="kb-error">{error}</p>}
    {!graph && <div>{error ? <button type="button" onClick={() => void loadGraph().then(() => setError("")).catch((cause) => setError(knowledgeErrorMessage(cause)))}>重试</button> : "正在读取文章…"}</div>}
    {graph && section === "articles" && <div className="kb-articles">
      <section className="kb-directory kb-panel kb-stack">
        <button className="kb-primary" type="button" disabled={opening} onClick={() => {
          if (mayLeave()) { onDirty(false); setEditor({ key: crypto.randomUUID(), document: null }); }
        }}><FilePlus size={17} /> 新建文章</button>
        {graph.nodes.length > 0 && <input aria-label="筛选文章" placeholder="按标题筛选" value={filter} onChange={(event) => setFilter(event.target.value)} />}
        {filtered.map((item) => <button key={item.id} disabled={opening} type="button" className="kb-list-item" onClick={() => void openDocument(item.id)}>
          <span>{item.title}</span><small>{documentKinds[item.kind]}</small>
        </button>)}
        {!filtered.length && <p className="kb-muted">{filter ? "没有匹配的文章。" : "这个世界观还没有文章。"}</p>}
      </section>
      {editor ? <KnowledgeEditor key={editor.key} api={api} world={world.id} graph={graph} initial={editor.document}
        onDirty={onDirty} onSaved={loadGraph} onOpen={(id) => void openDocument(id)} />
        : <section className="kb-panel kb-empty"><BookOpen size={27} /><h3>{opening ? "正在打开文章…" : "打开一篇文章"}</h3><p>也可以从左侧写下这个世界的第一条资料。</p></section>}
    </div>}
    {graph && section === "graph" && <KnowledgeGraph graph={graph} onOpen={(id) => void openDocument(id)} />}
    {section === "search" && <WorldSearch api={api} world={world.id} onOpen={(id) => void openDocument(id)} />}
    {section === "tokens" && <WorldTokens api={api} world={world.id} />}
  </div>;
}

function WorldSearch({ api, world, onOpen }: { api: KnowledgeClient; world: string; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 发送当前世界观和关键词。浏览器渲染服务返回的章节与出处，可点命中项回到原文。
  async function find(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setHits(undefined);
    try { setHits(await api.search(world, query)); }
    catch (cause) { setError(knowledgeErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <section className="kb-panel kb-stack">
    <h2>检索当前世界观</h2>
    <form className="kb-search" onSubmit={find}>
      <input aria-label="检索词" placeholder="人物、地名或正文片段" maxLength={120} required value={query} onChange={(event) => setQuery(event.target.value)} />
      <button className="kb-primary" disabled={busy || !query.trim()}>检索</button>
    </form>
    {error && <p role="alert" className="kb-error">{error}</p>}
    {busy && <p role="status">检索中…</p>}
    {hits?.length === 0 && <p>此世界观没有匹配的内容。</p>}
    {hits?.map((item) => <section className="kb-hit" key={item.chunkId}>
      <button type="button" className="kb-start" onClick={() => onOpen(item.documentId)}>{item.title}</button>
      <p className="kb-muted">{[documentKinds[item.kind], item.heading, item.source, `修订 ${item.revision}`].filter(Boolean).join(" · ")}</p>
      <pre className="kb-excerpt">{item.excerpt}</pre>
    </section>)}
  </section>;
}

function WorldTokens({ api, world }: { api: KnowledgeClient; world: string }) {
  const [tokens, setTokens] = useState<AgentToken[]>();
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<AgentToken["scope"]>("read");
  const [issued, setIssued] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api.listTokens(world).then((items) => { if (active) setTokens(items); }).catch((cause) => { if (active) setError(knowledgeErrorMessage(cause)); });
    return () => { active = false; };
  }, [api, world]);

  async function issue(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { token, ...item } = await api.createToken(world, label, scope);
      // 明文只放在当前页面的签发结果中。列表保留名称、编号和权限。
      setIssued(token);
      setTokens((previous) => [...(previous ?? []), item]);
      setLabel("");
    } catch (cause) { setError(knowledgeErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  async function revoke(id: string) {
    if (!window.confirm("撤销后，此凭据立即失效。继续吗？")) return;
    setError("");
    setBusy(true);
    try {
      await api.revokeToken(world, id);
      setTokens((previous) => previous?.filter((item) => item.id !== id));
      setIssued("");
    } catch (cause) { setError(knowledgeErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <section className="kb-panel kb-stack">
    <h2>Agent 凭据</h2>
    <p className="kb-muted">凭据只对当前世界观有效。使用 Authorization Bearer 调用检索接口。</p>
    <code className="kb-code">POST /api/knowledge/worlds/{world}/search</code>
    <form className="kb-field-grid" onSubmit={issue}>
      <label>凭据名称<input required maxLength={80} value={label} onChange={(event) => setLabel(event.target.value)} /></label>
      <label>权限<select value={scope} onChange={(event) => setScope(event.target.value as AgentToken["scope"])}>
        <option value="read">只读</option><option value="write">读写文章与关系</option>
      </select></label>
      <button className="kb-primary kb-start" disabled={busy || !tokens || !label.trim()}>签发凭据</button>
    </form>
    {issued && <label>新凭据仅显示本次，请保存到调用端<input readOnly value={issued} onFocus={(event) => event.target.select()} /></label>}
    {error && <p role="alert" className="kb-error">{error}</p>}
    {tokens?.map((item) => <div key={item.id} className="kb-row kb-between">
      <span>{item.label} · {item.scope === "read" ? "只读" : "读写"}</span>
      <button type="button" disabled={busy} onClick={() => void revoke(item.id)}>撤销</button>
    </div>)}
  </section>;
}
