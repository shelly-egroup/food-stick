'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { Avatar } from '@/components/Avatar';
import { fizzle, shatter, sparkle, twinkle } from '@/lib/sound';
import type { CrewBannerProps } from '../types';
import { copy } from './copy';
import './CrewBanner.css';

/** 盾形徽章的外框 */
const SHIELD = 'M32 3 L58 11 V35 C58 53 46 64 32 71 C18 64 6 53 6 35 V11 Z';
/** 星光碎片：往外飛的方向 */
const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const d = i % 2 ? 62 : 88;
  return [Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d * 0.8)];
});

function Shield() {
  return (
    <svg viewBox="0 0 64 74">
      <path d={SHIELD} fill="#2f3f8f" />
      <path d="M32 3 L58 11 V35 C58 53 46 64 32 71 Z" fill="#45399a" />
      <path d={SHIELD} fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round" />
      <path
        d="M32 9.5 L52 15.5 V35 C52 49 43 58 32 64 C21 58 12 49 12 35 V15.5 Z"
        fill="none"
        stroke="var(--marigold)"
        strokeWidth="1.6"
      />
      <path
        d="M32 19 L35.3 29 L45.5 29.4 L37.4 35.7 L40.3 45.6 L32 39.8 L23.7 45.6 L26.6 35.7 L18.5 29.4 L28.7 29 Z"
        fill="var(--marigold)"
        stroke="var(--ink)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="1.5" fill="#fff" />
      <circle cx="45" cy="51" r="1.2" fill="#c9b8ff" />
      <circle cx="22" cy="50" r="0.9" fill="#fff" />
    </svg>
  );
}

/**
 * 冒險小隊的徽章：一面盾形徽章、底下飄著寫隊名的緞帶，隊員浮在四周，腳下一圈法陣。
 * 新隊的徽章只是一圈虛線，組好了才成形、迸出星光；
 * 問要不要解散時徽章忽明忽暗、裂開一條縫；解散就碎成兩半、化成星光，隊員各自飄走。
 */
export function CrewBanner({ name, members, phase, fresh }: CrewBannerProps) {
  const last = useRef(phase);
  useEffect(() => {
    if (last.current === phase) return;
    last.current = phase;
    const later: ReturnType<typeof setTimeout>[] = [];
    if (phase === 'forming') sparkle();
    else if (phase === 'cheering') twinkle(7);
    else if (phase === 'asking') fizzle();
    else if (phase === 'parting') later.push(setTimeout(() => shatter(), 280));
    return () => later.forEach(clearTimeout);
  }, [phase]);

  const n = members.length;
  const rx = Math.min(134, 70 + n * 11);
  const ry = 56;

  return (
    <div className={`party is-${phase}${fresh ? ' is-fresh' : ''}`} aria-hidden="true">
      <svg className="party__circle" viewBox="0 0 320 44" preserveAspectRatio="none">
        <ellipse cx="160" cy="22" rx="156" ry="19" />
        <ellipse cx="160" cy="22" rx="122" ry="12" />
      </svg>

      <span className="party__crest">
        <svg className="party__ghost" viewBox="0 0 64 74">
          <path d={SHIELD} />
          <path d="M32 24 V44 M22 34 H42" />
        </svg>
        <span className="party__half party__half--l">
          <Shield />
        </span>
        <span className="party__half party__half--r">
          <Shield />
        </span>
        <svg className="party__crack" viewBox="0 0 64 74">
          <polyline points="33,3 29,22 35,38 30,55 32,71" pathLength={1} />
        </svg>
        {SPARKS.map(([x, y], i) => (
          <i
            key={i}
            className="party__spark"
            style={{ '--sx': `${x}px`, '--sy': `${y}px`, '--i': i } as CSSProperties}
          />
        ))}
      </span>

      <span className="party__ribbon">
        <b className={name ? undefined : 'is-blank'}>{name || copy.crew.preset}</b>
      </span>

      {members.map((m, i) => {
        // 隊員排在徽章四周的弧上：從左下繞過頭頂到右下
        const t = ((-200 + (220 * (i + 0.5)) / n) * Math.PI) / 180;
        const x = Math.round(Math.cos(t) * rx);
        const y = Math.round(Math.sin(t) * ry);
        return (
          <span
            key={m.id}
            className="party__mate"
            style={
              {
                '--i': i,
                '--x': `${x}px`,
                '--y': `${y}px`,
                '--ox': `${Math.round(Math.cos(t) * 90)}px`,
                '--oy': `${Math.round(Math.sin(t) * 70)}px`,
              } as CSSProperties
            }
          >
            <Avatar member={m} size={34} />
          </span>
        );
      })}
    </div>
  );
}
