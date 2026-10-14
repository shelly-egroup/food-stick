/** 搖籤的儀式：供桌上浮現金色八卦，神光從天而降。 */
import { INK, fx } from '@/art/ink';
import { fadeOff, reducedMotion, replay } from '@/lib/motion';
import './Bagua.css';

/* 先天八卦：1 是陽爻（實線），0 是陰爻（斷線） */
const TRIGRAMS = ['111', '110', '101', '100', '011', '010', '001', '000'];

/** 金色八卦環與神光。中心在 (cx, cy)，平放在桌面上 */
export function BaguaLight({ cx, cy }: { cx: number; cy: number }) {
  const R = 150;
  return (
    <g className="bagua" transform={`translate(${cx} ${cy})`}>
      <defs>
        <linearGradient id="beam-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6d6" stopOpacity="0" />
          <stop offset="0.45" stopColor="#ffe08a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff6d6" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="beam-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffe08a" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffe08a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffe08a" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="bagua-pool">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#f2b940" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f2b940" stopOpacity="0" />
        </radialGradient>
        <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* 桌面上的一圈光 */}
      <ellipse className="bagua__pool" rx={R + 40} ry={(R + 40) * 0.26} fill="url(#bagua-pool)" />
      {/* 神光 */}
      <g className="bagua__beam" filter="url(#glow-gold)">
        <rect x={-150} y={-640} width={300} height={640} fill="url(#beam-edge)" opacity="0.8" />
        <rect x={-70} y={-640} width={140} height={640} fill="url(#beam-g)" />
        <rect x={-14} y={-640} width={28} height={640} fill="#fffaf0" opacity="0.7" />
      </g>
      {/* 平放的八卦環：先畫成正圓，再壓扁成橢圓 */}
      <g transform="scale(1 0.26)" filter="url(#glow-gold)">
        <g className="bagua__spin">
          <circle r={R + 18} fill="none" stroke="var(--marigold)" strokeWidth="7" />
          <circle r={R - 26} fill="none" stroke="var(--marigold)" strokeWidth="3" />
          <circle
            r={R - 34}
            fill="rgba(242,185,64,0.18)"
            stroke="var(--vermilion)"
            strokeWidth="2"
            strokeDasharray="6 8"
          />
          {TRIGRAMS.map((t, k) => (
            <g key={t} transform={`rotate(${k * 45})`}>
              {[...t].map((bit, j) => {
                const y = -(R - j * 12);
                return bit === '1' ? (
                  <rect
                    key={j}
                    x={-20}
                    y={y}
                    width={40}
                    height={7}
                    fill="var(--marigold)"
                    stroke={INK}
                    strokeWidth="1"
                  />
                ) : (
                  <g key={j}>
                    <rect x={-20} y={y} width={16} height={7} fill="var(--marigold)" stroke={INK} strokeWidth="1" />
                    <rect x={4} y={y} width={16} height={7} fill="var(--marigold)" stroke={INK} strokeWidth="1" />
                  </g>
                );
              })}
            </g>
          ))}
        </g>
      </g>
      {/* 金紙碎片 */}
      <g className="bagua__flecks">
        {Array.from({ length: 10 }, (_, i) => (
          <rect
            key={i}
            x={fx(-110 + i * 24)}
            y={-300 - (i % 3) * 50}
            width="10"
            height="14"
            fill={i % 2 ? 'var(--marigold)' : 'var(--vermilion)'}
            stroke={INK}
            strokeWidth="1"
            style={{ animationDelay: `${0.3 + i * 0.07}s` }}
          />
        ))}
      </g>
    </g>
  );
}

export function playBagua(root: SVGElement | null) {
  if (!root || reducedMotion()) return;
  replay(root.querySelector('.bagua'));
}

export function stopBagua(root: SVGElement | null) {
  fadeOff(root?.querySelector('.bagua'));
}
