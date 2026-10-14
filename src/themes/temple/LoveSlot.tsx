'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { INK } from '@/art/ink';
import { buzz, paper, stamp } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
import type { LoveSlotProps } from '../types';
import { LoveStamp } from './LoveStamp';
import './LoveSlot.css';

/** 印泥噴出去的方向 */
const INK_DOTS = [
  [-30, -8],
  [-22, 20],
  [28, -16],
  [31, 12],
  [-6, 31],
  [12, -30],
];

/**
 * 蓋章處：虛線方框旁邊擱著一顆石章。
 * 蓋下去：石章抬起、重重壓進框裡、印泥噴開，留下「欽點愛店」的朱印；再按一下就把印收回來。
 */
export function LoveSlot({ on, fresh }: LoveSlotProps) {
  const root = useRef<HTMLSpanElement>(null);
  const prev = useRef(on);

  // 在畫面更新前就接手，新的狀態不會先閃一下
  useLayoutEffect(() => {
    const was = prev.current;
    prev.current = on;
    const el = root.current;
    if (was === on || !fresh || !el) return;
    const q = gsap.utils.selector(el);
    if (!on) {
      paper(0.18);
      if (reducedMotion()) return;
      const tl = gsap.timeline();
      tl.fromTo(
        q('.slot__mark'),
        { autoAlpha: 1, scale: 1, rotate: 0 },
        { autoAlpha: 0, scale: 0.86, rotate: -8, duration: 0.28, ease: 'power2.in', clearProps: 'all' },
      );
      return () => void tl.kill();
    }
    if (reducedMotion()) {
      stamp();
      return;
    }
    const seal = q('.slot__seal');
    // 動畫期間關掉石章的 CSS 過場，不然會跟 GSAP 互相拉扯
    el.classList.add('is-stamping');
    const tl = gsap.timeline({ onComplete: () => el.classList.remove('is-stamping') });
    tl.set(seal, { autoAlpha: 1, x: 0, y: -30, rotate: -6, scaleY: 1, transformOrigin: '50% 100%' })
      // 舉高、對準
      .to(seal, { y: -40, rotate: 0, duration: 0.16, ease: 'power2.out' })
      // 壓下去
      .to(seal, { y: 2, duration: 0.1, ease: 'power4.in' })
      .add(() => {
        stamp();
        buzz(14);
      })
      .to(seal, { scaleY: 0.86, duration: 0.05, ease: 'power1.out' })
      .fromTo(
        q('.slot__mark'),
        { autoAlpha: 0, scale: 1.16, rotate: 3 },
        { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.26, ease: 'power3.out', clearProps: 'all' },
        '<',
      )
      .fromTo(
        q('.slot__ink i'),
        { x: 0, y: 0, scale: 1, autoAlpha: 1 },
        {
          x: (i: number) => INK_DOTS[i][0],
          y: (i: number) => INK_DOTS[i][1],
          scale: 0.4,
          autoAlpha: 0,
          duration: 0.5,
          ease: 'power3.out',
          clearProps: 'all',
        },
        '<',
      )
      .fromTo(
        q('.slot__thud'),
        { autoAlpha: 0.7, scale: 0.7 },
        { autoAlpha: 0, scale: 1.5, duration: 0.45, ease: 'power2.out', clearProps: 'all' },
        '<',
      )
      // 放開：石章彈回去、淡出
      .to(seal, { scaleY: 1, y: -34, autoAlpha: 0, duration: 0.34, ease: 'power2.out', clearProps: 'all' }, '+=0.08');
    return () => {
      tl.kill();
      el.classList.remove('is-stamping');
    };
  }, [on, fresh]);

  return (
    <span ref={root} className={`slot slot--temple${on ? ' is-on' : ''}`}>
      <svg className="slot__frame" viewBox="0 0 56 56" aria-hidden="true">
        <rect
          x="6"
          y="6"
          width="44"
          height="44"
          rx="2"
          fill="var(--vermilion-tint)"
          fillOpacity="0.45"
          stroke="var(--vermilion)"
          strokeWidth="1.5"
          strokeDasharray="4 3.2"
        />
        <path
          d="M2 11 V2 H11 M45 2 H54 V11 M54 45 V54 H45 M11 54 H2 V45"
          fill="none"
          stroke="var(--vermilion)"
          strokeWidth="2"
          strokeLinecap="square"
        />
      </svg>
      <span className="slot__thud" />
      <span className="slot__mark">
        <LoveStamp size={46} />
      </span>
      <span className="slot__ink">
        {INK_DOTS.map((_, i) => (
          <i key={i} />
        ))}
      </span>
      {/* 擱在一旁的石章：青石章身、圓鈕、底下沾著印泥 */}
      <svg className="slot__seal" viewBox="0 0 40 54" aria-hidden="true">
        <path d="M11 15 C 11 4, 29 4, 29 15 Z" fill="var(--jade)" stroke={INK} strokeWidth="1.6" />
        <circle cx="20" cy="10.5" r="2.4" fill="var(--paper-hi)" stroke={INK} strokeWidth="1.3" />
        <rect x="7" y="15" width="26" height="29" rx="2" fill="var(--celadon)" stroke={INK} strokeWidth="1.6" />
        <rect x="10.5" y="18" width="4" height="23" rx="1" fill="var(--paper-hi)" opacity="0.45" />
        <rect x="6" y="44" width="28" height="7" rx="1.5" fill="var(--vermilion)" stroke={INK} strokeWidth="1.6" />
      </svg>
    </span>
  );
}
