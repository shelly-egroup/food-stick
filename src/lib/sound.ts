/**
 * 網站的聲音：幾乎全部用 Web Audio 即時合成（籤筒搖動、籤落地、鐘聲、蓋章、紙張、廟門、星光…），
 * 只有廟貓的叫聲用真的錄音（public/sounds/meow.mp3，CC0），合成的貓叫太假。
 */
const KEY = 'lunchstick:sound';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function readEnabled() {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

let enabled = readEnabled();
const listeners = new Set<(on: boolean) => void>();

export const isSoundOn = () => enabled;
export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* 無痕模式存不了也沒關係 */
  }
  listeners.forEach((fn) => fn(on));
}
export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noiseHit(ac: AudioContext, t: number, freq: number, q: number, peak: number, decay: number) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ac.createGain();
  env(g, t, peak, 0.002, decay);
  src.connect(bp).connect(g).connect(master!);
  src.start(t, Math.random() * 0.5, decay + 0.05);
}

function tone(
  ac: AudioContext,
  t: number,
  freq: number,
  peak: number,
  decay: number,
  type: OscillatorType = 'sine',
  glideTo?: number,
) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + decay * 0.6);
  const g = ac.createGain();
  env(g, t, peak, 0.004, decay);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + decay + 0.1);
}

/** 手機震動（Android 支援；iOS Safari 不支援就安靜略過） */
export function buzz(pattern: number | number[]) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* 不支援就算了 */
  }
}

/** 竹籤在筒裡碰撞 */
export function rattle(duration = 1) {
  const ac = audio();
  if (!ac) return;
  let t = ac.currentTime + 0.01;
  const end = t + duration;
  while (t < end) {
    const burst = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < burst; i++) {
      noiseHit(ac, t + i * 0.012, 1800 + Math.random() * 2200, 9, 0.09 + Math.random() * 0.12, 0.035);
    }
    t += 0.035 + Math.random() * 0.05;
  }
}

/** 一支籤跳出來：木頭清脆的一聲 */
export function clack() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  tone(ac, t, 720, 0.28, 0.12, 'triangle', 420);
  noiseHit(ac, t, 2600, 6, 0.18, 0.05);
}

/** 籤詩展開：一記清亮的磬聲 */
export function chime() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  const base = 659.25;
  [1, 2.76, 5.4, 8.93].forEach((m, i) => tone(ac, t, base * m, 0.16 / (i + 1), 2.4 - i * 0.4));
}

/** 蓋章：悶悶的一下 */
export function stamp() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  tone(ac, t, 150, 0.45, 0.18, 'sine', 70);
  noiseHit(ac, t, 900, 1.2, 0.2, 0.08);
}

/** 紙張：貼紙條、展開籤詩 */
export function paper(duration = 0.35) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(1800, t);
  hp.frequency.linearRampToValueAtTime(4200, t + duration);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.14, t + duration * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(hp).connect(g).connect(master!);
  src.start(t, Math.random() * 0.4, duration + 0.05);
}

/** 廟門：低沉的木門聲 */
export function door() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  tone(ac, t, 92, 0.35, 0.9, 'sine', 60);
  noiseHit(ac, t, 320, 0.8, 0.12, 0.6);
}

/** 聲帶的波形：泛音一個比一個弱，比鋸齒波柔和，像喉嚨發出的聲音 */
let glottis: PeriodicWave | null = null;
function glottalWave(ac: AudioContext) {
  if (glottis) return glottis;
  const n = 40;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) imag[k] = 1 / k ** 1.35;
  glottis = ac.createPeriodicWave(real, imag);
  return glottis;
}

/*
 * 真的貓叫：BigSoundBank #0098「Small mewing of a cat」，Joseph Sardin 錄自家的貓 Elix（CC0 公眾領域）。
 * 一個檔裡有好幾聲，載入後依音量自動切成一聲一聲，每次隨機挑一聲、音高再稍微變一下。
 */
const MEOW_URL = '/sounds/meow.mp3';
let meowRaw: Promise<ArrayBuffer | null> | null = null;
let meowBuf: AudioBuffer | null = null;
let meowCuts: [number, number][] = [];
let meowDecoding = false;

