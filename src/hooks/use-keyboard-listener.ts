import { useEffect } from "react";
import { normalizeKey, type KeyCode } from "@/pages/SoundboardTab/keyboard-layout";

interface UseKeyboardListenerOptions {
  onKeyDown: (key: KeyCode) => void;
  onKeyUp: (key: KeyCode) => void;
  enabled?: boolean;
}

export function useKeyboardListener({
  onKeyDown,
  onKeyUp,
  enabled = true,
}: UseKeyboardListenerOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略修饰键组合
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // 忽略重复按键（长按）
      if (e.repeat) return;
      // 忽略正在输入的表单元素
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const key = normalizeKey(e.key);
      if (!key) return;

      // 防止空格滚动和回车提交
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
      }

      onKeyDown(key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = normalizeKey(e.key);
      if (!key) return;
      onKeyUp(key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onKeyDown, onKeyUp, enabled]);
}
