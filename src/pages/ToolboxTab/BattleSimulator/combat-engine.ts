import type { Character, CombatOptions, CombatResult, Weapon } from "./types";
import { rollD100, rollDamage, checkResult, CheckResult, getResultDescription } from "./dice";

const MAX_ROUNDS = 100;

export function runSingleBattle(
  pcs: Character[],
  enemies: Character[],
  options: CombatOptions
): CombatResult {
  const result: CombatResult = {
    winner: null,
    rounds: 0,
    totalPCs: pcs.length,
    pcSurvivors: 0,
    logs: [],
  };

  const allCombatants = [...pcs, ...enemies];
  const pcSet = new Set(pcs);

  allCombatants.sort((a, b) => {
    const aInit = getInitiative(a, pcSet.has(a));
    const bInit = getInitiative(b, pcSet.has(b));
    return bInit - aInit;
  });

  result.logs.push("=== 战斗开始 ===");
  result.logs.push(`调查员: ${pcs.map((c) => c.name).join(", ")}`);
  result.logs.push(`敌人: ${enemies.map((c) => c.name).join(", ")}`);
  result.logs.push(
    `先攻顺序: ${allCombatants.map((c) => `${c.name}(DEX${c.dex}${hasReadiedFirearm(c, pcSet.has(c)) ? "+50" : ""})`).join(" → ")}`
  );
  result.logs.push("");

  let round = 0;
  const hasAimed: boolean[] = new Array(allCombatants.length).fill(false);

  if (options.surpriseRound) {
    round++;
    result.logs.push("--- 突袭回合 ---");
    for (let i = 0; i < allCombatants.length; i++) {
      const actor = allCombatants[i];
      if (!actor.alive || !pcSet.has(actor)) continue;
      const target = selectTarget(actor, pcs, enemies, pcSet);
      if (!target) break;
      performAttack(actor, target, true, false, false, options, result);
    }
    result.logs.push("");
  }

  while (round < MAX_ROUNDS) {
    round++;
    result.logs.push(`--- 第${round}回合 ---`);

    const dodgeUsed: number[] = new Array(allCombatants.length).fill(0);

    for (let i = 0; i < allCombatants.length; i++) {
      const actor = allCombatants[i];
      if (!actor.alive) continue;

      const target = selectTarget(actor, pcs, enemies, pcSet);
      if (!target) break;

      const actorIsPC = pcSet.has(actor);

      let aimBonus = hasAimed[i];
      hasAimed[i] = false;

      if (options.aiming && actorIsPC && shouldAim(actor)) {
        hasAimed[i] = true;
        result.logs.push(`${actor.name} 选择瞄准，放弃本回合攻击`);
        continue;
      }

      let outnumbered = false;
      if (options.outnumberedBonus) {
        const targetIdx = allCombatants.indexOf(target);
        dodgeUsed[targetIdx]++;
        outnumbered = dodgeUsed[targetIdx] > 1;
      }

      performAttack(actor, target, actorIsPC, aimBonus, outnumbered, options, result);
    }

    result.logs.push("");

    const pcAlive = pcs.some((c) => c.alive);
    const enemyAlive = enemies.some((c) => c.alive);

    if (!pcAlive) {
      result.winner = "enemy";
      result.logs.push("=== 调查员全灭，战斗结束 ===");
      break;
    }
    if (!enemyAlive) {
      result.winner = "pc";
      result.logs.push("=== 敌人全灭，调查员获胜 ===");
      break;
    }
  }

  result.rounds = round;
  result.pcSurvivors = pcs.filter((c) => c.alive).length;
  return result;
}

