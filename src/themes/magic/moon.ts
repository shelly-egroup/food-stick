/**
 * 月相：依日期算出今晚的月亮。
 * 以 2000-01-06 18:14 UTC 的新月為基準，朔望月 29.530588853 天。
 */
const SYNODIC = 29.530588853;
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

export interface MoonPhase {
  /** 0＝新月，0.25＝上弦，0.5＝滿月，0.75＝下弦 */
  p: number;
  /** 亮面比例 0–1 */
  lit: number;
  waxing: boolean;
  name: string;
  /** 月齡（天） */
  age: number;
}

export function moonPhase(date: Date = new Date()): MoonPhase {
  const days = (date.getTime() - NEW_MOON) / 86400000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const p = age / SYNODIC;
  const lit = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const name =
    p < 0.033 || p >= 0.967
      ? '新月'
      : p < 0.216
        ? '眉月'
        : p < 0.283
          ? '上弦月'
          : p < 0.466
            ? '盈凸月'
            : p < 0.533
              ? '滿月'
              : p < 0.716
                ? '虧凸月'
                : p < 0.783
                  ? '下弦月'
                  : '殘月';
  return { p, lit, waxing: p < 0.5, name, age };
}

/**
 * 亮面的 SVG 路徑（北半球看到的樣子：漸盈亮在右邊、漸虧亮在左邊）。
 * 新月回傳空字串，滿月回傳整個圓。
 */
export function litPath(cx: number, cy: number, r: number, m: MoonPhase): string {
  const f = (n: number) => Math.round(n * 100) / 100;
  if (m.lit < 0.01) return '';
  if (m.lit > 0.99)
    return `M${f(cx - r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
  const rx = f(r * Math.abs(Math.cos(2 * Math.PI * m.p)));
  const top = `${f(cx)} ${f(cy - r)}`;
  const bottom = `${f(cx)} ${f(cy + r)}`;
  const crescent = m.lit < 0.5;
  if (m.waxing) {
    // 右半圓，再沿明暗界線回到頂端；眉月界線往右彎、凸月往左彎
    return `M${top} A${r} ${r} 0 0 1 ${bottom} A${rx} ${r} 0 0 ${crescent ? 0 : 1} ${top} Z`;
  }
  return `M${top} A${r} ${r} 0 0 0 ${bottom} A${rx} ${r} 0 0 ${crescent ? 1 : 0} ${top} Z`;
}
