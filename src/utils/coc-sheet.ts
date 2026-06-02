import type {
  CocAttributes,
  CocSheetData,
  CocSkillChange,
  CocSkillValue,
  NormalizedCocSheet,
  NormalizedCocSkill,
  WikiBlock,
} from "@/types/wiki";
function calculateDamageBonus(str: number, siz: number): string {
  const total = str + siz;
  if (total <= 64) return "-2";
  if (total <= 84) return "-1";
  if (total <= 124) return "0";
  if (total <= 164) return "+1D4";
  if (total <= 204) return "+1D6";
  if (total <= 284) return "+2D6";
  if (total <= 364) return "+3D6";
  if (total <= 444) return "+4D6";
  return "+5D6";
}

/** COC7 体格（BUILD） */
export function calculatePhysique(str: number, siz: number): number {
  const total = str + siz;
  if (total <= 64) return -2;
  if (total <= 84) return -1;
  if (total <= 124) return 0;
  if (total <= 164) return 1;
  if (total <= 204) return 2;
  if (total <= 284) return 3;
  if (total <= 364) return 4;
  if (total <= 444) return 5;
  return 6;
}

export type CocRng = () => number;

export function createSeededRng(seed: string): CocRng {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return () => {
    hash = (hash * 1664525 + 1013904223) | 0;
    return (hash >>> 0) / 4294967296;
  };
}

function rollDice(rng: CocRng, count: number, sides: number): number {
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const roll = Math.min(sides, Math.max(1, Math.floor(rng() * sides) + 1));
    sum += roll;
  }
  return sum;
}

export function rollCoc7Attributes(rng: CocRng): Omit<CocAttributes, "hp" | "maxHp" | "mp" | "maxMp" | "san" | "maxSan" | "build"> {
  const str = rollDice(rng, 3, 6) * 5;
  const con = rollDice(rng, 3, 6) * 5;
  const siz = (rollDice(rng, 2, 6) + 6) * 5;
  const dex = rollDice(rng, 3, 6) * 5;
  const int = (rollDice(rng, 2, 6) + 6) * 5;
  const pow = rollDice(rng, 3, 6) * 5;
  const app = rollDice(rng, 3, 6) * 5;
  const edu = (rollDice(rng, 2, 6) + 6) * 5;

  const luck = pow;
  let mov = 7;
  if (str >= siz && dex >= siz) mov = 9;
  else if (str >= siz || dex >= siz) mov = 8;

  return { str, con, siz, dex, int, pow, app, edu, luck, mov };
}

export function deriveDerivedStats(
  base: Omit<CocAttributes, "hp" | "maxHp" | "mp" | "maxMp" | "san" | "maxSan" | "build">
): CocAttributes {
  const maxHp = Math.max(1, Math.floor((base.con + base.siz) / 10));
  const maxMp = Math.max(1, Math.floor(base.pow / 5));
  const maxSan = base.pow;
  const damageBonus = calculateDamageBonus(base.str, base.siz);
  const physique = calculatePhysique(base.str, base.siz);
  const dodge = Math.floor(base.dex / 2);

  return {
    ...base,
    maxHp,
    hp: maxHp,
    maxMp,
    mp: maxMp,
    maxSan,
    san: maxSan,
    physique,
    dodge,
    damageBonus,
    build: damageBonus,
  };
}

const COMMON_SKILLS = [
  "侦查",
  "聆听",
  "图书馆",
  "心理学",
  "说服",
  "急救",
  "神秘学",
  "恐吓",
  "格斗",
  "闪避",
  "手枪",
  "步枪",
  "潜行",
  "博物学",
  "历史",
] as const;

export function allocateSkills(
  attrs: CocAttributes,
  rng: CocRng,
  options?: { growthDemo?: { skillName: string; growth: number; changes: CocSkillChange[] }[] }
): Record<string, CocSkillValue> {
  const occupationPoints = attrs.edu * 4;
  const interestPoints = attrs.int * 2;
  let remaining = occupationPoints + interestPoints;

  const skills: Record<string, CocSkillValue> = {
    闪避: { base: Math.floor(attrs.dex / 2) },
    格斗: { base: Math.floor(attrs.str / 2) },
  };
  remaining -= skills["闪避"].base + skills["格斗"].base;

  const pool = [...COMMON_SKILLS].filter((name) => !(name in skills));
  while (remaining > 0 && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    const name = pool.splice(index, 1)[0];
    const spend = Math.min(remaining, Math.max(5, Math.floor(rng() * 20) + 5));
    skills[name] = { base: Math.min(99, spend) };
    remaining -= spend;
  }

  if (options?.growthDemo) {
    for (const demo of options.growthDemo) {
      const existing = skills[demo.skillName] ?? { base: 25 };
      skills[demo.skillName] = {
        base: existing.base,
        growth: demo.growth,
        changes: demo.changes,
      };
    }
  }

  return skills;
}

