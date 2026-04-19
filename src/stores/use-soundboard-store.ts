import { useState, useCallback } from "react";
import type { KeyCode } from "@/pages/SoundboardTab/keyboard-layout";
import { ALL_KEYS } from "@/pages/SoundboardTab/keyboard-layout";

const STORAGE_KEY = "trpg-soundboard-mappings";

export interface SoundMapping {
  key: KeyCode;
  /** base64 data URL 或 public 路径 */
  audioData: string;
  fileName: string;
}

function loadMappings(): SoundMapping[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SoundMapping[];
  } catch {
    // ignore
  }
  return [];
}

function saveMappings(mappings: SoundMapping[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
}

export function useSoundboardStore() {
  const [mappings, setMappingsState] = useState<SoundMapping[]>(loadMappings);

  const setMapping = useCallback((key: KeyCode, audioData: string, fileName: string) => {
    setMappingsState((prev) => {
      const next = prev.filter((m) => m.key !== key);
      next.push({ key, audioData, fileName });
      saveMappings(next);
      return next;
    });
  }, []);

  const removeMapping = useCallback((key: KeyCode) => {
    setMappingsState((prev) => {
      const next = prev.filter((m) => m.key !== key);
      saveMappings(next);
      return next;
    });
  }, []);

  const getMapping = useCallback(
    (key: KeyCode): SoundMapping | undefined => {
      return mappings.find((m) => m.key === key);
    },
    [mappings]
  );

  const hasBoundSound = useCallback(
    (key: KeyCode): boolean => {
      return mappings.some((m) => m.key === key);
    },
    [mappings]
  );

  const setAllMappings = useCallback((newMappings: SoundMapping[]) => {
    setMappingsState(newMappings);
    saveMappings(newMappings);
  }, []);

  /** 导出为JSON配置（不含音频数据，仅映射关系） */
  const exportConfig = useCallback((): string => {
    const config = mappings.map((m) => ({
      key: m.key,
      fileName: m.fileName,
      audioData: m.audioData,
    }));
    return JSON.stringify({ version: "1.0", mappings: config }, null, 2);
  }, [mappings]);

  /** 导入JSON配置 */
  const importConfig = useCallback((jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.mappings || !Array.isArray(data.mappings)) {
        throw new Error("无效的配置格式");
      }
      const newMappings: SoundMapping[] = data.mappings
        .filter((m: { key: string; audioData: string; fileName: string }) =>
          ALL_KEYS.includes(m.key as KeyCode) && m.audioData
        )
        .map((m: { key: string; audioData: string; fileName: string }) => ({
          key: m.key as KeyCode,
          audioData: m.audioData,
          fileName: m.fileName || m.key,
        }));
      setMappingsState(newMappings);
      saveMappings(newMappings);
      return newMappings.length;
    } catch (err) {
      throw err instanceof Error ? err : new Error("导入失败");
    }
  }, []);

  return {
    mappings,
    setMapping,
    removeMapping,
    getMapping,
    hasBoundSound,
    setAllMappings,
    exportConfig,
    importConfig,
  };
}
