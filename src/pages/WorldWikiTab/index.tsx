import { useState, useEffect, useMemo, useCallback, type AnchorHTMLAttributes } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Search,
  Users,
  MapPin,
  ScrollText,
  LibraryBig,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  LockKeyhole,
  Sparkles,
  BookCopy,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type WikiCategory = "character" | "location" | "event" | "module";

interface WikiFact {
  label: string;
  value: string;
}

interface WikiEntryMeta {
  id: string;
  title: string;
  file: string;
  category: WikiCategory;
  summary: string;
  tags: string[];
  aliases?: string[];
  players?: string[];
  relatedIds?: string[];
  facts?: WikiFact[];
  createdAt: string;
  updatedAt: string;
}

interface WikiContentSegment {
  type: "markdown" | "secret";
  content: string;
  players?: string[];
}

const PL_STORAGE_KEY = "blog-pl-name";
const WIKI_HOME_ROUTE = "/tools/world-wiki";
const SECRET_BLOCK_REGEX = /\[secret players="([^"]*)"\]([\s\S]*?)\[\/secret\]/g;

const CATEGORY_META: Record<
  WikiCategory,
  {
    label: string;
    description: string;
    icon: typeof Users;
    chipClassName: string;
  }
> = {
  character: {
    label: "人物",
    description: "调查员、关键 NPC 与关系网",
    icon: Users,
    chipClassName: "border-primary/30 bg-primary/10 text-primary",
  },
  location: {
    label: "地点",
    description: "小镇、医院、街区与重要据点",
    icon: MapPin,
    chipClassName: "border-accent/30 bg-accent/10 text-accent",
  },
  event: {
    label: "事件",
    description: "按时间线整理的大事件与余波",
    icon: ScrollText,
    chipClassName: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  module: {
    label: "模组",
    description: "补充资料、场景与可复用设定",
    icon: LibraryBig,
    chipClassName: "border-foreground/15 bg-foreground/5 text-foreground",
  },
};

const CATEGORY_ORDER: WikiCategory[] = ["character", "location", "event", "module"];

let wikiIndexCache: WikiEntryMeta[] | null = null;
const wikiContentCache = new Map<string, string>();

/** 统一做文本归一化，避免搜索与 PL 比对时受大小写和空格影响。 */
function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

/** 将未解锁文本替换成黑块字符，保留空白结构以模拟档案遮罩效果。 */
function maskSecretText(value: string): string {
  return value.replace(/[^\s]/g, "█");
}

/** 按约定语法切分普通 markdown 与受 PL 控制的隐藏档案块。 */
function buildWikiContentSegments(content: string): WikiContentSegment[] {
  const segments: WikiContentSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(SECRET_BLOCK_REGEX)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      segments.push({
        type: "markdown",
        content: content.slice(lastIndex, matchIndex),
      });
    }

    segments.push({
      type: "secret",
      players: match[1]
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      content: match[2].trim(),
    });

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: "markdown",
      content: content.slice(lastIndex),
    });
  }

  return segments.filter((segment) => segment.content.trim().length > 0);
}

/** 只有当前 PL 名称命中词条允许名单时，才显示隐藏档案正文。 */
function canUnlockSecret(players: string[] | undefined, plName: string): boolean {
  if (!players || players.length === 0) return false;
  if (!plName.trim()) return false;
  const currentPl = normalizeText(plName);
  return players.some((player) => normalizeText(player) === currentPl);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("zh-CN");
}

function matchesCurrentPl(entry: WikiEntryMeta, plName: string): boolean {
  if (!plName.trim()) return false;
  const currentPl = normalizeText(plName);
  return entry.players?.some((player) => normalizeText(player) === currentPl) ?? false;
}

function CurrentPlButton({ plName, onClick }: { plName: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {`[当前PL：${plName || "未设定"}]`}
    </button>
  );
}

