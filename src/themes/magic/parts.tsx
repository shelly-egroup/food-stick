/** 魔法版零件：星星、星座、蠟燭、書堆、白色貓頭鷹。 */
import type { CSSProperties } from 'react';
import { INK } from '@/art/ink';
import './parts.css';

export function Star({
  x,
  y,
  r = 9,
  fill = 'var(--marigold)',
  className,
  delay,
}: {
  x: number;
  y: number;
  r?: number;
  fill?: string;
  className?: string;
  delay?: number;
}) {
  const k = r * 0.28;
  return (
    <path
      className={className}
      style={delay !== undefined ? ({ animationDelay: `${delay}s` } as CSSProperties) : undefined}
      d={`M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`}
      fill={fill}
      stroke={INK}
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  );
}

/** 星座：細線連起幾顆星 */
export function Constellation({ pts, delay = 0 }: { pts: [number, number][]; delay?: number }) {
  return (
    <g className="constellation" style={{ animationDelay: `${delay}s` }}>
      <polyline
        points={pts.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke="var(--cobalt)"
        strokeWidth="1.4"
        strokeDasharray="3 5"
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 2.6 : 3.6} fill="var(--cobalt)" />
      ))}
    </g>
  );
}

/** 蠟燭：底部在 (x, base) */
export function Candle({ x, base, h = 46, delay = 0 }: { x: number; base: number; h?: number; delay?: number }) {
  return (
    <g>
      <g
        className="flame"
        style={{ transformOrigin: `${x}px ${base - h}px`, animationDelay: `${delay}s` } as CSSProperties}
      >
        <circle cx={x} cy={base - h - 12} r="16" fill="var(--marigold)" opacity="0.25" />
        <path
          d={`M${x} ${base - h - 26} C ${x + 8} ${base - h - 14}, ${x + 7} ${base - h - 3}, ${x} ${base - h - 2} C ${x - 7} ${base - h - 3}, ${x - 8} ${base - h - 14}, ${x} ${base - h - 26} Z`}
          fill="var(--marigold)"
          stroke={INK}
          strokeWidth="1.3"
        />
        <path
          d={`M${x} ${base - h - 16} C ${x + 3} ${base - h - 10}, ${x + 3} ${base - h - 6}, ${x} ${base - h - 5} C ${x - 3} ${base - h - 6}, ${x - 3} ${base - h - 10}, ${x} ${base - h - 16} Z`}
          fill="var(--vermilion)"
        />
      </g>
      <line x1={x} y1={base - h} x2={x} y2={base - h - 4} stroke={INK} strokeWidth="1.6" />
      <rect x={x - 8} y={base - h} width="16" height={h} fill="var(--paper-hi)" stroke={INK} strokeWidth="1.5" />
      <path d={`M${x - 8} ${base - h + 8} q4 4 6 0 q2 8 4 0`} fill="none" stroke={INK} strokeWidth="1" />
      <ellipse cx={x} cy={base} rx="16" ry="4" fill="var(--gold)" stroke={INK} strokeWidth="1.3" />
    </g>
  );
}

/** 一疊書：底部在 (x, base)，由下往上 */
export function BookStack({ x, base, w = 70 }: { x: number; base: number; w?: number }) {
  const books = [
    { h: 14, c: 'var(--cobalt)', dx: 0 },
    { h: 11, c: 'var(--vermilion)', dx: 6 },
    { h: 16, c: 'var(--jade)', dx: -4 },
    { h: 10, c: 'var(--marigold)', dx: 3 },
  ];
  let y = base;
  return (
    <g>
      {books.map((b, i) => {
        y -= b.h;
        return (
          <g key={i}>
            <rect x={x - w / 2 + b.dx} y={y} width={w - 6} height={b.h} fill={b.c} stroke={INK} strokeWidth="1.4" />
            <line
              x1={x - w / 2 + b.dx + 8}
              y1={y + 2}
              x2={x - w / 2 + b.dx + 8}
              y2={y + b.h - 2}
              stroke={INK}
              strokeWidth="1"
            />
            <line
              x1={x + w / 2 + b.dx - 14}
              y1={y + 2}
              x2={x + w / 2 + b.dx - 14}
              y2={y + b.h - 2}
              stroke={INK}
              strokeWidth="1"
            />
          </g>
        );
      })}
    </g>
  );
}

/** 貓頭鷹偶爾會穿戴的東西 */
export type OwlOutfit = 'none' | 'hat' | 'cape';

