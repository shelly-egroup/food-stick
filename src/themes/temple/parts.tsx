/**
 * 廟宇版畫零件：大樑、雀替、燈籠、太陽、閃光、香爐、柑橘、廟貓。
 * 全部是平面色塊＋墨線，座標都是 SVG 單位。
 */
import type { CSSProperties } from 'react';
import { INK, fx } from '@/art/ink';
import '@/art/art.css';
import './parts.css';

/** 殿內彩繪大樑：朱紅樑身、中央鈷藍彩繪框與祥雲、兩端箍頭彩帶 */
export function Beam({ x0 = -10, x1 = 400, h = 48 }: { x0?: number; x1?: number; h?: number }) {
  const cx = (x0 + x1) / 2;
  const band = (x: number) => (
    <g key={x}>
      <rect x={x} y="11" width="7" height={h - 15} fill="var(--jade)" />
      <rect x={x + 7} y="11" width="2.5" height={h - 15} fill="var(--marigold)" />
      <rect x={x + 9.5} y="11" width="7" height={h - 15} fill="var(--cobalt)" />
      <rect x={x + 16.5} y="11" width="2.5" height={h - 15} fill="var(--marigold)" />
      <rect x={x + 19} y="11" width="7" height={h - 15} fill="var(--jade)" />
      <rect x={x} y="11" width="26" height={h - 15} fill="none" stroke={INK} strokeWidth="1" />
    </g>
  );
  const w = 79;
  const my = (11 + h - 4) / 2;
  return (
    <g className="beam">
      <rect x={x0} y="0" width={x1 - x0} height="8" fill={INK} />
      <rect x={x0} y="8" width={x1 - x0} height={h - 8} fill="var(--vermilion)" />
      <line x1={x0} y1="11" x2={x1} y2="11" stroke="var(--marigold)" strokeWidth="1.2" />
      <line x1={x0} y1={h - 4} x2={x1} y2={h - 4} stroke="var(--marigold)" strokeWidth="1.2" />
      <line x1={x0} y1={h} x2={x1} y2={h} stroke={INK} strokeWidth="2" />
      {band(x0 + 38)}
      {band(x1 - 64)}
      <path
        d={`M${cx - w} ${my - 13.5} H${cx + w - 10} L${cx + w} ${my} L${cx + w - 10} ${my + 13.5} H${cx - w + 10} L${cx - w} ${my} L${cx - w + 10} ${my - 13.5} Z`}
        fill="var(--cobalt)"
        stroke="var(--marigold)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <g fill="none" stroke="var(--marigold)" strokeWidth="1.6" strokeLinecap="round">
        <path
          d={`M${cx - 45} ${my + 5.5} c-8 0 -10 -10 -3 -12 c6 -2 9 5 4 7 c-3 1 -4 -2 -2 -3 M${cx - 45} ${my + 5.5} h26 c6 0 10 -4 14 -7`}
        />
        <path
          d={`M${cx + 45} ${my + 5.5} c8 0 10 -10 3 -12 c-6 -2 -9 5 -4 7 c3 1 4 -2 2 -3 M${cx + 45} ${my + 5.5} h-26 c-6 0 -10 -4 -14 -7`}
        />
      </g>
      <circle
        cx={cx}
        cy={my - 2.5}
        r="4.6"
        fill="var(--vermilion)"
        stroke="var(--marigold)"
        strokeWidth="1.6"
        className="beam__pearl"
      />
    </g>
  );
}

/** 雀替：大樑下方角落的金色雕花托架 */
export function Bracket({
  x = 0,
  y = 48,
  flip = false,
  s = 1,
}: {
  x?: number;
  y?: number;
  flip?: boolean;
  s?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path
        d="M0 0 H92 C 80 4, 70 10, 63 19 C 55 30, 51 42, 40 50 C 30 57, 17 61, 0 78 Z"
        fill="var(--marigold)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <g fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round">
        <path d="M14 14 c10 -6 22 -2 22 8 c0 7 -9 9 -12 4 c-2 -4 3 -6 4 -3" />
        <path d="M40 8 c8 0 16 2 22 0" />
        <path d="M12 48 c4 -8 12 -12 20 -12" />
        <path d="M8 32 c2 -4 4 -6 8 -8" />
      </g>
    </g>
  );
}

