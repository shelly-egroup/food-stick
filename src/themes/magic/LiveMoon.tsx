'use client';

import { useSyncExternalStore } from 'react';
import { INK } from '@/art/ink';
import { litPath, moonPhase, type MoonPhase } from './moon';

const HOUR = 3_600_000;
let cache: { hour: number; m: MoonPhase } | null = null;

/** 同一個小時內回傳同一份月相，整點才重算 */
function currentPhase() {
  const hour = Math.floor(Date.now() / HOUR);
  if (cache?.hour !== hour) cache = { hour, m: moonPhase() };
  return cache.m;
}
const everyMinute = (cb: () => void) => {
  const t = setInterval(cb, 60_000);
  return () => clearInterval(t);
};

/** 今晚真正的月相：亮面金黃、暗面深藍 */
export function LiveMoon({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // 日期只在瀏覽器算，預先產生的頁面先畫月暈就好，避免和伺服器的時間不一致
  const m = useSyncExternalStore(everyMinute, currentPhase, () => null);

  return (
    <g className="moon" role="img" aria-label={m ? `今晚是${m.name}` : '月亮'}>
      <circle cx={cx} cy={cy} r={r + 22} fill="var(--marigold-tint)" opacity={m ? 0.35 + m.lit * 0.5 : 0.3} />
      {m && (
        <>
          <circle cx={cx} cy={cy} r={r} fill="#2f4c8a" stroke={INK} strokeWidth="2" />
          <circle cx={cx - r * 0.3} cy={cy + r * 0.25} r={r * 0.14} fill="#3a5a9c" />
          <circle cx={cx + r * 0.32} cy={cy - r * 0.3} r={r * 0.1} fill="#3a5a9c" />
          {m.lit >= 0.01 && (
            <path
              d={litPath(cx, cy, r, m)}
              fill="var(--marigold)"
              stroke={INK}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          )}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth="2" />
        </>
      )}
    </g>
  );
}