function PlNameDialog({
  open,
  initialValue,
  onClose,
  onConfirm,
}: {
  open: boolean;
  initialValue: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Enter") onConfirm(value.trim());
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onConfirm, open, value]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/55" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wiki-pl-dialog-title"
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        className="fixed left-1/2 top-1/3 z-[71] w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background/95 p-6 shadow-2xl"
      >
        <h3 id="wiki-pl-dialog-title" className="text-base font-heading font-semibold">
          设置当前 PL
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          用于解锁部分人物视角档案，也会在首页高亮你的相关词条。
        </p>
        <div className="mt-4 flex gap-2">
          <Input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="例如：Cici / 莱纳 / 稻草人"
          />
          <Button onClick={() => onConfirm(value.trim())}>确认</Button>
        </div>
      </motion.div>
    </>
  );
}

function LockedSecretBlock({ content }: { content: string }) {
  return (
    <button
      type="button"
      onClick={() => toast("请探索更多故事解锁~", { duration: 1800 })}
      className="relative my-6 w-full overflow-hidden rounded-xl border border-black/70 bg-black p-4 text-left shadow-inner transition-transform hover:-translate-y-0.5"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_40%,rgba(255,255,255,0.04))]" />
      <div className="relative z-10 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-primary-foreground/70">
        <LockKeyhole className="h-3.5 w-3.5" />
        档案未解锁
      </div>
      <pre className="relative z-10 mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-700">
        {maskSecretText(content)}
      </pre>
    </button>
  );
}

function WikiMarkdown({
  content,
  plName,
}: {
  content: string;
  plName: string;
}) {
  const segments = useMemo(() => buildWikiContentSegments(content), [content]);

  return (
    <div className="space-y-2">
      {segments.map((segment, index) => {
        if (segment.type === "secret") {
          const unlocked = canUnlockSecret(segment.players, plName);
          return unlocked ? (
            <div
              key={`secret-${index}`}
              className="rounded-xl border border-primary/20 bg-primary/5 p-4"
            >
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                已解锁档案
              </div>
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {segment.content}
              </Markdown>
            </div>
          ) : (
            <LockedSecretBlock key={`secret-${index}`} content={segment.content} />
          );
        }

        return (
          <Markdown
            key={`markdown-${index}`}
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {segment.content}
          </Markdown>
        );
      })}
    </div>
  );
}

