import { useEffect, useMemo, useRef, useState } from "react";
import { generateUUID } from "@/utils/uuid";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Dices, Trash2, Edit3, ChevronDown, ChevronRight, Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchWikiEntry } from "@/features/wiki/wiki-entry-cache";
import type { WikiIndexEntry, WikiIndexPayload } from "@/types/wiki";
import type { Character, CombatOptions, SimulationReport } from "./types";
import {
  DEFAULT_COMBAT_OPTIONS,
  COMBAT_OPTION_NAMES,
  COMBAT_OPTION_DESCRIPTIONS,
  COMBAT_OPTION_KEYS,
} from "./types";
import { runSimulation } from "./battle-simulator";
import { PRESET_INVESTIGATORS, PRESET_ENEMIES } from "./presets";
import { CharacterDialog } from "./CharacterDialog";
import { wikiEntryToCombatCharacter } from "./wiki-combat-adapter";

const STORAGE_KEY = "trpg-battle-config";

type WikiCharacterRoleFilter = "all" | "pc" | "npc";

const WIKI_CHARACTER_ROLE_FILTERS: { value: WikiCharacterRoleFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pc", label: "PC" },
  { value: "npc", label: "NPC" },
];

function getWikiCharacterRole(entry: WikiIndexEntry): "pc" | "npc" | "unknown" {
  const tags = new Set((entry.tags || []).map((tag) => tag.trim().toLowerCase()));
  if (tags.has("npc")) return "npc";
  if (tags.has("pc") || (entry.playerIds || []).length > 0) return "pc";
  return "unknown";
}

function matchesWikiCharacterRole(entry: WikiIndexEntry, filter: WikiCharacterRoleFilter) {
  if (filter === "all") return true;
  return getWikiCharacterRole(entry) === filter;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveState(pcs: Character[], enemies: Character[], options: CombatOptions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pcs, enemies, options }));
  } catch { /* ignore */ }
}

function getDefaultPcs(): Character[] {
  const susan = PRESET_INVESTIGATORS.find((c) => c.name === "苏珊·李");
  return susan ? [{ ...susan, id: generateUUID() }] : [];
}

function getDefaultEnemies(): Character[] {
  const hound = PRESET_ENEMIES.find((c) => c.name === "廷达洛斯猎犬");
  return hound ? [{ ...hound, id: generateUUID() }] : [];
}

