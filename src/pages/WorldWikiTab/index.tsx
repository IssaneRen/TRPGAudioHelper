import { useState, useEffect, useMemo, useCallback } from "react";
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
  Sparkles,
  BookCopy,
  Database,
  WandSparkles,
  Gem,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion } from "framer-motion";
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
import { WikiContentRenderer } from "@/features/wiki/WikiContentRenderer";
import type {
  WikiCategory,
  WikiEntryRecord,
  WikiIndexEntry,
  WikiIndexPayload,
  WikiPlayer,
} from "@/types/wiki";

const PL_STORAGE_KEY = "blog-pl-name";
const WIKI_HOME_ROUTE = "/tools/world-wiki";

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
    description: "调查员、NPC 与人物视角回看",
    icon: Users,
    chipClassName: "border-primary/30 bg-primary/10 text-primary",
  },
  location: {
    label: "地点",
    description: "小镇、医院、街区与事件舞台",
    icon: MapPin,
    chipClassName: "border-accent/30 bg-accent/10 text-accent",
  },
  event: {
    label: "事件",
    description: "跑后回看时的关键时间线节点",
    icon: ScrollText,
    chipClassName: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  module: {
    label: "模组",
    description: "给 PL 用的设定总索引与战报跳转入口",
    icon: LibraryBig,
    chipClassName: "border-foreground/15 bg-foreground/5 text-foreground",
  },
  "magic-book": {
    label: "魔法书籍",
    description: "法术来源、禁忌知识与阅读代价",
    icon: WandSparkles,
    chipClassName: "border-violet-300/40 bg-violet-500/10 text-violet-700",
  },
  "magic-item": {
    label: "魔法物品",
    description: "被诅咒之物、圣遗物与功能道具",
    icon: Gem,
    chipClassName: "border-emerald-300/40 bg-emerald-500/10 text-emerald-700",
  },
};

const CATEGORY_ORDER: WikiCategory[] = ["character", "location", "event", "module", "magic-book", "magic-item"];

let wikiIndexCache: WikiIndexPayload | null = null;
let wikiEntryDetailCache: Record<string, WikiEntryRecord> = {};

/** 文本统一归一化，确保 PL / 名称 / 别名匹配规则保持一致。 */
function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("zh-CN");
}

