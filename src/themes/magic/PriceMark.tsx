import { useId } from 'react';
import { INK } from '@/art/ink';
import './PriceMark.css';

/**
 * 價位：幾顆魔力球。小小的一顆看不出是什麼，所以每顆外面都有魔力圍繞：
 * 一圈淡紫光暈、一道慢慢繞著轉的金色軌跡，右上角一點星光。
 */
export function PriceMark({ n, size = 12 }: { n: number; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  // 光暈和軌跡會超出球本身，畫布放大一點，球的大小維持 size
  const box = size * 1.5;
  return (
    <span className="price-mark price-mark--mana" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} width={box} height={box} viewBox="-5 -5 30 30" style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id={`mana-${id}-${i}`} cx="36%" cy="32%" r="72%">
              <stop offset="0" stopColor="#efe9ff" />
              <stop offset="0.45" stopColor="#9b7bff" />
              <stop offset="1" stopColor="#3a3f9e" />
            </radialGradient>
            <radialGradient id={`aura-${id}-${i}`}>
              <stop offset="0.45" stopColor="#9b7bff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#9b7bff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="10" cy="10" r="14.5" fill={`url(#aura-${id}-${i})`} className="mana__aura" />
          <g className="mana__swirl" style={{ animationDelay: `${i * -0.7}s` }}>
            <path
              d="M-1.5 13.5 C -3.5 5, 4 -2.5, 12.5 -1.6"
              fill="none"
              stroke="var(--marigold)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M21.5 6.5 C 23.5 15, 16 22.5, 7.5 21.6"
              fill="none"
              stroke="var(--marigold)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="12.5" cy="-1.6" r="1.6" fill="#fff6d6" />
            <circle cx="7.5" cy="21.6" r="1.6" fill="#fff6d6" />
          </g>
          <circle cx="10" cy="10" r="7.6" fill={`url(#mana-${id}-${i})`} stroke={INK} strokeWidth="1.5" />
          <circle cx="7.6" cy="7.4" r="2" fill="#fff" opacity="0.92" />
          <path
            d="M17.6 -1.4 l1 2.2 l2.2 1 l-2.2 1 l-1 2.2 l-1 -2.2 l-2.2 -1 l2.2 -1 Z"
            fill="var(--marigold)"
            stroke={INK}
            strokeWidth="0.6"
            className="mana__spark"
          />
        </svg>
      ))}
    </span>
  );
}
