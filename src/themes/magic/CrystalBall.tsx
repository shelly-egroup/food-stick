/**
 * 水晶球：外圈光暈、旋轉的食物符文環、球內星雲、星星、高光。
 * 封面和書桌都用同一顆，id 用來區分漸層與裁切。
 */
import { INK, fx } from '@/art/ink';
import './CrystalBall.css';

const RUNES = ['飯', '麵', '湯', '茶', '肉', '菜', '甜', '飽'];

function star(x: number, y: number, r: number) {
  const k = r * 0.3;
  return `M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`;
}

export function CrystalBall({
  id,
  cx,
  cy,
  r,
  stand = true,
  runes = true,
}: {
  id: string;
  cx: number;
  cy: number;
  r: number;
  stand?: boolean;
  runes?: boolean;
}) {
  const ring = r * 1.42;
  return (
    <g className="crystal" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <defs>
        <radialGradient id={`${id}-aura`}>
          <stop offset="0" stopColor="#9b7bff" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#5f7fe0" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5f7fe0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-core`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#dbe4ff" />
          <stop offset="0.75" stopColor="#8aa5ec" />
          <stop offset="1" stopColor="#3a58b0" />
        </radialGradient>
        <radialGradient id={`${id}-heart`}>
          <stop offset="0" stopColor="#fff6d6" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#f2b940" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f2b940" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      {/* 光暈與放射光 */}
      <circle
        className="crystal__aura"
        cx={cx}
        cy={cy}
        r={r * 2.1}
        fill={`url(#${id}-aura)`}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      <g className="crystal__rays" style={{ transformOrigin: `${cx}px ${cy}px` }} opacity="0.5">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const a2 = a + 0.08;
          const r1 = r * 1.1;
          const r2 = r * 2;
          return (
            <path
              key={i}
              d={`M${fx(cx + Math.cos(a) * r1)} ${fx(cy + Math.sin(a) * r1)} L${fx(cx + Math.cos(a) * r2)} ${fx(cy + Math.sin(a) * r2)} L${fx(cx + Math.cos(a2) * r2)} ${fx(cy + Math.sin(a2) * r2)} Z`}
              fill={i % 2 ? '#c9b8ff' : '#f2d27a'}
            />
          );
        })}
      </g>

      {/* 食物符文環 */}
      {runes && (
        <g className="crystal__runes" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <circle cx={cx} cy={cy} r={ring} fill="none" stroke="var(--cobalt)" strokeWidth="1.4" strokeDasharray="3 7" />
          <circle cx={cx} cy={cy} r={ring + r * 0.16} fill="none" stroke="var(--marigold)" strokeWidth="1.2" />
          {RUNES.map((ch, i) => {
            const a = (i / RUNES.length) * Math.PI * 2 - Math.PI / 2;
            const x = fx(cx + Math.cos(a) * (ring + r * 0.08));
            const y = fx(cy + Math.sin(a) * (ring + r * 0.08));
            return (
              <g key={ch}>
                <circle cx={x} cy={y} r={r * 0.13} fill="var(--paper-hi)" stroke={INK} strokeWidth="1.2" />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="crystal__rune"
                  style={{ fontSize: r * 0.15 }}
                >
                  {ch}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* 底座 */}
      {stand && (
        <g className="crystal__stand">
          <ellipse cx={cx} cy={cy + r * 1.24} rx={r * 0.95} ry={r * 0.14} fill={INK} opacity="0.18" />
          <path
            d={`M${cx - r * 0.62} ${cy + r * 1.2} L${cx - r * 0.46} ${cy + r * 0.82} H${cx + r * 0.46} L${cx + r * 0.62} ${cy + r * 1.2} Z`}
            fill="var(--gold)"
            stroke={INK}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d={`M${cx - r * 0.5} ${cy + r * 0.82} q${r * 0.5} ${r * 0.16} ${r} 0`}
            fill="none"
            stroke={INK}
            strokeWidth="1.3"
          />
          <path d={`M${cx - r * 0.52} ${cy + r * 1.02} H${cx + r * 0.52}`} stroke={INK} strokeWidth="1" opacity="0.6" />
          <circle cx={cx} cy={cy + r * 1.02} r={r * 0.07} fill="var(--vermilion)" stroke={INK} strokeWidth="1" />
        </g>
      )}

      {/* 球體 */}
      <g className="crystal__glass" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <circle className="crystal__core" cx={cx} cy={cy} r={r} fill={`url(#${id}-core)`} />
        <g clipPath={`url(#${id}-clip)`}>
          <g className="crystal__nebula" style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <path
              d={`M${cx - r} ${cy + r * 0.1} C ${cx - r * 0.5} ${cy - r * 0.5}, ${cx - r * 0.1} ${cy + r * 0.5}, ${cx + r * 0.3} ${cy - r * 0.1} C ${cx + r * 0.6} ${cy - r * 0.5}, ${cx + r * 0.8} ${cy - r * 0.1}, ${cx + r} ${cy - r * 0.3} L ${cx + r} ${cy + r} H ${cx - r} Z`}
              fill="#7b5cff"
              opacity="0.45"
            />
            <path
              d={`M${cx - r} ${cy - r * 0.4} C ${cx - r * 0.4} ${cy - r * 0.05}, ${cx} ${cy - r * 0.75}, ${cx + r * 0.5} ${cy - r * 0.3} C ${cx + r * 0.75} ${cy - r * 0.1}, ${cx + r * 0.9} ${cy - r * 0.45}, ${cx + r} ${cy - r * 0.5} L ${cx + r} ${cy - r} H ${cx - r} Z`}
              fill="#ffffff"
              opacity="0.55"
            />
          </g>
          <g className="crystal__nebula crystal__nebula--b" style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <path
              d={`M${cx - r} ${cy + r * 0.5} C ${cx - r * 0.3} ${cy + r * 0.2}, ${cx + r * 0.1} ${cy + r * 0.8}, ${cx + r} ${cy + r * 0.35} L ${cx + r} ${cy + r} H ${cx - r} Z`}
              fill="#3a68ad"
              opacity="0.5"
            />
          </g>
          <circle
            className="crystal__heart"
            cx={cx}
            cy={cy}
            r={r * 0.62}
            fill={`url(#${id}-heart)`}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          <g className="crystal__stars">
            <path className="tw" d={star(cx - r * 0.3, cy + r * 0.2, r * 0.12)} fill="#fff6d6" />
            <path
              className="tw"
              style={{ animationDelay: '0.8s' }}
              d={star(cx + r * 0.35, cy - r * 0.15, r * 0.09)}
              fill="#fff6d6"
            />
            <path
              className="tw"
              style={{ animationDelay: '1.5s' }}
              d={star(cx + r * 0.1, cy + r * 0.48, r * 0.07)}
              fill="#f2b940"
            />
          </g>
        </g>
        <path
          d={`M${cx - r * 0.62} ${cy - r * 0.3} A ${r * 0.7} ${r * 0.7} 0 0 1 ${cx - r * 0.12} ${cy - r * 0.7}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth={r * 0.1}
          strokeLinecap="round"
          opacity="0.9"
        />
        <circle cx={cx + r * 0.42} cy={cy + r * 0.46} r={r * 0.05} fill="#ffffff" opacity="0.8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth="2.2" />
      </g>

      {/* 繞球飛的小星星 */}
      <g className="crystal__orbit" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <path d={star(cx + r * 1.18, cy, r * 0.11)} fill="var(--marigold)" stroke={INK} strokeWidth="1" />
        <path d={star(cx - r * 1.05, cy - r * 0.5, r * 0.08)} fill="var(--paper-hi)" stroke={INK} strokeWidth="1" />
      </g>
    </g>
  );
}
