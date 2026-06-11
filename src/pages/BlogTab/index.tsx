import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import { TAG_CATEGORIES } from "@/constants/tag-categories";
import { useNavigate, useParams } from "react-router";
import type { WikiEntryRecord, WikiIndexPayload } from "@/types/wiki";
import { WikiContentRenderer } from "@/features/wiki/WikiContentRenderer";
import { useAiSession } from "@/features/ai/use-ai-session";

interface BlogPostMeta {
  id: string;
  title: string;
  file: string;
  cover?: string[];
  tags: string[];
  players?: string[];
  renderMode?: "markdown" | "wiki";
  wikiEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

const SPECIAL_TAG_MY_PLAYED = "我跑过的";

/** Safari / iOS WebKit 在 CSS columns + fixed 浮层下对 layoutId 共享动画定位不准，会闪到错误位置 */
function shouldDisableSharedLayout(): boolean {
  if (typeof window === "undefined") return true;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari =
    /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS|Chromium/i.test(ua);
  return isIOS || isSafari;
}

let indexCache: BlogPostMeta[] | null = null;
const contentCache = new Map<string, string>();
let wikiIndexCache: WikiIndexPayload | null = null;
const wikiEntryCache = new Map<string, WikiEntryRecord>();

export default function BlogTab() {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId?: string }>();
  const [posts, setPosts] = useState<BlogPostMeta[]>(indexCache || []);
  const [loading, setLoading] = useState(!indexCache);
  const [loadError, setLoadError] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPostMeta | null>(null);
  const [postContent, setPostContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [wikiIndex, setWikiIndex] = useState<WikiIndexPayload | null>(wikiIndexCache);
  const [wikiEntry, setWikiEntry] = useState<WikiEntryRecord | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiError, setWikiError] = useState(false);
  const contentRequestRef = useRef(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showPlDialog, setShowPlDialog] = useState(false);
  const [isMyPlayedMode, setIsMyPlayedMode] = useState(false);
  const [hasConfirmedSpoiler, setHasConfirmedSpoiler] = useState(false);
  const aiSession = useAiSession();
  const prefersReducedMotion = useReducedMotion();
  const useSharedLayout = !prefersReducedMotion && !shouldDisableSharedLayout();

