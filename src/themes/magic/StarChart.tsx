'use client';

import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { INK, fx } from '@/art/ink';
import { sparkle, twinkle } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
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
export function StarChart({ top, unit, revealKey, onOpen }: PodiumProps) {
  const root = useRef<HTMLElement>(null);
  const narrow = useMedia('(max-width: 640px)');
  const spots = narrow ? SPOTS.narrow : SPOTS.wide;
  const [c1, c2, c3] = spots;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    const order = [2, 1, 0].filter((i) => i < top.length);
    const tl = gsap.timeline();
    tl.fromTo(el, { '--lit': 0 }, { '--lit': 1, duration: 0.9, ease: 'power1.out' })
      .fromTo(
        q('.sky__orbit'),
        { opacity: 0, scale: 0.86 },
        { opacity: 1, scale: 1, duration: 1.1, stagger: 0.12, ease: 'power2.out', svgOrigin: `${c1[0]} ${c1[1]}` },
        0,
      )
      .fromTo(q('.sky__vacant'), { opacity: 0 }, { opacity: 1, duration: 0.6, clearProps: 'opacity' }, 0.2);
    order.forEach((i, k) => {
      const at = 0.45 + k * 0.5;
      tl.fromTo(
        q(`[data-rank="${i}"] .sky__body`),
        { scale: 0, rotate: -140, opacity: 0 },
        {
          scale: 1,
          rotate: 0,
          opacity: 1,
          duration: 0.75,
          ease: 'back.out(2)',
          clearProps: 'opacity,transform',
          onStart: () => (i === 0 ? sparkle() : twinkle(k * 5)),
        },
        at,
      )
        .fromTo(
          q(`[data-rank="${i}"] .sky__flare`),
          { opacity: 0.95, scale: 0.4 },
          { opacity: 0, scale: 2.4, duration: 0.8, ease: 'power2.out', clearProps: 'all' },
          at + 0.12,
        )
        // 只清掉動畫用到的屬性：店名的字級是寫在 style 上的
        .fromTo(
          q(`[data-rank="${i}"] .sky__label > *`),
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: 'power2.out', clearProps: 'opacity,transform' },
          at + 0.25,
        );
    });
    tl.fromTo(q('.sky__link'), { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power1.inOut' }, '>-0.2');
    return () => void tl.kill();
    // 第一次進來、換排序、星星數量改變時才重新揭曉
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey, top.length]);

  const linked = [top[1] ? c2 : null, top[0] ? c1 : null, top[2] ? c3 : null].filter(Boolean) as (typeof c1)[];

  return (
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
              <button type="button" className="podium__open" onClick={() => onOpen(x.r)} aria-label={`看${x.r.name}`} />
            )}
          </article>
        );
      })}
    </section>
  );
}
