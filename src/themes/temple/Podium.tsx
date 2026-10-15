'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Seal } from '@/components/Seal';
import { chime, clack, stamp } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
import type { PodiumProps } from '../types';
import { copy } from './copy';
import './Podium.css';

/** 直書店名：名字越長字越小，放得進榜單 */
function PodiumName({ name, first }: { name: string; first: boolean }) {
  const n = [...name].length;
  const size = (first ? 1.25 : 1) * (n <= 4 ? 30 : n <= 6 ? 25 : 20);
  return (
    <h3 className="podium__name" style={{ fontSize: size }}>
      {name}
    </h3>
  );
}

/**
 * 金榜：狀元站中間最高，榜眼、探花分站兩旁。
 * 放榜時榜單由上往下展開，探花、榜眼、狀元依序落下、蓋上名號章。
 */
export function Podium({ top, unit, revealKey, onOpen }: PodiumProps) {
  const board = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = board.current;
    if (!el || reducedMotion() || top.length === 0) return;
    const q = gsap.utils.selector(el);
    const order = [2, 1, 0].filter((i) => i < top.length);
    const tl = gsap.timeline();
    tl.fromTo(
      el,
      { clipPath: 'inset(0 0 100% 0)' },
      { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'power2.out', clearProps: 'clipPath' },
    );
    order.forEach((i, k) => {
      tl.fromTo(
        q(`[data-rank="${i}"]`),
        { y: -50, opacity: 0, rotate: i === 0 ? 0 : i === 1 ? -6 : 6 },
        {
          y: 0,
          opacity: 1,
          rotate: 0,
          duration: 0.5,
          ease: 'back.out(1.8)',
          clearProps: 'all',
          onStart: () => (i === 0 ? chime() : clack()),
        },
        0.4 + k * 0.42,
      );
      tl.fromTo(
        q(`[data-rank="${i}"] .podium__title`),
        { scale: 2.2, opacity: 0, rotate: -20 },
        { scale: 1, opacity: 1, rotate: -6, duration: 0.3, ease: 'back.out(2.4)', onStart: () => stamp() },
        `>-0.1`,
      );
    });
    return () => void tl.kill();
    // 第一次進來、或切換排序時放榜
  }, [revealKey, top.length]);

  return (
    <section ref={board} className="podium" aria-label="前三名">
      {[1, 0, 2].map((i) => {
        const x = top[i];
        if (!x)
          return (
            <div key={`vacant-${i}`} className={`podium__slot podium__slot--${i + 1} podium__slot--vacant`}>
              <span className="podium__vacant">{copy.ranks.vacant}</span>
            </div>
          );
        return (
          <article key={x.r.id} className={`podium__slot podium__slot--${i + 1}`} data-rank={i}>
            <Seal
              text={copy.ranks.podium[i]}
              size={i === 0 ? 64 : 52}
              className="podium__title"
              label={copy.ranks.podium[i]}
              color="var(--accent)"
            />
            <PodiumName name={x.r.name} first={i === 0} />
            {i === 0 && <span className="podium__crown">{copy.ranks.crown}</span>}
            <p className="podium__stat">
              <b>{x.value}</b>
              {unit}
            </p>
            {onOpen && (
              <button type="button" className="podium__open" onClick={() => onOpen(x.r)} aria-label={`看${x.r.name}`} />
            )}
          </article>
        );
      })}
    </section>
  );
}
