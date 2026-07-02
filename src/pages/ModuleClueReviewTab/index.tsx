import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, LogIn, LogOut, Map as MapIcon, Save, Tags, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchModuleClues,
  updateModuleClueVisibility,
  type ModuleClueReviewPlayer,
} from "@/features/ai/ai-gateway-client";
import { useAiSession } from "@/features/ai/use-ai-session";
import {
  buildClueReviewLayout,
  getHighlightState,
  type HighlightSelection,
  type ModuleClueReviewClue,
  type ModuleClueReviewData,
} from "./clue-layout";

const MODULE_ID = "naimen-prologue";
const COLUMN_WIDTH = 284;
const CARD_WIDTH = 220;
const CARD_HEIGHT = 116;
const ROW_GAP = 26;
const CANVAS_PADDING_X = 32;
const CANVAS_PADDING_Y = 34;

function LoginDialog({
  open,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (token: string) => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/55" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/3 z-[71] w-[min(90vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-5 shadow-2xl"
      >
        <h3 className="font-heading text-base font-semibold">登录线索回顾</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          输入当前 PL 或 KP 的 token。
        </p>
        <div className="mt-4 flex gap-2">
          <input
            autoFocus
            type="password"
            value={value}
            disabled={loading}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onConfirm(value.trim());
              if (event.key === "Escape") onClose();
            }}
            placeholder="token"
            className="min-w-0 flex-1 rounded-md border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button type="button" disabled={loading} onClick={() => onConfirm(value.trim())}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}

