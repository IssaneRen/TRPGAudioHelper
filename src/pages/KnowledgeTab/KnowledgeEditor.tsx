import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { WorkMarkdown } from "@/features/workbench/WorkMarkdown";
import {
  documentKinds, knowledgeErrorMessage, KnowledgeRequestError, type DocumentInput, type DocumentKind, type Graph,
  type KnowledgeClient, type KnowledgeDocument, type Publication, type PublicationInput,
} from "@/features/knowledge/knowledge-client";
import type { WikiIndexPayload } from "@/types/wiki";

const blank: DocumentInput = { title: "", kind: "module", body: "", source: "", wikiId: "" };
const publicFields = (title = ""): PublicationInput => ({ title, summary: "", body: "", coverUrl: "" });
type Mode = "edit" | "read" | "public";

export function KnowledgeEditor({ api, world, initial, graph, onDirty, onSaved, onOpen }: {
  api: KnowledgeClient;
  world: string;
  initial: KnowledgeDocument | null;
  graph: Graph;
  onDirty: (dirty: boolean) => void;
  onSaved: () => Promise<void>;
  onOpen: (id: string) => void;
}) {
  const fieldsId = useId();
  // saved 是服务器确认的版本，draft 是浏览器里正在写的版本，阅读页直接展示 draft。
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<DocumentInput>(initial ?? blank);
  const [mode, setMode] = useState<Mode>(() => initial ? "read" : "edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState<KnowledgeDocument>();
  const [publicationConflict, setPublicationConflict] = useState(false);
  // publication 是上次读取的已发布版本。publicDraft 是当前页面上独立编写的公开稿。
  // undefined 表示还没有读过结果，null 表示已检查过且目前没有公开版。
  const [publication, setPublication] = useState<Publication | null>();
  const [publicDraft, setPublicDraft] = useState<PublicationInput>();
  const [preview, setPreview] = useState(false);
  const [wiki, setWiki] = useState<WikiIndexPayload["entries"]>();
  const [wikiFailed, setWikiFailed] = useState(false);
  const [target, setTarget] = useState("");
  const [label, setLabel] = useState("");
  const savedId = saved?.id;
  const snapshot = saved ?? blank;
  // 只比较实际可编辑的字段。服务器更新修订号或时间时，不会误判成用户改动。
  const dirty = (["title", "kind", "body", "source", "wikiId"] as const).some((key) => draft[key] !== snapshot[key]);
  const publicDirty = publicDraft !== undefined && publication !== undefined && Object.entries(publicDraft).some(
    ([key, value]) => value !== (publication ?? publicFields(snapshot.title))[key as keyof PublicationInput],
  );

  // 页面内切换由外层判断是否确认离开。刷新或关页由浏览器给出提示。
  useEffect(() => { onDirty(dirty || publicDirty); }, [dirty, publicDirty, onDirty]);

  useEffect(() => {
    if (!dirty && !publicDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, publicDirty]);

  useEffect(() => {
    // 人物选择框只读取 Wiki 索引，用名称和编号建立关联。正文可由维护者挑选后引用。
    const abort = new AbortController();
    fetch("/wiki/index.json", { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("人物 Wiki 加载失败。");
        return response.json() as Promise<WikiIndexPayload>;
      })
      .then((index) => setWiki(index.entries.filter((entry) => entry.category === "character")))
      .catch(() => { if (!abort.signal.aborted) setWikiFailed(true); });
    return () => abort.abort();
  }, []);

  // ref 的值立即生效，用来挡住同一个编辑器里的快速重复操作。busy 负责按钮状态。
  const requestInFlight = useRef(false);
  async function run(action: () => Promise<void>) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (cause) { setError(knowledgeErrorMessage(cause)); }
    finally { requestInFlight.current = false; setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      try {
        const next = await api.save(world, { ...draft, revision: saved?.revision }, savedId);
        setSaved(next);
        // 保存返回前仍可能继续打字。以发出请求时的草稿为基准，保留其后新增的修改。
        setDraft((current) => current === draft ? next : { ...current, revision: next.revision });
        setConflict(false);
        setLatest(undefined);
        setNotice("已保存");
        await onSaved();
      } catch (cause) {
        if (cause instanceof KnowledgeRequestError && cause.status === 409) setConflict(true);
        throw cause;
      }
    });
  }

  async function loadPublication() {
    if (!savedId) return;
    const next = await api.publication(world, savedId);
    setPublication(next);
    // 初次发布只带入标题，正文留给用户填写或主动复制。再编辑时从已发布内容开始。
    setPublicDraft(next ? { title: next.title, body: next.body, summary: next.summary, coverUrl: next.coverUrl } : publicFields(snapshot.title));
    setPreview(false);
    setPublicationConflict(false);
  }

  function switchMode(next: Mode) {
    // 只切换当前显示的面板，原稿和公开稿的编辑状态留在同一个编辑器里。
    setError("");
    setMode(next);
    if (next === "public" && publication === undefined) void run(loadPublication);
  }

  async function publish() {
    // 从明确预览的公开稿发布。后端用两个版本值再次确认原稿和公开版都仍是当前版本。
    if (!savedId || !saved || !publicDraft || dirty || !preview) return;
    await run(async () => {
      try {
        const next = await api.publish(world, savedId, { ...publicDraft, revision: saved.revision, previousPublicationAt: publication?.updatedAt ?? null });
        setPublication(next);
        setPublicDraft((current) => current === publicDraft ? { title: next.title, body: next.body, summary: next.summary, coverUrl: next.coverUrl } : current);
        setPublicationConflict(false);
        setNotice("公开版已发布");
      } catch (cause) {
        if (cause instanceof KnowledgeRequestError && cause.status === 409) setPublicationConflict(true);
        throw cause;
      }
    });
  }

  const wikiEntry = wiki?.find((entry) => entry.id === draft.wikiId);
  // 编辑器显示所有与当前文章有关的连线，包括它引用别人以及被别人引用两种方向。
  const relations = graph.edges.filter((edge) => edge.sourceId === savedId || edge.targetId === savedId);

  return <div className="kb-stack">
    <header className="kb-editor-header">
      <div><p className="kb-muted">{documentKinds[draft.kind]}{saved ? ` · 修订 ${saved.revision}` : ""}</p><h2>{draft.title || "新建文章"}</h2></div>
      <div className="kb-tabs" aria-label="文章模式">
        <button type="button" aria-pressed={mode === "edit"} onClick={() => switchMode("edit")}>编辑</button>
        <button type="button" aria-pressed={mode === "read"} onClick={() => switchMode("read")}>阅读</button>
        <button type="button" aria-pressed={mode === "public"} disabled={!saved} onClick={() => switchMode("public")}>公开版</button>
      </div>
    </header>
    {error && <p role="alert" className="kb-error">{error}</p>}
    {notice && <p role="status" className="kb-notice">{notice}</p>}
    {mode === "edit" && <form onSubmit={save} className="kb-panel kb-stack">
      <div className="kb-field-grid">
        <label>标题<input required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>文章类型<select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as DocumentKind })}>
          {Object.entries(documentKinds).map(([kind, name]) => <option key={kind} value={kind}>{name}</option>)}
        </select></label>
      </div>
      <div className="kb-labeled-control">
        <label htmlFor={`${fieldsId}-body`}>正文</label>
        <textarea id={`${fieldsId}-body`} className="kb-markdown-input" rows={16} maxLength={200000} value={draft.body} spellCheck={false}
          onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="在这里写 Markdown" />
      </div>
      <div className="kb-field-grid">
        <label>源文档与页码<input value={draft.source} maxLength={500} onChange={(event) => setDraft({ ...draft, source: event.target.value })} /></label>
        <div className="kb-labeled-control">
          <label htmlFor={`${fieldsId}-wiki`}>人物 Wiki</label>
          <select id={`${fieldsId}-wiki`} value={draft.wikiId} onChange={(event) => setDraft({ ...draft, wikiId: event.target.value })}>
            <option value="">无需关联</option>
            {draft.wikiId && !wikiEntry && <option value={draft.wikiId}>{draft.wikiId}{wiki ? "（未找到）" : ""}</option>}
            {wiki?.map((entry) => <option value={entry.id} key={entry.id}>{entry.displayName}</option>)}
          </select>
        </div>
      </div>
      {wikiFailed && <p className="kb-muted">人物 Wiki 暂时不可用。</p>}
      {wikiEntry && <Link to={`/trpg/tools/world-wiki/${encodeURIComponent(wikiEntry.id)}`} target="_blank" rel="noreferrer">打开 {wikiEntry.displayName} 的 Wiki</Link>}
      <div className="kb-row"><button className="kb-primary" disabled={busy || !draft.title.trim() || Boolean(saved && !dirty)}>保存文章</button>{dirty && <span className="kb-muted">有未保存修改</span>}</div>
    </form>}
    {conflict && savedId && mode === "edit" && <section className="kb-panel kb-stack">
      <button type="button" className="kb-start" disabled={busy} onClick={() => void run(async () => { setLatest(await api.read(world, savedId)); })}>检查服务器版本</button>
      {latest && <><p>服务器上的修订 {latest.revision} · {latest.title}</p><pre className="kb-excerpt">{latest.body}</pre>
        <button type="button" className="kb-start" onClick={() => { setSaved(latest); setConflict(false); setLatest(undefined); setNotice("本地内容已保留，请合并后再保存。"); }}>保留本地修改，以服务器版本为基准</button></>}
    </section>}
    {mode === "read" && <article className="kb-reading prose">
      {dirty && <p className="kb-muted">当前阅读的是编辑中的内容。</p>}
      {draft.body ? <WorkMarkdown body={draft.body} /> : <p className="kb-muted">正文为空，切到编辑开始写作。</p>}
      {draft.source && <footer>来源 · {draft.source}</footer>}
      {wikiEntry && <Link to={`/trpg/tools/world-wiki/${encodeURIComponent(wikiEntry.id)}`} target="_blank" rel="noreferrer">{wikiEntry.displayName} · 人物 Wiki</Link>}
    </article>}
    {mode === "public" && <>
      {publication && <div className="kb-row kb-between">
        <Link to={`/portfolio/${publication.id}`} target="_blank" rel="noreferrer">打开已发布作品</Link>
        <button type="button" disabled={busy} onClick={() => {
          if (savedId && window.confirm("从作品集撤下公开版？原稿仍可继续编辑。")) void run(async () => {
            await api.withdraw(world, savedId, publication.updatedAt);
            setPublication(null);
            setNotice("公开版已撤下，当前公开稿仍在此页。");
          });
        }}>撤下公开版</button>
      </div>}
      {dirty && <p className="kb-notice">先保存原稿，再发布公开版。</p>}
      {publicationConflict && savedId && <button type="button" className="kb-start" disabled={busy} onClick={() => void run(async () => {
        const [activePublication, activeDocument] = await Promise.all([api.publication(world, savedId), api.read(world, savedId)]);
        if (activeDocument.revision !== saved?.revision && !dirty) {
          setSaved(activeDocument);
          setDraft(activeDocument);
        }
        setPublication(activePublication);
        setPublicationConflict(false);
        setPreview(false);
        setNotice("已读取最新版本，当前公开稿已保留。请重新检查并预览。");
      })}>检查最新版本并保留公开稿</button>}
      {publication === undefined && <p>{busy ? "正在读取公开版…" : <button type="button" onClick={() => void run(loadPublication)}>重新载入公开版</button>}</p>}
      {publicDraft && <section className="kb-panel kb-stack">
        {preview ? <article className="kb-reading prose"><h2>{publicDraft.title}</h2><p>{publicDraft.summary}</p>
          {publicDraft.coverUrl && <img src={publicDraft.coverUrl} alt="" referrerPolicy="no-referrer" />}
          <WorkMarkdown body={publicDraft.body} />
        </article> : <>
          <label>公开标题<input value={publicDraft.title} maxLength={160} onChange={(event) => setPublicDraft({ ...publicDraft, title: event.target.value })} /></label>
          <label>作品摘要<input value={publicDraft.summary} maxLength={300} onChange={(event) => setPublicDraft({ ...publicDraft, summary: event.target.value })} /></label>
          <label>公开封面地址<input value={publicDraft.coverUrl} maxLength={1000} onChange={(event) => setPublicDraft({ ...publicDraft, coverUrl: event.target.value })} /></label>
          <div className="kb-labeled-control">
            <label htmlFor={`${fieldsId}-public-body`}>公开正文</label>
            <textarea id={`${fieldsId}-public-body`} className="kb-markdown-input" rows={12} maxLength={200000} value={publicDraft.body}
              onChange={(event) => setPublicDraft({ ...publicDraft, body: event.target.value })} />
          </div>
          {!publicDraft.body && saved?.body && <button type="button" className="kb-start" onClick={() => setPublicDraft({ ...publicDraft, body: saved.body })}>复制原稿正文供删改</button>}
        </>}
        <div className="kb-row">
          <button type="button" disabled={busy} onClick={() => setPreview(!preview)}>{preview ? "返回编辑公开稿" : "预览公开稿"}</button>
          {preview && <button className="kb-primary" type="button" disabled={busy || dirty || publicationConflict || !publicDraft.title.trim() || !publicDraft.body.trim()} onClick={() => void publish()}>确认发布</button>}
        </div>
      </section>}
    </>}
    {savedId && mode === "edit" && <section className="kb-panel kb-stack">
      <h3>文章关系</h3>
      {relations.map((edge) => {
        const outgoing = edge.sourceId === savedId;
        const other = graph.nodes.find((item) => item.id === (outgoing ? edge.targetId : edge.sourceId));
        return <div key={edge.id} className="kb-row kb-between">
          <button type="button" onClick={() => other && onOpen(other.id)}>{outgoing ? "→" : "←"} {edge.label} · {other?.title}</button>
          <button type="button" disabled={busy} onClick={() => void run(async () => { await api.removeRelation(world, edge.id); await onSaved(); })}>移除</button>
        </div>;
      })}
      <form className="kb-field-grid" onSubmit={(event) => {
        event.preventDefault();
        void run(async () => { await api.addRelation(world, { sourceId: savedId, targetId: target, label }); setLabel(""); setTarget(""); await onSaved(); });
      }}>
        <label>关联文章<select value={target} onChange={(event) => setTarget(event.target.value)}>
          <option value="">选择同世界观文章</option>
          {graph.nodes.filter((item) => item.id !== savedId).map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
        </select></label>
        <label>关系<input maxLength={50} value={label} onChange={(event) => setLabel(event.target.value)} /></label>
        <button type="submit" className="kb-start" disabled={busy || !target || !label.trim()}>添加关系</button>
      </form>
    </section>}
  </div>;
}
