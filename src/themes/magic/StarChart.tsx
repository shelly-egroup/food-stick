'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import { INK, fx } from '@/art/ink';
import { flip, sparkle, twinkle } from '@/lib/sound';
import { playAfterGate, reducedMotion } from '@/lib/motion';
import { useMedia } from '@/lib/useBrowser';
import type { PodiumProps } from '../types';
import { copy } from './copy';
import './StarChart.css';

/** 金星、銀星、銅星的顏色與大小 */
const BODIES = [
  { fill: '#f7c64a', core: '#fff3c4', glow: 'rgba(247, 198, 74, 0.55)', size: 76 },
  { fill: '#dde4f6', core: '#ffffff', glow: 'rgba(196, 210, 255, 0.5)', size: 60 },
  { fill: '#ee9d5e', core: '#ffe0c4', glow: 'rgba(238, 157, 94, 0.5)', size: 56 },
];

/** 三顆星在星盤上的位置（百分比）：電腦橫著排，手機由上往下錯開 */
const SPOTS = {
  wide: [
    [50, 24],
    [19, 57],
    [81, 62],
  ],
  narrow: [
    [50, 13],
    [29, 46],
    [71, 73],
  ],
} as const;

/** 背景的星塵：固定位置 */
const DUST = Array.from({ length: 70 }, (_, i) => {
  const a = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  const b = Math.abs(Math.sin(i * 78.233 + 1.7) * 24634.6345) % 1;
  return { x: fx(a * 200), y: fx(b * 100), r: i % 9 === 0 ? 0.75 : i % 4 === 0 ? 0.5 : 0.32, tw: i % 5 === 0 };
});

/** 八芒星：外圈 R、內圈 r */
function starPath(R: number, r: number) {
  return (
    Array.from({ length: 16 }, (_, k) => {
      const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
      const d = k % 2 ? r : R * (k % 4 === 0 ? 1 : 0.78);
      return `${k ? 'L' : 'M'}${fx(Math.cos(a) * d)} ${fx(Math.sin(a) * d)}`;
    }).join(' ') + ' Z'
  );
}

/** 依名字長度決定字級：名字越長字越小，最多兩行 */
function nameSize(name: string, first: boolean) {
  const n = [...name].length;
  const base = n <= 4 ? 30 : n <= 6 ? 26 : n <= 9 ? 22 : 19;
  return first ? Math.round(base * 1.12) : base;
}

/**
 * 星盤：一片夜空，前三名是三顆亮星，用星座的線連起來；金星在最上面，外圈是慢慢轉的星軌。
 * 揭曉時由銅星往金星一顆一顆點亮。
 */
type Skin = 'cobalt' | 'nebula';

/** 用店家 id 加上這次進來的隨機種子，決定每顆行星怎麼動：有的轉、有的飄、有的帶著小衛星，有的會閃 */
const hash = (str: string) => {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
};
const PLANET_FX = ['spin', 'bob', 'sway', 'orbit', 'twinkle', 'flare'] as const;
type PlanetFx = (typeof PLANET_FX)[number];
const pickSeed = () => Math.random().toString(36).slice(2, 8);
/** 星等表背景另外撒一些會閃、會飄的小星星，還有偶爾劃過的流星 */
const makeSparks = () =>
  Array.from({ length: 16 }, () => {
    const r = Math.random();
    return {
      x: fx(2 + Math.random() * 96),
      y: fx(4 + Math.random() * 92),
      big: Math.random() < 0.3,
      kind: r < 0.55 ? 'tw' : r < 0.85 ? 'drift' : 'pulse',
      d: fx(2.2 + Math.random() * 3.6),
      dl: fx(-Math.random() * 6),
    };
  });
const makeShoot = () => ({ y: fx(10 + Math.random() * 50), d: fx(7 + Math.random() * 6), dl: fx(Math.random() * 5) });
const pickSkin = (): Skin => (Math.random() < 0.5 ? 'cobalt' : 'nebula');