function DetailDialog({
  clue,
  isKeeper,
  players,
  saving,
  onClose,
  onSaveVisibility,
}: {
  clue: ModuleClueReviewClue | null;
  isKeeper: boolean;
  players: ModuleClueReviewPlayer[];
  saving: boolean;
  onClose: () => void;
  onSaveVisibility: (playerIds: string[]) => void;
}) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedPlayerIds(clue?.visiblePlayerIds ?? []);
  }, [clue]);

  if (!clue) return null;

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[71] max-h-[84vh] w-[min(92vw,640px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-background shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <h3 className="truncate font-heading text-lg font-semibold">{clue.title}</h3>
            {clue.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {clue.tags.map((tag) => (
                  <span key={tag} className="rounded border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 p-5">
          {clue.thumbnail ? (
            <img
              src={clue.thumbnail}
              alt={clue.title}
              className="max-h-72 w-full rounded-md border object-cover"
              loading="lazy"
            />
          ) : null}
          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/88">
            {clue.detail || clue.summary || clue.title}
          </p>
          {isKeeper ? (
            <div className="rounded-md border bg-secondary/35 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Eye className="h-4 w-4 text-primary" />
                可见 PL
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {players.map((player) => (
                  <label
                    key={player.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border bg-background/70 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlayerIds.includes(player.id)}
                      onChange={() => togglePlayer(player.id)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="min-w-0 truncate">{player.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{player.id}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button type="button" disabled={saving} onClick={() => onSaveVisibility(selectedPlayerIds)}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function ModuleClueReviewTab() {
  const aiSession = useAiSession();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [data, setData] = useState<ModuleClueReviewData | null>(null);
  const [players, setPlayers] = useState<ModuleClueReviewPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<HighlightSelection>({ type: "none" });
  const [detailClueId, setDetailClueId] = useState<string | null>(null);

  const isKeeper = aiSession.session?.isKeeper === true;
  const detailClue = useMemo(
    () => data?.clues.find((clue) => clue.id === detailClueId) ?? null,
    [data, detailClueId]
  );

  const layout = useMemo(() => (data ? buildClueReviewLayout(data) : null), [data]);
  const highlight = useMemo(
    () => (data ? getHighlightState(data, selection) : { highlightedClueIds: new Set<string>(), highlightedEdgeIds: new Set<string>() }),
    [data, selection]
  );
  const hasSelection = selection.type !== "none";

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (!layout) return map;
    for (const column of layout.columns) {
      column.clues.forEach((clue, rowIndex) => {
        map.set(clue.id, {
          x: CANVAS_PADDING_X + column.index * COLUMN_WIDTH,
          y: CANVAS_PADDING_Y + rowIndex * (CARD_HEIGHT + ROW_GAP),
        });
      });
    }
    return map;
  }, [layout]);

  const canvasSize = useMemo(() => {
    const columnCount = layout?.columns.length ?? 1;
    const rowCount = Math.max(1, ...(layout?.columns.map((column) => column.clues.length) ?? [1]));
    return {
      width: CANVAS_PADDING_X * 2 + Math.max(1, columnCount) * COLUMN_WIDTH + CARD_WIDTH,
      height: CANVAS_PADDING_Y * 2 + rowCount * CARD_HEIGHT + Math.max(0, rowCount - 1) * ROW_GAP,
    };
  }, [layout]);

  const loadData = async () => {
    if (!aiSession.token || !aiSession.session) {
      setData(null);
      setPlayers([]);
      return;
    }
    setLoading(true);
    try {
      const payload = await fetchModuleClues(aiSession.token, MODULE_ID);
      setData(payload);
      setPlayers(payload.players ?? []);
      setDetailClueId((current) => payload.clues.some((clue) => clue.id === current) ? current : null);
    } catch (error) {
      setData(null);
      setPlayers([]);
      toast.error(error instanceof Error ? error.message : "线索加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiSession.session?.playerId, aiSession.session?.isKeeper, aiSession.token]);

  const handleLogin = async (token: string) => {
    try {
      const session = await aiSession.login(token);
      toast.success(`已登录为 ${session.displayName}`);
      setShowLoginDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    }
  };

  const handleSaveVisibility = async (playerIds: string[]) => {
    if (!aiSession.token || !detailClue) return;
    setSaving(true);
    try {
      await updateModuleClueVisibility(aiSession.token, MODULE_ID, detailClue.id, playerIds);
      toast.success("可见性已更新");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "可见性保存失败");
    } finally {
      setSaving(false);
    }
  };

  const selectTag = (tag: string) => {
    setSelection((current) =>
      current.type === "tag" && current.tag === tag ? { type: "none" } : { type: "tag", tag }
    );
    setDetailClueId(null);
  };

  const selectClue = (clue: ModuleClueReviewClue) => {
    setSelection({ type: "clue", clueId: clue.id });
    setDetailClueId(clue.id);
  };

  return (
    <section className="mobile-safe-width min-w-0 space-y-4">
      <LoginDialog
        open={showLoginDialog}
        loading={aiSession.loading}
        onClose={() => setShowLoginDialog(false)}
        onConfirm={handleLogin}
      />
      <DetailDialog
        clue={detailClue}
        isKeeper={isKeeper}
        players={players}
        saving={saving}
        onClose={() => setDetailClueId(null)}
        onSaveVisibility={handleSaveVisibility}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary">
            <MapIcon className="h-4 w-4" />
            Module Clues
          </div>
          <h2 className="mt-1 font-heading text-2xl font-semibold tracking-normal">
            {data?.module.name ?? "模组线索回顾"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {aiSession.session ? (
            <>
              <span className="rounded-md border bg-secondary px-3 py-2 text-sm text-muted-foreground">
                {aiSession.session.displayName}
              </span>
              <Button type="button" variant="outline" onClick={aiSession.logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => setShowLoginDialog(true)}>
              <LogIn className="h-4 w-4" />
              登录
            </Button>
          )}
        </div>
      </div>

      {!aiSession.session ? (
        <div className="rounded-lg border bg-card/70 p-8 text-center">
          <p className="text-sm text-muted-foreground">登录后显示当前 token 可见的线索池。</p>
        </div>
      ) : (
        <div className="grid min-h-[620px] min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative min-w-0 overflow-hidden rounded-lg border bg-[#0d111a] shadow-sm">
            {loading ? (
              <div className="absolute inset-0 z-20 grid place-items-center bg-background/55 backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : null}
            <div className="h-[620px] min-w-0 overflow-auto">
              <div
                className="relative"
                style={{ width: canvasSize.width, height: canvasSize.height }}
              >
                <div
                  className="pointer-events-none absolute inset-y-0"
                  style={{
                    left: CANVAS_PADDING_X,
                    width: Math.max(0, (layout?.columns.length ?? 1) * COLUMN_WIDTH),
                    backgroundImage:
                      "linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
                    backgroundSize: `${COLUMN_WIDTH}px 100%`,
                  }}
                />
                <svg className="pointer-events-none absolute inset-0" width={canvasSize.width} height={canvasSize.height}>
                  <defs>
                    <marker id="module-clue-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                      <path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor" />
                    </marker>
                  </defs>
                  {data?.edges.map((edge) => {
                    const source = positions.get(edge.source);
                    const target = positions.get(edge.target);
                    if (!source || !target) return null;
                    const x1 = source.x + CARD_WIDTH;
                    const y1 = source.y + CARD_HEIGHT / 2;
                    const x2 = target.x;
                    const y2 = target.y + CARD_HEIGHT / 2;
                    const dx = Math.max(72, (x2 - x1) * 0.45);
                    const active = highlight.highlightedEdgeIds.has(edge.id);
                    return (
                      <path
                        key={edge.id}
                        d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                        className={active ? "text-primary" : "text-muted-foreground"}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={active ? 2.4 : 1.4}
                        strokeOpacity={hasSelection ? (active ? 0.95 : 0.18) : 0.48}
                        markerEnd="url(#module-clue-arrow)"
                      />
                    );
                  })}
                </svg>
                {layout?.columns.flatMap((column) =>
                  column.clues.map((clue) => {
                    const position = positions.get(clue.id);
                    if (!position) return null;
                    const active = highlight.highlightedClueIds.has(clue.id);
                    const muted = hasSelection && !active;
                    return (
                      <button
                        key={clue.id}
                        type="button"
                        onClick={() => selectClue(clue)}
                        className={`absolute flex flex-col rounded-md border p-3 text-left shadow-sm transition-all ${
                          active
                            ? "border-primary bg-primary/12 text-foreground shadow-primary/20"
                            : "border-white/10 bg-card/92 text-foreground hover:border-primary/55"
                        } ${muted ? "opacity-35" : "opacity-100"}`}
                        style={{
                          left: position.x,
                          top: position.y,
                          width: CARD_WIDTH,
                          height: CARD_HEIGHT,
                        }}
                      >
                        <span className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {clue.tags[0] ?? "线索"}
                        </span>
                        <span className="line-clamp-2 text-sm font-semibold leading-5">{clue.title}</span>
                        <span className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {clue.summary || clue.detail || "无附加记录"}
                        </span>
                      </button>
                    );
                  })
                )}
                {data && data.clues.length === 0 ? (
                  <div className="absolute left-8 top-8 rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">
                    当前 token 暂无可见线索。
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {data && data.tags.length > 0 ? (
            <aside className="min-w-0 rounded-lg border bg-card/70 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Tags className="h-4 w-4 text-primary" />
                线索 tag
              </div>
              <div className="flex flex-wrap gap-2 lg:flex-col">
                {data.tags.map((tag) => {
                  const active = selection.type === "tag" && selection.tag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => selectTag(tag)}
                      className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-secondary/55 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </section>
  );
}