  useEffect(() => {
    if (!isMyPlayedMode) return;
    if (wikiIndexCache) {
      setWikiIndex(wikiIndexCache);
      return;
    }
    let cancelled = false;
    const loadWikiIndex = async () => {
      try {
        const res = await fetch("/wiki/index.json", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as WikiIndexPayload;
        if (cancelled) return;
        wikiIndexCache = data;
        setWikiIndex(data);
      } catch {
        // ignore
      }
    };
    void loadWikiIndex();
    return () => {
      cancelled = true;
    };
  }, [isMyPlayedMode]);

  useEffect(() => {
    let cancelled = false;

    if (!indexCache) setLoading(true);
    setLoadError(false);
    fetch("/blog/index.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load blog index: ${r.status}`);
        return r.json();
      })
      .then((data: BlogPostMeta[]) => {
        if (cancelled) return;
        indexCache = data;
        setPosts(data);
      })
      .catch(() => {
        if (!cancelled && !indexCache) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [posts]);

  const currentBlogPlayerId = aiSession.session?.playerId || "";

  const filteredPosts = useMemo(() => {
    if (isMyPlayedMode) {
      if (!currentBlogPlayerId) return [];
      const normalizedPl = currentBlogPlayerId.trim().toLowerCase();
      return posts.filter((p) =>
        p.players?.some((pl) => pl.trim().toLowerCase() === normalizedPl)
      );
    }
    if (selectedTags.size === 0) return posts;
    return posts.filter((p) => p.tags.some((t) => selectedTags.has(t)));
  }, [posts, selectedTags, isMyPlayedMode, currentBlogPlayerId]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const loadPost = useCallback(async (post: BlogPostMeta) => {
    const requestId = ++contentRequestRef.current;
    setSelectedPost(post);
    setContentError(false);
    setWikiEntry(null);
    setWikiError(false);
    const cached = contentCache.get(post.file);
    if (cached) {
      setPostContent(cached);
      setContentLoading(false);
      return;
    }
    setPostContent("");
    setContentLoading(true);
    try {
      const res = await fetch(`/blog/${post.file}`);
      if (!res.ok) throw new Error(`Failed to load blog post: ${res.status}`);
      const text = await res.text();
      contentCache.set(post.file, text);
      if (requestId === contentRequestRef.current) setPostContent(text);
    } catch {
      if (requestId === contentRequestRef.current) setContentError(true);
    } finally {
      if (requestId === contentRequestRef.current) setContentLoading(false);
    }
  }, []);

  const loadWikiForPost = useCallback(async (post: BlogPostMeta) => {
    if (post.renderMode !== "wiki" || !post.wikiEntryId) return;
    const requestId = ++contentRequestRef.current;
    setWikiLoading(true);
    setWikiError(false);

    try {
      if (!wikiIndexCache) {
        const indexRes = await fetch("/wiki/index.json", { cache: "no-store" });
        if (!indexRes.ok) throw new Error(`Failed to load wiki index: ${indexRes.status}`);
        const indexData = (await indexRes.json()) as WikiIndexPayload;
        wikiIndexCache = indexData;
        setWikiIndex(indexData);
      } else {
        setWikiIndex(wikiIndexCache);
      }

      const cached = wikiEntryCache.get(post.wikiEntryId);
      if (cached) {
        if (requestId === contentRequestRef.current) setWikiEntry(cached);
        return;
      }

      const entryRes = await fetch(`/wiki/entities/entries/${post.wikiEntryId}.json`, {
        cache: "no-store",
      });
      if (!entryRes.ok) throw new Error(`Failed to load wiki entry: ${entryRes.status}`);
      const entryData = (await entryRes.json()) as WikiEntryRecord;
      wikiEntryCache.set(post.wikiEntryId, entryData);
      if (requestId === contentRequestRef.current) setWikiEntry(entryData);
    } catch {
      if (requestId === contentRequestRef.current) setWikiError(true);
    } finally {
      if (requestId === contentRequestRef.current) setWikiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!postId) {
      contentRequestRef.current += 1;
      setSelectedPost(null);
      setPostContent("");
      setContentLoading(false);
      setContentError(false);
      setWikiEntry(null);
      setWikiLoading(false);
      setWikiError(false);
      return;
    }
    if (loading) return;

    const post = posts.find((item) => item.id === postId);
    if (!post) {
      navigate("/blog", { replace: true });
      return;
    }
    if (selectedPost?.id === post.id) return;
    void loadPost(post);
    void loadWikiForPost(post);
  }, [loadPost, loadWikiForPost, loading, navigate, postId, posts, selectedPost?.id]);

  const handleSelectPost = (post: BlogPostMeta) => {
    void loadPost(post);
    void loadWikiForPost(post);
    navigate(`/blog/${encodeURIComponent(post.id)}`);
  };

  const currentWikiPlayerId = aiSession.session?.playerId || null;
  const revealAllWikiSecrets = Boolean(aiSession.session?.isKeeper);
  const displayPlName = aiSession.session?.displayName || "";

  const selectedPostIsReport = useMemo(
    () =>
      Boolean(
        selectedPost &&
          selectedPost.renderMode === "wiki" &&
          selectedPost.wikiEntryId &&
          selectedPost.wikiEntryId.startsWith("report.")
      ),
    [selectedPost]
  );

  const selectedPostPlayerMatched = useMemo(() => {
    if (!selectedPost || !selectedPost.players || selectedPost.players.length === 0) return false;
    const currentId = currentBlogPlayerId.trim().toLowerCase();
    if (!currentId) return false;
    return selectedPost.players.some((playerId) => playerId.trim().toLowerCase() === currentId);
  }, [currentBlogPlayerId, selectedPost]);

  const shouldShowReportSpoilerGate =
    selectedPostIsReport && !selectedPostPlayerMatched && !hasConfirmedSpoiler;

  const closeDetail = useCallback(() => {
    navigate("/blog", { replace: true });
  }, [navigate]);

  useEffect(() => {
    setHasConfirmedSpoiler(false);
  }, [selectedPost?.id]);

  useEffect(() => {
    if (!showPlDialog) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPlDialog(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showPlDialog]);

  useEffect(() => {
    if (!selectedPost) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
    };
  }, [selectedPost, closeDetail]);

  if (loading && posts.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="columns-2 gap-3">
          <Skeleton className="mb-3 aspect-[3/4] rounded-xl break-inside-avoid" />
          <Skeleton className="mb-3 aspect-square rounded-xl break-inside-avoid" />
          <Skeleton className="mb-3 aspect-[4/5] rounded-xl break-inside-avoid" />
          <Skeleton className="mb-3 aspect-[3/4] rounded-xl break-inside-avoid" />
        </div>
      </div>
    );
  }

  if (loadError && posts.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        博客内容加载失败，请刷新后重试。
      </div>
    );
  }

  return (
      <div className="mx-auto max-w-2xl space-y-5">
        {/* 顶部栏：筛选 + PL 名称 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2"
        >
          {/* 特殊 tag：我跑过的 */}
          <Badge
            variant={isMyPlayedMode ? "default" : "outline"}
            className={`cursor-pointer select-none transition-all hover:scale-105 ${
              isMyPlayedMode ? "ring-2 ring-primary/30" : ""
            }`}
            onClick={() => {
              if (!isMyPlayedMode && !aiSession.session) {
                setShowPlDialog(true);
                return;
              }
              setIsMyPlayedMode((v) => !v);
              if (!isMyPlayedMode) setSelectedTags(new Set());
            }}
          >
            {SPECIAL_TAG_MY_PLAYED}
          </Badge>

          {/* 分级 tag 筛选（我跑过的模式下置灰） */}
          <div className={`contents ${isMyPlayedMode ? "opacity-40 pointer-events-none" : ""}`}>
            <TagFilterBar
              allTags={allTags}
              selectedTags={selectedTags}
              toggleTag={toggleTag}
              clearTags={() => setSelectedTags(new Set())}
            />
          </div>

          {/* PL 名称（右上角） */}
          <button
            onClick={() => setShowPlDialog(true)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {aiSession.session ? `PL: ${displayPlName}` : "登录PL"}
          </button>
        </motion.div>

        {/* 等宽双列瀑布流 */}
        <div className="columns-2 gap-3">
          {filteredPosts.map((post) => {
            const hasCover = !!(post.cover && post.cover.length > 0);
            return (
            <motion.div
              key={post.id}
              layout={false}
              layoutId={
                useSharedLayout && hasCover && selectedPost?.id !== post.id
                  ? `card-${post.id}`
                  : undefined
              }
              whileHover={useSharedLayout ? { y: -3, transition: { duration: 0.15 } } : undefined}
              onClick={() => handleSelectPost(post)}
              className={`mb-3 cursor-pointer break-inside-avoid ${
                selectedPost?.id === post.id ? "invisible" : ""
              }`}
            >
              {hasCover ? (
                <ImageCard post={post} />
              ) : (
                <TitleCard post={post} />
              )}
            </motion.div>
          );
          })}
        </div>

        {filteredPosts.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            {isMyPlayedMode ? (
              <div className="space-y-3">
                <p>筛选不到你跑过的模组哦</p>
                <p className="text-sm">
                  是否已经正确登录：<strong className="text-foreground">{displayPlName || "未登录"}</strong>
                </p>
                <button
                  onClick={() => setShowPlDialog(true)}
                  className="text-sm text-primary hover:underline"
                >
                  点击更新
                </button>
              </div>
            ) : (
              "没有匹配的文章"
            )}
          </div>
        )}

        {/* 详情页覆盖层 */}
        <AnimatePresence>
          {selectedPost && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={closeDetail}
              />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="detail-title"
                  className={`fixed inset-0 z-50 pointer-events-auto ${
                    shouldShowReportSpoilerGate
                      ? "overflow-hidden"
                      : "overflow-y-auto overscroll-contain touch-pan-y"
                  }`}
                >
                {/* 固定关闭按钮 */}
                <button
                  onClick={closeDetail}
                  className="pointer-events-auto fixed right-4 top-4 z-[60] rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70 sm:right-6 sm:top-6"
                  aria-label="关闭"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
                <div
                  className={
                    shouldShowReportSpoilerGate
                      ? "flex h-full items-center justify-center p-4 sm:p-8"
                      : "flex min-h-full items-start justify-center p-4 pb-16 pt-10 sm:p-8 sm:pb-20 sm:pt-14"
                  }
                >
                  <motion.div
                    layout={false}
                    layoutId={
                      useSharedLayout && selectedPost.cover && selectedPost.cover.length > 0
                        ? `card-${selectedPost.id}`
                        : undefined
                    }
                    initial={
                      useSharedLayout ? undefined : { opacity: 0, y: 16, scale: 0.98 }
                    }
                    animate={
                      useSharedLayout ? undefined : { opacity: 1, y: 0, scale: 1 }
                    }
                    exit={
                      useSharedLayout ? undefined : { opacity: 0, y: 12, scale: 0.98 }
                    }
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className={`pointer-events-auto relative w-full max-w-3xl rounded-xl border bg-background shadow-2xl overflow-hidden ${
                      shouldShowReportSpoilerGate ? "max-h-[calc(100vh-3rem)]" : ""
                    }`}
                  >
                    <div
                      className={
                        shouldShowReportSpoilerGate
                          ? "pointer-events-none select-none blur-md saturate-50"
                          : ""
                      }
                    >
                      {/* Cover 滑动区域 */}
                      {selectedPost.cover && selectedPost.cover.length > 0 && (
                        <CoverSlider covers={selectedPost.cover} />
                      )}

                      {/* 标签 + 日期 */}
                      <div className="px-6 pt-4 pb-2 flex flex-wrap items-center gap-2">
                        {selectedPost.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        <time className="text-xs text-muted-foreground">
                          {new Date(selectedPost.createdAt).toLocaleDateString("zh-CN")}
                        </time>
                      </div>

                      {/* 标题 */}
                      <div className="px-6 pb-4">
                        <h2 id="detail-title" className="text-lg font-heading font-semibold leading-snug">
                          <span className="block">
                            {selectedPost.title}
                          </span>
                        </h2>
                      </div>

                      {/* 正文（Markdown / Wiki 内嵌） */}
                      <div className="border-t px-6 py-6">
                        {selectedPost.renderMode === "wiki" && selectedPost.wikiEntryId ? (
                          wikiLoading ? (
                            <div className="space-y-3">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-5/6" />
                              <Skeleton className="h-4 w-4/5" />
                            </div>
                          ) : wikiError || !wikiIndex || !wikiEntry ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                              Wiki 词条加载失败，请刷新后重试。
                            </p>
                          ) : (
                            <WikiContentRenderer
                              blocks={wikiEntry.content}
                              currentPlayerId={currentWikiPlayerId}
                              entriesById={new Map(wikiIndex.entries.map((e) => [e.id, e]))}
                              revealAllSecrets={revealAllWikiSecrets}
                              entryBaseRoute="/tools/world-wiki"
                            />
                          )
                        ) : contentLoading ? (
                          <div className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ) : contentError ? (
                          <p className="py-8 text-center text-sm text-muted-foreground">
                            文章内容加载失败，请刷新后重试。
                          </p>
                        ) : (
                          <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-heading prose-a:text-primary prose-blockquote:border-l-primary/50 prose-code:text-primary/80 prose-pre:bg-secondary prose-pre:border prose-img:rounded-lg">
                            <Markdown remarkPlugins={[remarkGfm, remarkFrontmatter]}>
                              {postContent}
                            </Markdown>
                          </article>
                        )}
                      </div>
                    </div>
                    {shouldShowReportSpoilerGate ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-background/95 p-6 text-center shadow-2xl">
                          <p className="text-sm leading-7 text-foreground/90">
                            你可能没有参与这次游戏，或者没有玩过这个模组。确定要查看战报吗？这可能带来轻微剧透
                          </p>
                          <div className="mt-5 flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => setHasConfirmedSpoiler(true)}
                              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                              确定
                            </button>
                            <button
                              type="button"
                              onClick={closeDetail}
                              className="rounded-md border border-border/70 bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent/40"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                </div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* PL token 登录弹窗 */}
        <AnimatePresence>
          {showPlDialog && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] bg-black/50"
                onClick={() => setShowPlDialog(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="pl-dialog-title"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed left-1/2 top-1/3 z-[71] -translate-x-1/2 -translate-y-1/2 w-[min(90vw,320px)] rounded-xl border bg-background p-6 shadow-2xl"
              >
                <h3 id="pl-dialog-title" className="text-base font-heading font-semibold mb-3">登录 PL</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  请输出pl的token码。如果你不知道要填什么，去询问你的kp。
                </p>
                <PlTokenInput
                  loading={aiSession.loading}
                  onConfirm={async (token) => {
                    try {
                      const session = await aiSession.login(token);
                      toast.success(`已登录为 ${session.displayName}`);
                      setShowPlDialog(false);
                      if (session.playerId) setIsMyPlayedMode(true);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "登录失败");
                    }
                  }}
                />
                {aiSession.session ? (
                  <button
                    type="button"
                    className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => {
                      aiSession.logout();
                      setIsMyPlayedMode(false);
                    setShowPlDialog(false);
                    }}
                  >
                    退出当前登录
                  </button>
                ) : null}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
  );
}

function PlTokenInput({
  loading,
  onConfirm,
}: {
  loading: boolean;
  onConfirm: (token: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="输入 token"
        className="flex-1 rounded-md border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        autoFocus
        disabled={loading}
        onKeyDown={(e) => { if (e.key === "Enter") onConfirm(value.trim()); }}
      />
      <button
        type="button"
        onClick={() => onConfirm(value.trim())}
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {loading ? "登录中" : "确认"}
      </button>
    </div>
  );
}

/** 封面滑动组件 — 第一张保持原比例，后续 fitXY */
function CoverSlider({ covers }: { covers: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);

  const updateIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentIndex(Math.min(index, covers.length - 1));
  }, [covers.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const supportsScrollEnd = "onscrollend" in window;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScrollEnd = () => updateIndex();
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(updateIndex, 80);
    };
    if (supportsScrollEnd) {
      el.addEventListener("scrollend", onScrollEnd);
    } else {
      el.addEventListener("scroll", onScroll);
    }
    return () => {
      if (supportsScrollEnd) {
        el.removeEventListener("scrollend", onScrollEnd);
      } else {
        el.removeEventListener("scroll", onScroll);
      }
      if (timer) clearTimeout(timer);
    };
  }, [updateIndex]);

  if (covers.length === 1) {
    return (
      <img
        src={covers[0]}
        alt="封面"
        className="w-full h-auto"
      />
    );
  }

  return (
    <div className="relative" style={{ height: containerHeight }}>
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", height: containerHeight }}
      >
        {covers.map((src, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-center" style={{ height: containerHeight }}>
            {i === 0 ? (
              <img
                src={src}
                alt={`封面 ${i + 1}`}
                className="w-full h-auto"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setContainerHeight(img.offsetHeight);
                }}
              />
            ) : (
              <img src={src} alt={`封面 ${i + 1}`} className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>
      {/* 指示器 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {covers.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/** 有封面图的卡片 — 列表只显示第一张 */
function ImageCard({ post }: { post: BlogPostMeta }) {
  const [imgError, setImgError] = useState(false);
  const firstCover = post.cover![0];

  if (imgError) return <TitleCard post={post} />;

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-lg min-h-[120px]">
      <img
        src={firstCover}
        alt={post.title}
        className="w-full h-auto block"
        loading="lazy"
        onError={() => setImgError(true)}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8">
        <span className="block text-sm font-medium text-white leading-snug line-clamp-2" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
          {post.title}
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {post.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 无封面的标题卡片 */
function TitleCard({ post }: { post: BlogPostMeta }) {
  return (
    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-br from-secondary via-card to-secondary p-6 text-center shadow-sm transition-shadow hover:shadow-lg">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_40%,oklch(0.55_0.12_160),transparent_60%),radial-gradient(circle_at_70%_70%,oklch(0.45_0.10_290),transparent_50%)]" />
      <div className="relative z-10">
        <span className="block text-base font-heading font-semibold leading-snug">
          {post.title}
        </span>
        <div className="mt-3 flex flex-wrap justify-center gap-1">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <time className="mt-2 block text-xs text-muted-foreground">
          {new Date(post.createdAt).toLocaleDateString("zh-CN")}
        </time>
      </div>
    </div>
  );
}

/** Tag 分级筛选栏 — 一级为 DropdownMenu 触发器（不可选），二级为 CheckboxItem */
function TagFilterBar({
  allTags,
  selectedTags,
  toggleTag,
  clearTags,
}: {
  allTags: string[];
  selectedTags: Set<string>;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
}) {
  const categorizedTags = new Set<string>();
  TAG_CATEGORIES.forEach((cat) => cat.tags.forEach((t) => categorizedTags.add(t)));
  const otherTags = allTags.filter((t) => !categorizedTags.has(t));

  const hasSelection = (tags: readonly string[]) =>
    tags.some((t) => selectedTags.has(t));

  return (
    <>
      {TAG_CATEGORIES.map((cat) => (
        <DropdownMenu key={cat.name}>
          <DropdownMenuTrigger asChild>
            <button
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                hasSelection(cat.tags)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.name}
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">{cat.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {cat.tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag}
                checked={selectedTags.has(tag)}
                onCheckedChange={() => toggleTag(tag)}
                onSelect={(e) => e.preventDefault()}
              >
                {tag}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}

      {otherTags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                otherTags.some((t) => selectedTags.has(t))
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              其他
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">其他</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {otherTags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag}
                checked={selectedTags.has(tag)}
                onCheckedChange={() => toggleTag(tag)}
                onSelect={(e) => e.preventDefault()}
              >
                {tag}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {selectedTags.size > 0 && (
        <>
          <div className="flex flex-wrap gap-1">
            {Array.from(selectedTags).map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="cursor-pointer text-xs"
                onClick={() => toggleTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
          <button
            onClick={clearTags}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            清除
          </button>
        </>
      )}
    </>
  );
}
