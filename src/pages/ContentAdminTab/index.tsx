import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BookOpen,
  Braces,
  Download,
  ExternalLink,
  FileText,
  ImagePlus,
  LoaderCircle,
  LogOut,
  PenLine,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteBlogDocument,
  deleteWikiDocument,
  exportContentZip,
  fetchBlogDocument,
  fetchContentOverview,
  fetchWikiDocument,
  importContentZip,
  saveBlogDocument,
  saveWikiDocument,
  uploadContentImage,
  type BlogPostDocument,
  type ContentDeleteReference,
  type ContentOverview
} from "@/features/content-admin/content-admin-client";
import { useAiSession } from "@/features/ai/use-ai-session";
import { BlockNoteEditor, type BlockNoteEditorHandle } from "@/features/editor/BlockNoteEditor";
import { WikiBlockNoteEditor, type WikiBlockNoteEditorHandle } from "@/features/editor/WikiBlockNoteEditor";
import { WikiBlockEditor } from "@/features/wiki/WikiBlockEditor";
import { WikiContentRenderer } from "@/features/wiki/WikiContentRenderer";
import type { WikiBlock, WikiCategory, WikiEntryRecord } from "@/types/wiki";
import { ContentGuide } from "./ContentGuide";
import {
  createBlankBlog,
  createBlankWiki,
  formatDelimitedList,
  parseDelimitedList,
  slugifyBlogTitle
} from "./content-admin-model";
import "./content-admin.css";

type Section = "blog" | "wiki" | "backup";
type WikiMode = "wysiwyg" | "structured" | "json" | "preview";

const categories: Array<{ value: WikiCategory; label: string }> = [
  { value: "character", label: "人物" },
  { value: "location", label: "地点" },
  { value: "event", label: "事件" },
  { value: "module", label: "模组" },
  { value: "report", label: "战报" },
  { value: "magic-book", label: "魔法书籍" },
  { value: "magic-item", label: "魔法物品" }
];

