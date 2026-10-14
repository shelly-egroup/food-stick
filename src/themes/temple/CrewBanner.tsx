'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { Avatar } from '@/components/Avatar';
import { buzz, clack, paper, scurry } from '@/lib/sound';
import type { CrewBannerProps } from '../types';
import { copy } from './copy';
import './CrewBanner.css';

/** 散團時每個人跑開的方向：[x, y, 轉幾度] */
const SCATTER: [number, number, number][] = [
  [-170, -30, -50],
  [150, -70, 40],
  [-110, 30, -30],
  [190, 0, 60],
  [-60, -110, -20],
  [110, 40, 30],
  [-200, -80, -70],
  [60, -120, 25],
  [-140, 50, -35],
  [220, -50, 55],
];
/** 團服輪流穿的顏色 */
const ROBES = ['var(--jade)', 'var(--marigold)', 'var(--cobalt)', 'var(--vermilion)', 'var(--celadon)', 'var(--wood)'];

/**
 * 進香團的團旗：廟埕上一支旗桿、一面鑲金牙邊的燕尾令旗，旗旁站著穿團服的團員。
 * 新團的旗子收在桿子下面，組好了才升到頂、寶珠迸出金光，大家跳一下；
 * 問要不要解散時降半旗、大家不安地晃；解散就收旗，大家往四面八方跑掉，只剩一支空桿子。
 */
export function CrewBanner({ name, members, phase, fresh }: CrewBannerProps) {
  const last = useRef(phase);
  useEffect(() => {
    if (last.current === phase) return;
    last.current = phase;
    const later: ReturnType<typeof setTimeout>[] = [];
    if (phase === 'forming') {
      paper(0.7);
      later.push(
        setTimeout(() => {
          clack();
          buzz(12);
        }, 620),
      );
    } else if (phase === 'cheering') {
      paper(0.25);
    } else if (phase === 'parting') {
      paper(0.5);
      later.push(setTimeout(() => scurry(), 360));
    }
    return () => later.forEach(clearTimeout);
  }, [phase]);

  return (
    <div className={`troupe is-${phase}${fresh ? ' is-fresh' : ''}`} aria-hidden="true">
      {/* 背後淡淡的廟頂：燕尾脊、葫蘆、往上翹的屋簷 */}
      <svg className="troupe__roof" viewBox="0 0 320 60" preserveAspectRatio="xMidYMin meet">
        <path d="M78 21 H242 C254 21 263 14 270 2 C273 13 266 24 252 26 H68 C54 24 47 13 50 2 C57 14 66 21 78 21 Z" />
        <path d="M84 27 H236 L284 44 C293 47 303 45 312 37 C307 50 297 55 284 55 H36 C23 55 13 50 8 37 C17 45 27 47 36 44 Z" />
        <path d="M155 20 C155 16 157 14 160 13 C163 14 165 16 165 20 Z" />
        <circle cx="160" cy="9.5" r="4" />
      </svg>

      <div className="troupe__group">
        <div className="troupe__mast">
          <span className="troupe__cloth">
            <b className={name ? undefined : 'is-blank'}>{name || copy.crew.preset}</b>
          </span>
        </div>
        <span className="troupe__pole">
          <span className="troupe__burst">
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} style={{ '--a': `${i * 45}deg` } as CSSProperties} />
            ))}
          </span>
        </span>
        <div className="troupe__crowd">
          {members.map((m, i) => {
            const [dx, dy, rot] = SCATTER[i % SCATTER.length];
            return (
              <span
                key={m.id}
                className="troupe__mate"
                style={
                  {
                    '--i': i,
                    '--dx': `${dx}px`,
                    '--dy': `${dy}px`,
                    '--rot': `${rot}deg`,
                    '--robe': ROBES[i % ROBES.length],
                  } as CSSProperties
                }
              >
                <Avatar member={m} size={30} />
                <span className="troupe__robe" />
              </span>
            );
          })}
        </div>
      </div>
      <span className="troupe__dust" />
    </div>
  );
}