function performAttack(
  attacker: Character,
  defender: Character,
  attackerIsPC: boolean,
  aimBonus: boolean,
  outnumbered: boolean,
  options: CombatOptions,
  result: CombatResult
) {
  const weapon = selectWeapon(attacker, attackerIsPC);
  if (!weapon) {
    result.logs.push(`${attacker.name} 没有可用武器`);
    return;
  }

  const skillValue = attacker.skills[weapon.skillName] || 0;

  let attackRoll: number;
  if (aimBonus) {
    const r1 = rollD100();
    const r2 = rollD100();
    attackRoll = Math.min(r1, r2);
    result.logs.push(`${attacker.name} [瞄准奖励] 骰了 ${r1} 和 ${r2}，取 ${attackRoll}`);
  } else if (outnumbered) {
    const r1 = rollD100();
    const r2 = rollD100();
    attackRoll = Math.min(r1, r2);
    result.logs.push(`${attacker.name} [以多打少] 骰了 ${r1} 和 ${r2}，取 ${attackRoll}`);
  } else {
    attackRoll = rollD100();
  }

  let attackResult = checkResult(attackRoll, skillValue);

  result.logs.push(
    `${attacker.name} 使用 ${weapon.name} 攻击 ${defender.name} (技能${skillValue}, 骰子${attackRoll}, ${getResultDescription(attackResult)})`
  );

  if (attackResult === CheckResult.FAIL || attackResult === CheckResult.FUMBLE) {
    result.logs.push("  → 攻击未命中");

    if (options.spendingLuck && attackerIsPC) {
      const needed = attackRoll - skillValue;
      if (needed > 0 && needed <= attacker.luck) {
        attacker.luck = Math.max(0, attacker.luck - needed);
        result.logs.push(
          `  [消耗幸运] 花费 ${needed} 点幸运将骰点从 ${attackRoll} 降至 ${skillValue}，变为成功！(剩余幸运: ${attacker.luck})`
        );
        attackResult = CheckResult.SUCCESS;
      } else {
        return;
      }
    } else {
      return;
    }
  }

  const isMelee = weapon.range === 0;

  if (isMelee) {
    const dodgeValue = defender.dodge;
    const dodgeRoll = rollD100();
    const dodgeResult = checkResult(dodgeRoll, dodgeValue);

    result.logs.push(
      `  ${defender.name} 闪避 (技能${dodgeValue}, 骰子${dodgeRoll}, ${getResultDescription(dodgeResult)})`
    );

    if (dodgeResult !== CheckResult.FAIL && dodgeResult !== CheckResult.FUMBLE) {
      result.logs.push("  → 闪避成功，攻击未命中");
      return;
    }
  } else {
    if (options.divingForCover && defender.dodge > 0) {
      const dodgeRoll = rollD100();
      const dodgeResult = checkResult(dodgeRoll, defender.dodge);
      if (dodgeResult !== CheckResult.FAIL && dodgeResult !== CheckResult.FUMBLE) {
        result.logs.push(
          `  ${defender.name} 扑倒寻求掩护成功！(骰${dodgeRoll} vs 闪避${defender.dodge})`
        );
        return;
      }
    }
    result.logs.push("  枪械攻击，无法闪避");
    if (weapon.ammo !== -1) {
      weapon.currentAmmo--;
    }
  }

  let baseDamage = rollDamage(weapon.damage);

  if (options.extremeDamage && attackResult === CheckResult.EXTREME) {
    const extraDamage = rollDamage(weapon.damage);
    baseDamage += extraDamage;
    result.logs.push(`  [极难成功] 额外造成 ${extraDamage} 点伤害！`);
  }

  if (isMelee) {
    const db = attacker.db;
    if (db !== "0" && db !== "-1" && db !== "-2") {
      baseDamage += rollDamage(db);
    } else if (db === "-1") {
      baseDamage -= 1;
    } else if (db === "-2") {
      baseDamage -= 2;
    }
  }

  const finalDamage = Math.max(0, baseDamage - defender.armor);
  result.logs.push(
    `  → 命中！造成 ${finalDamage} 伤害 (基础${baseDamage} - 护甲${defender.armor})`
  );

  defender.hp -= finalDamage;
  if (defender.hp <= 0) {
    defender.hp = 0;
    defender.alive = false;
  }
  result.logs.push(`  ${defender.name} HP: ${defender.hp}/${defender.maxHp}`);

  if (options.majorWound && defender.alive && finalDamage >= Math.floor(defender.maxHp / 2)) {
    result.logs.push("  重伤！需要CON检定...");
    const threshold = defender.con * 5;
    const conRoll = rollD100();
    if (conRoll > threshold) {
      defender.alive = false;
      result.logs.push(`  → 检定失败(骰${conRoll} vs ${threshold})，${defender.name} 昏迷`);
    } else {
      result.logs.push("  → 检定成功，坚持战斗");
    }
  }

  if (!defender.alive) {
    result.logs.push(`  ${defender.name} 已死亡`);
  }
}

function shouldAim(actor: Character): boolean {
  for (const w of actor.weapons) {
    if (w.range > 0 && (w.ammo === -1 || w.currentAmmo > 0)) {
      const skill = actor.skills[w.skillName] || 0;
      return skill < 50 && rollD100() > 70;
    }
  }
  return false;
}

function getInitiative(c: Character, isPC: boolean): number {
  return c.dex + (hasReadiedFirearm(c, isPC) ? 50 : 0);
}

function hasReadiedFirearm(c: Character, isPC: boolean): boolean {
  if (!isPC) return false;
  return c.weapons.some((w) => w.range > 0 && (w.ammo === -1 || w.currentAmmo > 0));
}

function selectTarget(
  actor: Character,
  pcs: Character[],
  enemies: Character[],
  pcSet: Set<Character>
): Character | null {
  const targets = pcSet.has(actor) ? enemies : pcs;
  return targets.find((c) => c.alive) || null;
}

function selectWeapon(character: Character, isPC: boolean): Weapon | null {
  const weapons = character.weapons;
  if (weapons.length === 0) return null;

  if (isPC) {
    const ranged = weapons.find((w) => w.range > 0 && (w.ammo === -1 || w.currentAmmo > 0));
    if (ranged) return ranged;
  }

  const melee = weapons.find((w) => w.range === 0);
  if (melee) return melee;

  return weapons[0];
}
