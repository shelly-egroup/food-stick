'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef, type SVGProps } from 'react';
import gsap from 'gsap';
import { buzz, clack, rattle } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
import { INK, fx } from '@/art/ink';
import './Tube.css';

export const MAX_STICKS = 18;

const STICKS = Array.from({ length: MAX_STICKS }, (_, i) => {
  const t = i / (MAX_STICKS - 1);
  const angle = fx(-14 + t * 28 + Math.sin(i * 7.3) * 1.5);
  const top = fx(56 + Math.abs(t - 0.5) * 66 + ((i * 37) % 23));
  return { i, angle, top, tone: i % 3 };
});
const ORDER = [...STICKS].sort((a, b) => Math.abs(a.angle) - Math.abs(b.angle)).map((s) => s.i);

/** 筒口橢圓 cx160 cy176 rx92 ry20、筒底橢圓 cx160 cy412 rx84 ry18 */
const mouthY = (x: number) => 176 + 20 * Math.sqrt(Math.max(0, 1 - ((x - 160) / 92) ** 2));
const footY = (x: number) => 412 + 18 * Math.sqrt(Math.max(0, 1 - ((x - 160) / 84) ** 2));

const BODY = 'M68 176 A92 20 0 0 0 252 176 L244 412 A84 18 0 0 1 76 412 Z';
const SHADE = `M198 ${mouthY(198).toFixed(1)} C 202 270, 202 350, 198 ${footY(198).toFixed(1)} A84 18 0 0 0 244 412 L252 176 A92 20 0 0 1 198 ${mouthY(198).toFixed(1)} Z`;
const LIGHT = `M100 ${mouthY(100).toFixed(1)} C 98 270, 98 350, 102 ${footY(102).toFixed(1)} L 112 ${footY(112).toFixed(1)} C 108 350, 108 270, 110 ${mouthY(110).toFixed(1)} Z`;
const band = (y: number, h: number, rTop: number, rBot: number) =>
  `M${160 - rTop} ${y} A${rTop} 19 0 0 0 ${160 + rTop} ${y} L${160 + rBot} ${y + h} A${rBot} 19 0 0 1 ${160 - rBot} ${y + h} Z`;
const BAND_TOP = band(204, 16, 91, 90.4);
const BAND_BOT = band(376, 14, 85.4, 84.9);

export interface TubeHandle {
  /** 搖筒，最後跳出一支籤 */
  draw: () => Promise<void>;
  /** 把跳出來的籤插回去 */
  settle: () => Promise<void>;
}

type Props = { count: number; onTap?: () => void; busy?: boolean } & Pick<
  SVGProps<SVGSVGElement>,
  'x' | 'y' | 'width' | 'height'
>;

/**
 * 版畫風籤筒：平面色塊＋線刻，直接放在供桌場景的 SVG 裡。
 * draw() 搖筒並跳出一支籤；settle() 把籤插回去。
 */