/** 燈籠：從 (x, top) 往下掛，會輕輕搖 */
export function Lantern({
  x,
  top,
  cord,
  delay = 0,
  char,
}: {
  x: number;
  top: number;
  cord: number;
  delay?: number;
  char?: string;
}) {
  const y = top + cord;
  return (
    <g
      className="lantern-sway"
      style={{ transformOrigin: `${x}px ${top}px`, animationDelay: `${delay}s` } as CSSProperties}
    >
      <line x1={x} y1={top} x2={x} y2={y} stroke={INK} strokeWidth="1.4" />
      <circle cx={x} cy={y + 40} r="46" fill="var(--marigold)" opacity="0.22" className="lantern-glow" />
      <rect x={x - 13} y={y} width="26" height="8" fill="var(--marigold)" stroke={INK} strokeWidth="1.2" />
      <ellipse cx={x} cy={y + 40} rx="27" ry="32" fill="var(--vermilion)" stroke={INK} strokeWidth="1.6" />
      <g fill="none" stroke={INK} strokeWidth="1.1">
        <ellipse cx={x} cy={y + 40} rx="15" ry="32" />
        {!char && <ellipse cx={x} cy={y + 40} rx="4.5" ry="32" />}
      </g>
      {char && (
        <text x={x} y={y + 41} textAnchor="middle" dominantBaseline="central" className="lantern__char">
          {char}
        </text>
      )}
      <rect x={x - 13} y={y + 70} width="26" height="7" fill="var(--marigold)" stroke={INK} strokeWidth="1.2" />
      <g stroke="var(--marigold)" strokeWidth="2.4" strokeLinecap="round">
        <line x1={x - 5} y1={y + 78} x2={x - 6} y2={y + 102} />
        <line x1={x} y1={y + 78} x2={x} y2={y + 106} />
        <line x1={x + 5} y1={y + 78} x2={x + 6} y2={y + 102} />
      </g>
    </g>
  );
}

/** 金色太陽與慢慢轉動的朱紅光芒 */
export function Sun({ cx, cy, r = 122, rays = 28 }: { cx: number; cy: number; r?: number; rays?: number }) {
  return (
    <g className="sun">
      <circle cx={cx} cy={cy} r={r} fill="var(--marigold)" />
      <circle cx={cx} cy={cy} r={r - 14} fill="none" stroke={INK} strokeWidth="1.2" opacity="0.45" />
      <g
        className="sun__rays"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        stroke="var(--vermilion)"
        strokeWidth="3"
        strokeLinecap="round"
      >
        {Array.from({ length: rays }, (_, i) => {
          const a = (i / rays) * Math.PI * 2;
          const r1 = r + 10;
          const r2 = r + (i % 2 ? 24 : 32);
          return (
            <line
              key={i}
              x1={fx(cx + Math.cos(a) * r1)}
              y1={fx(cy + Math.sin(a) * r1)}
              x2={fx(cx + Math.cos(a) * r2)}
              y2={fx(cy + Math.sin(a) * r2)}
            />
          );
        })}
      </g>
    </g>
  );
}