/** 先把貓叫的檔案抓下來（不需要聲音權限）；第一次點貓時才解碼 */
export function preloadMeow() {
  if (meowRaw || typeof fetch === 'undefined') return;
  meowRaw = fetch(MEOW_URL)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);
}

/** 依音量把錄音切成一聲一聲：每 20ms 算一次音量，大聲的連在一起就是一聲 */
function cutMeows(buf: AudioBuffer): [number, number][] {
  const data = buf.getChannelData(0);
  const win = Math.round(buf.sampleRate * 0.02);
  const rms: number[] = [];
  for (let i = 0; i + win <= data.length; i += win) {
    let s = 0;
    for (let j = i; j < i + win; j++) s += data[j] * data[j];
    rms.push(Math.sqrt(s / win));
  }
  const loud = Math.max(...rms) * 0.12;
  const cuts: [number, number][] = [];
  let from = -1;
  let quiet = 0;
  rms.forEach((v, k) => {
    if (v >= loud) {
      if (from < 0) from = k;
      quiet = 0;
    } else if (from >= 0 && ++quiet > 6) {
      cuts.push([from, k - quiet + 1]);
      from = -1;
      quiet = 0;
    }
  });
  if (from >= 0) cuts.push([from, rms.length]);
  return cuts
    .map(([a, b]): [number, number] => [Math.max(0, a * 0.02 - 0.03), Math.min(buf.duration, b * 0.02 + 0.08)])
    .filter(([a, b]) => b - a > 0.15);
}

function playRecordedMeow(ac: AudioContext, pitch: number, long: boolean) {
  if (!meowBuf || !meowCuts.length) return false;
  const [a, b] = long
    ? meowCuts.reduce((x, y) => (y[1] - y[0] > x[1] - x[0] ? y : x))
    : meowCuts[Math.floor(Math.random() * meowCuts.length)];
  const src = ac.createBufferSource();
  src.buffer = meowBuf;
  // 音高：撒嬌高一點、不耐煩低一點，再加一點點隨機，每一聲都不太一樣
  src.playbackRate.value = pitch * (0.94 + Math.random() * 0.12);
  const g = ac.createGain();
  g.gain.value = 0.9;
  src.connect(g).connect(master!);
  src.start(ac.currentTime + 0.005, a, b - a);
  return true;
}

/**
 * 廟貓：喵。優先播真的錄音；錄音還沒準備好（或載入失敗）才用下面的合成聲。
 * pitch 越高越撒嬌、越低越不耐煩；long 挑最長的那一聲。
 */
export function meow(pitch = 1, long = false) {
  const ac = audio();
  if (!ac) return;
  if (playRecordedMeow(ac, pitch, long)) return;
  preloadMeow();
  if (!meowDecoding && meowRaw) {
    meowDecoding = true;
    // 解碼很快（幾十毫秒），第一次點的時候解完就直接播
    void meowRaw
      .then((raw) => (raw ? ac.decodeAudioData(raw.slice(0)) : null))
      .then((buf) => {
        if (!buf) throw new Error('沒有貓叫錄音');
        meowBuf = buf;
        meowCuts = cutMeows(buf);
        if (!playRecordedMeow(ac, pitch, long)) synthMeow(ac, pitch, long);
      })
      .catch(() => synthMeow(ac, pitch, long))
      .finally(() => (meowDecoding = false));
    return;
  }
  synthMeow(ac, pitch, long);
}

/**
 * 合成的喵（備用）：用語音合成的做法模仿貓叫「m-i-a-u」：
 * - 聲帶：音高很快往上、再慢慢往下，帶一點顫音與氣音
 * - 嘴型：三個共振峰一起移動。i 是 F1 低 F2 高、a 是 F1 高、u 是 F1 F2 都低
 * - 開頭的 m：一開始悶在鼻子裡（低通），很快張開
 */
