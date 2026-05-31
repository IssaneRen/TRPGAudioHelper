export enum CheckResult {
  CRITICAL = "CRITICAL",
  EXTREME = "EXTREME",
  HARD = "HARD",
  SUCCESS = "SUCCESS",
  FAIL = "FAIL",
  FUMBLE = "FUMBLE",
}

export function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

export function roll(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDamage(expr: string): number {
  if (!expr || !expr.trim()) return 0;

  const normalized = expr.toUpperCase().replace(/\s+/g, "");
  const pattern = /(\d+)D(\d+)([+-]\d+)?/;
  const match = normalized.match(pattern);

  let total = 0;

  if (match) {
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    for (let i = 0; i < count; i++) {
      total += roll(sides);
    }
    if (match[3]) {
      total += parseInt(match[3]);
    }
  } else {
    const parsed = parseInt(normalized);
    total = isNaN(parsed) ? 0 : parsed;
  }

  return Math.max(0, total);
}

export function checkResult(rollValue: number, skill: number): CheckResult {
  if (rollValue === 1) return CheckResult.CRITICAL;

  if (skill <= 50) {
    if (rollValue === 100) return CheckResult.FUMBLE;
  } else {
    if (rollValue >= 96) return CheckResult.FUMBLE;
  }

  if (rollValue <= Math.floor(skill / 5)) return CheckResult.EXTREME;
  if (rollValue <= Math.floor(skill / 2)) return CheckResult.HARD;
  if (rollValue <= skill) return CheckResult.SUCCESS;

  return CheckResult.FAIL;
}

export function getResultDescription(result: CheckResult): string {
  const map: Record<CheckResult, string> = {
    [CheckResult.CRITICAL]: "大成功",
    [CheckResult.EXTREME]: "极难成功",
    [CheckResult.HARD]: "困难成功",
    [CheckResult.SUCCESS]: "成功",
    [CheckResult.FAIL]: "失败",
    [CheckResult.FUMBLE]: "大失败",
  };
  return map[result];
}

export function calculateDamageBonus(str: number, siz: number): string {
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
