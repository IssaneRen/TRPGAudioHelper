import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BlogPostMeta {
  id: string;
  title: string;
  file: string;
  cover?: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

let indexCache: BlogPostMeta[] | null = null;
const contentCache = new Map<string, string>();

export default function BlogTab() {
  const [posts, setPosts] = useState<BlogPostMeta[]>(indexCache || []);
  const [loading, setLoading] = useState(!indexCache);
  const [selectedPost, setSelectedPost] = useState<BlogPostMeta | null>(null);
  const [postContent, setPostContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (indexCache) return;
    fetch("/blog/index.json")
      .then((r) => r.json())
      .then((data: BlogPostMeta[]) => {
        indexCache = data;
        setPosts(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (selectedTags.size === 0) return posts;
    return posts.filter((p) => p.tags.some((t) => selectedTags.has(t)));
  }, [posts, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleSelectPost = async (post: BlogPostMeta) => {
    setSelectedPost(post);
    const cached = contentCache.get(post.file);
    if (cached) {
      setPostContent(cached);
      return;
    }
    setContentLoading(true);
    try {
      const res = await fetch(`/blog/${post.file}`);
      const text = await res.text();
      contentCache.set(post.file, text);
      setPostContent(text);
    } finally {
      setContentLoading(false);
    }
  };

  const closeDetail = useCallback(() => {
    setSelectedPost(null);
    setPostContent("");
  }, []);

  useEffect(() => {
    if (!selectedPost) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handler);
    };
  }, [selectedPost, closeDetail]);

  if (loading) {
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

  return (
    <LayoutGroup id="blog">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Tag 筛选栏 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.has(tag) ? "default" : "outline"}
              className="cursor-pointer select-none transition-all hover:scale-105"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
          {selectedTags.size > 0 && (
            <Badge
              variant="ghost"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedTags(new Set())}
            >
              清除筛选
            </Badge>
          )}
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
            没有匹配的文章
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
                className="fixed inset-0 z-50 overflow-y-auto pointer-events-none"
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
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
                      ) : (
                        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-heading prose-a:text-primary prose-blockquote:border-l-primary/50 prose-code:text-primary/80 prose-pre:bg-secondary prose-pre:border prose-img:rounded-lg">
                          <Markdown remarkPlugins={[remarkGfm]}>
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
      </div>
    </LayoutGroup>
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
