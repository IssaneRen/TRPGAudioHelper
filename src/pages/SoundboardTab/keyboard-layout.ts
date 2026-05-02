export const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
] as const;

export const SPECIAL_KEYS = ["Space", "Enter"] as const;

export const ALL_KEYS = [
  ...KEYBOARD_ROWS.flat(),
  ...SPECIAL_KEYS,
] as const;

export type KeyCode = (typeof ALL_KEYS)[number];

export const KEY_LABELS: Record<string, string> = {
  Space: "SPACE",
  Enter: "ENTER",
};

/** 按键视觉标签 (emoji + 中文描述) */
export const SOUND_LABELS: Record<string, { emoji: string; label: string }> = {
  // 第一排 QWERTYUIOP - 环境氛围音 + 探索发现音
  q: { emoji: "🚪", label: "嘎吱门" },
  w: { emoji: "👣", label: "脚步" },
  e: { emoji: "🌬️", label: "风声" },
  r: { emoji: "🌧️", label: "暴雨" },
  t: { emoji: "⚡", label: "雷鸣" },
  y: { emoji: "🔥", label: "火焰" },
  u: { emoji: "💥", label: "碎玻璃" },
  i: { emoji: "💓", label: "心跳" },
  o: { emoji: "🤫", label: "低语" },
  p: { emoji: "🔑", label: "钥匙" },

  // 第二排 ASDFGHJKL - 探索发现音 + 战斗特效音
  a: { emoji: "🔓", label: "开锁" },
  s: { emoji: "📖", label: "翻书" },
  d: { emoji: "🔔", label: "钟声" },
  f: { emoji: "😱", label: "尖叫" },
  g: { emoji: "⚔️", label: "剑击" },
  h: { emoji: "🏹", label: "弓箭" },
  j: { emoji: "✨", label: "魔法" },
  k: { emoji: "💣", label: "爆炸" },
  l: { emoji: "🛡️", label: "护盾" },

  // 第三排 ZXCVBNM - 战斗特效音 + 情境特殊音
  z: { emoji: "💚", label: "治疗" },
  x: { emoji: "⏰", label: "时钟" },
  c: { emoji: "💧", label: "水滴" },
  v: { emoji: "🐺", label: "狼嚎" },
  b: { emoji: "⛓️", label: "铁链" },
  n: { emoji: "🐦‍⬛", label: "鸦叫" },
  m: { emoji: "🌀", label: "回响" },

  // 特殊键
  Space: { emoji: "👏", label: "掌声" },
  Enter: { emoji: "🛑", label: "停止" },
};

/** 标准化浏览器 KeyboardEvent.key 到我们的 KeyCode */
export function normalizeKey(key: string): KeyCode | null {
  if (key === " ") return "Space";
  if (key === "Enter") return "Enter";
  const lower = key.toLowerCase();
  if (lower.length === 1 && lower >= "a" && lower <= "z") {
    return lower as KeyCode;
  }
  return null;
}
