/** 施法的儀式：法器底下展開魔法陣，光柱升起、蠟燭一盞盞亮起。 */
import { INK, fx } from '@/art/ink';
import { fadeOff, reducedMotion, replay } from '@/lib/motion';
import './parts.css';
import './MagicCircle.css';

/** 魔法陣、光柱與蠟燭，放在法器底下 (cx, cy) */
export function MagicCircle({ cx, cy, which }: { cx: number; cy: number; which: string }) {
  const R = 92;
  const pillars = [-86, -60, -30, 0, 30, 60, 86];
  const candles = [-78, -40, 0, 40, 78];
  const runes = ['✦', '☾', '✧', '◇', '✦', '☾', '✧', '◇'];
  return (
    <g className={`summon summon--${which}`} transform={`translate(${cx} ${cy})`}>
      <defs>
        <filter id={`glow-violet-${which}`} x="-80%" y="-30%" width="260%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="pillar-g" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.2" stopColor="#d9ccff" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#a98cff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#8b6bff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="circle-glow">
          <stop offset="0" stopColor="#c9b8ff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#9b7bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 地面的光 */}
      <ellipse className="summon__glow" rx={R * 1.5} ry={R * 0.4} fill="url(#circle-glow)" />
      {/* 光柱 */}
      <g className="summon__pillars" filter={`url(#glow-violet-${which})`}>
        {pillars.map((x, i) => {
          const w = i === 3 ? 34 : i % 2 ? 10 : 16;
          const h = i === 3 ? 230 : 120 + ((i * 37) % 70);
          const y = Math.abs(x) > 70 ? -4 : 4;
          return (
            <rect
              key={x}
              className="summon__pillar"
              x={x - w / 2}
              y={y - h}
              width={w}
              height={h}
              rx={w / 2}
              fill="url(#pillar-g)"
              style={{ animationDelay: `${0.35 + Math.abs(i - 3) * 0.07}s, ${0.9 + i * 0.04}s` }}
            />
          );
        })}
      </g>
      {/* 魔法陣：正圓壓扁成橢圓，在裡面旋轉 */}
      <g transform="scale(1 0.26)" filter={`url(#glow-violet-${which})`}>
        <g className="summon__spin">
          <circle r={R} fill="none" stroke="#9b7bff" strokeWidth="4" />
          <circle r={R - 12} fill="none" stroke="var(--marigold)" strokeWidth="2" strokeDasharray="5 7" />
          <circle r={R - 40} fill="none" stroke="#9b7bff" strokeWidth="2.5" />
          <path
            d={
              Array.from({ length: 6 }, (_, k) => {
                const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
                return `${k ? 'L' : 'M'}${fx(Math.cos(a) * (R - 12))} ${fx(Math.sin(a) * (R - 12))}`;
              }).join(' ') + ' Z'
            }
            fill="none"
            stroke="#c9b8ff"
            strokeWidth="2"
          />
          <path
            d={[0, 2, 4, 1, 3, 5]
              .map((k, i) => {
                const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
                return `${i === 0 || i === 3 ? 'M' : 'L'}${fx(Math.cos(a) * (R - 12))} ${fx(Math.sin(a) * (R - 12))}${i === 2 || i === 5 ? ' Z' : ''}`;
              })
              .join(' ')}
            fill="none"
            stroke="var(--marigold)"
            strokeWidth="2.4"
          />
          {runes.map((ch, k) => {
            const a = (k / runes.length) * Math.PI * 2;
            return (
              <text
                key={k}
                x={fx(Math.cos(a) * (R - 26))}
                y={fx(Math.sin(a) * (R - 26))}
                textAnchor="middle"
                dominantBaseline="central"
                className="summon__rune"
              >
                {ch}
              </text>
            );
          })}
        </g>
      </g>
      {/* 一圈蠟燭 */}
      <g className="summon__candles">
        {candles.map((x, i) => {
          const y = Math.abs(x) > 60 ? -4 : 8;
          return (
            <g key={x} className="summon__candle" style={{ animationDelay: `${0.25 + i * 0.1}s` }}>
              <circle cx={x} cy={y - 22} r="9" fill="var(--marigold)" opacity="0.35" />
              <path
                d={`M${x} ${y - 30} C ${x + 4} ${y - 24}, ${x + 4} ${y - 18}, ${x} ${y - 17} C ${x - 4} ${y - 18}, ${x - 4} ${y - 24}, ${x} ${y - 30} Z`}
                fill="var(--marigold)"
                stroke={INK}
                strokeWidth="0.9"
                className="flame flame--box"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
              <rect x={x - 4} y={y - 16} width="8" height="16" fill="var(--paper-hi)" stroke={INK} strokeWidth="1.1" />
            </g>
          );
        })}
      </g>
      {/* 往上飄的星光 */}
      <g className="summon__motes" fill="#fff6d6" stroke="#9b7bff" strokeWidth="0.8">
        {Array.from({ length: 9 }, (_, i) => (
          <circle
            key={i}
            cx={fx(-80 + i * 20)}
            cy={-10}
            r={2 + (i % 3)}
            style={{ animationDelay: `${0.5 + i * 0.07}s` }}
          />
        ))}
      </g>
    </g>
  );
}

export function playMagicCircle(root: SVGElement | null, which: string) {
  if (!root || reducedMotion()) return;
  replay(root.querySelector(`.summon--${which}`));
}

export function stopMagicCircle(root: SVGElement | null) {
  root?.querySelectorAll('.summon.is-on').forEach((g) => fadeOff(g));
}
