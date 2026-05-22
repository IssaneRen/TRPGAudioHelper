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
  const [weaponIdx, setWeaponIdx] = useState(0);
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
      setArmor(character.armor);
      const wpnIdx = WEAPON_PRESETS.findIndex((p) =>
        character.weapons.some((w) => w.name === p.weapon.name)
      );
      setWeaponIdx(wpnIdx >= 0 ? wpnIdx : 0);
    } else {
      setName("");
      setStr(50); setCon(50); setSiz(50); setDex(50); setInt(50); setPow(50);
      setFighting(50); setPistol(50); setRifle(50); setWeaponIdx(0); setArmor(0);
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
  };

  const handleConfirm = () => {
    if (!name.trim()) {
      return;
    }
    const skills: Record<string, number> = { "格斗": fighting, "手枪": pistol, "步枪": rifle };
    const weapon = { ...WEAPON_PRESETS[weaponIdx].weapon, currentAmmo: WEAPON_PRESETS[weaponIdx].weapon.ammo };
    const weapons: Weapon[] = [weapon];
    if (weaponIdx >= 3) {
      weapons.unshift({ ...WEAPON_PRESETS[0].weapon, currentAmmo: -1 });
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

              <div className="grid grid-cols-3 gap-2">
                <NumField label="格斗" value={fighting} onChange={setFighting} max={99} />
                <NumField label="手枪" value={pistol} onChange={setPistol} max={99} />
                <NumField label="步枪" value={rifle} onChange={setRifle} max={99} />
              </div>

              <div>
                <Label>武器</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={weaponIdx}
                  onChange={(e) => setWeaponIdx(Number(e.target.value))}
                >
                  {WEAPON_PRESETS.map((p, i) => (
                    <option key={i} value={i}>{p.label}</option>
                  ))}
                </select>
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
