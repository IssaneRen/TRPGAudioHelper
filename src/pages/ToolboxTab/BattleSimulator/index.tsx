import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Dices, Trash2, Edit3, ChevronDown, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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

const STORAGE_KEY = "trpg-battle-config";

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
  return susan ? [{ ...susan, id: crypto.randomUUID() }] : [];
}

function getDefaultEnemies(): Character[] {
  const hound = PRESET_ENEMIES.find((c) => c.name === "廷达洛斯猎犬");
  return hound ? [{ ...hound, id: crypto.randomUUID() }] : [];
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
  const [presetPanel, setPresetPanel] = useState<"pc" | "enemy" | null>(null);

  const persist = (p: Character[], e: Character[], o: CombatOptions) => saveState(p, e, o);

  const toggleOption = (key: keyof CombatOptions) => {
    const next = { ...options, [key]: !options[key] };
    setOptions(next);
    persist(pcs, enemies, next);
  };

  const addPreset = (char: Character, isEnemy: boolean) => {
    const clone: Character = { ...char, id: crypto.randomUUID() };
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
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* 左侧配置面板 */}
        <div className="space-y-4">
          {/* 调查员 */}
          <Card className="eldritch-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">调查员配置</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setPresetPanel(presetPanel === "pc" ? null : "pc")}>
                    预设
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setDialogIsEnemy(false); setEditingChar(null); setDialogOpen(true); }}>
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
              {pcs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">暂无调查员</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {pcs.map((c) => (
                    <CharCard key={c.id} char={c} onEdit={() => { setEditingChar(c); setDialogIsEnemy(false); setDialogOpen(true); }} onRemove={() => removeChar(c.id, false)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 敌人 */}
          <Card className="eldritch-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">敌人配置</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setPresetPanel(presetPanel === "enemy" ? null : "enemy")}>
                    预设
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setDialogIsEnemy(true); setEditingChar(null); setDialogOpen(true); }}>
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
              {enemies.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">暂无敌人</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {enemies.map((c) => (
                    <CharCard key={c.id} char={c} onEdit={() => { setEditingChar(c); setDialogIsEnemy(true); setDialogOpen(true); }} onRemove={() => removeChar(c.id, true)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 可选规则 */}
          <Card className="eldritch-card">
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
                      <div key={key} className="flex items-center justify-between">
                        <div className="space-y-0.5">
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
          <Card className="eldritch-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 flex-wrap">
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
        <div className="space-y-4">
          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="存活率" value={report ? `${(report.survivalRate * 100).toFixed(1)}%` : "--"} />
            <StatCard label="平均回合" value={report ? report.avgRounds.toFixed(1) : "--"} />
            <StatCard label="难度评级" value={report ? report.difficultyDescription : "--"} />
          </div>

          {/* 战斗日志 */}
          <Card className="eldritch-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">战斗日志</CardTitle>
                <div className="flex gap-1 flex-wrap">
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
            <CardContent>
              <div className="h-[40vh] min-h-[200px] overflow-y-auto rounded-md border bg-background/50 p-3 font-mono text-xs leading-relaxed">
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

function CharCard({ char, onEdit, onRemove }: { char: Character; onEdit: () => void; onRemove: () => void }) {
  const mainSkill = Object.entries(char.skills).sort((a, b) => b[1] - a[1])[0];
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium truncate">{char.name}</span>
        <Badge variant="outline" className="text-xs shrink-0">HP:{char.maxHp}</Badge>
        {mainSkill && <Badge variant="secondary" className="text-xs shrink-0">{mainSkill[0]}:{mainSkill[1]}</Badge>}
      </div>
      <div className="flex gap-1 shrink-0">
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
    <Card className="eldritch-card">
      <CardContent className="pt-4 pb-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold mt-1" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
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
  return <div className={className}>{text}</div>;
}
