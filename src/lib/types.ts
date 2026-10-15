/** 類型、價位、步行可以填的值都從下面的表推出來，改選項只要改表（firestore.rules 也要跟著改，types.test.ts 會檢查） */
export type CategoryId = (typeof CATEGORIES)[number]['id'];
export type Price = (typeof PRICES)[number]['v'];
export type Walk = (typeof WALKS)[number]['v'];
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
  role?: string;
}

export interface Note {
  id: string;
  rid: string;
  uid: string;
  text: string;
  createdAt: Date | null;
}

/**
 * 店的類型、價位、步行：名字和小圖都只寫在這裡，施法頁的篩選、店家頁的篩選、新增店家的表單都讀這幾張表。
 * icon 是 24×24、線條粗 1.7 的 SVG path（碗飯、麵、便當盒、咖啡、地球、葉子、餃子、手搖杯、蛋糕、刀叉）。
 */
export const CATEGORIES = [
  {
    id: 'rice',
    label: '飯',
    seal: '飯',
    icon: 'M3.5 12h17a8.5 8 0 0 1-17 0ZM6 12c.4-3.2 3-5 6-5s5.6 1.8 6 5M9 4.5c.8.8.8 1.7 0 2.5M13 3.5c.8.8.8 1.7 0 2.5',
  },
  {
    id: 'noodle',
    label: '麵',
    seal: '麵',
    icon: 'M3.5 12h17a8.5 8 0 0 1-17 0ZM7 12c.8-2.4 1.6-2.4 2.4 0s1.6 2.4 2.4 0 1.6-2.4 2.4 0M15 3l-3.5 9M19.5 4.5 13.5 12',
  },
  {
    id: 'bento',
    label: '便當',
    seal: '便',
    icon: 'M3.5 7h17v12h-17ZM12 7v12M3.5 13h8.5M15 10.5h3M15 13.5h3M15 16.5h3',
  },
  {
    id: 'brunch',
    label: '早午餐',
    seal: '早',
    icon: 'M4.5 9.5h12v4.5a5.5 5.5 0 0 1-5.5 5.5h-1A5.5 5.5 0 0 1 4.5 14ZM16.5 10.5h1.5a2.5 2.5 0 0 1 0 5h-1.5M8 3.5c.8.9.8 2.1 0 3M12 3.5c.8.9.8 2.1 0 3',
  },
  {
    id: 'world',
    label: '異國',
    seal: '異',
    icon: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17',
  },
  {
    id: 'light',
    label: '輕食',
    seal: '輕',
    icon: 'M5.5 18.5C5.5 10.5 10.5 5.5 19.5 4.5c0 9-5 14-13 14ZM5.5 18.5l7.5-7.5M4 20.5l1.5-2',
  },
  {
    id: 'snack',
    label: '小吃',
    seal: '小',
    icon: 'M3.5 15.5c0-5 3.9-8.5 8.5-8.5s8.5 3.5 8.5 8.5c-2.4 1.4-5.2 2-8.5 2s-6.1-.6-8.5-2ZM8 10.5l1.2 2M12 9v2.6M16 10.5l-1.2 2',
  },
  {
    id: 'drink',
    label: '飲料',
    seal: '飲',
    icon: 'M6.4 8.2h11.2l-1.5 12.4a1.6 1.6 0 0 1-1.6 1.4H9.5a1.6 1.6 0 0 1-1.6-1.4ZM5.2 8.2h13.6M12.6 8.2 15.4 2.4M9.7 17.2h.01M12 18.4h.01M14.3 17.2h.01',
  },
  {
    id: 'dessert',
    label: '甜點',
    seal: '甜',
    icon: 'M3.5 13 20.5 8.4v11.1h-17ZM3.5 15.8l17-1.6M20.5 8.4 13 5.6M15.6 3.6a1.6 1.6 0 1 1 0 .01',
  },
  {
    id: 'other',
    label: '其他',
    seal: '雜',
    icon: 'M7 3.5v7M5 3.5v4a2 2 0 0 0 4 0v-4M7 10.5v10M17.5 3.5c-2.2 2-2.2 7 0 8.5v8.5',
  },
] as const satisfies readonly { id: string; label: string; seal: string; icon: string }[];

export const PRICES = [
  { v: 1, label: '百元內', coins: '$' },
  { v: 2, label: '100–200', coins: '$$' },
  { v: 3, label: '200 以上', coins: '$$$' },
] as const satisfies readonly { v: number; label: string; coins: string }[];

/** 一個腳印（鞋底＋腳跟）：cx、cy 是鞋底中心，k 是大小 */
const foot = (cx: number, cy: number, k = 1) => {
  const e = (x: number, y: number, rx: number, ry: number) =>
    `M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
  return e(cx, cy, 1.9 * k, 3 * k) + e(cx, cy + 4.7 * k, 1.3 * k, 1.5 * k);
};

/** 走過去要多久：腳印越多走越遠，20 分以上是一個大步走的人 */
export const WALKS = [
  { v: 5, label: '5 分內', icon: foot(8.5, 12, 1.25) + foot(15.5, 5.5, 1.25) },
  { v: 10, label: '10 分', icon: foot(5.5, 13.5, 1.05) + foot(12, 9, 1.05) + foot(18.5, 4.5, 1.05) },
  {
    v: 15,
    label: '15 分',
    icon: foot(4, 15, 0.85) + foot(9.3, 11.5, 0.85) + foot(14.6, 8, 0.85) + foot(19.9, 4.5, 0.85),
  },
  {
    v: 20,
    label: '20 分以上',
    icon: 'M13.5 3a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM12.5 8.5l-2.5 5 3 2.5v5M12.5 8.5l2.5 3.5 3.5 1M10 13.5l-2 7M12.5 8.5l-3.5 1.5-1.5 3.5M3 21h4M17 21h4',
  },
] as const satisfies readonly { v: number; label: string; icon: string }[];

/** 找不到的類型一律當「其他」（用 id 找，表的順序改了也不會錯） */
export const categoryOf = (id: CategoryId): (typeof CATEGORIES)[number] =>
  CATEGORIES.find((c) => c.id === id) ?? categoryOf('other');
export const priceOf = (v: Price) => PRICES.find((p) => p.v === v) ?? PRICES[0];
export const walkOf = (v: Walk) => WALKS.find((w) => w.v === v) ?? WALKS[0];

/** 表裡有沒有這個值（手機裡存的資料可能是舊版的選項） */
export const isCategoryId = (v: unknown): v is CategoryId => CATEGORIES.some((c) => c.id === v);
export const isPrice = (v: unknown): v is Price => PRICES.some((p) => p.v === v);
export const isWalk = (v: unknown): v is Walk => WALKS.some((w) => w.v === v);
