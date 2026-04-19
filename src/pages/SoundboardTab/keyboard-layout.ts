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