export const Tube = forwardRef<TubeHandle, Props>(function Tube({ count, onTap, busy, ...box }, ref) {
  const svg = useRef<SVGSVGElement>(null);
  const chosen = useRef<number | null>(null);
  const visible = useMemo(() => new Set(ORDER.slice(0, Math.min(count, MAX_STICKS))), [count]);

  useImperativeHandle(ref, () => ({
    draw: () =>
      new Promise<void>((resolve) => {
        const el = svg.current;
        if (!el) return resolve();
        const q = gsap.utils.selector(el);
        const pool = [...visible];
        if (!pool.length) return resolve();
        const center = pool.filter((i) => Math.abs(STICKS[i].angle) < 8);
        const from = center.length ? center : pool;
        const win = from[Math.floor(Math.random() * from.length)];
        chosen.current = win;
        const winEl = q(`[data-stick="${win}"] .tp-stick__inner`);

        if (reducedMotion()) {
          clack();
          gsap.set(winEl, { y: -150 });
          q(`[data-stick="${win}"]`)[0]?.classList.add('is-chosen');
          return resolve();
        }

        rattle(1.15);
        buzz([24, 50, 24, 50, 24, 50, 24]);
        const tl = gsap.timeline({ onComplete: resolve });
        tl.to(q('.tp-body'), {
          keyframes: [
            { rotate: -8, y: -6, duration: 0.12 },
            { rotate: 9, y: 0, duration: 0.14 },
            { rotate: -10, y: -7, duration: 0.14 },
            { rotate: 8, y: 0, duration: 0.14 },
            { rotate: -6, y: -4, duration: 0.13 },
            { rotate: 5, y: 0, duration: 0.12 },
            { rotate: -2, y: -2, duration: 0.11 },
            { rotate: 0, y: 0, duration: 0.14, ease: 'back.out(3)' },
          ],
          svgOrigin: '160 430',
          ease: 'sine.inOut',
        });
        tl.to(q('.tp-shadow'), { opacity: 0.2, duration: 0.2, yoyo: true, repeat: 3 }, 0);
        pool.forEach((i) => {
          tl.to(
            q(`[data-stick="${i}"] .tp-stick__inner`),
            {
              y: () => -5 - Math.random() * 15,
              duration: 0.07 + Math.random() * 0.05,
              repeat: 9,
              yoyo: true,
              ease: 'sine.inOut',
            },
            0,
          );
        });
        tl.set(q('.tp-stick__inner'), { y: 0 }, '>-0.05');
        tl.add(() => {
          clack();
          buzz(60);
          q(`[data-stick="${win}"]`)[0]?.classList.add('is-chosen');
        });
        tl.to(winEl, { y: -172, duration: 0.6, ease: 'back.out(1.3)' });
        tl.fromTo(
          q('.tp-burst line'),
          { scale: 0.3, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.35, stagger: 0.02, transformOrigin: '50% 50%' },
          '-=0.25',
        );
      }),
    settle: () =>
      new Promise<void>((resolve) => {
        const el = svg.current;
        const win = chosen.current;
        if (!el || win === null) return resolve();
        const q = gsap.utils.selector(el);
        q(`[data-stick="${win}"]`)[0]?.classList.remove('is-chosen');
        chosen.current = null;
        gsap.to(q('.tp-burst line'), { opacity: 0, duration: 0.2 });
        if (reducedMotion()) {
          gsap.set(q(`[data-stick="${win}"] .tp-stick__inner`), { y: 0 });
          return resolve();
        }
        gsap.to(q(`[data-stick="${win}"] .tp-stick__inner`), {
          y: 0,
          duration: 0.4,
          ease: 'power2.in',
          onComplete: () => {
            clack();
            gsap.fromTo(q('.tp-body'), { y: 0 }, { y: 3, duration: 0.06, yoyo: true, repeat: 1, svgOrigin: '160 430' });
            resolve();
          },
        });
      }),
  }));

  return (
    <svg
      ref={svg}
      viewBox="-60 -150 440 640"
      className={`tp${busy ? ' tp--busy' : ''}${count === 0 ? ' tp--empty' : ''}`}
      onClick={busy ? undefined : onTap}
      overflow="visible"
      aria-hidden="true"
      {...box}
    >
      <ellipse className="tp-shadow" cx="160" cy="414" rx="96" ry="10" fill={INK} opacity="0.18" />
      <rect className="tp-hit" x="40" y="20" width="240" height="420" fill="transparent" />

      <g className="tp-body">
        <ellipse cx="160" cy="176" rx="92" ry="20" fill={INK} />

        <g className="tp-sticks">
          {STICKS.map((s) => (
            <g key={s.i} transform={`rotate(${s.angle.toFixed(2)} 160 420)`}>
              <g data-stick={s.i} className={`tp-stick${visible.has(s.i) ? '' : ' is-out'}`}>
                <g className="tp-stick__inner">
                  <rect
                    className="tp-stick__wood"
                    x="155"
                    y={s.top}
                    width="10"
                    height={420 - s.top}
                    fill={s.tone === 1 ? '#dcc597' : 'var(--bamboo)'}
                  />
                  <rect x="155" y={s.top} width="10" height="24" fill="var(--vermilion)" />
                  <rect x="155" y={s.top} width="10" height={420 - s.top} fill="none" stroke={INK} strokeWidth="1.3" />
                  <line x1="155" y1={s.top + 24} x2="165" y2={s.top + 24} stroke={INK} strokeWidth="1.1" />
                  <line
                    x1="160"
                    y1={s.top + 34}
                    x2="160"
                    y2={s.top + 52}
                    stroke={INK}
                    strokeWidth="0.8"
                    opacity="0.6"
                  />
                </g>
              </g>
            </g>
          ))}
        </g>

        <path d={BODY} fill="var(--vermilion)" />
        <path d={SHADE} fill="var(--vermilion-lo)" />
        <path d={LIGHT} fill="#e07a60" opacity="0.75" />
        <path d={BAND_TOP} fill="var(--gold)" />
        <path d={BAND_BOT} fill="var(--gold)" />
        <rect x="130" y="240" width="60" height="122" rx="4" fill={INK} />

        <g fill="none" stroke={INK} strokeLinejoin="round">
          <path d={SHADE} fill="url(#hatch-v)" stroke="none" opacity="0.55" />
          <path d={BODY} strokeWidth="2" />
          <path d={BAND_TOP} strokeWidth="1.4" />
          <path d={BAND_BOT} strokeWidth="1.4" />
          <path d="M74 212 A88 18 0 0 0 246 212" strokeWidth="0.8" />
          <path d="M80 383 A82 17 0 0 0 240 383" strokeWidth="0.8" />
          <rect x="130" y="240" width="60" height="122" rx="4" strokeWidth="1.4" />
          <rect x="136" y="246" width="48" height="110" rx="2" stroke="var(--gold-hi)" strokeWidth="1" />
          <path d="M68 176 A92 20 0 0 1 252 176" strokeWidth="1.4" />
          <path d="M68 176 A92 20 0 0 0 252 176" strokeWidth="2.6" />
          <path d="M92 300 q8 -10 16 0 q8 10 16 0 M196 300 q8 -10 16 0 q8 10 16 0" strokeWidth="1" opacity="0.7" />
        </g>
        {['食', '神', '靈', '籤'].map((ch, i) => (
          <text key={ch} x="160" y={268 + i * 27} textAnchor="middle" dominantBaseline="central" className="tp-label">
            {ch}
          </text>
        ))}
      </g>

      <g className="tp-burst" stroke="var(--vermilion)" strokeWidth="2.6" strokeLinecap="round">
        {Array.from({ length: 10 }, (_, k) => {
          const a = (-150 + k * 13.3) * (Math.PI / 180);
          const r1 = 36;
          const r2 = 58 + (k % 2) * 12;
          return (
            <line
              key={k}
              x1={fx(160 + Math.cos(a) * r1)}
              y1={fx(-70 + Math.sin(a) * r1)}
              x2={fx(160 + Math.cos(a) * r2)}
              y2={fx(-70 + Math.sin(a) * r2)}
              opacity="0"
            />
          );
        })}
      </g>
    </svg>
  );
});
