import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Settings, Volume2, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAudioManager } from "@/hooks/use-audio-manager";
import { useKeyboardListener } from "@/hooks/use-keyboard-listener";
import { useSoundboardStore } from "@/stores/use-soundboard-store";
import { ALL_KEYS, type KeyCode } from "./keyboard-layout";
import { synthesizeBuffer, SOUND_SYNTH_MAP } from "./sound-synthesis";
import { Keyboard3D } from "./Keyboard3D";
import { SoundSettings } from "./SoundSettings";

/** 分批大小 */
const BATCH_SIZE = 5;

export default function SoundboardTab() {
  const audioManager = useAudioManager();
  const soundStore = useSoundboardStore();
  const [pressedKeys, setPressedKeys] = useState<Set<KeyCode>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const packInputRef = useRef<HTMLInputElement>(null);

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
        if (!mapping.audioData) continue;
        try {
          await audioManager.preload(mapping.key, mapping.audioData);
        } catch {
          console.warn(`无法加载音效: ${mapping.key}`);
        }
      }
    };
    loadUserSounds();
  }, [soundStore.mappings, audioManager]);

  // 使用拟真合成音效加载默认音效（分批加载，5个一批）
  // 如果已导入音效包，跳过合成音效加载
  useEffect(() => {
    if (defaultsLoaded || soundStore.packMeta) return;
    let cancelled = false;

    const loadDefaults = async () => {
      // 收集需要加载的按键
      const keysToLoad = ALL_KEYS.filter(
        (key) => key !== "Enter" && !boundKeys.has(key) && SOUND_SYNTH_MAP[key]
      );
      const total = keysToLoad.length;
      setLoadProgress({ loaded: 0, total });

      // 分批加载
      for (let i = 0; i < keysToLoad.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const batch = keysToLoad.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (key) => {
            const buffer = await synthesizeBuffer(key);
            audioManager.preloadBuffer(`default-${key}`, buffer);
          })
        );
        // 统计成功数
        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        if (!cancelled) {
          setLoadProgress((prev) => ({
            ...prev,
            loaded: Math.min(prev.loaded + succeeded, total),
          }));
        }
      }

      if (!cancelled) {
        setDefaultsLoaded(true);
      }
    };
    loadDefaults();

    return () => {
      cancelled = true;
    };
  }, [audioManager, boundKeys, defaultsLoaded, soundStore.packMeta]);

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
        const count = await soundStore.importConfig(text);
        toast.success(`已导入 ${count} 个音效映射`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "导入失败");
      }
    };
    input.click();
  }, [soundStore]);

  // 导入音效包（文件夹）
  const handleImportPack = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);
    try {
      const result = await soundStore.importPack(files);
      toast.success(`已导入音效包「${result.name}」(${result.count} 个音效)`);
      setDefaultsLoaded(true); // 有音效包时跳过合成音效加载
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
      // 重置 input 以允许重复选择同一文件夹
      if (packInputRef.current) packInputRef.current.value = "";
    }
  }, [soundStore]);

  // 清除音效包
  const handleClearPack = useCallback(() => {
    soundStore.clearPack();
    setDefaultsLoaded(false); // 允许重新加载合成音效
    toast.success("已清除音效包，恢复默认合成音效");
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => packInputRef.current?.click()}
            disabled={importing}
          >
            <FolderOpen className="mr-1 h-4 w-4" />
            {importing ? "导入中..." : "导入音效包"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="mr-1 h-4 w-4" /> 设置
          </Button>
        </div>
      </div>

      {/* 隐藏的文件夹选择器 */}
      <input
        ref={packInputRef}
        type="file"
        className="hidden"
        onChange={handleImportPack}
        {...{ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>}
      />

      {/* 音效包信息 + 统计 */}
      <div className="flex flex-col items-center gap-1">
        {soundStore.packMeta && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-primary">{soundStore.packMeta.name}</span>
            <span className="text-muted-foreground">({soundStore.packMeta.keyCount} 个音效)</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-destructive hover:text-destructive"
              onClick={handleClearPack}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>已绑定: {boundKeys.size} / {ALL_KEYS.length - 1} 个按键</span>
          {!soundStore.packMeta && (
            <span>默认音效: {ALL_KEYS.length - 1 - boundKeys.size} 个</span>
          )}
        </div>
        {!defaultsLoaded && !soundStore.packMeta && loadProgress.total > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-all duration-300"
                style={{ width: `${(loadProgress.loaded / loadProgress.total) * 100}%` }}
              />
            </div>
            <span>
              加载音效 {loadProgress.loaded}/{loadProgress.total}
            </span>
          </div>
        )}
      </div>

      {/* 3D 键盘 */}
      <Keyboard3D
        pressedKeys={pressedKeys}
        boundKeys={boundKeys}
        onKeyClick={handleKeyClick}
        packLabels={soundStore.packLabels}
      />

      {/* 提示 */}
      <p className="text-xs text-muted-foreground text-center max-w-md px-4">
        {soundStore.packMeta
          ? "当前使用音效包。点击「导入音效包」切换其他包，或在「设置」中单独替换某个按键。"
          : "点击「导入音效包」加载音效文件夹（需含 manifest.json）。未绑定的按键使用合成音效。"
        }
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
