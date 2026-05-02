import { motion } from "framer-motion";
import { KEYBOARD_ROWS, SPECIAL_KEYS, type KeyCode } from "./keyboard-layout";
import { Key3D } from "./Key3D";
import type { PackLabels } from "@/stores/use-soundboard-store";

interface Keyboard3DProps {
  pressedKeys: Set<KeyCode>;
  boundKeys: Set<KeyCode>;
  onKeyClick: (key: KeyCode) => void;
  packLabels?: PackLabels;
}

export function Keyboard3D({ pressedKeys, boundKeys, onKeyClick, packLabels }: Keyboard3DProps) {
  return (
    <motion.div
      className="keyboard-3d-container"
      initial={{ opacity: 0, rotateX: 20 }}
      animate={{ opacity: 1, rotateX: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="keyboard-body">
        {/* 字母键行 */}
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="keyboard-row"
            style={{ paddingLeft: `${rowIndex * 20}px` }}
          >
            {row.map((key) => (
              <Key3D
                key={key}
                keyCode={key}
                isPressed={pressedKeys.has(key)}
                hasBoundSound={boundKeys.has(key)}
                onClick={() => onKeyClick(key)}
                packLabel={packLabels?.[key]}
              />
            ))}
          </div>
        ))}

        {/* 特殊键行 */}
        <div className="keyboard-row keyboard-special-row">
          {SPECIAL_KEYS.map((key) => (
            <Key3D
              key={key}
              keyCode={key}
              isPressed={pressedKeys.has(key)}
              hasBoundSound={key !== "Enter" && boundKeys.has(key)}
              onClick={() => onKeyClick(key)}
              packLabel={packLabels?.[key]}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