const markdownComponents = {
  a: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (!href) return <span>{children}</span>;

    if (href.startsWith("/tools/world-wiki/")) {
      return (
        <Link
          to={href}
          className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          {children}
        </Link>
      );
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        {...props}
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-primary/40 bg-primary/5 px-4 py-2 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
};

function WikiEntryCard({
  entry,
  currentPl,
}: {
  entry: WikiEntryMeta;
  currentPl: string;
}) {
  const categoryMeta = CATEGORY_META[entry.category];
  const Icon = categoryMeta.icon;

  return (
    <Link
      to={`${WIKI_HOME_ROUTE}/${entry.id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="eldritch-card h-full gap-4 border-border/70 bg-card/80 py-5 transition-transform hover:-translate-y-1">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <Badge variant="outline" className={categoryMeta.chipClassName}>
              <Icon className="h-3.5 w-3.5" />
              {categoryMeta.label}
            </Badge>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-lg leading-snug">{entry.title}</CardTitle>
            <CardDescription className="text-sm leading-6">
              {entry.summary}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {entry.players && entry.players.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.players.map((player) => (
                <Badge
                  key={player}
                  variant={matchesCurrentPl(entry, currentPl) && normalizeText(player) === normalizeText(currentPl) ? "default" : "secondary"}
                  className="text-[11px]"
                >
                  {player}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[11px]">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function WorldWikiTab() {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId?: string }>();
  const [entries, setEntries] = useState<WikiEntryMeta[]>(wikiIndexCache || []);
  const [indexLoading, setIndexLoading] = useState(!wikiIndexCache);
  const [indexError, setIndexError] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<WikiCategory | "all">("all");
  const [plName, setPlName] = useState(() => localStorage.getItem(PL_STORAGE_KEY) || "");
  const [showPlDialog, setShowPlDialog] = useState(false);
  const [detailContent, setDetailContent] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!wikiIndexCache) setIndexLoading(true);
    setIndexError(false);

    fetch("/wiki/index.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load wiki index: ${response.status}`);
        return response.json();
      })
      .then((data: WikiEntryMeta[]) => {
        if (cancelled) return;
        wikiIndexCache = data;
        setEntries(data);
      })
      .catch(() => {
        if (!cancelled && !wikiIndexCache) setIndexError(true);
      })
      .finally(() => {
        if (!cancelled) setIndexLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === entryId) ?? null,
    [entries, entryId]
  );

  useEffect(() => {
    if (!entryId) {
      setDetailContent("");
      setDetailLoading(false);
      setDetailError(false);
      return;
    }

    if (indexLoading) return;
    if (!selectedEntry) {
      navigate(WIKI_HOME_ROUTE, { replace: true });
      return;
    }

    const cached = wikiContentCache.get(selectedEntry.file);
    if (cached) {
      setDetailContent(cached);
      setDetailLoading(false);
      setDetailError(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(false);
    setDetailContent("");

    fetch(`/wiki/${selectedEntry.file}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load wiki entry: ${response.status}`);
        return response.text();
      })
      .then((content) => {
        if (cancelled) return;
        wikiContentCache.set(selectedEntry.file, content);
        setDetailContent(content);
      })
      .catch(() => {
        if (!cancelled) setDetailError(true);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entryId, indexLoading, navigate, selectedEntry]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    return entries.filter((entry) => {
      const matchesCategory =
        selectedCategory === "all" ? true : entry.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const searchTarget = [
        entry.title,
        entry.summary,
        entry.aliases?.join(" "),
        entry.tags.join(" "),
        entry.players?.join(" "),
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeText(searchTarget).includes(normalizedQuery);
    });
  }, [entries, query, selectedCategory]);

  const groupedEntries = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      entries: filteredEntries.filter((entry) => entry.category === category),
    })).filter((group) => group.entries.length > 0);
  }, [filteredEntries]);

  const currentPlEntries = useMemo(
    () => entries.filter((entry) => matchesCurrentPl(entry, plName)),
    [entries, plName]
  );

  const relatedEntries = useMemo(() => {
    if (!selectedEntry?.relatedIds) return [];
    return selectedEntry.relatedIds
      .map((id) => entries.find((entry) => entry.id === id) ?? null)
      .filter((entry): entry is WikiEntryMeta => entry !== null);
  }, [entries, selectedEntry]);

  const handleSavePlName = useCallback((name: string) => {
    localStorage.setItem(PL_STORAGE_KEY, name);
    setPlName(name);
    setShowPlDialog(false);
  }, []);

  if (indexLoading && entries.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-44 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (indexError && entries.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        世界 wiki 数据加载失败，请刷新后重试。
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="eldritch-card overflow-hidden rounded-[28px] border border-border/70 bg-card/75 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 text-primary">
              <BookCopy className="h-3.5 w-3.5" />
              世界 Wiki
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-heading font-semibold tracking-wide md:text-4xl">
                金斯波特档案总览
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                参考百科全书式的信息架构，整理人物、地点、事件与模组之间的关系。
                词条正文来自静态文件，适合持续补完与快速部署。
              </p>
            </div>
          </div>
          <CurrentPlButton plName={plName} onClick={() => setShowPlDialog(true)} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-2xl border border-border/60 bg-background/65 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="检索人物、地点、事件、别名或 PL 名称"
                className="pl-9"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selectedCategory === "all"
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                全部
              </button>
              {CATEGORY_ORDER.map((category) => {
                const meta = CATEGORY_META[category];
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selectedCategory === category
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/65 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              当前视角摘要
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {plName
                ? `当前已锁定为「${plName}」。系统会高亮与你相关的词条，并决定隐藏档案是否解锁。`
                : "尚未设置当前 PL。你仍可浏览公开词条，但部分人物视角档案会保持遮罩状态。"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {CATEGORY_ORDER.map((category) => {
                const Icon = CATEGORY_META[category].icon;
                const count = entries.filter((entry) => entry.category === category).length;
                return (
                  <div key={category} className="rounded-xl border border-border/50 bg-card/70 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4 text-primary" />
                      {CATEGORY_META[category].label}
                    </div>
                    <p className="mt-2 text-2xl font-heading font-semibold">{count}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {CATEGORY_META[category].description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {selectedEntry ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <article className="rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <Button variant="ghost" size="sm" className="-ml-3 w-fit" asChild>
                  <Link to={WIKI_HOME_ROUTE}>
                    <ArrowLeft className="h-4 w-4" />
                    返回检索页
                  </Link>
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={CATEGORY_META[selectedEntry.category].chipClassName}>
                    {CATEGORY_META[selectedEntry.category].label}
                  </Badge>
                  <Badge variant="outline">更新于 {formatDate(selectedEntry.updatedAt)}</Badge>
                </div>
                <h2 className="text-3xl font-heading font-semibold leading-tight">
                  {selectedEntry.title}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                  {selectedEntry.summary}
                </p>
              </div>
              <CurrentPlButton plName={plName} onClick={() => setShowPlDialog(true)} />
            </div>

            <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-heading prose-a:text-primary prose-code:text-primary/80 prose-pre:bg-secondary prose-pre:border prose-li:my-1">
              {detailLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-40 w-full rounded-xl" />
                </div>
              ) : detailError ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  词条内容加载失败，请刷新后重试。
                </p>
              ) : (
                <WikiMarkdown content={detailContent} plName={plName} />
              )}
            </div>
          </article>

          <aside className="space-y-4">
            <Card className="gap-4 border-border/70 bg-card/80 py-5">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">信息框</CardTitle>
                <CardDescription>百科页风格的核心资料摘要</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {selectedEntry.facts?.map((fact) => (
                  <div key={fact.label} className="rounded-xl border border-border/50 bg-background/65 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {fact.label}
                    </p>
                    <p className="mt-1 leading-6">{fact.value}</p>
                  </div>
                ))}
                {selectedEntry.aliases && selectedEntry.aliases.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-background/65 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">别名</p>
                    <p className="mt-1 leading-6">{selectedEntry.aliases.join(" / ")}</p>
                  </div>
                )}
                {selectedEntry.players && selectedEntry.players.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-background/65 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">关联 PL</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedEntry.players.map((player) => (
                        <Badge key={player} variant="secondary" className="text-[11px]">
                          {player}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-border/50 bg-background/65 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">标签</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedEntry.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[11px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {relatedEntries.length > 0 && (
              <Card className="gap-4 border-border/70 bg-card/80 py-5">
                <CardHeader className="gap-2">
                  <CardTitle className="text-base">关联词条</CardTitle>
                  <CardDescription>从这里继续跳转调查</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {relatedEntries.map((entry) => (
                    <Link
                      key={entry.id}
                      to={`${WIKI_HOME_ROUTE}/${entry.id}`}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-sm transition-colors hover:bg-accent/40"
                    >
                      <span>{entry.title}</span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="gap-4 border-primary/25 bg-primary/5 py-5">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">隐藏档案规则</CardTitle>
                <CardDescription>未解锁时使用黑色遮罩保护剧透信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>当前页面中的黑色档案块会根据「当前 PL」自动判断是否解锁。</p>
                <p>若尚未解锁，点击遮罩会提示：请探索更多故事解锁~</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      ) : (
        <>
          {plName && currentPlEntries.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-semibold">与你相关的词条</h2>
                  <p className="text-sm text-muted-foreground">
                    基于当前 PL「{plName}」高亮的世界档案入口
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {currentPlEntries.map((entry) => (
                  <WikiEntryCard key={entry.id} entry={entry} currentPl={plName} />
                ))}
              </div>
            </section>
          )}

          {groupedEntries.map((group) => (
            <section key={group.category} className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-heading font-semibold">
                    {CATEGORY_META[group.category].label}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_META[group.category].description}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  共 {group.entries.length} 条结果
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.entries.map((entry) => (
                  <WikiEntryCard key={entry.id} entry={entry} currentPl={plName} />
                ))}
              </div>
            </section>
          ))}

          {filteredEntries.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border/70 px-6 py-16 text-center text-sm text-muted-foreground">
              没有找到匹配的 wiki 词条，请尝试更换关键词或分类。
            </div>
          )}
        </>
      )}

      <PlNameDialog
        open={showPlDialog}
        initialValue={plName}
        onClose={() => setShowPlDialog(false)}
        onConfirm={handleSavePlName}
      />
    </div>
  );
}
