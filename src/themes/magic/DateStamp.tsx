'use client';

import { useId } from 'react';
import { INK } from '@/art/ink';
import type { DateStampProps } from '../types';
import { litPath, moonPhase } from './moon';

const WEEK = '日一二三四五六';
/** 郵票四邊的齒孔：每邊 6 個 */
const HOLES = [10, 22, 34, 46, 58, 70];

/**
 * 魔法的日期章：一張星郵票。齒孔邊、鈷藍底、燙金內框；左上一顆星，右上是那一天的月相。
 * 三行由上而下是年份、大大的月/日、星期，都用阿拉伯數字。
 */
export function DateStamp({ date, size = 72, label, className }: DateStampProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const md = `${m}/${d}`;
  const week = `週${WEEK[date.getDay()]}`;
  const moon = moonPhase(date);
  return (
    <svg
      className={`date-stamp date-stamp--magic${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label={label ?? `${y} 年 ${m} 月 ${d} 日 星期${WEEK[date.getDay()]}，${moon.name}`}
    >
      <defs>
        <mask id={`perf-${id}`}>
          <rect x="2" y="2" width="76" height="76" fill="#fff" />
          {HOLES.map((v) => (
            <g key={v} fill="#000">
              <circle cx={v} cy="2" r="3" />
              <circle cx={v} cy="78" r="3" />
              <circle cx="2" cy={v} r="3" />
              <circle cx="78" cy={v} r="3" />
            </g>
          ))}
        </mask>
      </defs>
      <rect x="2" y="2" width="76" height="76" fill="#fbf6ea" mask={`url(#perf-${id})`} />
      <rect x="9" y="9" width="62" height="62" fill="#2f4a9a" stroke={INK} strokeWidth="1.4" />
      <rect x="13" y="13" width="54" height="54" fill="none" stroke="var(--marigold)" strokeWidth="1.1" />
      {/* 左上的星、右上那一天的月相 */}
      <path d="M21 15.5l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2Z" fill="var(--marigold)" />
      <circle cx="59" cy="20" r="4.6" fill="#1c2a63" />
      <path d={litPath(59, 20, 4.6, moon)} fill="var(--marigold)" />
      <g textAnchor="middle" fontFamily="var(--f-serif)">
        <text x="40" y="24" fontSize="9.5" fontWeight="700" letterSpacing="1.2" fill="var(--marigold)">
          {y}
        </text>
        {/* 數字用基線定位（不用 dominant-baseline，有些字型會往下掉、壓到星期） */}
        <text x="40" y="47.5" fontSize={md.length > 4 ? 18.5 : 22} fontWeight="900" fill="#fbf6ea">
          {md}
        </text>
        <text x="40" y="62" fontSize="9.5" fontWeight="700" letterSpacing="1.6" fill="var(--marigold)">
          {week}
        </text>
      </g>
    </svg>
  );
}
