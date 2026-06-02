import { extractCocSheetFromContent, normalizeCocSheet } from "@/utils/coc-sheet";
import { generateUUID } from "@/utils/uuid";
import type { WikiEntryRecord, WikiIndexEntry, NormalizedCocSheet } from "@/types/wiki";
import type { Character, Weapon } from "./types";

function weapon(name: string, skillName: string, damage: string, range: number, ammo: number): Weapon {
  return { name, skillName, damage, range, rateOfFire: 1, ammo, currentAmmo: ammo };
}

function findSkill(sheet: NormalizedCocSheet, names: string[]): number {
  for (const name of names) {
    const skill = sheet.skills.find((item) => item.name === name);
    if (skill) return skill.final;
  }
  return 0;
}

function buildSkills(sheet: NormalizedCocSheet): Record<string, number> {
  const fighting = findSkill(sheet, ["格斗", "斗殴", "近战"]);
  const handgun = findSkill(sheet, ["手枪", "射击：手枪", "火器：手枪"]);
  const rifle = findSkill(sheet, ["步枪", "射击：步枪", "火器：步枪", "霰弹枪"]);
  const dodge = findSkill(sheet, ["闪避"]) || sheet.attributes.dodge || Math.floor(sheet.attributes.dex / 2);

  return {
    格斗: fighting || Math.floor(sheet.attributes.str / 2),
    手枪: handgun,
    步枪: rifle,
    闪避: dodge,
  };
}

function buildWeapons(skills: Record<string, number>): Weapon[] {
  const weapons = [weapon("拳头", "格斗", "1D3+DB", 0, -1)];

  if ((skills["手枪"] || 0) > 0) {
    weapons.push(weapon("手枪", "手枪", "1D10", 15, 6));
  }

  if ((skills["步枪"] || 0) > 0) {
    weapons.push(weapon("步枪", "步枪", "2D6+4", 90, 5));
  }

  return weapons;
}

export function wikiEntryToCombatCharacter(entry: WikiEntryRecord, indexEntry?: WikiIndexEntry): Character | null {
  const sheet = normalizeCocSheet(extractCocSheetFromContent(entry.content));
  if (!sheet) return null;

  const attributes = sheet.attributes;
  const skills = buildSkills(sheet);
  const maxHp = attributes.maxHp || attributes.hp || Math.max(1, Math.floor((attributes.con + attributes.siz) / 10));
  const maxMp = attributes.maxMp || attributes.mp || Math.max(1, Math.floor(attributes.pow / 5));
  const damageBonus = attributes.damageBonus || attributes.build || "0";

  return {
    id: generateUUID(),
    name: entry.displayName,
    str: attributes.str,
    con: attributes.con,
    siz: attributes.siz,
    dex: attributes.dex,
    intelligence: attributes.int,
    pow: attributes.pow,
    app: attributes.app,
    edu: attributes.edu,
    maxHp,
    hp: attributes.hp || maxHp,
    mp: attributes.mp || maxMp,
    db: damageBonus,
    dodge: skills["闪避"],
    skills,
    weapons: buildWeapons(skills),
    armor: 0,
    luck: attributes.luck ?? attributes.pow,
    alive: true,
    source: {
      type: "wiki",
      entryId: entry.id,
      updatedAt: indexEntry?.updatedAt ?? entry.updatedAt,
      importedAt: new Date().toISOString(),
    },
  };
}

