/**
 * TRPG 氛围音效合成器
 * 使用 Web Audio API OfflineAudioContext 纯代码合成拟真音效
 */

/** 音效合成函数类型 */
type SynthFn = (ctx: OfflineAudioContext) => void;

/** 生成白噪声 buffer */
function createNoiseBuffer(ctx: OfflineAudioContext, duration: number): AudioBuffer {
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** 辅助：创建噪声源节点 */
function createNoiseSource(ctx: OfflineAudioContext, duration: number): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = createNoiseBuffer(ctx, duration);
  return src;
}

// ===== 环境氛围音 =====

/** 嘎吱门声：短脉冲噪声 + 带通滤波 + 快速衰减 */
const synthCreakingDoor: SynthFn = (ctx) => {
  const dur = 0.8;
  const noise = createNoiseSource(ctx, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(800, 0);
  bp.frequency.linearRampToValueAtTime(400, 0.3);
  bp.frequency.linearRampToValueAtTime(600, 0.6);
  bp.Q.value = 8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.7, 0.05);
  gain.gain.setValueAtTime(0.5, 0.2);
  gain.gain.linearRampToValueAtTime(0.6, 0.4);
  gain.gain.linearRampToValueAtTime(0, dur);
  noise.connect(bp).connect(gain).connect(ctx.destination);
  noise.start(0);
  noise.stop(dur);
};

/** 脚步声：低频冲击 + 高通 */
const synthFootsteps: SynthFn = (ctx) => {
  // 总时长 0.6s（由 SOUND_SYNTH_MAP 管理）
  // 两步
  for (const t of [0, 0.3]) {
    const noise = createNoiseSource(ctx, 0.15);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 200;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.8, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    noise.connect(hp).connect(lp).connect(gain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.15);
  }
  // 低频共振
  for (const t of [0, 0.3]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 60;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }
};

/** 风声：brown噪声 + 低通 + 慢LFO调制 */
const synthWind: SynthFn = (ctx) => {
  const dur = 2.0;
  const noise = createNoiseSource(ctx, dur);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 800;
  lp.Q.value = 1;
  // LFO 调制滤波频率
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 400;
  lfo.connect(lfoGain).connect(lp.frequency);
  lfo.start(0);
  lfo.stop(dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.4, 0.5);
  gain.gain.setValueAtTime(0.4, dur - 0.5);
  gain.gain.linearRampToValueAtTime(0, dur);
  noise.connect(lp).connect(gain).connect(ctx.destination);
  noise.start(0);
  noise.stop(dur);
};

/** 暴雨声：密集噪声 + 带通滤波 */
const synthHeavyRain: SynthFn = (ctx) => {
  const dur = 2.0;
  const noise = createNoiseSource(ctx, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3000;
  bp.Q.value = 0.5;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 6000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.5, 0.3);
  gain.gain.setValueAtTime(0.5, dur - 0.4);
  gain.gain.linearRampToValueAtTime(0, dur);
  noise.connect(bp).connect(lp).connect(gain).connect(ctx.destination);
  noise.start(0);
  noise.stop(dur);
};

/** 雷鸣：低频爆发 + 噪声 + 长尾 */
const synthThunder: SynthFn = (ctx) => {
  const dur = 1.5;
  // 低频轰鸣
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(80, 0);
  osc.frequency.exponentialRampToValueAtTime(30, dur);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 200;
  const g1 = ctx.createGain();
  g1.gain.setValueAtTime(0, 0);
  g1.gain.linearRampToValueAtTime(0.6, 0.02);
  g1.gain.exponentialRampToValueAtTime(0.01, dur);
  osc.connect(lp).connect(g1).connect(ctx.destination);
  osc.start(0);
  osc.stop(dur);
  // 噪声爆裂
  const noise = createNoiseSource(ctx, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 500;
  bp.Q.value = 1;
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0, 0);
  g2.gain.linearRampToValueAtTime(0.5, 0.01);
  g2.gain.exponentialRampToValueAtTime(0.01, 0.8);
  noise.connect(bp).connect(g2).connect(ctx.destination);
  noise.start(0);
  noise.stop(dur);
};

