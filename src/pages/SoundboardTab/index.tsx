import { useState, useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Settings, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAudioManager, generateDefaultSound } from "@/hooks/use-audio-manager";
import { useKeyboardListener } from "@/hooks/use-keyboard-listener";
import { useSoundboardStore } from "@/stores/use-soundboard-store";
import { ALL_KEYS, type KeyCode } from "./keyboard-layout";
import { Keyboard3D } from "./Keyboard3D";
import { SoundSettings } from "./SoundSettings";

// 默认音效配置：每个字母对应不同的频率和波形
const DEFAULT_SOUNDS: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
  // A-G: 鼓点/低音
  a: { freq: 80, type: "sine", duration: 0.3 },
  b: { freq: 100, type: "triangle", duration: 0.25 },
  c: { freq: 120, type: "sine", duration: 0.2 },
  d: { freq: 150, type: "square", duration: 0.15 },
  e: { freq: 90, type: "sawtooth", duration: 0.3 },
  f: { freq: 110, type: "triangle", duration: 0.2 },
  g: { freq: 130, type: "sine", duration: 0.25 },
  // H-N: 中音
  h: { freq: 262, type: "sine", duration: 0.4 },
  i: { freq: 294, type: "triangle", duration: 0.35 },
  j: { freq: 330, type: "sine", duration: 0.3 },
  k: { freq: 349, type: "square", duration: 0.25 },
  l: { freq: 392, type: "triangle", duration: 0.3 },
  m: { freq: 440, type: "sine", duration: 0.35 },
  n: { freq: 494, type: "sawtooth", duration: 0.3 },
  // O-T: 高音/游戏音效
  o: { freq: 523, type: "square", duration: 0.2 },
  p: { freq: 587, type: "sine", duration: 0.25 },
  q: { freq: 659, type: "triangle", duration: 0.2 },
  r: { freq: 698, type: "sine", duration: 0.15 },
  s: { freq: 784, type: "square", duration: 0.2 },
  t: { freq: 880, type: "triangle", duration: 0.25 },
  // U-Z: 高频效果音
  u: { freq: 988, type: "sawtooth", duration: 0.15 },
  v: { freq: 1047, type: "sine", duration: 0.2 },
  w: { freq: 1175, type: "triangle", duration: 0.15 },
  x: { freq: 1319, type: "square", duration: 0.1 },
  y: { freq: 1397, type: "sine", duration: 0.15 },
  z: { freq: 1568, type: "sawtooth", duration: 0.1 },
  // Space: 掌声效果（白噪声模拟）
  Space: { freq: 200, type: "sawtooth", duration: 0.5 },
};

export default function SoundboardTab() {
  const audioManager = useAudioManager();
  const soundStore = useSoundboardStore();
  const [pressedKeys, setPressedKeys] = useState<Set<KeyCode>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

  // 计算哪些按键有绑定音效
  const boundKeys = useMemo(() => {
    const set = new Set<KeyCode>();
    for (const mapping of soundStore.mappings) {
      set.add(mapping.key);
    }
    return set;
  }, [soundStore.mappings]);

  // 加载用户自定义音效
  useEffect(() => {
    const loadUserSounds = async () => {
      for (const mapping of soundStore.mappings) {
        try {
          await audioManager.preload(mapping.key, mapping.audioData);
        } catch {
          console.warn(`无法加载音效: ${mapping.key}`);
        }
      }
    };
    loadUserSounds();
  }, [soundStore.mappings, audioManager]);

  // 生成并加载默认音效（仅对未绑定的按键）
  useEffect(() => {
    if (defaultsLoaded) return;
    const loadDefaults = async () => {
      for (const key of ALL_KEYS) {
        if (key === "Enter") continue;
        if (boundKeys.has(key)) continue;
        const config = DEFAULT_SOUNDS[key];
        if (!config) continue;
        try {
          const audioData = await generateDefaultSound(config.freq, config.type, config.duration);
          await audioManager.preload(`default-${key}`, audioData);
        } catch {
          // 忽略单个失败
        }
      }
      setDefaultsLoaded(true);
    };
    loadDefaults();
  }, [audioManager, boundKeys, defaultsLoaded]);

  // 按键回调
  const handleKeyDown = useCallback(
    (key: KeyCode) => {
      setPressedKeys((prev) => new Set(prev).add(key));

      if (key === "Enter") {
        audioManager.stopAll();
        toast("已停止所有音效", { duration: 1000 });
        return;
      }

      // 优先播放用户绑定的音效，否则播放默认音效
      if (boundKeys.has(key)) {
        audioManager.play(key);
      } else {
        audioManager.play(`default-${key}`);
      }
    },
    [audioManager, boundKeys]
  );

  const handleKeyUp = useCallback((key: KeyCode) => {
    setPressedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // 监听物理键盘
  useKeyboardListener({
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    enabled: !settingsOpen,
  });

  // 鼠标点击按键
  const handleKeyClick = useCallback(
    (key: KeyCode) => {
      handleKeyDown(key);
      // 模拟按键释放
      setTimeout(() => handleKeyUp(key), 150);
    },
    [handleKeyDown, handleKeyUp]
  );

  // 上传音效
  const handleUploadSound = useCallback(
    async (key: KeyCode, file: File) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const audioData = e.target?.result as string;
          try {
            await audioManager.preload(key, audioData);
            soundStore.setMapping(key, audioData, file.name);
            resolve();
          } catch {
            reject(new Error("音频解码失败"));
          }
        };
        reader.onerror = () => reject(new Error("文件读取失败"));
        reader.readAsDataURL(file);
      });
    },
    [audioManager, soundStore]
  );

  // 移除音效
  const handleRemoveSound = useCallback(
    (key: KeyCode) => {
      audioManager.remove(key);
      soundStore.removeMapping(key);
      toast.success(`已移除「${key.toUpperCase()}」的音效`);
    },
    [audioManager, soundStore]
  );

  // 导出配置
  const handleExport = useCallback(() => {
    const json = soundStore.exportConfig();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soundboard-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("配置已导出");
  }, [soundStore]);

  // 导入配置
  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const count = soundStore.importConfig(text);
        toast.success(`已导入 ${count} 个音效映射`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "导入失败");
      }
    };
    input.click();
  }, [soundStore]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6 py-4 sm:py-8"
    >
      {/* 标题栏 */}
      <div className="flex w-full max-w-3xl items-center justify-between px-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Volume2 className="h-6 w-6" /> 音效键盘
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            按下键盘或点击按键播放音效 · Enter 停止所有
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="mr-1 h-4 w-4" /> 设置
        </Button>
      </div>

      {/* 统计信息 */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>已绑定: {boundKeys.size} / {ALL_KEYS.length - 1} 个按键</span>
        <span>默认音效: {ALL_KEYS.length - 1 - boundKeys.size} 个</span>
      </div>

      {/* 3D 键盘 */}
      <Keyboard3D
        pressedKeys={pressedKeys}
        boundKeys={boundKeys}
        onKeyClick={handleKeyClick}
      />

      {/* 提示 */}
      <p className="text-xs text-muted-foreground text-center max-w-md px-4">
        所有按键默认使用合成音效。点击右上角「设置」可为每个按键上传自定义音效。
        支持 JSON 配置导入导出。
      </p>

      {/* 设置面板 */}
      <SoundSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        boundKeys={boundKeys}
        onUploadSound={handleUploadSound}
        onRemoveSound={handleRemoveSound}
        onExport={handleExport}
        onImport={handleImport}
      />
    </motion.div>
  );
}