/** 白色貓頭鷹：腳底在 (x, y)。會眨眼、歪頭，點一下拍翅膀；偶爾戴巫師帽或披斗篷 */
export function Owl({
  x,
  y,
  s = 1,
  onPoke,
  outfit = 'none',
  asleep = false,
}: {
  x: number;
  y: number;
  s?: number;
  onPoke?: () => void;
  outfit?: OwlOutfit;
  /** 睡著：眼睛閉成兩道彎、不眨眼 */
  asleep?: boolean;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      className={`owl${asleep ? ' is-asleep' : ''}`}
      onClick={onPoke}
      role={onPoke ? 'button' : undefined}
      aria-label={onPoke ? '貓頭鷹' : undefined}
    >
      <g className="owl__body">
        <g className="owl__hop">
          <rect
            x="-30"
            y={outfit === 'hat' ? -96 : -64}
            width="60"
            height={outfit === 'hat' ? 100 : 68}
            fill="transparent"
          />
          {/* 斗篷：披在身後，飛起來會飄 */}
          {outfit === 'cape' && (
            <g className="owl__cape">
              <path
                d="M-14 -40 C -27 -30, -32 -10, -31 4 C -22 9, -12 6, 0 8 C 12 6, 22 9, 31 4 C 32 -10, 27 -30, 14 -40 C 6 -36, -6 -36, -14 -40 Z"
                fill="#5b3f8c"
                stroke={INK}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M-26 -2 C -16 2, 16 2, 26 -2" fill="none" stroke="var(--marigold)" strokeWidth="1.4" />
            </g>
          )}
          {/* 翅膀 */}
          <path
            className="owl__wing owl__wing--l"
            d="M-17 -36 C -30 -26, -30 -8, -14 -1 C -18 -14, -18 -26, -17 -36 Z"
            fill="var(--paper-hi)"
            stroke={INK}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            className="owl__wing owl__wing--r"
            d="M17 -36 C 30 -26, 30 -8, 14 -1 C 18 -14, 18 -26, 17 -36 Z"
            fill="var(--paper-hi)"
            stroke={INK}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* 身體 */}
          <path
            d="M-19 -20 C -21 -46, -13 -60, 0 -60 C 13 -60, 21 -46, 19 -20 C 19 -5, 11 1, 0 1 C -11 1, -19 -5, -19 -20 Z"
            fill="#fffdf8"
            stroke={INK}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* 雪鴞的斑點 */}
          <g fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" opacity="0.75">
            <path d="M-9 -18 l2.5 2 l2.5 -2 M3 -14 l2.5 2 l2.5 -2 M-4 -8 l2.5 2 l2.5 -2 M7 -24 l2 1.6 l2 -1.6 M-13 -27 l2 1.6 l2 -1.6" />
          </g>
          {/* 臉 */}
          <g className="owl__face">
            <path
              d="M-15 -44 C -11 -50, -3 -50, 0 -45 C 3 -50, 11 -50, 15 -44"
              fill="none"
              stroke={INK}
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            {asleep && (
              <path
                className="owl__lids"
                d="M-14 -40.5 Q -8 -35.5 -2 -40.5 M2 -40.5 Q 8 -35.5 14 -40.5"
                fill="none"
                stroke={INK}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            )}
            <g className="owl__eyes" display={asleep ? 'none' : undefined}>
              <circle cx="-8" cy="-40" r="7" fill="var(--marigold)" stroke={INK} strokeWidth="1.3" />
              <circle cx="8" cy="-40" r="7" fill="var(--marigold)" stroke={INK} strokeWidth="1.3" />
              <circle cx="-7.5" cy="-40" r="3.4" fill={INK} />
              <circle cx="8.5" cy="-40" r="3.4" fill={INK} />
              <circle cx="-6.4" cy="-41.4" r="1.1" fill="#fff" />
              <circle cx="9.6" cy="-41.4" r="1.1" fill="#fff" />
            </g>
            <path
              d="M-3 -34.5 L3 -34.5 L0 -28.5 Z"
              fill="var(--marigold)"
              stroke={INK}
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          </g>
          {/* 腳 */}
          <g stroke="var(--marigold)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M-7 0 l-2 4 M-7 0 l0 4.5 M-7 0 l2 4" />
            <path d="M7 0 l-2 4 M7 0 l0 4.5 M7 0 l2 4" />
          </g>
          {/* 斗篷的金扣子扣在脖子上 */}
          {outfit === 'cape' && (
            <circle cx="0" cy="-27" r="3.2" fill="var(--marigold)" stroke={INK} strokeWidth="1.2" />
          )}
          {/* 巫師帽：鈷藍尖帽、金色帽帶、帽尖往右彎 */}
          {outfit === 'hat' && (
            <g className="owl__hat">
              <path
                d="M-11 -55 C -9 -66, -4 -79, 4 -92 C 6 -84, 8 -76, 12 -68 L 12 -55 Z"
                fill="var(--cobalt)"
                stroke={INK}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M-19 -54 C -8 -58, 8 -58, 19 -54 C 21 -52, 19 -50, 16 -50 C 6 -53, -6 -53, -16 -50 C -19 -50, -21 -52, -19 -54 Z"
                fill="var(--cobalt)"
                stroke={INK}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M-10.4 -58 C -3 -60, 5 -60, 12 -58 L 12 -54.6 C 5 -56, -3 -56, -10.8 -54.6 Z"
                fill="var(--marigold)"
              />
              <Star x={3} y={-72} r={4} />
            </g>
          )}
        </g>
      </g>
    </g>
  );
}