/** 火焰声：中频噪声 + 带通 + LFO */
const synthFlame: SynthFn = (ctx) => {
  const dur = 1.5;
  const noise = createNoiseSource(ctx, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1500;
  bp.Q.value = 1;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 3;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 500;
  lfo.connect(lfoG).connect(bp.frequency);
  lfo.start(0);
  lfo.stop(dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.4, 0.2);
  gain.gain.setValueAtTime(0.35, dur - 0.3);
  gain.gain.linearRampToValueAtTime(0, dur);
  noise.connect(bp).connect(gain).connect(ctx.destination);
  noise.start(0);
  noise.stop(dur);
};

/** 碎玻璃：高频噪声爆裂 + 金属共振 */
const synthGlassBreak: SynthFn = (ctx) => {
  const dur = 0.6;
  const noise = createNoiseSource(ctx, dur);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.8, 0);
  gain.gain.exponentialRampToValueAtTime(0.01, 0.4);
  noise.connect(hp).connect(gain).connect(ctx.destination);
  noise.start(0);
  noise.stop(dur);
  // 金属余响
  for (const freq of [4000, 5500, 7200]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, 0);
    g.gain.exponentialRampToValueAtTime(0.001, dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(0);
    osc.stop(dur);
  }
};

// ===== 探索发现音 =====

/** 心跳声 */
const synthHeartbeat: SynthFn = (ctx) => {
  // 总时长 1.0s（由 SOUND_SYNTH_MAP 管理）
  for (const t of [0, 0.15, 0.5, 0.65]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = t % 0.5 < 0.01 ? 50 : 40;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.6, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }
};

/** 低语声：多个柔和正弦波叠加 */
const synthWhisper: SynthFn = (ctx) => {
  const dur = 1.0;
  const noise = createNoiseSource(ctx, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2000;
  bp.Q.value = 3;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 4;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.15;
  lfo.connect(lfoG).connect(ctx.createGain()).connect(ctx.destination);
  lfo.start(0);
  lfo.stop(dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.2, 0.1);
  gain.gain.setValueAtTime(0.15, dur - 0.2);
  gain.gain.linearRampToValueAtTime(0, dur);
  noise.connect(bp).connect(gain).connect(ctx.destination);
  noise.start(0);
  noise.stop(dur);
};

/** 钥匙声：金属碰撞 */
const synthKeys: SynthFn = (ctx) => {
  // 总时长 0.5s（由 SOUND_SYNTH_MAP 管理）
  for (const [t, freq] of [[0, 3200], [0.1, 4100], [0.2, 3600]] as [number, number][]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }
};

/** 开锁声：咔嗒机械声 */
const synthUnlock: SynthFn = (ctx) => {
  const dur = 0.4;
  // 咔嗒
  const noise = createNoiseSource(ctx, 0.05);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.7, 0);
  g.gain.exponentialRampToValueAtTime(0.01, 0.05);
  noise.connect(hp).connect(g).connect(ctx.destination);
  noise.start(0);
  noise.stop(0.05);
  // 金属转动
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(800, 0.08);
  osc.frequency.linearRampToValueAtTime(1200, 0.2);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0, 0.08);
  g2.gain.linearRampToValueAtTime(0.2, 0.1);
  g2.gain.exponentialRampToValueAtTime(0.01, 0.35);
  osc.connect(g2).connect(ctx.destination);
  osc.start(0.08);
  osc.stop(dur);
};

/** 翻书声 */
const synthPageTurn: SynthFn = (ctx) => {
  const dur = 0.4;
  const noise = createNoiseSource(ctx, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 4000;
  bp.Q.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.5, 0.02);
  gain.gain.setValueAtTime(0.3, 0.08);
  gain.gain.exponentialRampToValueAtTime(0.01, 0.3);
  noise.connect(bp).connect(gain).connect(ctx.destination);
  noise.start(0);
  noise.stop(dur);
};