/** 复用 blog-pl-name，但在 wiki 内解析成玩家唯一键，避免名字改动导致权限失效。 */
function resolveCurrentPlayer(index: WikiIndexPayload | null, plName: string): WikiPlayer | null {
  if (!index || !plName.trim()) return null;
  const matchedId = index.lookup.playerIdByName[normalizeText(plName)];
  return index.players.find((player) => player.id === matchedId) ?? null;
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
          用于解锁你的个人视角补遗，并高亮与你相关的词条入口。
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

function WikiEntryCard({
  entry,
  currentPlayerId,
  playersById,
}: {
  entry: WikiIndexEntry;
  currentPlayerId: string | null;
  playersById: Map<string, WikiPlayer>;
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
            <CardTitle className="text-lg leading-snug">{entry.displayName}</CardTitle>
            <CardDescription className="text-sm leading-6">
              {entry.summary}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {entry.playerIds && entry.playerIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.playerIds.map((playerId) => {
                const player = playersById.get(playerId);
                if (!player) return null;
                return (
                  <Badge
                    key={player.id}
                    variant={currentPlayerId === player.id ? "default" : "secondary"}
                    className="text-[11px]"
                  >
                    {player.displayName}
                  </Badge>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            <span>唯一键：{entry.id}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function WorldWikiTab() {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId?: string }>();
  const [indexData, setIndexData] = useState<WikiIndexPayload | null>(wikiIndexCache);
  const [entryDetailsById, setEntryDetailsById] = useState<Record<string, WikiEntryRecord>>(
    wikiEntryDetailCache
  );
  const [indexLoading, setIndexLoading] = useState(!wikiIndexCache);
  const [indexError, setIndexError] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<WikiCategory | "all">("all");
  const [plName, setPlName] = useState(() => localStorage.getItem(PL_STORAGE_KEY) || "");
  const [showPlDialog, setShowPlDialog] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [isSearchPanelExpanded, setIsSearchPanelExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!wikiIndexCache) setIndexLoading(true);
    setIndexError(false);

    fetch("/wiki/index.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load wiki index: ${response.status}`);
        return response.json();
      })
      .then((data: WikiIndexPayload) => {
        if (cancelled) return;
        wikiIndexCache = data;
        setIndexData(data);
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

  useEffect(() => {
    if (!entryId) {
      setDetailLoading(false);
      setDetailError(false);
      return;
    }

    if (wikiEntryDetailCache[entryId]) {
      setEntryDetailsById({ ...wikiEntryDetailCache });
      setDetailLoading(false);
      setDetailError(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(false);

    fetch(`/wiki/entities/entries/${entryId}.json`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load wiki entry detail: ${response.status}`);
        return response.json();
      })
      .then((data: WikiEntryRecord) => {
        if (cancelled) return;
        wikiEntryDetailCache = {
          ...wikiEntryDetailCache,
          [data.id]: data,
        };
        setEntryDetailsById({ ...wikiEntryDetailCache });
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
  }, [entryId]);

  useEffect(() => {
    if (entryId) {
      setIsSearchPanelExpanded(false);
    }
  }, [entryId]);

  const playersById = useMemo(
    () => new Map((indexData?.players || []).map((player) => [player.id, player])),
    [indexData]
  );

  const modulesById = useMemo(
    () => new Map((indexData?.modules || []).map((module) => [module.id, module])),
    [indexData]
  );

  const entriesById = useMemo(
    () => new Map((indexData?.entries || []).map((entry) => [entry.id, entry])),
    [indexData]
  );

  const currentPlayer = useMemo(
    () => resolveCurrentPlayer(indexData, plName),
    [indexData, plName]
  );

  const selectedEntry = useMemo(
    () => (indexData?.entries || []).find((entry) => entry.id === entryId) ?? null,
    [indexData, entryId]
  );

  const selectedEntryDetail = useMemo(
    () => (entryId ? entryDetailsById[entryId] ?? null : null),
    [entryDetailsById, entryId]
  );

  useEffect(() => {
    if (!entryId) {
      setDetailLoading(false);
      setDetailError(false);
      return;
    }

    if (indexLoading) return;
    if (!selectedEntry) {
      navigate(WIKI_HOME_ROUTE, { replace: true });
    }
  }, [entryId, indexLoading, navigate, selectedEntry]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    return (indexData?.entries || []).filter((entry) => {
      const matchesCategory =
        selectedCategory === "all" ? true : entry.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const searchTarget = [
        entry.displayName,
        entry.summary,
        entry.aliasNames?.join(" "),
        entry.playerIds?.map((playerId) => playersById.get(playerId)?.displayName || "").join(" "),
        entry.moduleIds?.map((moduleId) => modulesById.get(moduleId)?.displayName || "").join(" "),
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeText(searchTarget).includes(normalizedQuery);
    });
  }, [indexData, modulesById, playersById, query, selectedCategory]);

  const groupedEntries = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      entries: filteredEntries.filter((entry) => entry.category === category),
    })).filter((group) => group.entries.length > 0);
  }, [filteredEntries]);

  /** 检索结果按分类计数，供搜索框下方状态文案使用。 */
  const searchResultStats = useMemo(() => {
    const counts: Record<WikiCategory, number> = {
      character: 0,
      location: 0,
      event: 0,
      module: 0,
      "magic-book": 0,
      "magic-item": 0,
    };
    for (const entry of filteredEntries) {
      counts[entry.category] += 1;
    }
    return { total: filteredEntries.length, counts };
  }, [filteredEntries]);

  const currentPlEntries = useMemo(
    () =>
      (indexData?.entries || []).filter((entry) =>
        currentPlayer ? entry.playerIds?.includes(currentPlayer.id) : false
      ),
    [currentPlayer, indexData]
  );

  const relatedEntries = useMemo(() => {
    if (!selectedEntry?.relatedEntryIds) return [];
    return selectedEntry.relatedEntryIds
      .map((id) => indexData?.entries.find((entry) => entry.id === id) ?? null)
      .filter((entry): entry is WikiIndexEntry => entry !== null);
  }, [indexData, selectedEntry]);

  const handleSavePlName = useCallback((name: string) => {
    localStorage.setItem(PL_STORAGE_KEY, name);
    setPlName(name);
    setShowPlDialog(false);
  }, []);

  const trimmedQuery = query.trim();
  const showCollapsedZeroResultHint =
    !selectedEntry && trimmedQuery.length > 0 && searchResultStats.total === 0;

  if (indexLoading && !indexData) {
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

  if (indexError && !indexData) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        世界 wiki 数据加载失败，请刷新后重试。
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="eldritch-card overflow-hidden rounded-[28px] border border-border/70 bg-card/75 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Badge
              variant="outline"
              className="hidden shrink-0 border-primary/30 bg-primary/10 text-primary md:inline-flex"
            >
              <BookCopy className="h-3.5 w-3.5" />
              世界 Wiki
            </Badge>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === "Enter") {
                    setIsSearchPanelExpanded(true);
                  }
                }}
                placeholder="检索世界 Wiki 词条、地点、事件、中文名、英文名或 PL 名称"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:justify-end">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>当前视角摘要</span>
              {showCollapsedZeroResultHint && (
                <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                  0 条结果
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSearchPanelExpanded((prev) => !prev)}
              >
                {isSearchPanelExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    展开
                  </>
                )}
              </Button>
              <CurrentPlButton plName={plName} onClick={() => setShowPlDialog(true)} />
              <Button variant="outline" size="sm" onClick={() => navigate("/tools/world-wiki/modules")}>模组总览</Button>
            </div>
          </div>
        </div>

        <motion.div
          initial={false}
          animate={{
            height: isSearchPanelExpanded ? "auto" : 0,
            opacity: isSearchPanelExpanded ? 1 : 0,
            marginTop: isSearchPanelExpanded ? 24 : 0,
          }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="space-y-6 border-t border-border/50 pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <Badge
                  variant="outline"
                  className="w-fit border-primary/30 bg-primary/10 text-primary md:hidden"
                >
                  <BookCopy className="h-3.5 w-3.5" />
                  世界 Wiki
                </Badge>
                <div className="space-y-2">
                  <h1 className="text-3xl font-heading font-semibold tracking-wide md:text-4xl">
                    金斯波特档案回顾库
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                    这里不是主持人备团后台，而是给 PL 在跑完以后做回顾、补读战报超链接、重新拼起人物与事件关系时使用的世界档案页。
                  </p>
                </div>
              </div>
              {import.meta.env.DEV && (
                <Button variant="outline" size="sm" asChild className="w-fit">
                  <Link to="/admin/wiki">进入管理台</Link>
                </Button>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-background/65 p-4">
                <div className="flex flex-wrap gap-2">
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
                  {CATEGORY_ORDER.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        selectedCategory === category
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {CATEGORY_META[category].label}
                    </button>
                  ))}
                </div>

                {!selectedEntry && (
                  <div className="mt-4 flex flex-1 flex-col items-center justify-center px-2 py-4">
                    <div className="w-full rounded-xl border border-border/45 bg-card/35 px-5 py-6 text-center md:px-6 md:py-7">
                      {!trimmedQuery ? (
                        <p className="font-heading text-base leading-8 tracking-wide text-foreground/90 md:text-lg">
                          还没有搜任何内容呢~
                          <br />
                          <span className="text-muted-foreground">我展示所有结果</span>
                        </p>
                      ) : searchResultStats.total === 0 ? (
                        <p className="text-base leading-8 text-foreground/90 md:text-lg">
                          搜索
                          <span className="mx-1 font-heading font-semibold text-primary">
                            「{trimmedQuery}」
                          </span>
                          什么都没有呢，结果为空，请你换个词试试吧
                        </p>
                      ) : (
                        <p className="text-base leading-8 text-foreground/90 md:text-lg">
                          你搜索的
                          <span className="mx-1 font-heading font-semibold text-primary">
                            「{trimmedQuery}」
                          </span>
                          关键词已经找完啦，一共有
                          <span className="mx-1 font-heading text-xl font-semibold text-primary">
                            {searchResultStats.total}
                          </span>
                          条结果，其中人物
                          <span className="mx-0.5 font-medium text-foreground">
                            {searchResultStats.counts.character}
                          </span>
                          条，地点
                          <span className="mx-0.5 font-medium text-foreground">
                            {searchResultStats.counts.location}
                          </span>
                          条，事件
                          <span className="mx-0.5 font-medium text-foreground">
                            {searchResultStats.counts.event}
                          </span>
                          条，模组
                          <span className="mx-0.5 font-medium text-foreground">
                            {searchResultStats.counts.module}
                          </span>
                          条，魔法书籍
                          <span className="mx-0.5 font-medium text-foreground">
                            {searchResultStats.counts["magic-book"]}
                          </span>
                          条，魔法物品
                          <span className="mx-0.5 font-medium text-foreground">
                            {searchResultStats.counts["magic-item"]}
                          </span>
                          条
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/65 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  当前视角摘要
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {currentPlayer
                    ? `当前已匹配为「${currentPlayer.displayName}」。系统会根据玩家唯一键高亮相关词条，并判断段落级 / 句子级隐藏内容是否解锁。`
                    : plName
                      ? `当前填写了「${plName}」，但尚未匹配到已有 PL 档案。你仍可浏览公开词条。`
                      : "尚未设置当前 PL。你仍可浏览公开词条，但个人视角补遗会保持黑框遮罩。"}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {CATEGORY_ORDER.map((category) => {
                    const Icon = CATEGORY_META[category].icon;
                    const count = (indexData?.entries || []).filter(
                      (entry) => entry.category === category
                    ).length;
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
                <div className="mt-3 rounded-xl border border-border/50 bg-card/70 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Database className="h-4 w-4 text-primary" />
                    唯一键映射
                  </div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    页面展示名以中文为主，内部跳转与权限控制全部基于唯一键；即使词条改名，历史战报链接仍然稳定。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
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
                  <Badge variant="outline">唯一键：{selectedEntry.id}</Badge>
                </div>
                <h2 className="text-3xl font-heading font-semibold leading-tight">
                  {selectedEntry.displayName}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                  {selectedEntry.summary}
                </p>
              </div>
              <CurrentPlButton plName={plName} onClick={() => setShowPlDialog(true)} />
              <Button variant="outline" size="sm" onClick={() => navigate("/tools/world-wiki/modules")}>模组总览</Button>
            </div>

            <div className="mt-8">
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
                selectedEntryDetail && (
                  <WikiContentRenderer
                    blocks={selectedEntryDetail.content}
                    currentPlayerId={currentPlayer?.id || null}
                    entriesById={entriesById}
                  />
                )
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
                {selectedEntry.aliasNames && selectedEntry.aliasNames.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-background/65 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">别名</p>
                    <p className="mt-1 leading-6">{selectedEntry.aliasNames.join(" / ")}</p>
                  </div>
                )}
                {selectedEntry.playerIds && selectedEntry.playerIds.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-background/65 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">关联 PL</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedEntry.playerIds.map((playerId) => {
                        const player = playersById.get(playerId);
                        if (!player) return null;
                        return (
                          <Badge key={player.id} variant="secondary" className="text-[11px]">
                            {player.displayName}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedEntry.moduleIds && selectedEntry.moduleIds.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-background/65 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">所属模组</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedEntry.moduleIds.map((moduleId) => {
                        const module = modulesById.get(moduleId);
                        if (!module) return null;
                        return (
                          <Badge key={module.id} variant="outline" className="text-[11px]">
                            <Link to={`/tools/world-wiki/modules/${module.id}`}>{module.displayName}</Link>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {relatedEntries.length > 0 && (
              <Card className="gap-4 border-border/70 bg-card/80 py-5">
                <CardHeader className="gap-2">
                  <CardTitle className="text-base">关联词条</CardTitle>
                  <CardDescription>从这里继续回看相邻事件与人物</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {relatedEntries.map((entry) => (
                    <Link
                      key={entry.id}
                      to={`${WIKI_HOME_ROUTE}/${entry.id}`}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-sm transition-colors hover:bg-accent/40"
                    >
                      <span>{entry.displayName}</span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* <Card className="gap-4 border-primary/25 bg-primary/5 py-5">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">权限标签规则</CardTitle>
                <CardDescription>支持整段与句子级别的黑框遮罩</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>整段隐藏内容使用 `secret-panel`，句子或短语使用 `secret-inline`。</p>
                <p>两者都会根据当前 PL 的唯一键自动判断是否解锁；未解锁时点击会提示：请探索更多故事解锁~</p>
              </CardContent>
            </Card> */}
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
                  <WikiEntryCard
                    key={entry.id}
                    entry={entry}
                    currentPlayerId={currentPlayer?.id || null}
                    playersById={playersById}
                  />
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
                  <WikiEntryCard
                    key={entry.id}
                    entry={entry}
                    currentPlayerId={currentPlayer?.id || null}
                    playersById={playersById}
                  />
                ))}
              </div>
            </section>
          ))}

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