function legacyStatusToAttributes(status: Record<string, number>): Partial<CocAttributes> {
  const map: Record<string, keyof CocAttributes> = {
    str: "str",
    con: "con",
    siz: "siz",
    dex: "dex",
    int: "int",
    intelligence: "int",
    pow: "pow",
    app: "app",
    edu: "edu",
    hp: "hp",
    maxhp: "maxHp",
    mp: "mp",
    maxmp: "maxMp",
    san: "san",
    maxsan: "maxSan",
    luck: "luck",
    mov: "mov",
  };

  const partial: Partial<CocAttributes> = {};
  for (const [key, value] of Object.entries(status)) {
    const target = map[key.toLowerCase()];
    if (target) {
      (partial as Record<string, number>)[target] = value;
    }
  }
  return partial;
}

function normalizeSkillEntry(name: string, value: CocSkillValue | number): NormalizedCocSkill {
  if (typeof value === "number") {
    return { name, base: value, growth: 0, final: value, changes: [] };
  }
  const growth = value.growth ?? 0;
  const base = value.base;
  return {
    name,
    base,
    growth,
    final: base + growth,
    changes: value.changes ?? [],
  };
}

export function normalizeCocSheet(raw?: CocSheetData | null): NormalizedCocSheet | null {
  if (!raw) return null;

  let attributes: CocAttributes | null = null;

  if (raw.attributes) {
    attributes = { ...raw.attributes };
  } else if (raw.status && Object.keys(raw.status).length > 0) {
    const partial = legacyStatusToAttributes(raw.status);
    const base = rollCoc7Attributes(() => 0.5);
    const merged = { ...deriveDerivedStats(base), ...partial };
    if (!merged.maxHp && merged.hp) merged.maxHp = merged.hp;
    if (!merged.hp && merged.maxHp) merged.hp = merged.maxHp;
    attributes = merged as CocAttributes;
  }

  const skillSource = raw.skills ?? raw.skill;
  const skills: NormalizedCocSkill[] = skillSource
    ? Object.entries(skillSource)
        .map(([name, value]) => normalizeSkillEntry(name, value))
        .sort((a, b) => b.final - a.final)
    : [];

  if (!attributes && skills.length === 0 && !raw.avatar) return null;
  if (!attributes) {
    attributes = deriveDerivedStats(rollCoc7Attributes(() => 0.5));
  }

  const dodgeSkill = skills.find((skill) => skill.name === "闪避");
  const damageBonus =
    attributes.damageBonus ??
    (typeof attributes.build === "string" ? attributes.build : undefined) ??
    calculateDamageBonus(attributes.str, attributes.siz);

  attributes = {
    ...attributes,
    physique: attributes.physique ?? calculatePhysique(attributes.str, attributes.siz),
    dodge: attributes.dodge ?? dodgeSkill?.final ?? Math.floor(attributes.dex / 2),
    damageBonus,
    build: damageBonus,
  };

  return {
    avatar: raw.avatar,
    attributes,
    skills,
  };
}

export function extractCocSheetFromContent(content: WikiBlock[]): CocSheetData | null {
  const block = content.find((item) => item.type === "coc-sheet");
  return block?.cocData ?? null;
}

export function contentWithoutCocSheets(content: WikiBlock[]): WikiBlock[] {
  return content.filter((block) => block.type !== "coc-sheet");
}

export function generateCocSheetData(entryId: string, options?: Parameters<typeof allocateSkills>[2]): CocSheetData {
  const rng = createSeededRng(entryId);
  const base = rollCoc7Attributes(rng);
  const attributes = deriveDerivedStats(base);
  const skills = allocateSkills(attributes, rng, options);
  return { attributes, skills };
}

export const ATTRIBUTE_LABELS: Record<keyof Pick<CocAttributes, "str" | "con" | "siz" | "dex" | "int" | "pow" | "app" | "edu">, string> = {
  str: "力量",
  con: "体质",
  siz: "体型",
  dex: "敏捷",
  int: "智力",
  pow: "意志",
  app: "外貌",
  edu: "教育",
};

export const DERIVED_LABELS: { key: keyof CocAttributes; label: string }[] = [
  { key: "hp", label: "生命" },
  { key: "mp", label: "魔法" },
  { key: "san", label: "理智" },
];
