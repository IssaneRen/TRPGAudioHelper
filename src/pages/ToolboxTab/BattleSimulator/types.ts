export interface Weapon {
  name: string;
  skillName: string;
  damage: string;
  range: number;
  rateOfFire: number;
  ammo: number;
  currentAmmo: number;
}

export interface Character {
  id: string;
  name: string;
  str: number;
  con: number;
  siz: number;
  dex: number;
  intelligence: number;
  pow: number;
  app: number;
  edu: number;
  maxHp: number;
  hp: number;
  mp: number;
  db: string;
  dodge: number;
  skills: Record<string, number>;
  weapons: Weapon[];
  armor: number;
  luck: number;
  alive: boolean;
}

export interface CombatOptions {
  spendingLuck: boolean;
  aiming: boolean;
  surpriseRound: boolean;
  fullAuto: boolean;
  outnumberedBonus: boolean;
  divingForCover: boolean;
  majorWound: boolean;
  extremeDamage: boolean;
}

export interface CombatResult {
  winner: "pc" | "enemy" | null;
  rounds: number;
  totalPCs: number;
  pcSurvivors: number;
  logs: string[];
}

export interface TaggedLog {
  tag: "团灭" | "全员存活" | "部分死亡";
  lines: string[];
}

export interface SimulationReport {
  totalRuns: number;
  pcWins: number;
  enemyWins: number;
  avgRounds: number;
  survivalRate: number;
  difficultyRating: number;
  difficultyDescription: string;
  sampleLog: string[];
  allLogs: TaggedLog[];
}

export const COMBAT_OPTION_NAMES = [
  "消耗幸运 (Spending Luck)",
  "瞄准 (Aiming)",
  "突袭回合 (Surprise Round)",
  "全自动射击 (Full Auto)",
  "以多打少 (Outnumbered Bonus)",
  "扑倒寻求掩护 (Diving for Cover)",
  "重伤检定 (Major Wound)",
  "极难成功额外伤害 (Extreme Damage)",
];

export const COMBAT_OPTION_DESCRIPTIONS = [
  "PC可消耗幸运值降低骰点，每点幸运减1点骰点",
  "放弃本回合行动，下回合射击获得1个奖励骰",
  "伏击方获得完整行动回合，被伏击方首回合无法反应",
  "冲锋枪等连射武器可一次射击多发，每发独立判定",
  "防御者用完闪避后，后续攻击获得1个奖励骰",
  "射击目标可声明扑倒，成功则射手+1惩罚骰",
  "单次伤害≥HP/2时需CON×5检定，失败则昏迷",
  "极难成功时额外加骰伤害",
];

export const COMBAT_OPTION_KEYS: (keyof CombatOptions)[] = [
  "spendingLuck",
  "aiming",
  "surpriseRound",
  "fullAuto",
  "outnumberedBonus",
  "divingForCover",
  "majorWound",
  "extremeDamage",
];

export const DEFAULT_COMBAT_OPTIONS: CombatOptions = {
  spendingLuck: false,
  aiming: false,
  surpriseRound: false,
  fullAuto: true,
  outnumberedBonus: true,
  divingForCover: false,
  majorWound: true,
  extremeDamage: false,
};
