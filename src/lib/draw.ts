import type { CategoryId, Member, Price, Restaurant, Walk } from './types';

export interface DrawFilters {
  categories: CategoryId[];
  prices: Price[];
  /** 之前存在手機裡的篩選沒有這一項，當成不限 */
  walks?: Walk[];
}

/**
 * 抽籤偏好
 * - favorites（愛店優先）：越多人愛的店越容易中
 * - explore（探店）：還沒人愛過、這陣子沒吃過的店比較容易中
 */
export type Preference = 'favorites' | 'explore';

export interface DrawInput {
  restaurants: Restaurant[];
  /** 一起吃的人（自己吃就只有自己） */
  party: Member[];
  filters: DrawFilters;
  /** 最近幾天已經定案過的店，降低機率 */
  recent: string[];
  prefer?: Preference;
  /** 探店用：一起吃的人這陣子已經吃過的店 */
  eaten?: string[];
  /** 這一輪重抽前抽到過的店，避免一直抽到同一家 */
  exclude?: string[];
}

export interface Candidate {
  restaurant: Restaurant;
  weight: number;
  likedBy: number;
}

/** 三人以上揪團時，只抽適合多人的店 */
export const BIG_GROUP = 3;

export function candidates({
  restaurants,
  party,
  filters,
  recent,
  prefer = 'favorites',
  eaten = [],
  exclude = [],
}: DrawInput): Candidate[] {
  const blocked = new Set(party.flatMap((m) => m.blocks));
  const recentSet = new Set(recent);
  const eatenSet = new Set(eaten);
  const excluded = new Set(exclude);
  const big = party.length >= BIG_GROUP;

  return restaurants
    .filter((r) => !blocked.has(r.id))
    .filter((r) => filters.categories.length === 0 || filters.categories.includes(r.category))
    .filter((r) => filters.prices.length === 0 || filters.prices.includes(r.price))
    .filter((r) => !filters.walks?.length || filters.walks.includes(r.walk))
    .filter((r) => !big || r.group)
    .filter((r) => !excluded.has(r.id))
    .map((restaurant) => {
      const likedBy = party.filter((m) => m.likes.includes(restaurant.id)).length;
      let weight: number;
      if (prefer === 'explore') {
        weight = likedBy > 0 ? 1 : 3;
        if (eatenSet.has(restaurant.id)) weight *= 0.3;
      } else {
        weight = 1 + 2 * likedBy;
      }
      if (recentSet.has(restaurant.id)) weight *= 0.25;
      return { restaurant, weight, likedBy };
    });
}

export function pickWeighted<T extends { weight: number }>(list: T[], rand: () => number = Math.random): T | null {
  const total = list.reduce((s, c) => s + c.weight, 0);
  if (list.length === 0 || total <= 0) return null;
  let roll = rand() * total;
  for (const c of list) {
    roll -= c.weight;
    if (roll < 0) return c;
  }
  return list[list.length - 1];
}

/** 先避開這一輪抽過的店；全部都抽過了就不再排除 */
export function drawOne(input: DrawInput, rand: () => number = Math.random): Candidate | null {
  const fresh = candidates(input);
  if (fresh.length > 0) return pickWeighted(fresh, rand);
  if (input.exclude?.length) return pickWeighted(candidates({ ...input, exclude: [] }), rand);
  return null;
}
