import { useState, useCallback, useMemo, useEffect } from "react";
import type { KeyCode } from "@/pages/SoundboardTab/keyboard-layout";
import { ALL_KEYS } from "@/pages/SoundboardTab/keyboard-layout";

const STORAGE_KEY = "trpg-soundboard-mappings";
const PACK_META_KEY = "trpg-soundboard-pack-meta";
const PACK_LABELS_KEY = "trpg-soundboard-pack-labels";
const AUDIO_DB_NAME = "trpg-soundboard-audio";
const AUDIO_STORE_NAME = "audio";
const AUDIO_DB_VERSION = 1;

export interface SoundMapping {
  key: KeyCode;
  /** Base64 data URL or public URL. Persist large data in IndexedDB, not localStorage. */
  audioData?: string;
  fileName: string;
  volume?: number;
}

interface StoredSoundMapping {
  key: KeyCode;
  fileName: string;
  audioData?: string;
  volume?: number;
}

export interface PackManifest {
  name: string;
  description?: string;
  author?: string;
  version?: string;
  mappings: Record<string, {
    emoji: string;
    label: string;
    file: string;
    volume?: number;
  }>;
}

export interface PackMeta {
  name: string;
  description?: string;
  author?: string;
  keyCount: number;
  importedAt: string;
}

export type PackLabels = Record<string, { emoji: string; label: string }>;

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIO_DB_NAME, AUDIO_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open audio database"));
  });
}

async function getAudioData(key: KeyCode): Promise<string | undefined> {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, "readonly");
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result as string | undefined);
    request.onerror = () => reject(request.error ?? new Error("Failed to read audio data"));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
}

async function saveAudioData(key: KeyCode, audioData: string): Promise<void> {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, "readwrite");
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    store.put(audioData, key);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("Failed to save audio data"));
    };
  });
}

async function removeAudioData(key: KeyCode): Promise<void> {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, "readwrite");
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    store.delete(key);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("Failed to remove audio data"));
    };
  });
}

async function clearAudioData(): Promise<void> {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, "readwrite");
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    store.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("Failed to clear audio data"));
    };
  });
}

function loadMappings(): SoundMapping[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    return (JSON.parse(raw) as StoredSoundMapping[])
      .filter((m) => ALL_KEYS.includes(m.key))
      .map((m) => ({
        key: m.key,
        fileName: m.fileName || m.key,
        audioData: m.audioData,
        volume: normalizeVolume(m.volume),
      }));
  } catch {
    return [];
  }
}

