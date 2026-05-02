import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";
import { KEY_LABELS, SOUND_LABELS } from "./keyboard-layout";

interface Key3DProps {
  keyCode: string;
  isPressed: boolean;
  hasBoundSound: boolean;
  onClick: () => void;
}

function Key3DComponent({ keyCode, isPressed, hasBoundSound, onClick }: Key3DProps) {
  const label = KEY_LABELS[keyCode] || keyCode.toUpperCase();
  const isSpace = keyCode === "Space";
  const isEnter = keyCode === "Enter";
  const soundLabel = SOUND_LABELS[keyCode];

  return (
    <motion.button
      className={cn(
        "key-3d relative inline-flex flex-col items-center justify-center rounded-lg border font-bold select-none",
        "transition-colors duration-150",
        isSpace && "key-space",
        isEnter && "key-enter",
        !isSpace && !isEnter && "key-normal",
        hasBoundSound
          ? "key-bound border-primary/40 dark:border-primary/50"
          : "key-unbound border-border/60 dark:border-border/40",
        isEnter && "key-enter-special border-red-500/50 dark:border-red-400/40",
      )}
      animate={{
        scale: isPressed ? 0.93 : 1,
        y: isPressed ? 3 : 0,
      }}
      whileHover={{ scale: 1.05, y: -2 }}
      transition={{
        type: "spring",
        stiffness: 600,
        damping: 30,
      }}
      onClick={onClick}
      aria-label={`Key ${label}`}
    >
      {/* 左上角字母 */}
      <span className="absolute top-1 left-1.5 text-[10px] sm:text-xs opacity-60 font-normal">
        {label}
      </span>

      {/* 右上角音效图标 (非 Enter) */}
      {hasBoundSound && !isEnter && (
        <Volume2 className="absolute -top-1 -right-1 h-3 w-3 text-primary opacity-70" />
      )}

      {/* Enter 右上角 STOP 标签 */}
      {isEnter && (
        <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none px-1 py-0.5 rounded bg-red-500/80 text-white font-normal">
          STOP
        </span>
      )}

      {/* 中央 emoji */}
      {soundLabel && (
        <span className="text-base sm:text-lg leading-none mb-0.5">
          {soundLabel.emoji}
        </span>
      )}

      {/* 底部中文标签 */}
      {soundLabel && (
        <span className="text-[8px] sm:text-[10px] opacity-80 leading-none font-normal">
          {soundLabel.label}
        </span>
      )}
    </motion.button>
  );
}

export const Key3D = memo(Key3DComponent, (prev, next) => {
  return (
    prev.isPressed === next.isPressed &&
    prev.hasBoundSound === next.hasBoundSound &&
    prev.keyCode === next.keyCode
  );
});