export default function BattleSimulator() {
  const saved = useRef(loadState());
  const [pcs, setPcs] = useState<Character[]>(saved.current?.pcs || getDefaultPcs());
  const [enemies, setEnemies] = useState<Character[]>(saved.current?.enemies || getDefaultEnemies());
  const [options, setOptions] = useState<CombatOptions>(saved.current?.options || DEFAULT_COMBAT_OPTIONS);
  const [simCount, setSimCount] = useState(100);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [running, setRunning] = useState(false);
  const [logFilter, setLogFilter] = useState<string>("全部");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [dialogIsEnemy, setDialogIsEnemy] = useState(false);
  const [presetPanel, setPresetPanel] = useState<"pc" | "enemy" | "wiki" | "enemy-people" | null>(null);
  const [wikiIndex, setWikiIndex] = useState<WikiIndexPayload | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiImportingId, setWikiImportingId] = useState<string | null>(null);
  const [pcWikiCharacterRoleFilter, setPcWikiCharacterRoleFilter] = useState<WikiCharacterRoleFilter>("pc");
  const [enemyWikiCharacterRoleFilter, setEnemyWikiCharacterRoleFilter] = useState<WikiCharacterRoleFilter>("npc");

  useEffect(() => {
    let cancelled = false;
    setWikiLoading(true);
    fetch("/wiki/index.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`wiki index ${response.status}`);
        return response.json();
      })
      .then((data: WikiIndexPayload) => {
        if (!cancelled) setWikiIndex(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Wiki 人物卡索引加载失败");
      })
      .finally(() => {
        if (!cancelled) setWikiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const wikiCharacterEntries = useMemo(
    () => (wikiIndex?.entries || []).filter((entry) => entry.category === "character"),
    [wikiIndex]
  );
  const filteredPcWikiCharacterEntries = useMemo(
    () => wikiCharacterEntries.filter((entry) => matchesWikiCharacterRole(entry, pcWikiCharacterRoleFilter)),
    [wikiCharacterEntries, pcWikiCharacterRoleFilter]
  );
  const filteredEnemyWikiCharacterEntries = useMemo(
    () => wikiCharacterEntries.filter((entry) => matchesWikiCharacterRole(entry, enemyWikiCharacterRoleFilter)),
    [wikiCharacterEntries, enemyWikiCharacterRoleFilter]
  );

  const persist = (p: Character[], e: Character[], o: CombatOptions) => saveState(p, e, o);

  const toggleOption = (key: keyof CombatOptions) => {
    const next = { ...options, [key]: !options[key] };
    setOptions(next);
    persist(pcs, enemies, next);
  };

  const addPreset = (char: Character, isEnemy: boolean) => {
    const clone: Character = { ...char, id: generateUUID() };
    if (isEnemy) {
      const next = [...enemies, clone];
      setEnemies(next);
      persist(pcs, next, options);
    } else {
      const next = [...pcs, clone];
      setPcs(next);
      persist(next, enemies, options);
    }
  };

  const importWikiCharacter = async (entry: WikiIndexEntry, isEnemy: boolean, replaceId?: string) => {
    setWikiImportingId(entry.id);
    try {
      const detail = await fetchWikiEntry(entry.id);
      const character = wikiEntryToCombatCharacter(detail, entry);
      if (!character) {
        toast.error("该 Wiki 人物卡没有可导入的 coc-sheet 数据");
        return;
      }

      if (replaceId) {
        if (isEnemy) {
          const next = enemies.map((enemy) => (enemy.id === replaceId ? { ...character, id: replaceId } : enemy));
          setEnemies(next);
          persist(pcs, next, options);
        } else {
          const next = pcs.map((pc) => (pc.id === replaceId ? { ...character, id: replaceId } : pc));
          setPcs(next);
          persist(next, enemies, options);
        }
        toast.success(`已刷新 ${character.name}`);
        return;
      }

      if (isEnemy) {
        const next = [...enemies, character];
        setEnemies(next);
        persist(pcs, next, options);
      } else {
        const next = [...pcs, character];
        setPcs(next);
        persist(next, enemies, options);
      }
      toast.success(`已导入 ${character.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? `导入失败：${error.message}` : "导入失败");
    } finally {
      setWikiImportingId(null);
    }
  };

  const refreshWikiCharacter = (char: Character, isEnemy: boolean) => {
    if (!char.source || char.source.type !== "wiki") return;
    const entry = wikiCharacterEntries.find((item) => item.id === char.source?.entryId);
    if (!entry) {
      toast.error("找不到该角色的 Wiki 索引");
      return;
    }
    void importWikiCharacter(entry, isEnemy, char.id);
  };

  const removeChar = (id: string, isEnemy: boolean) => {
    if (isEnemy) {
      const next = enemies.filter((c) => c.id !== id);
      setEnemies(next);
      persist(pcs, next, options);
    } else {
      const next = pcs.filter((c) => c.id !== id);
      setPcs(next);
      persist(next, enemies, options);
    }
  };

  const handleSaveChar = (char: Character) => {
    if (editingChar) {
      if (dialogIsEnemy) {
        const next = enemies.map((c) => (c.id === editingChar.id ? { ...char, id: editingChar.id } : c));
        setEnemies(next);
        persist(pcs, next, options);
      } else {
        const next = pcs.map((c) => (c.id === editingChar.id ? { ...char, id: editingChar.id } : c));
        setPcs(next);
        persist(next, enemies, options);
      }
    } else {
      if (dialogIsEnemy) {
        const next = [...enemies, char];
        setEnemies(next);
        persist(pcs, next, options);
      } else {
        const next = [...pcs, char];
        setPcs(next);
        persist(next, enemies, options);
      }
    }
    setDialogOpen(false);
    setEditingChar(null);
  };

  const startSimulation = () => {
    if (pcs.length === 0 || enemies.length === 0) {
      toast.error("请至少添加一个调查员和一个敌人");
      return;
    }
    setRunning(true);
    setLogFilter("全部");

    setTimeout(() => {
      try {
        const r = runSimulation(pcs, enemies, simCount, options);
        setReport(r);
        toast.success(`模拟完成！团灭:${r.enemyWins} 全员存活:${r.allLogs.filter((l) => l.tag === "全员存活").length} 部分死亡:${r.allLogs.filter((l) => l.tag === "部分死亡").length}`);
      } catch (e) {
        toast.error("模拟出错: " + (e instanceof Error ? e.message : "未知错误"));
      } finally {
        setRunning(false);
      }
    }, 16);
  };

  const exportLog = () => {
    if (!report) return;
    const text = report.sampleLog.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `battle_log_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = report
    ? logFilter === "全部"
      ? report.allLogs
      : report.allLogs.filter((l) => l.tag === logFilter)
    : [];

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* 左侧配置面板 */}
        <div className="min-w-0 space-y-4">
          {/* 调查员 */}
          <Card className="eldritch-card min-w-0">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="shrink-0 text-base">调查员配置</CardTitle>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" className="text-xs sm:text-sm" onClick={() => setPresetPanel(presetPanel === "pc" ? null : "pc")}>
                    预设
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs sm:text-sm" onClick={() => setPresetPanel(presetPanel === "wiki" ? null : "wiki")}>
                    Wiki人物卡
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs sm:text-sm" onClick={() => { setDialogIsEnemy(false); setEditingChar(null); setDialogOpen(true); }}>
                    <Plus className="h-3 w-3 mr-1" /> 添加
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <AnimatePresence>
                {presetPanel === "pc" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="flex flex-wrap gap-1 pb-2 border-b mb-2">
                      {PRESET_INVESTIGATORS.map((p) => (
                        <Button key={p.name} size="sm" variant="outline" className="text-xs" onClick={() => addPreset(p, false)}>
                          {p.name}
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {presetPanel === "wiki" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-2 border-b pb-2 mb-2">
                      <p className="text-xs text-muted-foreground">
                        从 Wiki 人物卡导入当前 coc-sheet 快照；人物成长后可刷新已导入角色。
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {WIKI_CHARACTER_ROLE_FILTERS.map((filter) => (
                          <Button
                            key={filter.value}
                            size="sm"
                            variant={pcWikiCharacterRoleFilter === filter.value ? "default" : "outline"}
                            className="h-7 text-xs"
                            onClick={() => setPcWikiCharacterRoleFilter(filter.value)}
                          >
                            {filter.label}
                          </Button>
                        ))}
                      </div>
                      {wikiLoading ? (
                        <p className="text-xs text-muted-foreground">正在加载 Wiki 人物卡...</p>
                      ) : wikiCharacterEntries.length === 0 ? (
                        <p className="text-xs text-muted-foreground">暂无可导入的 Wiki 人物卡</p>
                      ) : filteredPcWikiCharacterEntries.length === 0 ? (
                        <p className="text-xs text-muted-foreground">当前筛选下暂无可导入的人物卡</p>
                      ) : (
                        <div className="max-h-40 space-y-1 overflow-y-auto">
                          {filteredPcWikiCharacterEntries.map((entry) => (
                            <div key={entry.id} className="flex min-w-0 items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <p className="truncate text-xs font-medium">{entry.displayName}</p>
                                  <Badge variant="outline" className="shrink-0 text-[10px]">
                                    {getWikiCharacterRole(entry).toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {entry.updatedAt ? `更新：${entry.updatedAt.slice(0, 10)}` : entry.id}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 shrink-0 text-xs"
                                disabled={!entry.hasCocSheet || wikiImportingId === entry.id}
                                onClick={() => void importWikiCharacter(entry, false)}
                              >
                                {!entry.hasCocSheet ? "无车卡" : wikiImportingId === entry.id ? "导入中" : "导入"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {pcs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">暂无调查员</p>
              ) : (
                <div className="max-h-48 min-w-0 space-y-1 overflow-y-auto">
                  {pcs.map((c) => {
                    const wikiEntry = c.source?.type === "wiki"
                      ? wikiCharacterEntries.find((entry) => entry.id === c.source?.entryId)
                      : undefined;
                    return (
                      <CharCard
                        key={c.id}
                        char={c}
                        onEdit={() => { setEditingChar(c); setDialogIsEnemy(false); setDialogOpen(true); }}
                        onRemove={() => removeChar(c.id, false)}
                        onRefresh={c.source?.type === "wiki" ? () => refreshWikiCharacter(c, false) : undefined}
                        refreshing={wikiImportingId === c.source?.entryId}
                        sourceUpdatedAt={wikiEntry?.updatedAt}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 敌人 */}
          <Card className="eldritch-card min-w-0">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="shrink-0 text-base">敌人配置</CardTitle>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" className="text-xs sm:text-sm" onClick={() => setPresetPanel(presetPanel === "enemy" ? null : "enemy")}>
                    预设
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs sm:text-sm" onClick={() => setPresetPanel(presetPanel === "enemy-people" ? null : "enemy-people")}>
                    预设人物
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs sm:text-sm" onClick={() => { setDialogIsEnemy(true); setEditingChar(null); setDialogOpen(true); }}>
                    <Plus className="h-3 w-3 mr-1" /> 添加
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <AnimatePresence>
                {presetPanel === "enemy" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="flex flex-wrap gap-1 pb-2 border-b mb-2 max-h-32 overflow-y-auto">
                      {PRESET_ENEMIES.map((p) => (
                        <Button key={p.name} size="sm" variant="outline" className="text-xs" onClick={() => addPreset(p, true)}>
                          {p.name}
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {presetPanel === "enemy-people" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-3 border-b pb-2 mb-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">预设人物可作为敌方、反派或临时倒戈角色加入模拟。</p>
                        <div className="flex flex-wrap gap-1">
                          {PRESET_INVESTIGATORS.map((p) => (
                            <Button key={p.name} size="sm" variant="outline" className="text-xs" onClick={() => addPreset(p, true)}>
                              {p.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          从 Wiki 人物卡导入当前 coc-sheet 快照到敌方；人物成长后可刷新已导入角色。
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {WIKI_CHARACTER_ROLE_FILTERS.map((filter) => (
                            <Button
                              key={filter.value}
                              size="sm"
                              variant={enemyWikiCharacterRoleFilter === filter.value ? "default" : "outline"}
                              className="h-7 text-xs"
                              onClick={() => setEnemyWikiCharacterRoleFilter(filter.value)}
                            >
                              {filter.label}
                            </Button>
                          ))}
                        </div>
                        {wikiLoading ? (
                          <p className="text-xs text-muted-foreground">正在加载 Wiki 人物卡...</p>
                        ) : wikiCharacterEntries.length === 0 ? (
                          <p className="text-xs text-muted-foreground">暂无可导入的 Wiki 人物卡</p>
                        ) : filteredEnemyWikiCharacterEntries.length === 0 ? (
                          <p className="text-xs text-muted-foreground">当前筛选下暂无可导入的人物卡</p>
                        ) : (
                          <div className="max-h-40 space-y-1 overflow-y-auto">
                            {filteredEnemyWikiCharacterEntries.map((entry) => (
                              <div key={entry.id} className="flex min-w-0 items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                                <div className="min-w-0">
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <p className="truncate text-xs font-medium">{entry.displayName}</p>
                                    <Badge variant="outline" className="shrink-0 text-[10px]">
                                      {getWikiCharacterRole(entry).toUpperCase()}
                                    </Badge>
                                  </div>
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {entry.updatedAt ? `更新：${entry.updatedAt.slice(0, 10)}` : entry.id}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 shrink-0 text-xs"
                                  disabled={!entry.hasCocSheet || wikiImportingId === entry.id}
                                  onClick={() => void importWikiCharacter(entry, true)}
                                >
                                  {!entry.hasCocSheet ? "无车卡" : wikiImportingId === entry.id ? "导入中" : "导入"}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {enemies.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">暂无敌人</p>
              ) : (
                <div className="max-h-48 min-w-0 space-y-1 overflow-y-auto">
                  {enemies.map((c) => {
                    const wikiEntry = c.source?.type === "wiki"
                      ? wikiCharacterEntries.find((entry) => entry.id === c.source?.entryId)
                      : undefined;
                    return (
                      <CharCard
                        key={c.id}
                        char={c}
                        onEdit={() => { setEditingChar(c); setDialogIsEnemy(true); setDialogOpen(true); }}
                        onRemove={() => removeChar(c.id, true)}
                        onRefresh={c.source?.type === "wiki" ? () => refreshWikiCharacter(c, true) : undefined}
                        refreshing={wikiImportingId === c.source?.entryId}
                        sourceUpdatedAt={wikiEntry?.updatedAt}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 可选规则 */}
          <Card className="eldritch-card min-w-0">
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setRulesOpen(!rulesOpen)}>
              <div className="flex items-center gap-2">
                {rulesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="text-base">可选规则</CardTitle>
              </div>
            </CardHeader>
            <AnimatePresence>
              {rulesOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <CardContent className="space-y-3 pt-0">
                    {COMBAT_OPTION_KEYS.map((key, i) => (
                      <div key={key} className="flex min-w-0 items-center justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <Label className="text-sm">{COMBAT_OPTION_NAMES[i]}</Label>
                          <p className="text-xs text-muted-foreground">{COMBAT_OPTION_DESCRIPTIONS[i]}</p>
                        </div>
                        <Switch checked={options[key]} onCheckedChange={() => toggleOption(key)} />
                      </div>
                    ))}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* 模拟控制 */}
          <Card className="eldritch-card min-w-0">
            <CardContent className="pt-4">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">模拟次数:</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    step={100}
                    value={simCount}
                    onChange={(e) => setSimCount(Math.min(10000, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-24"
                  />
                </div>
                <Button onClick={startSimulation} disabled={running} className="flex-1 sm:flex-none">
                  <Dices className="h-4 w-4 mr-1" />
                  {running ? "模拟中..." : "开始模拟"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧结果面板 */}
        <div className="min-w-0 space-y-4">
          {/* 统计卡片 */}
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[430px]:grid-cols-3">
            <StatCard label="存活率" value={report ? `${(report.survivalRate * 100).toFixed(1)}%` : "--"} />
            <StatCard label="平均回合" value={report ? report.avgRounds.toFixed(1) : "--"} />
            <StatCard label="难度评级" value={report ? report.difficultyDescription : "--"} />
          </div>

          {/* 战斗日志 */}
          <Card className="eldritch-card min-w-0">
            <CardHeader className="pb-2">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="shrink-0 text-base">战斗日志</CardTitle>
                <div className="flex min-w-0 flex-wrap gap-1">
                  {["全部", "团灭", "全员存活", "部分死亡"].map((tag) => (
                    <Button
                      key={tag}
                      size="sm"
                      variant={logFilter === tag ? "default" : "ghost"}
                      className="text-xs"
                      onClick={() => setLogFilter(tag)}
                    >
                      {tag}
                      {report && tag !== "全部" && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {report.allLogs.filter((l) => l.tag === tag).length}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="h-[40vh] min-h-[200px] min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain rounded-md border bg-background/50 p-3 font-mono text-xs leading-relaxed touch-pan-x">
                {!report ? (
                  <p className="text-muted-foreground text-center py-8">点击"开始模拟"查看结果</p>
                ) : filteredLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">没有符合 [{logFilter}] 的战斗记录</p>
                ) : (
                  <div className="space-y-1">
                    {filteredLogs[0].lines.map((line, i) => (
                      <LogLine key={i} text={line} />
                    ))}
                    {filteredLogs.length > 1 && (
                      <p className="text-muted-foreground mt-4">... 还有 {filteredLogs.length - 1} 场同类战斗日志</p>
                    )}
                  </div>
                )}
              </div>
              {report && (
                <div className="flex justify-end gap-2 mt-2">
                  <Button size="sm" variant="ghost" onClick={() => setReport(null)}>清空</Button>
                  <Button size="sm" variant="ghost" onClick={exportLog}>
                    <Download className="h-3 w-3 mr-1" /> 导出
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CharacterDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingChar(null); }}
        onSave={handleSaveChar}
        character={editingChar}
        isEnemy={dialogIsEnemy}
      />
    </div>
  );
}

function CharCard({
  char,
  onEdit,
  onRemove,
  onRefresh,
  refreshing,
  sourceUpdatedAt,
}: {
  char: Character;
  onEdit: () => void;
  onRemove: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  sourceUpdatedAt?: string;
}) {
  const mainSkill = Object.entries(char.skills).sort((a, b) => b[1] - a[1])[0];
  const hasWikiUpdate =
    char.source?.type === "wiki" &&
    Boolean(sourceUpdatedAt && char.source.updatedAt && sourceUpdatedAt !== char.source.updatedAt);
  return (
    <div className="flex min-w-0 items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <span className="min-w-0 max-w-full break-words font-medium">{char.name}</span>
        <Badge variant="outline" className="text-xs shrink-0">HP:{char.maxHp}</Badge>
        {char.source?.type === "wiki" && <Badge variant="outline" className="text-xs shrink-0">Wiki</Badge>}
        {hasWikiUpdate && <Badge variant="default" className="text-xs shrink-0">有更新</Badge>}
        {mainSkill && <Badge variant="secondary" className="min-w-0 max-w-full text-xs">{mainSkill[0]}:{mainSkill[1]}</Badge>}
      </div>
      <div className="flex shrink-0 gap-1">
        {onRefresh && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={refreshing} onClick={onRefresh}>
            <RefreshCcw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit}>
          <Edit3 className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="eldritch-card min-w-0">
      <CardContent className="min-w-0 px-3 pb-4 pt-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-base font-bold sm:text-lg" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
      </CardContent>
    </Card>
  );
}

function LogLine({ text }: { text: string }) {
  let className = "text-foreground/80";
  if (text.includes("===") || text.includes("获胜") || text.includes("成功")) {
    className = "text-primary";
  } else if (text.includes("全灭") || text.includes("已死亡") || text.includes("昏迷") || text.includes("失败")) {
    className = "text-destructive";
  } else if (text.includes("---") || text.includes("重伤") || text.includes("消耗幸运")) {
    className = "text-yellow-500 dark:text-yellow-400";
  }
  return <div className={`${className} whitespace-pre-wrap break-words`}>{text}</div>;
}
