import type { Character, CombatOptions, SimulationReport, TaggedLog, Weapon } from "./types";
import { runSingleBattle } from "./combat-engine";
import { calculateDamageBonus } from "./dice";

function cloneCharacter(template: Character): Character {
  return {
    ...template,
    hp: template.maxHp,
    alive: true,
    luck: template.pow,
    skills: { ...template.skills },
    weapons: template.weapons.map((w): Weapon => ({
      ...w,
      currentAmmo: w.ammo === -1 ? -1 : w.ammo,
    })),
  };
}

export function runSimulation(
  pcTemplates: Character[],
  enemyTemplates: Character[],
  times: number,
  options: CombatOptions
): SimulationReport {
  let totalRounds = 0;
  let totalSurvivors = 0;
  let pcWins = 0;
  let enemyWins = 0;
  let sampleLog: string[] = [];
  const allLogs: TaggedLog[] = [];

  for (let i = 0; i < times; i++) {
    const pcs = pcTemplates.map(cloneCharacter);
    const enemies = enemyTemplates.map(cloneCharacter);

    const result = runSingleBattle(pcs, enemies, options);
    sampleLog = result.logs;

    totalRounds += result.rounds;
    totalSurvivors += result.pcSurvivors;

    let tag: TaggedLog["tag"];
    if (result.winner === "enemy") {
      tag = "团灭";
      enemyWins++;
    } else {
      pcWins++;
      tag = result.pcSurvivors === result.totalPCs ? "全员存活" : "部分死亡";
    }

    allLogs.push({ tag, lines: result.logs });
  }

  const winRate = pcWins / times;
  let difficultyRating: number;
  if (winRate >= 0.9) difficultyRating = 1;
  else if (winRate >= 0.7) difficultyRating = 2;
  else if (winRate >= 0.5) difficultyRating = 3;
  else if (winRate >= 0.3) difficultyRating = 4;
  else difficultyRating = 5;

  const descriptions = ["", "简单 ★", "普通 ★★", "困难 ★★★", "极难 ★★★★", "致命 ★★★★★"];

  return {
    totalRuns: times,
    pcWins,
    enemyWins,
    avgRounds: totalRounds / times,
    survivalRate: totalSurvivors / (times * pcTemplates.length),
    difficultyRating,
    difficultyDescription: descriptions[difficultyRating],
    sampleLog,
    allLogs,
  };
}

export function createCharacter(
  name: string,
  str: number,
  con: number,
  siz: number,
  dex: number,
  intelligence: number,
  pow: number,
  skills: Record<string, number>,
  weapons: Weapon[],
  armor: number
): Character {
  const maxHp = Math.floor((con + siz) / 10);
  return {
    id: crypto.randomUUID(),
    name,
    str,
    con,
    siz,
    dex,
    intelligence,
    pow,
    app: 50,
    edu: 50,
    maxHp,
    hp: maxHp,
    mp: Math.floor(pow / 5),
    db: calculateDamageBonus(str, siz),
    dodge: skills["闪避"] !== undefined ? skills["闪避"] : Math.floor(dex / 2),
    skills,
    weapons,
    armor,
    luck: pow,
    alive: true,
  };
}

export function randomizeAttributes(): {
  str: number; con: number; siz: number; dex: number;
  intelligence: number; pow: number;
} {
  const roll3d6x5 = () => {
    let sum = 0;
    for (let i = 0; i < 3; i++) sum += Math.floor(Math.random() * 6) + 1;
    return sum * 5;
  };
  const roll2d6p6x5 = () => {
    let sum = 6;
    for (let i = 0; i < 2; i++) sum += Math.floor(Math.random() * 6) + 1;
    return sum * 5;
  };

  return {
    str: roll3d6x5(),
    con: roll3d6x5(),
    siz: roll2d6p6x5(),
    dex: roll3d6x5(),
    intelligence: roll2d6p6x5(),
    pow: roll3d6x5(),
  };
}
