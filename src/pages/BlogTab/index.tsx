import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { ChevronDown } from "lucide-react";
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

interface BlogPostMeta {
  id: string;
  title: string;
  file: string;
  cover?: string[];
  tags: string[];
  players?: string[];
  createdAt: string;
  updatedAt: string;
}

const PL_STORAGE_KEY = "blog-pl-name";
const SPECIAL_TAG_MY_PLAYED = "我跑过的";

let indexCache: BlogPostMeta[] | null = null;
const contentCache = new Map<string, string>();

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
  const contentRequestRef = useRef(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [plName, setPlName] = useState(() => localStorage.getItem(PL_STORAGE_KEY) || "");
  const [showPlDialog, setShowPlDialog] = useState(false);
  const [isMyPlayedMode, setIsMyPlayedMode] = useState(false);

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

  const filteredPosts = useMemo(() => {
    if (isMyPlayedMode) {
      if (!plName) return [];
      const normalizedPl = plName.trim().toLowerCase();
      return posts.filter((p) =>
        p.players?.some((pl) => pl.trim().toLowerCase() === normalizedPl)
      );
    }
    if (selectedTags.size === 0) return posts;
    return posts.filter((p) => p.tags.some((t) => selectedTags.has(t)));
  }, [posts, selectedTags, isMyPlayedMode, plName]);

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

  useEffect(() => {
    if (!postId) {
      contentRequestRef.current += 1;
      setSelectedPost(null);
      setPostContent("");
      setContentLoading(false);
      setContentError(false);
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
  }, [loadPost, loading, navigate, postId, posts, selectedPost?.id]);

  const handleSelectPost = (post: BlogPostMeta) => {
    void loadPost(post);
    navigate(`/blog/${encodeURIComponent(post.id)}`);
  };

  const closeDetail = useCallback(() => {
    navigate("/blog", { replace: true });
  }, [navigate]);

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
    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);

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
    <LayoutGroup id="blog">
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
              if (!isMyPlayedMode && !plName) {
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
            {plName ? `PL: ${plName}` : "设置PL名称"}
          </button>
        </motion.div>

        {/* 等宽双列瀑布流 */}
        <div className="columns-2 gap-3">
          {filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              layoutId={`card-${post.id}`}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              onClick={() => handleSelectPost(post)}
              className="mb-3 cursor-pointer break-inside-avoid"
            >
              {post.cover && post.cover.length > 0 ? (
                <ImageCard post={post} />
              ) : (
                <TitleCard post={post} />
              )}
            </motion.div>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            {isMyPlayedMode ? (
              <div className="space-y-3">
                <p>筛选不到你跑过的模组哦</p>
                <p className="text-sm">
                  是否已经正确填写了PL名称：<strong className="text-foreground">{plName || "未设置"}</strong>
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
                  className="fixed inset-0 z-50 overflow-y-auto pointer-events-auto"
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
                <div className="flex min-h-full items-start justify-center p-4 pb-16 pt-10 sm:p-8 sm:pb-20 sm:pt-14">
                  <motion.div
                    layoutId={`card-${selectedPost.id}`}
                    className="pointer-events-auto w-full max-w-3xl rounded-xl border bg-background shadow-2xl overflow-hidden"
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
                        <motion.span layoutId={`title-${selectedPost.id}`} className="block">
                          {selectedPost.title}
                        </motion.span>
                      </h2>
                    </div>

                    {/* Markdown 正文 */}
                    <div className="border-t px-6 py-6">
                      {contentLoading ? (
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
                  </motion.div>
                </div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* PL 名称输入弹窗 */}
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
                <h3 id="pl-dialog-title" className="text-base font-heading font-semibold mb-3">设置 PL 名称</h3>
                <p className="text-xs text-muted-foreground mb-3">输入你的玩家名称，用于筛选"我跑过的"模组</p>
                <PlNameInput
                  initialValue={plName}
                  onConfirm={(name) => {
                    setPlName(name);
                    localStorage.setItem(PL_STORAGE_KEY, name);
                    setShowPlDialog(false);
                    if (name) setIsMyPlayedMode(true);
                  }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

function PlNameInput({ initialValue, onConfirm }: { initialValue: string; onConfirm: (name: string) => void }) {
  const [value, setValue] = useState(initialValue);
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="输入玩家名称"
        className="flex-1 rounded-md border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        autoFocus
        onKeyDown={(e) => { if (e.key === "Enter") onConfirm(value.trim()); }}
      />
      <button
        onClick={() => onConfirm(value.trim())}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        确认
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
        <motion.span layoutId={`title-${post.id}`} className="block text-sm font-medium text-white leading-snug line-clamp-2" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
          {post.title}
        </motion.span>
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
        <motion.span layoutId={`title-${post.id}`} className="block text-base font-heading font-semibold leading-snug">
          {post.title}
        </motion.span>
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