/** 钟声：正弦波 + 泛音 + 长衰减 */
const synthBell: SynthFn = (ctx) => {
  const dur = 2.0;
  for (const [freq, amp] of [[440, 0.4], [880, 0.2], [1320, 0.1], [1760, 0.05]] as [number, number][]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(amp, 0);
    g.gain.exponentialRampToValueAtTime(0.001, dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(0);
    osc.stop(dur);
  }
};

/** 尖叫声：高频升调 + 噪声 */
const synthScream: SynthFn = (ctx) => {
  const dur = 0.8;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, 0);
  osc.frequency.linearRampToValueAtTime(1200, 0.1);
  osc.frequency.setValueAtTime(1000, 0.3);
  osc.frequency.linearRampToValueAtTime(600, dur);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.5, 0.05);
  gain.gain.setValueAtTime(0.4, 0.3);
  gain.gain.linearRampToValueAtTime(0, dur);
  osc.connect(lp).connect(gain).connect(ctx.destination);
  osc.start(0);
  osc.stop(dur);
};

// ===== 战斗特效音 =====

/** 剑击声 */
const synthSwordSlash: SynthFn = (ctx) => {
  const dur = 0.4;
  const noise = createNoiseSource(ctx, dur);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(1000, 0);
  hp.frequency.linearRampToValueAtTime(4000, 0.05);
  hp.frequency.linearRampToValueAtTime(2000, 0.2);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.7, 0);
  gain.gain.exponentialRampToValueAtTime(0.01, 0.3);
  noise.connect(hp).connect(gain).connect(ctx.destination);
  noise.start(0);
  noise.stop(dur);
  // 金属共振
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 3000;
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.3, 0);
  g2.gain.exponentialRampToValueAtTime(0.001, 0.3);
  osc.connect(g2).connect(ctx.destination);
  osc.start(0);
  osc.stop(dur);
};

/** 弓箭声 */
const synthArrow: SynthFn = (ctx) => {
  const dur = 0.5;
  const noise = createNoiseSource(ctx, 0.3);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(500, 0);
  bp.frequency.linearRampToValueAtTime(3000, 0.1);
  bp.Q.value = 2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, 0);
  gain.gain.exponentialRampToValueAtTime(0.01, 0.25);
  noise.connect(bp).connect(gain).connect(ctx.destination);
  noise.start(0);
  noise.stop(0.3);
  // 弦振动
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(200, 0);
  osc.frequency.exponentialRampToValueAtTime(80, 0.4);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.3, 0);
  g2.gain.exponentialRampToValueAtTime(0.001, dur);
  osc.connect(g2).connect(ctx.destination);
  osc.start(0);
  osc.stop(dur);
};

/** 魔法声：多个升频正弦波 + 闪烁 */
const synthMagic: SynthFn = (ctx) => {
  const dur = 1.0;
  for (const [baseFreq, delay] of [[400, 0], [600, 0.1], [800, 0.2]] as [number, number][]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, delay);
    osc.frequency.linearRampToValueAtTime(baseFreq * 2, delay + 0.3);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, delay);
    g.gain.linearRampToValueAtTime(0.2, delay + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(delay);
    osc.stop(dur);
  }
  // 闪烁噪声
  const noise = createNoiseSource(ctx, dur);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 5000;
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(0, 0);
  gn.gain.linearRampToValueAtTime(0.1, 0.1);
  gn.gain.exponentialRampToValueAtTime(0.001, 0.8);
  noise.connect(hp).connect(gn).connect(ctx.destination);
  noise.start(0);
  noise.stop(dur);
};

/** 爆炸声 */
const synthExplosion: SynthFn = (ctx) => {
  const dur = 1.2;
  const noise = createNoiseSource(ctx, dur);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(4000, 0);
  lp.frequency.exponentialRampToValueAtTime(200, dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.8, 0);
  gain.gain.exponentialRampToValueAtTime(0.01, dur);
  noise.connect(lp).connect(gain).connect(ctx.destination);
  noise.start(0);
  noise.stop(dur);
  // 低频冲击
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(100, 0);
  osc.frequency.exponentialRampToValueAtTime(20, 0.5);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.6, 0);
  g2.gain.exponentialRampToValueAtTime(0.01, 0.6);
  osc.connect(g2).connect(ctx.destination);
  osc.start(0);
  osc.stop(dur);
};