type Move =
  | 'charge'
  | 'stomp'
  | 'twins'
  | 'scuttle'
  | 'roar'
  | 'sway'
  | 'balance'
  | 'sting'
  | 'arrow'
  | 'climb'
  | 'pour'
  | 'swim';

interface Zodiac {
  name: string;
  latin: string;
  move: Move;
  stars: [number, number][];
  lines: [number, number][];
}

/** 十二星座：簡化成認得出來的連線，座標在 100×70 的框裡 */
const ZODIAC: Zodiac[] = [
  {
    name: '牡羊座',
    latin: 'Aries',
    move: 'charge',
    stars: [
      [10, 34],
      [40, 24],
      [62, 30],
      [80, 42],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  {
    name: '金牛座',
    latin: 'Taurus',
    move: 'stomp',
    stars: [
      [50, 44],
      [42, 34],
      [34, 26],
      [58, 34],
      [64, 26],
      [16, 10],
      [88, 12],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [0, 3],
      [3, 4],
      [2, 5],
      [4, 6],
    ],
  },
  {
    name: '雙子座',
    latin: 'Gemini',
    move: 'twins',
    stars: [
      [22, 8],
      [26, 28],
      [30, 48],
      [24, 64],
      [56, 6],
      [60, 26],
      [64, 46],
      [70, 62],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [4, 5],
      [5, 6],
      [6, 7],
      [1, 5],
    ],
  },
  {
    name: '巨蟹座',
    latin: 'Cancer',
    move: 'scuttle',
    stars: [
      [50, 34],
      [50, 8],
      [26, 58],
      [76, 60],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  },
  {
    name: '獅子座',
    latin: 'Leo',
    move: 'roar',
    stars: [
      [18, 42],
      [24, 26],
      [36, 16],
      [50, 22],
      [48, 34],
      [40, 42],
      [70, 46],
      [86, 58],
      [62, 60],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 5],
    ],
  },
  {
    name: '處女座',
    latin: 'Virgo',
    move: 'sway',
    stars: [
      [10, 20],
      [28, 26],
      [44, 30],
      [60, 34],
      [74, 20],
      [62, 54],
      [82, 58],
      [44, 56],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [3, 5],
      [5, 6],
      [2, 7],
    ],
  },
  {
    name: '天秤座',
    latin: 'Libra',
    move: 'balance',
    stars: [
      [50, 8],
      [26, 32],
      [74, 32],
      [22, 58],
      [78, 58],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [1, 2],
      [1, 3],
      [2, 4],
    ],
  },
  {
    name: '天蠍座',
    latin: 'Scorpius',
    move: 'sting',
    stars: [
      [82, 8],
      [72, 18],
      [62, 22],
      [52, 30],
      [46, 42],
      [44, 54],
      [50, 64],
      [62, 66],
      [70, 58],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
    ],
  },
  {
    name: '射手座',
    latin: 'Sagittarius',
    move: 'arrow',
    stars: [
      [20, 42],
      [34, 28],
      [50, 30],
      [62, 18],
      [72, 34],
      [60, 52],
      [40, 54],
      [88, 26],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 0],
      [2, 5],
      [4, 7],
    ],
  },
  {
    name: '摩羯座',
    latin: 'Capricornus',
    move: 'climb',
    stars: [
      [10, 22],
      [30, 32],
      [50, 52],
      [70, 48],
      [88, 24],
      [60, 30],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
    ],
  },
  {
    name: '水瓶座',
    latin: 'Aquarius',
    move: 'pour',
    stars: [
      [10, 30],
      [24, 22],
      [38, 32],
      [52, 24],
      [66, 34],
      [80, 26],
      [62, 50],
      [72, 60],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [4, 6],
      [6, 7],
    ],
  },
  {
    name: '雙魚座',
    latin: 'Pisces',
    move: 'swim',
    stars: [
      [50, 64],
      [32, 46],
      [16, 28],
      [22, 12],
      [66, 48],
      [80, 32],
      [90, 22],
      [84, 12],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [0, 4],
      [4, 5],
      [5, 6],
      [6, 7],
    ],
  },
];
/**
 * 星座可以待的區域：避開三顆星和它們的名字。每次進來隨機挑一區，
 * 再在區域裡隨機偏移、隨機大小、微微傾斜，所以每次位置都不一樣。up：名字改浮在星座上方
 */
type Zone = { x: [number, number]; y: [number, number]; w: [number, number]; up?: boolean };
const ZONES: Record<'wide' | 'narrow', Zone[]> = {
  wide: [
    { x: [2, 9], y: [4, 13], w: [17, 23] },
    { x: [70, 77], y: [4, 15], w: [17, 22] },
    { x: [33, 46], y: [60, 66], w: [15, 19], up: true },
  ],
  narrow: [
    { x: [3, 8], y: [2, 5], w: [23, 28] },
    { x: [61, 66], y: [35, 43], w: [29, 34] },
    { x: [4, 12], y: [76, 81], w: [29, 34], up: true },
  ],
};
const lerp = ([lo, hi]: [number, number], t: number) => fx(lo + (hi - lo) * t);
const pickZodiac = () => Math.floor(Math.random() * ZODIAC.length);
const pickPlace = () => ({ z: Math.random(), x: Math.random(), y: Math.random(), w: Math.random(), r: Math.random() });
/** 換下一個星座時也搬家：挑一個跟現在不同的區域 */
const movePlace = (prev: ReturnType<typeof pickPlace>, n: number) => {
  const cur = Math.floor(prev.z * n);
  const k = (cur + 1 + Math.floor(Math.random() * (n - 1))) % n;
  return { ...pickPlace(), z: (k + Math.random()) / n };
};

const NS = 'http://www.w3.org/2000/svg';
function spawn(svg: SVGSVGElement, tag: string, attrs: Record<string, string>) {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  svg.appendChild(el);
  return el;
}

/** 每個星座自己的小動作 */
function perform(z: Zodiac, svg: SVGSVGElement, tl: gsap.core.Timeline) {
  const q = gsap.utils.selector(svg);
  const fig = q('.const__fig');
  const stars = q('.const__star');
  const at = 0.9;
  const [cx, cy] = z.stars[0];
  switch (z.move) {
    case 'charge':
      tl.to(fig, { keyframes: { x: [0, -4, 9, 0, -3, 9, 0] }, duration: 1, ease: 'power2.inOut' }, at);
      break;
    case 'stomp':
      tl.to(fig, { keyframes: { y: [0, -3, 2, -2, 1, 0], x: [0, 2, -2, 1, 0, 0] }, duration: 0.8 }, at).to(
        stars[0],
        { fill: '#ff7a5a', scale: 2, duration: 0.25, yoyo: true, repeat: 3, transformOrigin: '50% 50%' },
        at,
      );
      break;
    case 'twins':
      tl.to(
        stars.slice(0, 4),
        { scale: 2, duration: 0.2, yoyo: true, repeat: 1, stagger: 0.08, transformOrigin: '50% 50%' },
        at,
      ).to(
        stars.slice(4),
        { scale: 2, duration: 0.2, yoyo: true, repeat: 1, stagger: 0.08, transformOrigin: '50% 50%' },
        at + 0.1,
      );
      break;
    case 'scuttle':
      tl.to(fig, { keyframes: { x: [0, -10, 10, -8, 8, 0] }, duration: 1.1, ease: 'steps(10)' }, at);
      break;
    case 'roar': {
      tl.to(fig, { scale: 1.18, duration: 0.18, yoyo: true, repeat: 3, svgOrigin: '50 35' }, at);
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const ln = spawn(svg, 'line', {
          x1: String(36 + Math.cos(ang) * 14),
          y1: String(28 + Math.sin(ang) * 14),
          x2: String(36 + Math.cos(ang) * 22),
          y2: String(28 + Math.sin(ang) * 22),
          stroke: '#f2d98a',
          'stroke-width': '1',
          'stroke-linecap': 'round',
        });
        tl.fromTo(
          ln,
          { opacity: 1, scale: 0.4, svgOrigin: '36 28' },
          { opacity: 0, scale: 1.8, duration: 0.7, onComplete: () => ln.remove() },
          at,
        );
      }
      break;
    }
    case 'sway':
      tl.to(
        fig,
        { keyframes: { rotate: [0, -6, 5, -3, 2, 0] }, duration: 1.6, ease: 'sine.inOut', svgOrigin: '44 60' },
        at,
      );
      for (let k = 0; k < 6; k++) {
        const d = spawn(svg, 'circle', { cx: String(20 + k * 12), cy: '20', r: '0.9', fill: '#f2d98a' });
        tl.fromTo(
          d,
          { y: 0, opacity: 1 },
          { y: 40, opacity: 0, duration: 1.4, ease: 'power1.in', onComplete: () => d.remove() },
          at + k * 0.1,
        );
      }
      break;
    case 'balance':
      tl.to(
        fig,
        { keyframes: { rotate: [0, -10, 8, -5, 3, 0] }, duration: 1.8, ease: 'sine.out', svgOrigin: '50 8' },
        at,
      );
      break;
    case 'sting':
      tl.to(stars.slice(-3), { x: -6, y: -8, duration: 0.18, yoyo: true, repeat: 3, stagger: 0.04 }, at).to(
        stars[stars.length - 1],
        { scale: 2.4, fill: '#ff7a5a', duration: 0.2, yoyo: true, repeat: 1, transformOrigin: '50% 50%' },
        at + 0.5,
      );
      break;
    case 'arrow': {
      const [ax, ay] = z.stars[7];
      const arrow = spawn(svg, 'line', {
        x1: String(ax - 6),
        y1: String(ay + 3),
        x2: String(ax),
        y2: String(ay),
        stroke: '#fff6d6',
        'stroke-width': '1.4',
        'stroke-linecap': 'round',
      });
      tl.fromTo(
        arrow,
        { x: 0, y: 0, opacity: 1 },
        { x: 60, y: -26, opacity: 0, duration: 0.7, ease: 'power2.in', onComplete: () => arrow.remove() },
        at,
      ).to(fig, { x: -3, duration: 0.1, yoyo: true, repeat: 1 }, at);
      break;
    }
    case 'climb':
      tl.to(fig, { keyframes: { y: [0, -4, -4, -8, -8, -12, 0] }, duration: 1.4, ease: 'steps(7)' }, at);
      break;
    case 'pour':
      for (let k = 0; k < 7; k++) {
        const d = spawn(svg, 'ellipse', {
          cx: String(z.stars[7][0] + (k % 3) - 1),
          cy: String(z.stars[7][1]),
          rx: '0.9',
          ry: '1.4',
          fill: '#9fc4ff',
        });
        tl.fromTo(
          d,
          { y: 0, opacity: 1 },
          { y: 18 + k * 2, opacity: 0, duration: 0.8, ease: 'power2.in', onComplete: () => d.remove() },
          at + k * 0.12,
        );
      }
      tl.to(fig, { rotate: 6, duration: 0.4, yoyo: true, repeat: 1, svgOrigin: '66 34' }, at);
      break;
    case 'swim':
      tl.to(stars, { y: -4, duration: 0.25, yoyo: true, repeat: 3, stagger: 0.07, ease: 'sine.inOut' }, at).to(
        fig,
        { x: 4, duration: 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut' },
        at,
      );
      break;
  }
  void cx;
  void cy;
}

function Constellation({ narrow }: { narrow: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [idx, setIdx] = useState(pickZodiac);
  const [place, setPlace] = useState(pickPlace);
  const zones = ZONES[narrow ? 'narrow' : 'wide'];
  const zone = zones[Math.floor(place.z * zones.length)];
  const played = useRef(false);
  const showName = (on: boolean) => ref.current?.classList.toggle('is-named', on);
  const busy = useRef(false);
  const z = ZODIAC[idx];

  const tap = () => {
    const el = ref.current;
    const svg = el?.querySelector('svg');
    if (!el || !svg || busy.current) return;
    if (played.current) {
      played.current = false;
      showName(false);
      const next = () => {
        setIdx((i) => (i + 1) % ZODIAC.length);
        setPlace((p) => movePlace(p, zones.length));
      };
      if (reducedMotion()) return next();
      busy.current = true;
      flip();
      gsap.to(svg, {
        opacity: 0,
        scale: 0.7,
        duration: 0.25,
        transformOrigin: '50% 50%',
        onComplete: () => {
          next();
          gsap.fromTo(
            svg,
            { opacity: 0, scale: 0.7 },
            {
              opacity: 1,
              scale: 1,
              duration: 0.45,
              ease: 'back.out(2)',
              onComplete: () => void (busy.current = false),
            },
          );
        },
      });
      return;
    }
    played.current = true;
    showName(true);
    if (reducedMotion()) return;
    busy.current = true;
    const q = gsap.utils.selector(svg);
    const tl = gsap.timeline({ onComplete: () => void (busy.current = false) });
    tl.fromTo(
      q('.const__line'),
      { strokeDashoffset: 60 },
      { strokeDashoffset: 0, duration: 0.45, stagger: 0.08, ease: 'power1.inOut' },
      0,
    );
    q('.const__star').forEach((s, i) => {
      tl.fromTo(
        s,
        { scale: 1 },
        {
          scale: 2.2,
          duration: 0.16,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
          transformOrigin: '50% 50%',
          onStart: () => twinkle(i * 2),
        },
        i * 0.1,
      );
    });
    perform(z, svg, tl);
  };

  const button = (
    <button
      ref={ref}
      type="button"
      className={`sky__const${zone.up ? ' is-up' : ''}`}
      style={
        {
          left: `${lerp(zone.x, place.x)}%`,
          top: `${lerp(zone.y, place.y)}%`,
          width: `${lerp(zone.w, place.w)}%`,
          '--tilt': `${fx((place.r - 0.5) * 18)}deg`,
        } as CSSProperties
      }
      onClick={tap}
      aria-label={`${z.name}：點一下讓它動起來，再點一下換下一個星座`}
    >
      <svg viewBox="0 0 100 70" aria-hidden="true">
        <g className="const__fig" key={idx}>
          {z.lines.map(([p, q2], i) => (
            <line
              key={i}
              className="const__line"
              x1={z.stars[p][0]}
              y1={z.stars[p][1]}
              x2={z.stars[q2][0]}
              y2={z.stars[q2][1]}
              pathLength={60}
              strokeDasharray="60"
            />
          ))}
          {z.stars.map(([x, y], i) => (
            <path
              key={i}
              className="const__star"
              style={{ animationDelay: `${i * 0.4}s` }}
              d={`M${x} ${y - 3.2} L${x + 1} ${y - 1} L${x + 3.2} ${y} L${x + 1} ${y + 1} L${x} ${y + 3.2} L${x - 1} ${y + 1} L${x - 3.2} ${y} L${x - 1} ${y - 1} Z`}
            />
          ))}
        </g>
      </svg>
      <span className="const__name">
        {z.name}
        <em>{z.latin}</em>
      </span>
    </button>
  );
  return button;
}

/** 星等表上的七顆行星：水星、金星、地球、火星、木星、土星、海王星 */
function Planet({ k }: { k: number }) {
  const ink = { stroke: INK, strokeWidth: 1.3 };
  switch (k % 7) {
    case 0:
      return (
        <g>
          <circle r="8" fill="#b9b2a6" {...ink} />
          <circle cx="-3" cy="-2" r="1.8" fill="#968e80" />
          <circle cx="2.6" cy="3" r="1.3" fill="#968e80" />
          <circle cx="3" cy="-3.4" r="0.9" fill="#968e80" />
        </g>
      );
    case 1:
      return (
        <g>
          <circle r="8.5" fill="#efc96a" {...ink} />
          <path d="M-7 -1 q4 -3 8 0 t6 -1 M-6 3.5 q4 -2 7 0 t5 -1" fill="none" stroke="#c9952f" strokeWidth="1.1" />
        </g>
      );
    case 2:
      return (
        <g>
          <circle r="9" fill="#3a68ad" {...ink} />
          <path
            d="M-5 -6 c3 0 4 2 3 4 c-1 2 -4 1 -5 3 c-1 -2 -1 -5 2 -7 Z M2 1 c3 -1 5 1 4 4 c-2 2 -4 1 -5 -1 Z"
            fill="#2e9c83"
          />
          <path d="M-4 -7.4 a8.4 8.4 0 0 1 6 -0.8" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      );
    case 3:
      return (
        <g>
          <circle r="7.5" fill="#c8432a" {...ink} />
          <circle cx="-2.4" cy="-1.6" r="1.6" fill="#8f2c1c" />
          <circle cx="2.6" cy="2.2" r="1.1" fill="#8f2c1c" />
          <path d="M-3 -6.6 h6" stroke="#fff3d0" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );
    case 4:
      return (
        <g>
          <circle r="10" fill="#efe0c4" {...ink} />
          <path d="M-9.4 -4 H9.4 M-10 1 H10 M-8.6 5.4 H8.6" stroke="#c88f55" strokeWidth="2" />
          <ellipse cx="3" cy="3.2" rx="2.4" ry="1.4" fill="#c8432a" />
          <circle r="10" fill="none" {...ink} />
        </g>
      );
    case 5:
      return (
        <g>
          <path
            d="M-14 3 C -14 -1, 14 -5, 14 -1"
            fill="none"
            stroke="#b39b63"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle r="7.5" fill="#e2c27a" {...ink} />
          <path d="M-6.6 -2 H6.6" stroke="#c39a4a" strokeWidth="1.2" />
          <path d="M-14 3 C -14 6, 14 2, 14 -1" fill="none" stroke={INK} strokeWidth="1.1" />
          <path d="M-14 3 C -14 6, 14 2, 14 -1" fill="none" stroke="#e2c27a" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    default:
      return (
        <g>
          <circle r="8.5" fill="#5f8fd8" {...ink} />
          <path d="M-7 2 q7 3 14 0" fill="none" stroke="#3a68ad" strokeWidth="1.4" />
          <circle cx="-3" cy="-3" r="2.2" fill="#c9dcff" opacity="0.8" />
        </g>
      );
  }
}

export function StarChart({ top, rest = [], unit, revealKey, onOpen }: PodiumProps) {
  const ledger = useRef<HTMLOListElement>(null);
  const [skin] = useState(pickSkin);
  const [seed] = useState(pickSeed);
  const [sparks] = useState(makeSparks);
  const [shoot] = useState(makeShoot);
  const maxVal = Math.max(1, ...top.map((t) => t.value), ...rest.map((t) => t.value));
  const root = useRef<HTMLElement>(null);
  const narrow = useMedia('(max-width: 640px)');
  const spots = narrow ? SPOTS.narrow : SPOTS.wide;
  const [c1, c2, c3] = spots;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    const order = [2, 1, 0].filter((i) => i < top.length);
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(el, { '--lit': 0 }, { '--lit': 1, duration: 0.7, ease: 'power1.out' })
      .fromTo(
        q('.sky__orbit'),
        { opacity: 0, scale: 0.86 },
        { opacity: 1, scale: 1, duration: 0.9, stagger: 0.1, ease: 'power2.out', svgOrigin: `${c1[0]} ${c1[1]}` },
        0,
      )
      .fromTo(q('.sky__vacant'), { opacity: 0 }, { opacity: 1, duration: 0.6, clearProps: 'opacity' }, 0.2);
    order.forEach((i, k) => {
      const at = 0.3 + k * 0.38;
      tl.fromTo(
        q(`[data-rank="${i}"] .sky__body`),
        { scale: 0, rotate: -140, opacity: 0 },
        {
          scale: 1,
          rotate: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'back.out(2)',
          clearProps: 'opacity,transform',
          onStart: () => (i === 0 ? sparkle() : twinkle(k * 5)),
        },
        at,
      )
        .fromTo(
          q(`[data-rank="${i}"] .sky__flare`),
          { opacity: 0.95, scale: 0.4 },
          { opacity: 0, scale: 2.4, duration: 0.65, ease: 'power2.out', clearProps: 'all' },
          at + 0.1,
        )
        // 只清掉動畫用到的屬性：店名的字級是寫在 style 上的
        .fromTo(
          q(`[data-rank="${i}"] .sky__label > *`),
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.36, stagger: 0.05, ease: 'power2.out', clearProps: 'opacity,transform' },
          at + 0.18,
        );
    });
    tl.fromTo(q('.sky__link'), { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, '>-0.2');
    // 名次列表不等星盤演完，一進來就出現
    const rows = ledger.current?.querySelectorAll('.ledger__row');
    if (rows?.length)
      tl.fromTo(
        rows,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out', clearProps: 'all' },
        0,
      ).fromTo(
        ledger.current!.querySelectorAll('.ledger__star'),
        { scale: 0, rotate: -90 },
        {
          scale: 1,
          rotate: 0,
          duration: 0.45,
          stagger: 0.04,
          ease: 'back.out(2.6)',
          clearProps: 'transform',
          onStart: () => twinkle(3),
        },
        0.1,
      );
    const cancel = playAfterGate(tl);
    return () => {
      cancel();
      tl.kill();
    };
    // 第一次進來、換排序、星星數量改變時才重新揭曉
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey, top.length]);

  const linked = [top[1] ? c2 : null, top[0] ? c1 : null, top[2] ? c3 : null].filter(Boolean) as (typeof c1)[];

  return (
    <div className={`starchart starchart--${skin}`}>
      <section ref={root} className="sky" aria-label="前三名">
        {/* 星塵：等比例縮放、裁掉多的部分 */}
        <svg className="sky__dust" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {DUST.map((d, i) => (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill="#fff"
              className={d.tw ? 'sky__twinkle' : undefined}
              style={d.tw ? ({ animationDelay: `${(i % 7) * 0.45}s` } as CSSProperties) : undefined}
            />
          ))}
        </svg>
        <Constellation narrow={narrow} />
        {/* 星軌與星座線：跟著星盤拉伸，線寬不變 */}
        <svg className="sky__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[16, 30, 46].map((rx, k) => (
            <ellipse
              key={rx}
              className="sky__orbit"
              cx={c1[0]}
              cy={c1[1]}
              rx={rx}
              ry={rx * (narrow ? 0.55 : 1.05)}
              fill="none"
              stroke="#f2b940"
              strokeOpacity={0.32 - k * 0.07}
              strokeWidth="1"
              strokeDasharray={k === 1 ? '2 6' : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {linked.length > 1 && (
            <polyline
              className="sky__link"
              points={linked.map((p) => p.join(',')).join(' ')}
              fill="none"
              stroke="#f2b940"
              strokeWidth="1.6"
              strokeDasharray="1 7"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {[0, 1, 2].map((i) => {
          const x = top[i];
          const [px, py] = spots[i];
          const body = BODIES[i];
          const style = {
            '--x': `${px}%`,
            '--y': `${py}%`,
            '--s': `${body.size}px`,
            '--fill': body.fill,
            '--glow': body.glow,
          } as CSSProperties;
          if (!x)
            return (
              <div key={`vacant-${i}`} className={`sky__star sky__star--${i + 1} sky__vacant`} style={style}>
                <span className="sky__body" aria-hidden="true" />
                <span className="sky__label">
                  <span className="sky__title">{copy.ranks.podium[i]}</span>
                  <span className="sky__empty">{copy.ranks.vacant}</span>
                </span>
              </div>
            );
          return (
            <article key={x.r.id} className={`sky__star sky__star--${i + 1}`} style={style} data-rank={i}>
              <span className="sky__body" aria-hidden="true">
                <span className="sky__flare" />
                <svg viewBox="-50 -50 100 100">
                  <path d={starPath(48, 17)} fill="var(--fill)" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
                  <circle r="15" fill={body.core} stroke={INK} strokeWidth="2.2" />
                  <circle r="6" cx="-4" cy="-4" fill="#fff" opacity="0.9" />
                </svg>
              </span>
              <span className="sky__label">
                <span className="sky__title">
                  {copy.ranks.podium[i]}
                  {i === 0 && <em>{copy.ranks.crown}</em>}
                </span>
                <h3 className="sky__name" style={{ fontSize: nameSize(x.r.name, i === 0) }}>
                  {x.r.name}
                </h3>
                <span className="sky__stat">
                  <b>{x.value}</b>
                  {unit}
                </span>
              </span>
              {onOpen && (
                <button
                  type="button"
                  className="podium__open"
                  onClick={() => onOpen(x.r)}
                  aria-label={`看${x.r.name}`}
                />
              )}
            </article>
          );
        })}
      </section>
      {rest.length > 0 && (
        <ol ref={ledger} className="ledger" start={4}>
          <li className="ledger__sky" aria-hidden="true">
            {sparks.map((p, i) => (
              <span
                key={i}
                className={`ledger__spark ledger__spark--${p.kind}${p.big ? ' is-big' : ''}`}
                style={{ left: `${p.x}%`, top: `${p.y}%`, '--d': `${p.d}s`, '--dl': `${p.dl}s` } as CSSProperties}
              />
            ))}
            <span
              className="ledger__shoot"
              style={{ top: `${shoot.y}%`, '--d': `${shoot.d}s`, '--dl': `${shoot.dl}s` } as CSSProperties}
            />
          </li>
          {rest.map((x, k) => {
            const mag = 0.72 + (x.value / maxVal) * 0.28;
            const pfx: PlanetFx = PLANET_FX[Math.floor(hash(x.r.id + seed) * PLANET_FX.length)];
            const d = fx(2.4 + hash(seed + x.r.id) * 2.6);
            const timing = { '--d': `${d}s`, '--dl': `${fx(-hash(x.r.id + 'dl' + seed) * d * 2)}s` } as CSSProperties;
            const flashy = pfx === 'twinkle' || pfx === 'flare';
            return (
              <li key={x.r.id} className="ledger__row">
                <button
                  type="button"
                  className="ledger__hit"
                  onClick={() => onOpen?.(x.r)}
                  aria-label={`看${x.r.name}`}
                >
                  <span className="ledger__no">{copy.ranks.no(k + 4)}</span>
                  <svg
                    className={`ledger__star${flashy ? ` ledger__star--${pfx}` : ''}`}
                    viewBox="-15 -12 30 24"
                    aria-hidden="true"
                    style={{ scale: String(mag), ...timing }}
                  >
                    <g className={flashy ? undefined : `ledger__fx ledger__fx--${pfx}`}>
                      <Planet k={k} />
                    </g>
                    {pfx === 'orbit' && (
                      <g className="ledger__orbit-x">
                        <g className="ledger__orbit-y">
                          <circle className="ledger__moon" r="2.2" fill="#f6e7b8" stroke={INK} strokeWidth="0.9" />
                        </g>
                      </g>
                    )}
                    {flashy && (
                      <path
                        className="ledger__glint"
                        d="M9 -13 L10 -9.5 L13.5 -8.5 L10 -7.5 L9 -4 L8 -7.5 L4.5 -8.5 L8 -9.5 Z"
                        fill="#fff6d6"
                        stroke={INK}
                        strokeWidth="0.6"
                      />
                    )}
                  </svg>
                  <span className="ledger__name">{x.r.name}</span>
                  <span className="ledger__val">
                    <b>{x.value}</b>
                    {unit}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
