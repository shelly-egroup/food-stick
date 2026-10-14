import { INK, fx } from '@/art/ink';

/** 魔法版的稱號徽章：鈷藍圓章，金色虛線內圈，四方各一顆小星，正中一個字 */
export function Badge({ text, size = 46 }: { text: string; size?: number }) {
  const ch = [...text][0] ?? '';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
      style={{ flex: 'none', overflow: 'visible' }}
    >
      <circle cx="40" cy="40" r="35" fill="var(--cobalt)" stroke={INK} strokeWidth="2.2" />
      <circle cx="40" cy="40" r="28.5" fill="none" stroke="var(--marigold)" strokeWidth="1.8" strokeDasharray="3 3.4" />
      {[0, 1, 2, 3].map((k) => {
        const a = (k / 4) * Math.PI * 2 - Math.PI / 2;
        const x = fx(40 + Math.cos(a) * 35);
        const y = fx(40 + Math.sin(a) * 35);
        return (
          <path
            key={k}
            d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`}
            fill="var(--marigold)"
            stroke={INK}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        );
      })}
      <text
        x="40"
        y="41"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--f-display)"
        fontWeight="900"
        fontSize="30"
        fill="var(--paper-hi)"
      >
        {ch}
      </text>
    </svg>
  );
}