/** 一閃一閃的四角星 */
export function Sparks({ points, color = 'var(--vermilion)' }: { points: [number, number, number][]; color?: string }) {
  return (
    <g fill={color} className="sparks">
      {points.map(([x, y, d]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y - 9} L${x + 2.4} ${y - 2.4} L${x + 9} ${y} L${x + 2.4} ${y + 2.4} L${x} ${y + 9} L${x - 2.4} ${y + 2.4} L${x - 9} ${y} L${x - 2.4} ${y - 2.4} Z`}
          style={{ animationDelay: `${d}s`, transformOrigin: `${x}px ${y}px` }}
        />
      ))}
    </g>
  );
}

/** 香爐：底部貼齊 base，三炷香與飄動的煙 */
export function Censer({ x, base }: { x: number; base: number }) {
  const y = (v: number) => base - 358 + v;
  return (
    <g transform={`translate(${x} 0)`}>
      <g className="smoke" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" opacity="0.5">
        <path d={`M14 ${y(288)} C 4 ${y(268)}, 26 ${y(250)}, 14 ${y(230)} S 22 ${y(196)}, 8 ${y(176)}`} />
        <path d={`M24 ${y(286)} C 34 ${y(264)}, 14 ${y(246)}, 26 ${y(224)} S 18 ${y(188)}, 30 ${y(166)}`} />
        <path d={`M34 ${y(288)} C 30 ${y(272)}, 44 ${y(258)}, 36 ${y(242)} S 44 ${y(212)}, 38 ${y(196)}`} />
      </g>
      <g stroke={INK} strokeWidth="1.4">
        <line x1="14" y1={y(292)} x2="18" y2={y(334)} />
        <line x1="24" y1={y(288)} x2="24" y2={y(334)} />
        <line x1="34" y1={y(292)} x2="30" y2={y(334)} />
      </g>
      <g fill="var(--vermilion)" className="embers">
        <circle cx="14" cy={y(291)} r="2.6" />
        <circle cx="24" cy={y(287)} r="2.6" />
        <circle cx="34" cy={y(291)} r="2.6" />
      </g>
      <path
        d={`M-4 ${y(334)} h56 c0 14 -10 24 -28 24 S -4 ${y(348)} -4 ${y(334)} Z`}
        fill="var(--gold)"
        stroke={INK}
        strokeWidth="1.5"
      />
      <path d={`M2 ${y(342)} q22 8 44 0`} fill="none" stroke={INK} strokeWidth="1" />
    </g>
  );
}

/** 一盤柑橘 */
export function Oranges({ x, base }: { x: number; base: number }) {
  return (
    <g transform={`translate(${x} ${base - 358})`}>
      <circle cx="-12" cy="344" r="11" fill="var(--orange)" stroke={INK} strokeWidth="1.3" />
      <circle cx="12" cy="344" r="11" fill="var(--orange)" stroke={INK} strokeWidth="1.3" />
      <circle cx="0" cy="328" r="11" fill="#f39c3c" stroke={INK} strokeWidth="1.3" />
      <path d="M0 317 q4 -6 9 -5 q-2 5 -9 5 Z" fill="var(--jade)" stroke={INK} strokeWidth="1" />
      <path d="M-27 356 h54" stroke={INK} strokeWidth="2.4" />
    </g>
  );
}

/**
 * 廟貓：甩尾巴、眨眼，畫在 (0, 0)，由外層決定位置。
 * 平常是一條趴著的黑貓；跑起來（外層加 .is-running）會伸出四隻腳。
 * .cat__flip 給動畫轉向、壓扁拉長用，裡面的東西不要再放 transform。
 */
export function Cat({ onPoke }: { onPoke?: () => void }) {
  return (
    <g className="cat" onClick={onPoke} role={onPoke ? 'button' : undefined} aria-label={onPoke ? '廟貓' : undefined}>
      <g className="cat__flip">
        <rect x="-44" y="-30" width="88" height="58" fill="transparent" />
        <g className="cat__legs" stroke={INK} strokeWidth="4.2" strokeLinecap="round">
          <line className="cat__leg cat__leg--a" x1="-17" y1="14" x2="-19" y2="25" />
          <line className="cat__leg cat__leg--b" x1="-8" y1="15" x2="-6" y2="26" />
          <line className="cat__leg cat__leg--b" x1="12" y1="15" x2="10" y2="26" />
          <line className="cat__leg cat__leg--a" x1="20" y1="13" x2="22" y2="24" />
        </g>
        <path
          className="cat__tail"
          d="M-28 12 q-16 -2 -12 -18"
          fill="none"
          stroke={INK}
          strokeWidth="3.4"
          strokeLinecap="round"
          style={{ transformOrigin: '-28px 12px' }}
        />
        <ellipse cx="0" cy="8" rx="30" ry="13" fill={INK} />
        <circle cx="24" cy="0" r="11" fill={INK} />
        <path d="M16 -8 l3 -9 l6 7 Z M27 -9 l5 -8 l3 9 Z" fill={INK} />
        <g className="cat__eyes" style={{ transformOrigin: '26px 1px' }}>
          <circle cx="21" cy="1" r="1.8" fill="var(--marigold)" />
          <circle cx="30" cy="1" r="1.8" fill="var(--marigold)" />
        </g>
      </g>
    </g>
  );
}
