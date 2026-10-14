export type CategoryId = 'rice' | 'noodle' | 'bento' | 'snack' | 'world' | 'light' | 'brunch' | 'other';
export type Price = 1 | 2 | 3;
export type Walk = 5 | 10 | 15 | 20;
export type DrawMode = 'solo' | 'group';

export interface Restaurant {
  id: string;
  name: string;
  category: CategoryId;
  price: Price;
  walk: Walk;
  group: boolean;
  mapUrl: string;
  /** 開放大家一起修改（預設開）；關掉的話只有建立者能改 */
  open: boolean;
  createdBy: string;
  createdAt: Date | null;
}

/** 自己存的揪團名單：廟宇叫進香團、魔法叫冒險小隊 */
export interface Crew {
  name: string;
  ids: string[];
}

export interface Member {
  id: string;
  name: string;
  photoURL: string;
  likes: string[];
  blocks: string[];
  /** 自己存的揪團名單（最多 8 個） */
  crews: Crew[];
  /** 自己抽的額度：哪一天、今天還能重抽幾次（寫在資料庫裡，重新整理也不會重來） */
  today: { day: string; left: number } | null;
  role?: string;
}

export interface DrawRecord {
  id: string;
  rid: string;
  uid: string;
  mode: DrawMode;
  party: string[];
  createdAt: Date | null;
  rerolled: boolean;
}

export interface Note {
  id: string;
  rid: string;
  uid: string;
  text: string;
  createdAt: Date | null;
}

export const CATEGORIES: { id: CategoryId; label: string; seal: string }[] = [
  { id: 'rice', label: '飯', seal: '飯' },
  { id: 'noodle', label: '麵', seal: '麵' },
  { id: 'bento', label: '便當', seal: '便' },
  { id: 'brunch', label: '早午餐', seal: '早' },
  { id: 'world', label: '異國', seal: '異' },
  { id: 'light', label: '輕食', seal: '輕' },
  { id: 'snack', label: '小吃', seal: '小' },
  { id: 'other', label: '其他', seal: '雜' },
];

export const PRICES: { v: Price; label: string; coins: string }[] = [
  { v: 1, label: '百元內', coins: '$' },
  { v: 2, label: '100–200', coins: '$$' },
  { v: 3, label: '200 以上', coins: '$$$' },
];

export const WALKS: { v: Walk; label: string }[] = [
  { v: 5, label: '5 分內' },
  { v: 10, label: '10 分' },
  { v: 15, label: '15 分' },
  { v: 20, label: '20 分以上' },
];

export const categoryOf = (id: CategoryId) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[7];
export const priceOf = (v: Price) => PRICES.find((p) => p.v === v) ?? PRICES[0];
export const walkOf = (v: Walk) => WALKS.find((w) => w.v === v) ?? WALKS[0];