function synthMeow(ac: AudioContext, pitch = 1, long = false) {
  const t = ac.currentTime + 0.01;
  const dur = long ? 1.05 : 0.72;
  const at = (k: number) => t + dur * k;
  const end = t + dur;
  const f0 = 590 * pitch;

  // 聲帶
  const voice = ac.createOscillator();
  voice.setPeriodicWave(glottalWave(ac));
  voice.frequency.setValueAtTime(f0 * 0.82, t);
  voice.frequency.exponentialRampToValueAtTime(f0 * 1.18, at(0.3));
  voice.frequency.exponentialRampToValueAtTime(f0 * 1.05, at(0.55));
  voice.frequency.exponentialRampToValueAtTime(f0 * 0.72, end);
  const vibrato = ac.createOscillator();
  vibrato.frequency.value = 6.2;
  const depth = ac.createGain();
  depth.gain.value = f0 * 0.022;
  vibrato.connect(depth).connect(voice.frequency);

  // 共振峰：(時間點, 頻率) 依序是 m、i、a、a、u
  const formant = (points: [number, number][], q: number, level: number, input: AudioNode) => {
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(points[0][1], t);
    points.slice(1).forEach(([k, f]) => bp.frequency.linearRampToValueAtTime(f, at(k)));
    const g = ac.createGain();
    g.gain.value = level;
    input.connect(bp).connect(g);
    return g;
  };
  const mix = ac.createGain();
  formant(
    [
      [0, 380],
      [0.12, 420],
      [0.35, 1050],
      [0.6, 980],
      [1, 520],
    ],
    6,
    3.2,
    voice,
  ).connect(mix);
  formant(
    [
      [0, 1900],
      [0.12, 2300],
      [0.35, 1650],
      [0.6, 1500],
      [1, 880],
    ],
    9,
    2.2,
    voice,
  ).connect(mix);
  formant(
    [
      [0, 2900],
      [0.35, 3100],
      [1, 2600],
    ],
    10,
    0.9,
    voice,
  ).connect(mix);

  // 氣音：一點點濾過的雜音
  const breath = ac.createBufferSource();
  breath.buffer = noiseBuf;
  const hiss = ac.createBiquadFilter();
  hiss.type = 'bandpass';
  hiss.frequency.value = 2600;
  hiss.Q.value = 0.8;
  const breathGain = ac.createGain();
  breathGain.gain.value = 0.05;
  breath.connect(hiss).connect(breathGain).connect(mix);

  // 開頭的 m：嘴巴閉著，聲音悶悶的，很快張開
  const lips = ac.createBiquadFilter();
  lips.type = 'lowpass';
  lips.frequency.setValueAtTime(520, t);
  lips.frequency.exponentialRampToValueAtTime(5200, at(0.14));
  lips.frequency.exponentialRampToValueAtTime(2400, end);

  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(0.16, at(0.06));
  amp.gain.linearRampToValueAtTime(0.34, at(0.3));
  amp.gain.linearRampToValueAtTime(0.28, at(0.62));
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  mix.connect(lips).connect(amp).connect(master!);

  voice.start(t);
  vibrato.start(t);
  breath.start(t, Math.random() * 0.4, dur + 0.05);
  voice.stop(end + 0.05);
  vibrato.stop(end + 0.05);
}

/** 廟貓不耐煩：哈氣 */
export function hiss() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  noiseHit(ac, t, 3200, 0.9, 0.22, 0.5);
  noiseHit(ac, t + 0.05, 5200, 1.4, 0.12, 0.42);
}

/** 貓頭鷹：咕、咕。pitch 越高越好奇；angry 是急促的三聲 */
export function owlHoot(pitch = 1, angry = false) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  const beats = angry ? [0, 0.14, 0.28] : [0, 0.32];
  beats.forEach((d, i) =>
    tone(ac, t + d, (i % 2 ? 360 : 420) * pitch, 0.22, angry ? 0.16 : 0.28, 'sine', (i % 2 ? 330 : 380) * pitch),
  );
}

/** 翅膀拍動：幾下輕輕的風聲 */
export function flutter(times = 4) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  for (let i = 0; i < times; i++) noiseHit(ac, t + i * 0.09, 700, 0.8, 0.08, 0.07);
}

/** 魔法：一串閃亮的上行音 */
export function sparkle() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  [0, 4, 7, 12, 16, 19].forEach((semi, i) => tone(ac, t + i * 0.06, 880 * 2 ** (semi / 12), 0.09, 0.6, 'sine'));
}

/** 一顆星亮起：清脆的一聲，step 越大越高 */
export function twinkle(step = 0) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  const f = 1046.5 * 2 ** (step / 12);
  tone(ac, t, f, 0.1, 0.9);
  tone(ac, t + 0.05, f * 1.5, 0.05, 0.7);
}

