import { INK } from '@/art/ink';
import type { DateStampProps } from '../types';

const WEEK = '日一二三四五六';

/**
 * 廟宇的日期章：一顆方形朱印，白色內框，三行由上而下是年份、大大的月/日、星期。
 * 版畫風：乾淨的平面色塊，不做粗糙邊；字都用阿拉伯數字，一眼看得懂。
 */
export function DateStamp({ date, size = 72, label, className }: DateStampProps) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const md = `${m}/${d}`;
  const week = `週${WEEK[date.getDay()]}`;
  return (
    <svg
      className={`date-stamp date-stamp--temple${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label={label ?? `${y} 年 ${m} 月 ${d} 日 星期${WEEK[date.getDay()]}`}
    >
      <rect x="4" y="4" width="72" height="72" rx="5" fill="var(--vermilion)" stroke={INK} strokeWidth="2" />
      <rect x="10" y="10" width="60" height="60" rx="2.5" fill="none" stroke="var(--paper-hi)" strokeWidth="2" />
      <g fill="var(--paper-hi)" textAnchor="middle" fontFamily="var(--f-display)">
        <text x="40" y="24.5" fontSize="10.5" fontWeight="700" letterSpacing="1.4">
          {y}
        </text>
        {/* 數字用基線定位（不用 dominant-baseline，有些字型會往下掉、壓到星期） */}
        <text x="40" y="48.5" fontSize={md.length > 4 ? 19.5 : 23} fontWeight="900">
          {md}
        </text>
        <text x="40" y="66.5" fontSize="10.5" fontWeight="700" letterSpacing="2">
          {week}
        </text>
      </g>
      <path d="M24 53.5H56" stroke="var(--paper-hi)" strokeWidth="1.2" />
    </svg>
  );
}
