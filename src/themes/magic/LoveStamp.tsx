import type { LoveStampProps } from '../types';
import { INK } from '@/art/ink';

type Kind = 'ball' | 'book';

/** 沒有指定法器時，依店家固定挑一款，同一家店每次看到的都一樣 */
function kindOf(variant?: string, seed = ''): Kind {
  if (variant === 'ball' || variant === 'book') return variant;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 2 ? 'ball' : 'book';
}

export const HEART = (x: number, y: number, s: number) =>
  `M${x} ${y + 9 * s} C ${x - 10 * s} ${y + 2 * s}, ${x - 13 * s} ${y - 4 * s}, ${x - 9 * s} ${y - 8.5 * s} C ${x - 6 * s} ${y - 11.5 * s}, ${x - 1.5 * s} ${y - 10.5 * s}, ${x} ${y - 7 * s} C ${x + 1.5 * s} ${y - 10.5 * s}, ${x + 6 * s} ${y - 11.5 * s}, ${x + 9 * s} ${y - 8.5 * s} C ${x + 13 * s} ${y - 4 * s}, ${x + 10 * s} ${y + 2 * s}, ${x} ${y + 9 * s} Z`;

const SPARK = (x: number, y: number, r: number) =>
  `M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`;

/** 水晶球愛心：球裡亮著一顆心 */
function Ball() {
  return (
    <>
      <path d="M22 70 L26 58 H54 L58 70 Z" fill="var(--gold)" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="40" cy="36" r="24" fill="#dbe4ff" stroke={INK} strokeWidth="2" />
      <path
        d="M18 40 C 26 32, 34 46, 44 36 C 52 28, 58 36, 62 32 L 62 50 C 50 62, 30 62, 18 50 Z"
        fill="#9b7bff"
        opacity="0.35"
      />
      <path d={HEART(40, 40, 1)} fill="#e8697c" stroke="#7d1b2c" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M26 26 C 28 21, 32 18, 36 17" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <path d={SPARK(66, 20, 6)} fill="var(--marigold)" stroke={INK} strokeWidth="0.8" />
      <path d={SPARK(12, 26, 4)} fill="var(--marigold)" stroke={INK} strokeWidth="0.8" />
    </>
  );
}

/** 魔法書愛心：封面燙金一顆心，夾著紅色書籤帶 */
function Book() {
  return (
    <>
      <g transform="rotate(-6 40 40)">
        <rect x="17" y="12" width="46" height="58" rx="3" fill="var(--cobalt)" stroke={INK} strokeWidth="2" />
        <rect x="17" y="12" width="8" height="58" fill="#2c5596" stroke={INK} strokeWidth="1.4" />
        <rect x="29" y="18" width="29" height="46" rx="2" fill="none" stroke="var(--marigold)" strokeWidth="1.4" />
        <path d={HEART(43.5, 40, 1)} fill="var(--marigold)" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
        <path
          d="M50 70 L50 78 L54 75 L58 78 L58 70 Z"
          fill="var(--vermilion)"
          stroke={INK}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>
      <path d={SPARK(68, 24, 6)} fill="var(--marigold)" stroke={INK} strokeWidth="0.8" />
    </>
  );
}

/**
 * 愛心咒：水晶球愛心或魔法書愛心。
 * 籤卡上跟著揭曉的法器走（variant），其他地方依店家固定一款（seed）。
 */
export function LoveStamp({ size, className, label, variant, seed }: LoveStampProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ overflow: 'visible', flex: 'none' }}
    >
      {kindOf(variant, seed) === 'ball' ? <Ball /> : <Book />}
    </svg>
  );
}