/** 护盾声：上升和声 */
const synthShield: SynthFn = (ctx) => {
  const dur = 0.8;
  for (const freq of [300, 450, 600]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 0.5, 0);
    osc.frequency.linearRampToValueAtTime(freq, 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(0.2, 0.15);
    g.gain.setValueAtTime(0.15, 0.5);
    g.gain.linearRampToValueAtTime(0, dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(0);
    osc.stop(dur);
  }
};

/** 治疗声：柔和上升音阶 */
const synthHeal: SynthFn = (ctx) => {
  // 总时长 1.0s（由 SOUND_SYNTH_MAP 管理）
  const notes = [523, 659, 784, 1047]; // C5-E5-G5-C6
  notes.forEach((freq, i) => {
    const t = i * 0.15;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  });
};

// ===== 情境特殊音 =====

/** 时钟滴答 */
const synthClock: SynthFn = (ctx) => {
  // 总时长 1.0s（由 SOUND_SYNTH_MAP 管理）
  for (const t of [0, 0.5]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }
};

/** 水滴声 */
const synthWaterDrop: SynthFn = (ctx) => {
  const dur = 0.5;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1500, 0);
  osc.frequency.exponentialRampToValueAtTime(400, 0.15);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.5, 0);
  g.gain.exponentialRampToValueAtTime(0.001, 0.3);
  osc.connect(g).connect(ctx.destination);
  osc.start(0);
  osc.stop(dur);
};

/** 狼嚎声：升降频 */
const synthWolfHowl: SynthFn = (ctx) => {
  const dur = 1.5;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, 0);
  osc.frequency.linearRampToValueAtTime(500, 0.4);
  osc.frequency.setValueAtTime(480, 0.6);
  osc.frequency.linearRampToValueAtTime(350, 1.0);
  osc.frequency.linearRampToValueAtTime(200, dur);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(0.35, 0.2);
  gain.gain.setValueAtTime(0.3, 0.8);
  gain.gain.linearRampToValueAtTime(0, dur);
  osc.connect(lp).connect(gain).connect(ctx.destination);
  osc.start(0);
  osc.stop(dur);
};

/** 铁链声：金属碰撞序列 */
const synthChains: SynthFn = (ctx) => {
  // 总时长 0.8s（由 SOUND_SYNTH_MAP 管理）
  for (let i = 0; i < 5; i++) {
    const t = i * 0.12;
    const noise = createNoiseSource(ctx, 0.08);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2500 + Math.random() * 2000;
    bp.Q.value = 5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    noise.connect(bp).connect(g).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.08);
  }
};

/** 乌鸦叫声 */
const synthCrow: SynthFn = (ctx) => {
  // 总时长 0.8s（由 SOUND_SYNTH_MAP 管理）
  for (const [t, fStart, fEnd] of [[0, 600, 900], [0.25, 650, 850], [0.5, 580, 920]] as [number, number, number][]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(fStart, t);
    osc.frequency.linearRampToValueAtTime(fEnd, t + 0.08);
    osc.frequency.linearRampToValueAtTime(fStart * 0.8, t + 0.15);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
    osc.connect(lp).connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }
};

/** 回响声：延迟反馈 */
const synthEcho: SynthFn = (ctx) => {
  // 总时长 1.5s（由 SOUND_SYNTH_MAP 管理）
  const freqs = [440, 554, 659];
  for (let rep = 0; rep < 4; rep++) {
    const t = rep * 0.25;
    const amp = 0.3 * Math.pow(0.5, rep);
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    }
  }
};