/** 解除：輕輕的一聲往下 */
export function fizzle() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  tone(ac, t, 880, 0.06, 0.3, 'sine', 520);
}

/** 碎裂：一聲脆響，碎片叮叮噹噹往下落（徽章碎成星光、魔法書消失） */
export function shatter() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  noiseHit(ac, t, 5200, 1.6, 0.12, 0.14);
  [0, 0.06, 0.13, 0.21, 0.3, 0.41].forEach((d, i) =>
    tone(ac, t + d, 2093 * 2 ** (-(i * 2.2 + Math.random()) / 12), 0.07 - i * 0.008, 0.55, 'sine'),
  );
}

/** 一群人小跑步散開：一陣細碎的腳步 */
export function scurry(steps = 9) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  for (let i = 0; i < steps; i++) {
    noiseHit(ac, t + i * 0.05 + Math.random() * 0.025, 420 + Math.random() * 520, 1.4, 0.09 - i * 0.006, 0.05);
  }
}

/** 報馬仔敲鑼：一聲低沉的銅鑼，尾音長長地嗡 */
export function gong() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  [1, 1.48, 2.02, 2.74, 3.6].forEach((m, i) =>
    tone(ac, t, 196 * m, 0.16 / (i + 1), 1.8 - i * 0.25, 'sine', 196 * m * 0.985),
  );
  noiseHit(ac, t, 1200, 1.5, 0.12, 0.12);
}

/** 釘子彈飛：一聲清脆的金屬響 */
export function ping() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  tone(ac, t, 2350, 0.12, 0.35, 'triangle', 2100);
  tone(ac, t, 3520, 0.05, 0.22, 'sine');
  noiseHit(ac, t, 6000, 3, 0.08, 0.03);
}

/** 化成星塵：一串細碎的高音一路往下飄，底下一陣風聲 */
export function dissolve(duration = 1) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const at = t + (i / n) * duration * 0.85;
    tone(ac, at, 2637 * 2 ** (-(i * 1.6 + Math.random() * 1.5) / 12), 0.05 * (1 - i / (n + 2)), 0.45, 'sine');
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(3800, t);
  bp.frequency.exponentialRampToValueAtTime(900, t + duration);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.07, t + duration * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(bp).connect(g).connect(master!);
  src.start(t, Math.random() * 0.3, duration + 0.05);
}

/** 重物落地：木頭、木板倒下的一聲悶響 */
export function thud() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  tone(ac, t, 110, 0.5, 0.35, 'sine', 55);
  noiseHit(ac, t, 260, 0.9, 0.3, 0.22);
  noiseHit(ac, t + 0.012, 1400, 2.5, 0.1, 0.08);
}

/** 翻書頁 */
export function flip() {
  paper(0.12);
}

/** 叩門環：兩下金屬敲擊（密語錯誤） */
export function knock() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  [0, 0.16].forEach((d) => {
    tone(ac, t + d, 330, 0.25, 0.25, 'triangle', 300);
    noiseHit(ac, t + d, 1400, 3, 0.12, 0.06);
  });
}

/** 起駕的鞭炮：一串劈哩啪啦，每幾聲夾一下比較響的「砰」 */
export function crackers(pops = 14) {
  const ac = audio();
  if (!ac) return;
  let t = ac.currentTime + 0.01;
  for (let i = 0; i < pops; i++) {
    const loud = i % 4 === 0;
    noiseHit(ac, t, 1800 + Math.random() * 2600, 0.7, loud ? 0.34 : 0.2, loud ? 0.09 : 0.05);
    if (loud) tone(ac, t, 150, 0.14, 0.14, 'sine', 70);
    t += 0.04 + Math.random() * 0.07;
  }
}

/** 掃帚咻地飛走：一陣往上掃的風聲，尾巴帶幾聲星光 */
export function whoosh() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(360, t);
  bp.frequency.exponentialRampToValueAtTime(2800, t + 0.6);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.24, t + 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
  src.connect(bp).connect(g).connect(master!);
  src.start(t, Math.random() * 0.3, 0.85);
  [0, 5, 9, 12].forEach((semi, i) => tone(ac, t + 0.42 + i * 0.07, 1318.5 * 2 ** (semi / 12), 0.06, 0.5));
}
