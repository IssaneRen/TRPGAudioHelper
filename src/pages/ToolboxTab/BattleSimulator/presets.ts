import type { Character, Weapon } from "./types";
import { createCharacter } from "./battle-simulator";

function w(name: string, skillName: string, damage: string, range: number, ammo: number): Weapon {
  return { name, skillName, damage, range, rateOfFire: 1, ammo, currentAmmo: ammo };
}

export const PRESET_INVESTIGATORS: Character[] = [
  createCharacter("杰克·沃伦", 55, 60, 65, 70, 65, 55, { "格斗": 40, "手枪": 65, "闪避": 35 }, [w("拳头", "格斗", "1D3+DB", 0, -1), w(".38左轮", "手枪", "1D10", 15, 6)], 0),
  createCharacter("艾琳·布莱克", 45, 50, 55, 65, 80, 60, { "格斗": 35, "手枪": 30, "闪避": 32 }, [w("匕首", "格斗", "1D4+DB", 0, -1)], 0),
  createCharacter("鲍勃·马丁", 75, 70, 80, 60, 50, 55, { "格斗": 70, "步枪": 75, "闪避": 30 }, [w("拳头", "格斗", "1D3+DB", 0, -1), w("步枪", "步枪", "2D6+4", 90, 5)], 0),
  createCharacter("苏珊·李", 40, 55, 50, 60, 85, 65, { "格斗": 25, "手枪": 20, "闪避": 30 }, [w("拳头", "格斗", "1D3+DB", 0, -1)], 0),
];

export const PRESET_ENEMIES: Character[] = [
  createCharacter("深潜者", 80, 55, 75, 50, 65, 50, { "格斗": 40 }, [w("爪击", "格斗", "1D6+DB", 0, -1)], 1),
  createCharacter("食尸鬼", 75, 60, 65, 55, 60, 50, { "格斗": 45 }, [w("爪击", "格斗", "1D6+DB", 0, -1), w("噬咬", "格斗", "1D6", 0, -1)], 1),
  createCharacter("修格斯幼体", 90, 70, 80, 45, 30, 50, { "格斗": 60 }, [w("伪足", "格斗", "2D6+DB", 0, -1)], 0),
  createCharacter("米·戈", 55, 45, 50, 70, 85, 65, { "格斗": 40 }, [w("钳击", "格斗", "1D6", 0, -1)], 0),
  createCharacter("暗夜食灵", 60, 50, 50, 75, 50, 55, { "格斗": 55 }, [w("噬咬", "格斗", "1D8", 0, -1)], 0),
  createCharacter("蛇人", 65, 55, 60, 70, 80, 65, { "格斗": 50 }, [w("噬咬", "格斗", "1D8+DB", 0, -1)], 1),
  createCharacter("飞水螅", 70, 60, 75, 55, 45, 55, { "格斗": 45 }, [w("触手", "格斗", "1D6+DB", 0, -1)], 2),
  createCharacter("深潜者混血", 60, 55, 60, 50, 55, 45, { "格斗": 25 }, [w("拳头", "格斗", "1D3+DB", 0, -1)], 0),
  createCharacter("廷达洛斯猎犬", 85, 80, 80, 70, 65, 75, { "格斗": 90 }, [w("利舌", "格斗", "1D10+DB", 0, -1)], 2),
  createCharacter("黑山羊幼仔", 150, 100, 200, 60, 35, 80, { "格斗": 60 }, [w("践踏", "格斗", "4D6+DB", 0, -1)], 5),
  createCharacter("狩猎恐魔", 120, 90, 150, 75, 50, 75, { "格斗": 80 }, [w("利爪", "格斗", "2D6+DB", 0, -1)], 5),
  createCharacter("无形之物", 70, 60, 70, 65, 55, 60, { "格斗": 50 }, [w("冲击", "格斗", "1D10", 0, -1)], 2),
  createCharacter("修格斯(完整体)", 180, 140, 300, 40, 20, 80, { "格斗": 70 }, [w("碾压", "格斗", "6D6", 0, -1)], 8),
  createCharacter("星之精", 150, 120, 250, 50, 70, 100, { "格斗": 60 }, [w("触手", "格斗", "3D6", 0, -1)], 10),
];

export const WEAPON_PRESETS: { label: string; weapon: Weapon }[] = [
  { label: "拳头 (1D3+DB)", weapon: w("拳头", "格斗", "1D3+DB", 0, -1) },
  { label: "匕首 (1D4+DB)", weapon: w("匕首", "格斗", "1D4+DB", 0, -1) },
  { label: "棍棒 (1D6+DB)", weapon: w("棍棒", "格斗", "1D6+DB", 0, -1) },
  { label: "手枪 (1D10)", weapon: w("手枪", "手枪", "1D10", 15, 6) },
  { label: "步枪 (2D6+4)", weapon: w("步枪", "步枪", "2D6+4", 90, 5) },
  { label: "霰弹枪 (4D6/2D6/1D6)", weapon: w("霰弹枪", "步枪", "4D6", 10, 2) },
];
