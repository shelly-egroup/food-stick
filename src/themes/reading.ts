/**
 * 籤詩共用工具：每首四句、每句七個字。
 * 第一句看店的類型，第二句看走多遠，第三句看價位，第四句看自己吃還是揪團。
 * 這個檔案和各主題的 reading.ts 都不能引用 React 或 CSS，單元測試直接跑。
 */
import type { CategoryId, DrawMode, Price, Restaurant, Walk } from '@/lib/types';

export type Rand = () => number;

export interface Verses {
  opening: Record<CategoryId, string[]>;
  walk: Record<Walk, string[]>;
  price: Record<Price, string[]>;
  closing: Record<DrawMode, string[]>;
}

export interface Grade {
  seal: string;
  name: string;
  weight: number;
}

export const pick = <T>(list: T[], rand: Rand) => list[Math.floor(rand() * list.length) % list.length];

/** 第幾號：1–100 */
export const rollNumber = (rand: Rand) => 1 + Math.floor(rand() * 100);

/** 依權重抽籤等 */
export function rollGrade(grades: Grade[], rand: Rand): { seal: string; name: string } {
  let roll = rand() * grades.reduce((s, g) => s + g.weight, 0);
  const g = grades.find((x) => (roll -= x.weight) < 0) ?? grades[0];
  return { seal: g.seal, name: g.name };
}

export function compose(v: Verses, r: Restaurant, mode: DrawMode, rand: Rand): [string, string, string, string] {
  return [
    pick(v.opening[r.category], rand),
    pick(v.walk[r.walk], rand),
    pick(v.price[r.price], rand),
    pick(v.closing[mode], rand),
  ];
}

/** 全部句子，給測試檢查字數 */
export const allLines = (v: Verses) =>
  [v.opening, v.walk, v.price, v.closing].flatMap((group) => Object.values(group).flat());