function saveMappings(mappings: SoundMapping[]) {
  const metadata: StoredSoundMapping[] = mappings.map((m) => ({
    key: m.key,
    fileName: m.fileName,
    volume: normalizeVolume(m.volume),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
}

function normalizeVolume(volume: unknown): number {
  return typeof volume === "number" && Number.isFinite(volume) && volume >= 0 ? volume : 1;
}

function loadPackMeta(): PackMeta | null {
  try {
    const raw = localStorage.getItem(PACK_META_KEY);
    if (raw) return JSON.parse(raw) as PackMeta;
  } catch {
    // ignore
  }
  return null;
}

function loadPackLabels(): PackLabels {
  try {
    const raw = localStorage.getItem(PACK_LABELS_KEY);
    if (raw) return JSON.parse(raw) as PackLabels;
  } catch {
    // ignore
  }
  return {};
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`读取失败: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function useSoundboardStore() {
  const [mappings, setMappingsState] = useState<SoundMapping[]>(loadMappings);
  const [packMeta, setPackMeta] = useState<PackMeta | null>(loadPackMeta);
  const [packLabels, setPackLabels] = useState<PackLabels>(loadPackLabels);

  useEffect(() => {
    let cancelled = false;

    const hydrateMappings = async () => {
      const hydrated = await Promise.all(
        mappings.map(async (mapping) => {
          if (mapping.audioData) {
            await saveAudioData(mapping.key, mapping.audioData);
            return mapping;
          }

          const audioData = await getAudioData(mapping.key);
          return audioData ? { ...mapping, audioData } : mapping;
        })
      );

      if (!cancelled) {
        setMappingsState(hydrated);
        saveMappings(hydrated);
      }
    };

    void hydrateMappings();

    return () => {
      cancelled = true;
    };
    // Run only for the initially loaded localStorage metadata.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMapping = useCallback((key: KeyCode, audioData: string, fileName: string, volume = 1) => {
    void saveAudioData(key, audioData);
    setMappingsState((prev) => {
      const next = prev.filter((m) => m.key !== key);
      next.push({ key, audioData, fileName, volume: normalizeVolume(volume) });
      saveMappings(next);
      return next;
    });
  }, []);

  const removeMapping = useCallback((key: KeyCode) => {
    void removeAudioData(key);
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
    for (const mapping of newMappings) {
      if (mapping.audioData) {
        void saveAudioData(mapping.key, mapping.audioData);
      }
    }
    setMappingsState(newMappings);
    saveMappings(newMappings);
  }, []);

  const exportConfig = useCallback((): string => {
    const config = mappings.map((m) => ({
      key: m.key,
      fileName: m.fileName,
      audioData: m.audioData ?? "",
      volume: normalizeVolume(m.volume),
    }));
    return JSON.stringify({ version: "1.0", mappings: config }, null, 2);
  }, [mappings]);

  const importConfig = useCallback(async (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr) as {
        mappings?: Array<{ key: string; audioData?: string; fileName?: string; volume?: number }>;
      };
      if (!data.mappings || !Array.isArray(data.mappings)) {
        throw new Error("无效的配置格式");
      }

      const newMappings: SoundMapping[] = data.mappings
        .filter((m) => ALL_KEYS.includes(m.key as KeyCode) && m.audioData)
        .map((m) => ({
          key: m.key as KeyCode,
          audioData: m.audioData,
          fileName: m.fileName || m.key,
          volume: normalizeVolume(m.volume),
        }));

      await Promise.all(
        newMappings.map((mapping) => saveAudioData(mapping.key, mapping.audioData ?? ""))
      );
      setMappingsState(newMappings);
      saveMappings(newMappings);
      return newMappings.length;
    } catch (err) {
      throw err instanceof Error ? err : new Error("导入失败");
    }
  }, []);

  const importPack = useCallback(async (files: FileList): Promise<{ name: string; count: number }> => {
    const manifestFile = Array.from(files).find(
      (f) => f.name === "manifest.json" || f.webkitRelativePath.endsWith("/manifest.json")
    );
    if (!manifestFile) {
      throw new Error("未找到 manifest.json，请确保音效包文件夹中包含此文件");
    }

    let manifest: PackManifest;
    try {
      manifest = JSON.parse(await manifestFile.text()) as PackManifest;
    } catch {
      throw new Error("manifest.json 格式错误");
    }

    if (!manifest.name || !manifest.mappings) {
      throw new Error("manifest.json 缺少 name 或 mappings 字段");
    }

    const fileMap = new Map<string, File>();
    for (const file of Array.from(files)) {
      fileMap.set(file.name, file);
      if (file.webkitRelativePath) {
        fileMap.set(file.webkitRelativePath, file);
        fileMap.set(file.webkitRelativePath.split("/").slice(1).join("/"), file);
      }
    }

    const newMappings: SoundMapping[] = [];
    const newLabels: PackLabels = {};

    for (const [key, def] of Object.entries(manifest.mappings)) {
      if (!ALL_KEYS.includes(key as KeyCode)) continue;

      const audioFile = fileMap.get(def.file);
      if (!audioFile) {
        console.warn(`[SoundPack] 文件未找到: ${def.file}，跳过按键 ${key}`);
        continue;
      }

      const audioData = await readFileAsDataUrl(audioFile);
      const mapping: SoundMapping = {
        key: key as KeyCode,
        audioData,
        fileName: def.file,
        volume: normalizeVolume(def.volume),
      };
      newMappings.push(mapping);
      newLabels[key] = { emoji: def.emoji, label: def.label };
    }

    if (newMappings.length === 0) {
      throw new Error("未能加载任何音效文件，请检查 manifest.json 中的文件路径");
    }

    await clearAudioData();
    await Promise.all(
      newMappings.map((mapping) => saveAudioData(mapping.key, mapping.audioData ?? ""))
    );

    setMappingsState(newMappings);
    saveMappings(newMappings);

    const meta: PackMeta = {
      name: manifest.name,
      description: manifest.description,
      author: manifest.author,
      keyCount: newMappings.length,
      importedAt: new Date().toISOString(),
    };
    setPackMeta(meta);
    localStorage.setItem(PACK_META_KEY, JSON.stringify(meta));

    setPackLabels(newLabels);
    localStorage.setItem(PACK_LABELS_KEY, JSON.stringify(newLabels));

    return { name: manifest.name, count: newMappings.length };
  }, []);

  const clearPack = useCallback(() => {
    void clearAudioData();
    setMappingsState([]);
    saveMappings([]);
    setPackMeta(null);
    localStorage.removeItem(PACK_META_KEY);
    setPackLabels({});
    localStorage.removeItem(PACK_LABELS_KEY);
  }, []);

  return useMemo(() => ({
    mappings,
    setMapping,
    removeMapping,
    getMapping,
    hasBoundSound,
    setAllMappings,
    exportConfig,
    importConfig,
    packMeta,
    packLabels,
    importPack,
    clearPack,
  }), [
    mappings,
    setMapping,
    removeMapping,
    getMapping,
    hasBoundSound,
    setAllMappings,
    exportConfig,
    importConfig,
    packMeta,
    packLabels,
    importPack,
    clearPack,
  ]);
}
