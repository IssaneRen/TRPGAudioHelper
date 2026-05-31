import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Character, Weapon } from "./types";
import { createCharacter, randomizeAttributes } from "./battle-simulator";
import { WEAPON_PRESETS } from "./presets";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (char: Character) => void;
  character: Character | null;
  isEnemy: boolean;
}

export function CharacterDialog({ open, onClose, onSave, character, isEnemy }: Props) {
  const [name, setName] = useState("");
  const [str, setStr] = useState(50);
  const [con, setCon] = useState(50);
  const [siz, setSiz] = useState(50);
  const [dex, setDex] = useState(50);
  const [int_, setInt] = useState(50);
  const [pow, setPow] = useState(50);
  const [fighting, setFighting] = useState(50);
  const [pistol, setPistol] = useState(50);
  const [rifle, setRifle] = useState(50);
  const [dodge, setDodge] = useState<string>("");
  const [selectedWeapons, setSelectedWeapons] = useState<boolean[]>(new Array(WEAPON_PRESETS.length).fill(false));
  const [armor, setArmor] = useState(0);

  useEffect(() => {
    if (character) {
      setName(character.name);
      setStr(character.str);
      setCon(character.con);
      setSiz(character.siz);
      setDex(character.dex);
      setInt(character.intelligence);
      setPow(character.pow);
      setFighting(character.skills["格斗"] || 0);
      setPistol(character.skills["手枪"] || 0);
      setRifle(character.skills["步枪"] || 0);
      setDodge(character.skills["闪避"] !== undefined ? String(character.skills["闪避"]) : "");
      setArmor(character.armor);
      const sel = WEAPON_PRESETS.map((p) =>
        character.weapons.some((w) => w.name === p.weapon.name)
      );
      setSelectedWeapons(sel);
    } else {
      setName("");
      setStr(50); setCon(50); setSiz(50); setDex(50); setInt(50); setPow(50);
      setFighting(50); setPistol(50); setRifle(50); setDodge(""); setArmor(0);
      setSelectedWeapons(new Array(WEAPON_PRESETS.length).fill(false));
    }
  }, [character, open]);

  const handleRandom = () => {
    const attrs = randomizeAttributes();
    setStr(attrs.str);
    setCon(attrs.con);
    setSiz(attrs.siz);
    setDex(attrs.dex);
    setInt(attrs.intelligence);
    setPow(attrs.pow);
    setFighting(Math.floor(Math.random() * 40) + 25);
    setPistol(Math.floor(Math.random() * 50) + 20);
    setRifle(Math.floor(Math.random() * 45) + 25);
    setDodge("");
  };

  const toggleWeapon = (idx: number) => {
    const next = [...selectedWeapons];
    next[idx] = !next[idx];
    setSelectedWeapons(next);
  };

  const handleConfirm = () => {
    if (!name.trim()) return;

    const dodgeValue = dodge.trim() !== "" ? parseInt(dodge) : Math.floor(dex / 2);
    const skills: Record<string, number> = {
      "格斗": fighting,
      "手枪": pistol,
      "步枪": rifle,
      "闪避": isNaN(dodgeValue) ? Math.floor(dex / 2) : dodgeValue,
    };

    const weapons: Weapon[] = [];
    selectedWeapons.forEach((sel, i) => {
      if (sel) {
        const preset = WEAPON_PRESETS[i].weapon;
        weapons.push({ ...preset, currentAmmo: preset.ammo });
      }
    });

    if (weapons.length === 0) {
      weapons.push({ ...WEAPON_PRESETS[0].weapon, currentAmmo: -1 });
    }

    const char = createCharacter(name.trim(), str, con, siz, dex, int_, pow, skills, weapons, armor);
    onSave(char);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-lg border bg-card p-6 shadow-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2 className="text-lg font-bold mb-4">
              {character ? "编辑" : "添加"}{isEnemy ? "怪物" : "调查员"}
            </h2>

            <div className="space-y-3">
              <div>
                <Label>名称</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="角色名称" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <NumField label="力量" value={str} onChange={setStr} />
                <NumField label="体质" value={con} onChange={setCon} />
                <NumField label="体型" value={siz} onChange={setSiz} />
                <NumField label="敏捷" value={dex} onChange={setDex} />
                <NumField label="智力" value={int_} onChange={setInt} />
                <NumField label="意志" value={pow} onChange={setPow} />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <NumField label="格斗" value={fighting} onChange={setFighting} max={99} />
                <NumField label="手枪" value={pistol} onChange={setPistol} max={99} />
                <NumField label="步枪" value={rifle} onChange={setRifle} max={99} />
                <div>
                  <Label className="text-xs">闪避</Label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={dodge}
                    onChange={(e) => setDodge(e.target.value)}
                    placeholder={`${Math.floor(dex / 2)}`}
                    className="h-8"
                  />
                </div>
              </div>

              <div>
                <Label>武器（可多选）</Label>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {WEAPON_PRESETS.map((p, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                        selectedWeapons[i]
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedWeapons[i]}
                        onChange={() => toggleWeapon(i)}
                        className="sr-only"
                      />
                      <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
                        selectedWeapons[i] ? "bg-primary border-primary" : "border-muted-foreground"
                      }`}>
                        {selectedWeapons[i] && <span className="text-[8px] text-primary-foreground">✓</span>}
                      </span>
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              <NumField label="护甲" value={armor} onChange={setArmor} max={10} />
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={handleRandom}>
                <Dices className="h-3 w-3 mr-1" /> 随机属性
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" onClick={onClose}>取消</Button>
              <Button onClick={handleConfirm} disabled={!name.trim()}>确认</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NumField({ label, value, onChange, max = 99 }: {
  label: string; value: number; onChange: (v: number) => void; max?: number;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))}
        className="h-8"
      />
    </div>
  );
}
