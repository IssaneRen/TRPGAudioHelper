import { useRef, useCallback, useEffect, useMemo } from "react";

/** 全局 AudioContext 单例 */
let globalContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!globalContext) {
    globalContext = new AudioContext();
  }
  return globalContext;
}

/** 确保 AudioContext 在用户交互后 resume（iOS要求） */
async function ensureResumed() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  return ctx;
}

export interface AudioManager {
  /** 预加载音频（base64或URL） */
  preload: (key: string, audioData: string) => Promise<void>;
  /** 直接存储 AudioBuffer 到缓存（跳过编解码，用于合成音效） */
  preloadBuffer: (key: string, buffer: AudioBuffer) => void;
  /** 播放指定按键的音效 */
  play: (key: string, options?: PlayOptions) => AudioPlayback | null;
  /** 停止所有正在播放的音效 */
  stopAll: () => void;
  /** 移除某个按键的音频缓存 */
  remove: (key: string) => void;
  /** 清空所有缓存 */
  clearAll: () => void;
}

export interface PlayOptions {
  onEnded?: (playbackId: string) => void;
}

export interface AudioPlayback {
  id: string;
  key: string;
  startedAt: number;
  duration: number;
}

export function useAudioManager(): AudioManager {
  const bufferCache = useRef<Map<string, AudioBuffer>>(new Map());
  const activeSources = useRef<AudioBufferSourceNode[]>([]);
  const playbackCounter = useRef(0);

  const preload = useCallback(async (key: string, audioData: string) => {
    const ctx = await ensureResumed();

    let arrayBuffer: ArrayBuffer;
    if (audioData.startsWith("data:")) {
      // base64 data URL
      const base64 = audioData.split(",")[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      // URL
      const response = await fetch(audioData);
      arrayBuffer = await response.arrayBuffer();
    }

    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    bufferCache.current.set(key, audioBuffer);
  }, []);

  const preloadBuffer = useCallback((key: string, buffer: AudioBuffer) => {
    bufferCache.current.set(key, buffer);
  }, []);

  const play = useCallback((key: string, options?: PlayOptions): AudioPlayback | null => {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const buffer = bufferCache.current.get(key);
    if (!buffer) return null;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const playback: AudioPlayback = {
      id: `${key}-${Date.now()}-${playbackCounter.current++}`,
      key,
      startedAt: ctx.currentTime,
      duration: buffer.duration,
    };
    source.start(0);

    activeSources.current.push(source);
    source.onended = () => {
      activeSources.current = activeSources.current.filter((s) => s !== source);
      options?.onEnded?.(playback.id);
    };
    return playback;
  }, []);

  const stopAll = useCallback(() => {
    for (const source of activeSources.current) {
      try {
        source.stop();
      } catch {
        // 已停止的 source 会抛错，忽略
      }
    }
    activeSources.current = [];
  }, []);

  const remove = useCallback((key: string) => {
    bufferCache.current.delete(key);
  }, []);

  const clearAll = useCallback(() => {
    bufferCache.current.clear();
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return useMemo(
    () => ({ preload, preloadBuffer, play, stopAll, remove, clearAll }),
    [preload, preloadBuffer, play, stopAll, remove, clearAll]
  );
}

/** 生成简单的合成音效作为默认音效 */
export function generateDefaultSound(
  frequency: number,
  type: OscillatorType = "sine",
  duration = 0.3,
  attack = 0.01,
  release = 0.1
): Promise<string> {
  return new Promise((resolve) => {
    const offlineCtx = new OfflineAudioContext(1, 44100 * duration, 44100);

    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    // Envelope: attack + sustain + release
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.5, attack);
    gain.gain.setValueAtTime(0.5, duration - release);
    gain.gain.linearRampToValueAtTime(0, duration);

    osc.connect(gain);
    gain.connect(offlineCtx.destination);
    osc.start(0);
    osc.stop(duration);

    offlineCtx.startRendering().then((buffer) => {
      // 转换为 WAV data URL
      const wav = audioBufferToWav(buffer);
      const blob = new Blob([wav], { type: "audio/wav" });
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  });
}

/** AudioBuffer → WAV 二进制 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const data = buffer.getChannelData(0);
  const dataLength = data.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // PCM data
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample * 0x7fff, true);
    offset += 2;
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
