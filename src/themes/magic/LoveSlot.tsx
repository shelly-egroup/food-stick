'use client';

import { useId, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { INK, fx } from '@/art/ink';
import { buzz, fizzle, sparkle } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
import type { LoveSlotProps } from '../types';
import { HEART } from './LoveStamp';
import './LoveSlot.css';

const SPARKS = 10;
const RUNES = 6;
const HEART_D = HEART(32, 34, 1.28);

/**
 * 愛心咒的法陣：平常是一圈慢慢轉的法陣，中間一顆空心的愛心。
 * 施咒：法陣猛轉、衝擊波散開、星芒四射，愛心亮起來並持續發光；再按一下咒語就熄掉。
 * 每一層都是一個 HTML 框（裡面各放一張 64×64 的 SVG），動畫只轉這些框，旋轉中心才會準。
 */
export function LoveSlot({ on, fresh }: LoveSlotProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const root = useRef<HTMLSpanElement>(null);
  const prev = useRef(on);

  useLayoutEffect(() => {
    const was = prev.current;
    prev.current = on;
    const el = root.current;
    if (was === on || !fresh || !el) return;
    const q = gsap.utils.selector(el);
    if (!on) {
      fizzle();
      if (reducedMotion()) return;
      const tl = gsap.timeline();
      tl.fromTo(
        q('.slot__heart'),
        { autoAlpha: 1, scale: 1 },
        { autoAlpha: 0, scale: 0.5, duration: 0.3, ease: 'power2.in', clearProps: 'all' },
      ).fromTo(q('.slot__halo'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.3, clearProps: 'all' }, 0);
      return () => void tl.kill();
    }
    sparkle();
    buzz([8, 40, 12]);
    if (reducedMotion()) return;
    const tl = gsap.timeline();
    tl.fromTo(q('.slot__ring'), { rotate: 0 }, { rotate: 300, duration: 1, ease: 'power3.out', clearProps: 'all' }, 0)
      .fromTo(
        q('.slot__shock'),
        { autoAlpha: 0.95, scale: 0.35 },
        { autoAlpha: 0, scale: 2.2, duration: 0.65, ease: 'power2.out', clearProps: 'all' },
        0.06,
      )
      .fromTo(
        q('.slot__halo'),
        { autoAlpha: 0, scale: 0.5 },
        { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power2.out', clearProps: 'all' },
        0.06,
      )
      .fromTo(
        q('.slot__heart'),
        { autoAlpha: 0, scale: 0.15 },
        { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(3.2)', clearProps: 'all' },
        0.1,
      )
      .fromTo(
        q('.slot__sparks i'),
        { x: 0, y: 0, scale: 0.3, autoAlpha: 1, rotate: 0 },
        {
          x: (i: number) => fx(Math.cos((i / SPARKS) * Math.PI * 2 - 0.4) * (34 + (i % 3) * 9)),
          y: (i: number) => fx(Math.sin((i / SPARKS) * Math.PI * 2 - 0.4) * (34 + (i % 3) * 9)),
          scale: (i: number) => (i % 2 ? 0.8 : 1.15),
          rotate: 90,
          autoAlpha: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.012,
          clearProps: 'all',
        },
        0.12,
      );
    return () => void tl.kill();
  }, [on, fresh]);

  return (
    <span ref={root} className={`slot slot--magic${on ? ' is-on' : ''}`}>
      <span className="slot__halo" />
      <span className="slot__shock" />
      {/* 法陣：外層慢慢轉（CSS），內層施咒時猛轉（GSAP） */}
      <span className="slot__layer slot__spin">
        <span className="slot__layer slot__ring">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="29" fill="none" stroke="var(--cobalt)" strokeWidth="1.6" />
            <circle
              cx="32"
              cy="32"
              r="24.5"
              fill="none"
              stroke="var(--marigold)"
              strokeWidth="1.4"
              strokeDasharray="2 3.3"
            />
            {Array.from({ length: RUNES }, (_, k) => {
              const a = (k / RUNES) * Math.PI * 2 - Math.PI / 2;
              const x = fx(32 + Math.cos(a) * 29);
              const y = fx(32 + Math.sin(a) * 29);
              return (
                <rect
                  key={k}
                  x={x - 2.6}
                  y={y - 2.6}
                  width="5.2"
                  height="5.2"
                  transform={`rotate(45 ${x} ${y})`}
                  fill={k % 2 ? 'var(--paper-hi)' : 'var(--marigold)'}
                  stroke={INK}
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        </span>
      </span>
      {/* 還沒施咒：虛線的空心愛心 */}
      <svg className="slot__layer slot__heart-line" viewBox="0 0 64 64" aria-hidden="true">
        <path
          d={HEART_D}
          fill="none"
          stroke="var(--cobalt)"
          strokeWidth="1.6"
          strokeDasharray="3.2 2.4"
          strokeLinejoin="round"
        />
      </svg>
      {/* 施了咒：發光的愛心，外層給 GSAP 放大、內層給 CSS 心跳 */}
      <span className="slot__layer slot__heart">
        <span className="slot__layer slot__beat">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <defs>
              <radialGradient id={`lh-${id}`} cx="38%" cy="32%" r="75%">
                <stop offset="0" stopColor="#ffe3ea" />
                <stop offset="0.5" stopColor="#ec6f86" />
                <stop offset="1" stopColor="#8c3fa0" />
              </radialGradient>
            </defs>
            <path d={HEART_D} fill={`url(#lh-${id})`} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
            <path
              d="M23.4 27.5 C 24.4 24.6, 26.6 23.2, 29 23.1"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </span>
      <span className="slot__sparks">
        {Array.from({ length: SPARKS }, (_, i) => (
          <i key={i} />
        ))}
      </span>
    </span>
  );
}