function LoginGate({ children }: { children: React.ReactNode }) {
  const auth = useAiSession();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const session = await auth.login(token);
      if (!session.isKeeper) {
        auth.logout();
        setError("该 Token 不是管理员账号。");
      }
    } catch {
      setError("Token 无效或网关不可用。");
    }
  }

  if (auth.session?.isKeeper) return <>{children}</>;

  return (
    <div className="content-login" role="dialog" aria-modal="true" aria-label="管理员登录">
      <div className="content-login__sigil" aria-hidden="true">L</div>
      <form className="content-login__card" onSubmit={handleLogin}>
        <p className="content-kicker">KEEPER ACCESS / RESTRICTED</p>
        <h1>档案室登录</h1>
        <p>请输入现有 KP Token。身份通过前，后台内容不会加载。</p>
        <Label htmlFor="keeper-token">KP Token</Label>
        <Input
          id="keeper-token"
          type="password"
          autoComplete="current-password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="••••••••••••"
          disabled={auth.loading}
        />
        {(error || auth.error || (auth.session && !auth.session.isKeeper)) && (
          <div className="content-login__error">{error || "当前登录不是管理员。"}</div>
        )}
        <Button type="submit" size="lg" disabled={auth.loading || !token.trim()}>
          {auth.loading ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
          验证并进入
        </Button>
        <a href="/" className="content-login__return">返回主站</a>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="content-field"><span>{label}</span>{children}</label>;
}

function EmptyEditor({ section }: { section: Section }) {
  return (
    <div className="content-empty">
      {section === "blog" ? <FileText /> : section === "wiki" ? <BookOpen /> : <Archive />}
      <h2>{section === "backup" ? "服务器内容备份" : "从左侧选择内容"}</h2>
      <p>{section === "backup" ? "导出完整 ZIP，或导入符合 v1 格式的备份。" : "也可以创建一份新草稿。"}</p>
    </div>
  );
}

export default function ContentAdminTab() {
  return <LoginGate><ContentAdminWorkspace /></LoginGate>;
}

function ContentAdminWorkspace() {
  const auth = useAiSession();
  const [overview, setOverview] = useState<ContentOverview | null>(null);
  const [section, setSection] = useState<Section>("blog");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blogDraft, setBlogDraft] = useState<BlogPostDocument | null>(null);
  const [wikiDraft, setWikiDraft] = useState<WikiEntryRecord | null>(null);
  const [wikiMode, setWikiMode] = useState<WikiMode>("structured");
  const [wikiJson, setWikiJson] = useState("");
  const [lastImageUrl, setLastImageUrl] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [blogMetaOpen, setBlogMetaOpen] = useState(false);
  const blogEditorApi = useRef<BlockNoteEditorHandle | null>(null);
  const wikiEditorApi = useRef<WikiBlockNoteEditorHandle | null>(null);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  async function handleBatchDelete() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const label = section === "blog" ? "篇博客" : "条 Wiki";
    if (!window.confirm(`确定删除选中的 ${ids.length} ${label}吗？\n\n内容会先移入服务器回收站（trash 目录），不会立即物理删除。被其他词条引用的删除项会在结果里提示。`)) return;
    setDeleting(true);
    const references: ContentDeleteReference[] = [];
    try {
      for (const id of ids) {
        const result = section === "blog" ? await deleteBlogDocument(token, id) : await deleteWikiDocument(token, id);
        references.push(...result.references);
      }
      await loadOverview();
      clearSelection();
      if (blogDraft && ids.includes(blogDraft.id)) setBlogDraft(null);
      if (wikiDraft && ids.includes(wikiDraft.id)) setWikiDraft(null);
      if (references.length) {
        toast.warning(`已删除 ${ids.length} 项。以下内容仍引用被删项：${references.map((ref) => `${ref.kind}:${ref.id}`).join("、")}`);
      } else {
        toast.success(`已删除 ${ids.length} 项，文件已移入服务器回收站。`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败，已中止剩余项目。");
      await loadOverview();
    } finally {
      setDeleting(false);
    }
  }

  const token = auth.token;
  const loadOverview = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setOverview(await fetchContentOverview(token));
    } catch {
      toast.error("内容索引加载失败。");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const filteredBlogs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (overview?.blogs ?? []).filter((item) => !keyword || `${item.title} ${item.id} ${item.tags.join(" ")}`.toLowerCase().includes(keyword));
  }, [overview, query]);

  const filteredWiki = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (overview?.wikiEntries ?? []).filter((item) => !keyword || `${item.displayName} ${item.id} ${item.summary}`.toLowerCase().includes(keyword));
  }, [overview, query]);

  const entriesById = useMemo(
    () => new Map((overview?.wikiEntries ?? []).map((entry) => [entry.id, entry])),
    [overview]
  );

  const blogMetaSummary = useMemo(() => {
    if (!blogDraft) return "";
    const parts: string[] = [];
    if (blogDraft.id) parts.push(blogDraft.id);
    if (blogDraft.tags.length) parts.push(blogDraft.tags.map((tag) => `#${tag}`).join(" "));
    parts.push(blogDraft.renderMode);
    if (blogDraft.players?.length) parts.push(`可见 ${blogDraft.players.length} PL`);
    if (blogDraft.wikiEntryId) parts.push(`Wiki ${blogDraft.wikiEntryId}`);
    return parts.join(" · ");
  }, [blogDraft]);

  async function selectBlog(id: string) {
    setSection("blog");
    setLoading(true);
    try {
      setBlogDraft(await fetchBlogDocument(token, id));
      setWikiDraft(null);
    } catch {
      toast.error("博客读取失败。");
    } finally {
      setLoading(false);
    }
  }

  async function selectWiki(id: string) {
    setSection("wiki");
    setLoading(true);
    try {
      const entry = await fetchWikiDocument(token, id);
      setWikiDraft(entry);
      setWikiJson(JSON.stringify(entry, null, 2));
      setWikiMode("wysiwyg");
      setBlogDraft(null);
    } catch {
      toast.error("Wiki 读取失败。");
    } finally {
      setLoading(false);
    }
  }

  async function saveBlog() {
    if (!blogDraft?.id.trim() && !blogDraft?.title.trim()) return toast.error("请先填写标题或元数据中的 id。");
    setSaving(true);
    try {
      // 编辑器正文是防抖回写的，保存前先冲刷，避免丢最后几百毫秒的输入
      const flushedMarkdown = blogEditorApi.current?.flush() ?? null;
      let draft = flushedMarkdown !== null ? { ...blogDraft, markdown: flushedMarkdown } : blogDraft;
      if (!draft.id.trim()) {
        const autoId = slugifyBlogTitle(draft.title) || `blog-${Date.now()}`;
        draft = { ...draft, id: autoId };
        toast.success(`已自动生成博客 id：${autoId}`);
      }
      const saved = await saveBlogDocument(token, { ...draft, updatedAt: new Date().toISOString() });
      setBlogDraft(saved);
      await loadOverview();
      toast.success("博客已保存并立即生效。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "博客保存失败。");
    } finally {
      setSaving(false);
    }
  }

  function syncWikiJsonToDraft(): WikiEntryRecord | null {
    try {
      const parsed = JSON.parse(wikiJson) as WikiEntryRecord;
      if (!parsed || !Array.isArray(parsed.content)) throw new Error("content 必须是数组");
      setWikiDraft(parsed);
      return parsed;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wiki JSON 无效。");
      return null;
    }
  }

  function switchWikiMode(nextMode: WikiMode) {
    if (!wikiDraft) return;
    let draft = wikiDraft;
    if (wikiMode === "wysiwyg" && nextMode !== "wysiwyg") {
      // 离开所见即所得前冲刷防抖中的正文
      const flushed = wikiEditorApi.current?.flush() ?? null;
      if (flushed) {
        draft = { ...wikiDraft, content: flushed };
        setWikiDraft(draft);
      }
    }
    if (wikiMode === "json" && nextMode !== "json" && !syncWikiJsonToDraft()) return;
    if (nextMode === "json") setWikiJson(JSON.stringify(draft, null, 2));
    setWikiMode(nextMode);
  }

  async function saveWiki() {
    // 所见即所得编辑器正文是防抖回写的，保存前先冲刷
    const flushedBlocks = wikiMode === "wysiwyg" ? (wikiEditorApi.current?.flush() ?? null) : null;
    const flushedDraft = flushedBlocks && wikiDraft ? { ...wikiDraft, content: flushedBlocks } : wikiDraft;
    if (flushedBlocks && wikiDraft) setWikiDraft(flushedDraft);
    const source = wikiMode === "json" ? syncWikiJsonToDraft() : flushedDraft;
    if (!source?.id.trim()) return toast.error("Wiki id 不能为空。");
    setSaving(true);
    try {
      const saved = await saveWikiDocument(token, { ...source, updatedAt: new Date().toISOString() });
      setWikiDraft(saved);
      setWikiJson(JSON.stringify(saved, null, 2));
      await loadOverview();
      toast.success("Wiki 已保存并立即生效。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wiki 保存失败。");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditorImageUpload(file: File) {
    const result = await uploadContentImage(token, file);
    setLastImageUrl(result.url);
    return result.url;
  }

  async function handleImageUpload(file: File | undefined) {
    if (!file) return;
    setTransferBusy(true);
    try {
      const result = await uploadContentImage(token, file);
      setLastImageUrl(result.url);
      if (section === "blog" && blogDraft) {
        setBlogDraft({ ...blogDraft, markdown: `${blogDraft.markdown.trimEnd()}\n\n![${file.name}](${result.url})\n` });
      }
      if (section === "wiki" && wikiDraft) {
        const imageBlock: WikiBlock = { type: "image", src: result.url, alt: file.name, caption: file.name };
        setWikiDraft({ ...wikiDraft, content: [...wikiDraft.content, imageBlock] });
      }
      toast.success("图片已上传并插入当前草稿。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "图片上传失败。");
    } finally {
      setTransferBusy(false);
    }
  }

  async function handleExport() {
    setTransferBusy(true);
    try {
      const result = await exportContentZip(token);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("ZIP 备份已导出。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导出失败。");
    } finally {
      setTransferBusy(false);
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setTransferBusy(true);
    try {
      const result = await importContentZip(token, file);
      await loadOverview();
      setBlogDraft(null);
      setWikiDraft(null);
      toast.success(`已导入 ${result.blogPosts} 篇博客、${result.wikiEntries} 条 Wiki。`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导入失败。");
    } finally {
      setTransferBusy(false);
    }
  }

  return (
    <div className="content-admin">
      <header className="content-admin__header">
        <div>
          <p className="content-kicker">LUCIUS / KEEPER ARCHIVE</p>
          <h1>运行时档案室</h1>
        </div>
        <div className="content-admin__header-actions">
          <span className="content-admin__status"><i /> {auth.session?.displayName}</span>
          <a className="content-admin__link" href="/" target="_blank" rel="noreferrer"><ExternalLink />主站</a>
          <Button variant="outline" onClick={() => void loadOverview()} disabled={loading}><RefreshCcw className={loading ? "animate-spin" : ""} />刷新</Button>
          <Button variant="outline" onClick={auth.logout}><LogOut />退出</Button>
        </div>
      </header>

      <div className="content-admin__grid">
        <nav className="content-sidebar">
          <div className="content-sidebar__tabs">
            <button className={section === "blog" ? "active" : ""} onClick={() => { setSection("blog"); clearSelection(); }}><FileText />博客</button>
            <button className={section === "wiki" ? "active" : ""} onClick={() => { setSection("wiki"); clearSelection(); }}><BookOpen />Wiki</button>
            <button className={section === "backup" ? "active" : ""} onClick={() => { setSection("backup"); clearSelection(); }}><Archive />备份</button>
          </div>
          {section !== "backup" && (
            <>
              <div className="content-sidebar__search"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题或 id" /></div>
              <Button
                className="content-sidebar__new"
                onClick={() => {
                  if (section === "blog") { setBlogDraft(createBlankBlog()); setWikiDraft(null); }
                  else { const draft = createBlankWiki(); setWikiDraft(draft); setWikiJson(JSON.stringify(draft, null, 2)); setWikiMode("wysiwyg"); setBlogDraft(null); }
                }}
              ><Plus />新建{section === "blog" ? "博客" : "词条"}</Button>
              <div className="content-sidebar__list">
                {section === "blog" && filteredBlogs.map((post) => (
                  <div key={post.id} className={blogDraft?.id === post.id ? "active" : ""}>
                    <input
                      type="checkbox"
                      aria-label={`选择博客 ${post.title}`}
                      checked={selectedIds.has(post.id)}
                      onChange={() => toggleSelected(post.id)}
                    />
                    <button onClick={() => void selectBlog(post.id)}>
                      <strong>{post.title}</strong><span>{post.id}</span>
                    </button>
                  </div>
                ))}
                {section === "wiki" && filteredWiki.map((entry) => (
                  <div key={entry.id} className={wikiDraft?.id === entry.id ? "active" : ""}>
                    <input
                      type="checkbox"
                      aria-label={`选择词条 ${entry.displayName}`}
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleSelected(entry.id)}
                    />
                    <button onClick={() => void selectWiki(entry.id)}>
                      <strong>{entry.displayName}</strong><span>{entry.category} · {entry.id}</span>
                    </button>
                  </div>
                ))}
              </div>
              {selectedIds.size > 0 && (
                <div className="content-sidebar__batch">
                  <span>已选 {selectedIds.size} 项</span>
                  <Button variant="outline" size="sm" onClick={clearSelection} disabled={deleting}>取消选择</Button>
                  <Button variant="destructive" size="sm" onClick={() => void handleBatchDelete()} disabled={deleting}>
                    <Trash2 />{deleting ? "删除中" : "删除选中"}
                  </Button>
                </div>
              )}
            </>
          )}
          <label className="content-upload">
            <ImagePlus />
            <span>{transferBusy ? "处理中…" : "上传图片"}</span>
            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" disabled={transferBusy} onChange={(event) => void handleImageUpload(event.target.files?.[0])} />
          </label>
          {lastImageUrl && <button className="content-upload__url" onClick={() => void navigator.clipboard.writeText(lastImageUrl)}>{lastImageUrl}</button>}
        </nav>

        <main className="content-editor">
          {loading && !blogDraft && !wikiDraft ? <div className="content-empty"><LoaderCircle className="animate-spin" /><h2>读取档案</h2></div> : null}
          {!loading && section === "blog" && !blogDraft ? <EmptyEditor section={section} /> : null}
          {!loading && section === "wiki" && !wikiDraft ? <EmptyEditor section={section} /> : null}
          {section === "backup" ? (
            <section className="content-backup">
              <p className="content-kicker">PORTABLE ARCHIVE / FORMAT V1</p>
              <h2>整站内容备份</h2>
              <p>ZIP 包含 manifest、博客、Wiki 与后台上传图片。导入前服务器会自动备份当前内容。</p>
              <div className="content-backup__actions">
                <Button size="lg" onClick={() => void handleExport()} disabled={transferBusy}><Download />导出 ZIP</Button>
                <label className="content-backup__import"><Upload />导入 ZIP<input type="file" accept=".zip,application/zip" disabled={transferBusy} onChange={(event) => void handleImport(event.target.files?.[0])} /></label>
              </div>
              <pre>{`manifest.json  # formatVersion: 1\nblog/          # Markdown + index.json\nwiki/          # 完整结构化 JSON\nuploads/       # 后台上传图片`}</pre>
            </section>
          ) : null}

          {section === "blog" && blogDraft ? (
            <section className="content-document content-blog">
              <div className="content-blog__bar">
                <button
                  type="button"
                  className="content-blog__meta-toggle"
                  onClick={() => setBlogMetaOpen((open) => !open)}
                >
                  <Settings2 />元数据
                </button>
                <span className="content-blog__summary">{blogMetaSummary}</span>
                <Button onClick={() => void saveBlog()} disabled={saving}><Save />{saving ? "保存中" : "保存并发布"}</Button>
              </div>
              {blogMetaOpen ? (
                <div className="content-form-grid content-blog__meta">
                  <Field label="id"><Input value={blogDraft.id} onChange={(event) => setBlogDraft({ ...blogDraft, id: event.target.value })} disabled={overview?.blogs.some((item) => item.id === blogDraft.id)} /></Field>
                  <Field label="标签（逗号/换行）"><Textarea value={formatDelimitedList(blogDraft.tags)} onChange={(event) => setBlogDraft({ ...blogDraft, tags: parseDelimitedList(event.target.value) })} /></Field>
                  <Field label="封面 URL（逗号/换行）"><Textarea value={formatDelimitedList(blogDraft.cover)} onChange={(event) => setBlogDraft({ ...blogDraft, cover: parseDelimitedList(event.target.value) })} /></Field>
                  <Field label="可见 PL（逗号/换行）"><Textarea value={formatDelimitedList(blogDraft.players)} onChange={(event) => setBlogDraft({ ...blogDraft, players: parseDelimitedList(event.target.value) })} /></Field>
                  <Field label="渲染模式"><select value={blogDraft.renderMode} onChange={(event) => setBlogDraft({ ...blogDraft, renderMode: event.target.value as "markdown" | "wiki" })}><option value="markdown">markdown</option><option value="wiki">wiki</option></select></Field>
                  <Field label="关联 Wiki id"><Input value={blogDraft.wikiEntryId || ""} onChange={(event) => setBlogDraft({ ...blogDraft, wikiEntryId: event.target.value || undefined })} /></Field>
                  <Field label="创建时间"><Input value={blogDraft.createdAt} onChange={(event) => setBlogDraft({ ...blogDraft, createdAt: event.target.value })} /></Field>
                </div>
              ) : null}
              <input
                className="content-blog__title"
                aria-label="博客标题"
                value={blogDraft.title}
                onChange={(event) => setBlogDraft({ ...blogDraft, title: event.target.value })}
                placeholder="无标题"
              />
              <BlockNoteEditor
                key={blogDraft.id || "new"}
                ref={blogEditorApi}
                value={blogDraft.markdown}
                onChange={(markdown) => setBlogDraft((current) => (current ? { ...current, markdown } : current))}
                uploadImage={handleEditorImageUpload}
              />
            </section>
          ) : null}

          {section === "wiki" && wikiDraft ? (
            <section className="content-document">
              <div className="content-document__title"><div><p className="content-kicker">WIKI ENTITY</p><h2>{wikiDraft.displayName || "未命名词条"}</h2></div><Button onClick={() => void saveWiki()} disabled={saving}><Save />{saving ? "保存中" : "保存并发布"}</Button></div>
              <div className="content-mode-tabs">
                <button className={wikiMode === "wysiwyg" ? "active" : ""} onClick={() => switchWikiMode("wysiwyg")}><PenLine />所见即所得</button>
                <button className={wikiMode === "structured" ? "active" : ""} onClick={() => switchWikiMode("structured")}><BookOpen />结构化</button>
                <button className={wikiMode === "json" ? "active" : ""} onClick={() => switchWikiMode("json")}><Braces />原始 JSON</button>
                <button className={wikiMode === "preview" ? "active" : ""} onClick={() => switchWikiMode("preview")}><ExternalLink />预览</button>
              </div>
              {wikiMode === "wysiwyg" ? (
                <WikiBlockNoteEditor
                  key={wikiDraft.id || "new"}
                  ref={wikiEditorApi}
                  value={wikiDraft.content}
                  deps={{ players: overview?.players ?? [], entries: overview?.wikiEntries ?? [] }}
                  onChange={(content) => setWikiDraft((current) => (current ? { ...current, content } : current))}
                  uploadImage={handleEditorImageUpload}
                />
              ) : null}
              {wikiMode === "structured" ? (
                <>
                  <div className="content-form-grid">
                    <Field label="id"><Input value={wikiDraft.id} onChange={(event) => setWikiDraft({ ...wikiDraft, id: event.target.value })} disabled={overview?.wikiEntries.some((item) => item.id === wikiDraft.id)} /></Field>
                    <Field label="分类"><select value={wikiDraft.category} onChange={(event) => setWikiDraft({ ...wikiDraft, category: event.target.value as WikiCategory })}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                    <Field label="展示名"><Input value={wikiDraft.displayName} onChange={(event) => setWikiDraft({ ...wikiDraft, displayName: event.target.value })} /></Field>
                    <Field label="头像 URL"><Input value={wikiDraft.avatar || ""} onChange={(event) => setWikiDraft({ ...wikiDraft, avatar: event.target.value || undefined })} /></Field>
                    <Field label="摘要"><Textarea value={wikiDraft.summary} onChange={(event) => setWikiDraft({ ...wikiDraft, summary: event.target.value })} /></Field>
                    <Field label="别名（逗号/换行）"><Textarea value={formatDelimitedList(wikiDraft.aliasNames)} onChange={(event) => setWikiDraft({ ...wikiDraft, aliasNames: parseDelimitedList(event.target.value) })} /></Field>
                    <Field label="PL ids"><Textarea value={formatDelimitedList(wikiDraft.playerIds)} onChange={(event) => setWikiDraft({ ...wikiDraft, playerIds: parseDelimitedList(event.target.value) })} /></Field>
                    <Field label="module ids"><Textarea value={formatDelimitedList(wikiDraft.moduleIds)} onChange={(event) => setWikiDraft({ ...wikiDraft, moduleIds: parseDelimitedList(event.target.value) })} /></Field>
                    <Field label="关联词条 ids"><Textarea value={formatDelimitedList(wikiDraft.relatedEntryIds)} onChange={(event) => setWikiDraft({ ...wikiDraft, relatedEntryIds: parseDelimitedList(event.target.value) })} /></Field>
                    <Field label="tags"><Textarea value={formatDelimitedList(wikiDraft.tags)} onChange={(event) => setWikiDraft({ ...wikiDraft, tags: parseDelimitedList(event.target.value) })} /></Field>
                  </div>
                  <div className="content-json-fields">
                    <Field label="facts JSON"><Textarea key={`facts-${wikiDraft.id}`} defaultValue={JSON.stringify(wikiDraft.facts || [], null, 2)} onBlur={(event) => { try { setWikiDraft({ ...wikiDraft, facts: JSON.parse(event.target.value) }); } catch { toast.error("facts JSON 无效"); } }} /></Field>
                    <Field label="relatedEntryAccess JSON"><Textarea key={`access-${wikiDraft.id}`} defaultValue={JSON.stringify(wikiDraft.relatedEntryAccess || [], null, 2)} onBlur={(event) => { try { setWikiDraft({ ...wikiDraft, relatedEntryAccess: JSON.parse(event.target.value) }); } catch { toast.error("relatedEntryAccess JSON 无效"); } }} /></Field>
                  </div>
                  <div className="content-blocks"><WikiBlockEditor blocks={wikiDraft.content} entries={overview?.wikiEntries ?? []} players={overview?.players ?? []} onChange={(content) => setWikiDraft({ ...wikiDraft, content })} /></div>
                </>
              ) : null}
              {wikiMode === "json" ? <Textarea className="content-code-editor content-code-editor--json" value={wikiJson} onChange={(event) => setWikiJson(event.target.value)} spellCheck={false} /> : null}
              {wikiMode === "preview" ? <div className="content-preview content-preview--wiki"><WikiContentRenderer blocks={wikiDraft.content} currentPlayerId={null} entriesById={entriesById} revealAllSecrets /></div> : null}
            </section>
          ) : null}
        </main>
        <ContentGuide />
      </div>
    </div>
  );
}