/** 掌声 */
const synthApplause: SynthFn = (ctx) => {
  const dur = 2.0;
  const noise = createNoiseSource(ctx, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2000;
  bp.Q.value = 0.3;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 8;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.1;
  lfo.connect(lfoG);
  const masterGain = ctx.createGain();
  lfoG.connect(masterGain.gain);
  masterGain.gain.setValueAtTime(0, 0);
  masterGain.gain.linearRampToValueAtTime(0.4, 0.3);
  masterGain.gain.setValueAtTime(0.4, dur - 0.5);
  masterGain.gain.linearRampToValueAtTime(0, dur);
  noise.connect(bp).connect(masterGain).connect(ctx.destination);
  lfo.start(0);
  lfo.stop(dur);
  noise.start(0);
  noise.stop(dur);
};

// ===== 按键映射 =====

interface SoundDef {
  synth: SynthFn;
  duration: number;
}

/** 按键 → 合成方案映射（与 keyboard-layout.ts SOUND_LABELS 对应） */
export const SOUND_SYNTH_MAP: Record<string, SoundDef> = {
  // 第一排 QWERTYUIOP
  q: { synth: synthCreakingDoor, duration: 0.8 },   // 嘎吱门
  w: { synth: synthFootsteps, duration: 0.6 },      // 脚步
  e: { synth: synthWind, duration: 2.0 },            // 风声
  r: { synth: synthHeavyRain, duration: 2.0 },       // 暴雨
  t: { synth: synthThunder, duration: 1.5 },         // 雷鸣
  y: { synth: synthFlame, duration: 1.5 },           // 火焰
  u: { synth: synthGlassBreak, duration: 0.6 },      // 碎玻璃
  i: { synth: synthHeartbeat, duration: 1.0 },       // 心跳
  o: { synth: synthWhisper, duration: 1.0 },         // 低语
  p: { synth: synthKeys, duration: 0.5 },            // 钥匙

  // 第二排 ASDFGHJKL
  a: { synth: synthUnlock, duration: 0.4 },          // 开锁
  s: { synth: synthPageTurn, duration: 0.4 },        // 翻书
  d: { synth: synthBell, duration: 2.0 },            // 钟声
  f: { synth: synthScream, duration: 0.8 },          // 尖叫
  g: { synth: synthSwordSlash, duration: 0.4 },      // 剑击
  h: { synth: synthArrow, duration: 0.5 },           // 弓箭
  j: { synth: synthMagic, duration: 1.0 },           // 魔法
  k: { synth: synthExplosion, duration: 1.2 },       // 爆炸
  l: { synth: synthShield, duration: 0.8 },          // 护盾

  // 第三排 ZXCVBNM
  z: { synth: synthHeal, duration: 1.0 },            // 治疗
  x: { synth: synthClock, duration: 1.0 },           // 时钟
  c: { synth: synthWaterDrop, duration: 0.5 },       // 水滴
  v: { synth: synthWolfHowl, duration: 1.5 },        // 狼嚎
  b: { synth: synthChains, duration: 0.8 },          // 铁链
  n: { synth: synthCrow, duration: 0.8 },            // 鸦叫
  m: { synth: synthEcho, duration: 1.5 },            // 回响

  // 特殊键
  Space: { synth: synthApplause, duration: 2.0 },    // 掌声
};

/** 合成指定按键的音效，直接返回 AudioBuffer（跳过 WAV 编码，性能更优） */
export async function synthesizeBuffer(key: string): Promise<AudioBuffer> {
  const def = SOUND_SYNTH_MAP[key];
  if (!def) throw new Error(`No synth defined for key: ${key}`);

  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * def.duration), sampleRate);

  def.synth(ctx);

  return ctx.startRendering();
}

/** 合成指定按键的音效，返回 WAV data URL（用于导出场景） */
export async function synthesizeSound(key: string): Promise<string> {
  const def = SOUND_SYNTH_MAP[key];
  if (!def) throw new Error(`No synth defined for key: ${key}`);

  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * def.duration), sampleRate);

  def.synth(ctx);

  const buffer = await ctx.startRendering();
  const wav = audioBufferToWav(buffer);
  const blob = new Blob([wav], { type: "audio/wav" });

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

/** AudioBuffer → WAV 二进制 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const data = buffer.getChannelData(0);
  const dataLength = data.length * bytesPerSample;
  const totalLength = 44 + dataLength;
  const ab = new ArrayBuffer(totalLength);
  const view = new DataView(ab);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample * 0x7fff, true);
    offset += 2;
  }
  return ab;
}
