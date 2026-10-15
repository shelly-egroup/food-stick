import { isThemeId, type ThemeId } from '../themes/ids';
import { cleanFilters, type DrawFilters, type Preference } from './draw';
import type { DrawMode } from './types';

/*
 * 一餐一張單（meals/{日期_餐別_發起人}）：自己吃、揪團吃都是同一種單，自己吃就是名單只有自己。
 * 這裡只放型別、表和純邏輯（不碰 Firestore），首頁、通知、歷史、規則測試都照這裡的說法。
 */

/** 餐別：預設午餐；也可以自己打字。icon 是 24×24、線條粗 1.7 的 SVG path */
export const SLOTS = [
  {
    key: 'breakfast',
    label: '早餐',
    // 地平線上露出半顆太陽
    icon: 'M3 17h18M6.5 17a5.5 5.5 0 0 1 11 0M12 5.5V8M5.2 9.4l1.6 1.6M18.8 9.4l-1.6 1.6M8.5 20.5h7',
  },
  {
    key: 'lunch',
    label: '午餐',
    // 正中午的太陽
    icon: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4 7 7M17 17l1.6 1.6M5.4 18.6 7 17M17 7l1.6-1.6',
  },
  {
    key: 'tea',
    label: '下午茶',
    // 冒著熱氣的茶杯
    icon: 'M4.5 9.5h12V13a5.5 5.5 0 0 1-5.5 5.5h-1A5.5 5.5 0 0 1 4.5 13ZM16.5 10.5H18a2.5 2.5 0 0 1 0 5h-1.5M3.5 21h15M9 3.5c.8.9.8 2.1 0 3M13 3.5c.8.9.8 2.1 0 3',
  },
  {
    key: 'dinner',
    label: '晚餐',
    // 碗上掛著一彎月
    icon: 'M3.5 13.5h17a8.5 7 0 0 1-17 0ZM15 3.4a4 4 0 1 0 4.6 5.4A3.4 3.4 0 0 1 15 3.4Z',
  },
  {
    key: 'supper',
    label: '宵夜',
    // 弦月和兩顆星
    icon: 'M15 4.2a8 8 0 1 0 5 13.4A7 7 0 0 1 15 4.2ZM6 3.6l.6 1.4 1.4.6-1.4.6L6 7.6l-.6-1.4L4 5.6l1.4-.6ZM9.6 10.6l.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4Z',
  },
] as const satisfies readonly { key: string; label: string; icon: string }[];

export type SlotKey = (typeof SLOTS)[number]['key'];
export interface Slot {
  key: SlotKey | 'custom';
  label: string;
}

/** 自己寫的餐別：一支毛筆 */
export const CUSTOM_SLOT_ICON = 'M4 20l4.4-1.2L19 8.2a2.1 2.1 0 0 0-3-3L5.3 15.8ZM14.6 6.6l2.8 2.8M4 20l1.3-4.2';
export const SLOT_MAX = 8;
export const DEFAULT_SLOT: Slot = { key: 'lunch', label: '午餐' };

export const isSlotKey = (v: unknown): v is SlotKey => SLOTS.some((s) => s.key === v);

/** 自己打的餐別：拿掉空白和單號用不了的符號，最多 8 個字；剛好是內建的名字就用內建的 */
export function customSlot(text: string): Slot | null {
  const label = [...text.replace(/[\s/\\.#[\]_]/g, '')].slice(0, SLOT_MAX).join('');
  if (!label) return null;
  const preset = SLOTS.find((s) => s.label === label);
  return preset ? { key: preset.key, label: preset.label } : { key: 'custom', label };
}

export const slotIcon = (s: Slot) => SLOTS.find((x) => x.key === s.key)?.icon ?? CUSTOM_SLOT_ICON;
/** 單號裡的餐別：內建的用英文代號，自己寫的是 c-名字 */
export const slotCode = (s: Slot) => (s.key === 'custom' ? `c-${s.label}` : s.key);
export const sameSlot = (a: Slot, b: Slot) => slotCode(a) === slotCode(b);
export const mealIdOf = (date: string, slot: Slot, host: string) => `${date}_${slotCode(slot)}_${host}`;

const TAIPEI = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
/** 台北時間的日期（YYYY-MM-DD）：同一天、同一餐只有一張單，就是看這個 */
export const taipeiDate = (t: number | Date) => TAIPEI.format(t);

/** 開單後幾小時結束 */
export const MEAL_HOURS = 3;
export const MEAL_MS = MEAL_HOURS * 3_600_000;
/** 重抽次數：預設 3 次，發起人最多設到 5 次 */
export const REROLLS = 3;
export const MAX_REROLLS = 5;
export const MAX_PARTY = 50;

export type Answer = 'in' | 'out';
/** open 還在抽；decided 起駕了（就是定案）；cancelled 發起人取消 */
export type MealStatus = 'open' | 'decided' | 'cancelled';
export const MEAL_STATUSES: MealStatus[] = ['open', 'decided', 'cancelled'];

/** 抽到的一支：當時的店名、誰抽的、籤詩種子；lines／verdict 是 AI 照 theme 那個主題寫的（沒有就空的） */
export interface MealPick {
  rid: string;
  name: string;
  by: string;
  at: Date | null;
  seed: number;
  variant: string;
  theme: ThemeId;
  lines: string[];
  verdict: string;
}

/** 「這家去不了」：哪一家、誰按的 */
export interface MealSkip {
  rid: string;
  by: string;
  at: Date | null;
}

export interface MealFilters extends DrawFilters {
  prefer: Preference;
}

export interface Meal {
  id: string;
  v: number;
  date: string;
  slot: Slot;
  host: string;
  /** 被揪的所有人（含發起人）；自己吃就只有自己 */
  party: string[];
  /** 被揪的人的回覆；沒有 = 還沒回。發起人不在這裡，一定是要去 */
  answers: Record<string, Answer>;
  /** 要去的人（含發起人） */
  going: string[];
  /** 發起人設的重抽次數；「這家去不了」之後回到這個數字 */
  rerolls: number;
  rerollsLeft: number;
  filters: MealFilters;
  /** 抽過的每一支（只會往後加） */
  picks: MealPick[];
  /** 候選：還能選的店（照抽到的順序）；按了「去不了」的會拿掉 */
  cands: string[];
  skips: MealSkip[];
  /** 起駕的那一家 */
  decision: { rid: string; by: string; at: Date | null } | null;
  status: MealStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
  endsAt: Date | null;
}

export const NO_MEAL_FILTERS: MealFilters = { categories: [], prices: [], walks: [], prefer: 'favorites' };

export const cleanMealFilters = (v: unknown): MealFilters => ({
  ...cleanFilters(v),
  prefer: (v as { prefer?: unknown } | null)?.prefer === 'explore' ? 'explore' : 'favorites',
});

/* ---------- 讀資料：唯一的入口，缺的欄位在這裡補預設值 ---------- */

type Raw = Record<string, unknown>;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown) => (typeof v === 'string' ? v : '');
const int = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : fallback);
const strings = (v: unknown) => list(v).filter((x): x is string => typeof x === 'string');

function toSlot(v: unknown): Slot {
  const x = (v ?? {}) as Raw;
  if (isSlotKey(x.key)) return { key: x.key, label: SLOTS.find((s) => s.key === x.key)!.label };
  const label = text(x.label);
  return x.key === 'custom' && label ? { key: 'custom', label } : DEFAULT_SLOT;
}

/** Firestore 的一筆餐單（toDate 負責把 Timestamp 轉成 Date） */
export function toMeal(id: string, x: Raw, toDate: (v: unknown) => Date | null): Meal {
  const answers: Record<string, Answer> = {};
  Object.entries((x.answers ?? {}) as Raw).forEach(([u, a]) => {
    if (a === 'in' || a === 'out') answers[u] = a;
  });
  const decision = (x.decision ?? null) as Raw | null;
  return {
    id,
    v: int(x.v, 1),
    date: text(x.date),
    slot: toSlot(x.slot),
    host: text(x.host),
    party: strings(x.party),
    answers,
    going: strings(x.going),
    rerolls: int(x.rerolls, REROLLS),
    rerollsLeft: int(x.rerollsLeft),
    filters: cleanMealFilters(x.filters),
    picks: list(x.picks).map((p) => {
      const q = (p ?? {}) as Raw;
      return {
        rid: text(q.rid),
        name: text(q.name),
        by: text(q.by),
        at: toDate(q.at),
        seed: int(q.seed),
        variant: text(q.variant),
        theme: isThemeId(q.theme) ? q.theme : 'temple',
        lines: strings(q.lines),
        verdict: text(q.verdict),
      };
    }),
    cands: strings(x.cands),
    skips: list(x.skips).map((s) => {
      const q = (s ?? {}) as Raw;
      return { rid: text(q.rid), by: text(q.by), at: toDate(q.at) };
    }),
    decision:
      decision && text(decision.rid)
        ? { rid: text(decision.rid), by: text(decision.by), at: toDate(decision.at) }
        : null,
    status: MEAL_STATUSES.includes(x.status as MealStatus) ? (x.status as MealStatus) : 'cancelled',
    createdAt: toDate(x.createdAt),
    updatedAt: toDate(x.updatedAt),
    endsAt: toDate(x.endsAt),
  };
}

/* ---------- 純邏輯 ---------- */

export type MateState = 'in' | 'out' | 'wait';

/** 一個人在這一餐的狀態：發起人一定要去；其他人看回覆，沒回就是還沒回 */
export const stateOf = (m: Meal, uid: string): MateState => (uid === m.host ? 'in' : (m.answers[uid] ?? 'wait'));
export const isGoing = (m: Meal, uid: string) => m.party.includes(uid) && stateOf(m, uid) === 'in';
export const modeOf = (m: Meal): DrawMode => (m.party.length > 1 ? 'group' : 'solo');

/** 除了 skip 以外，要去、還沒回、不去各幾個人 */
export function tallyOf(m: Meal, skip?: string) {
  const t: Record<MateState, number> = { in: 0, wait: 0, out: 0 };
  m.party.forEach((u) => u !== skip && (t[stateOf(m, u)] += 1));
  return t;
}

export const endsAtOf = (m: Meal) =>
  m.endsAt?.getTime() ?? (m.createdAt ? m.createdAt.getTime() + MEAL_MS : Number.POSITIVE_INFINITY);
export const isEnded = (m: Meal, now: number) => now >= endsAtOf(m);
/** 還在進行：沒取消、還沒到結束時間 */
export const isLive = (m: Meal, now: number) => m.status !== 'cancelled' && !isEnded(m, now);

/** 某一家最後一次被抽到的那一支 */
export const pickOf = (m: Meal, rid: string) => m.picks.findLast((p) => p.rid === rid) ?? null;
/** 候選：照抽到的順序 */
export const candidatesOf = (m: Meal) => m.cands.map((rid) => pickOf(m, rid)).filter((p): p is MealPick => !!p);
/** 最新抽到、還能選的那一支 */
export const latestOf = (m: Meal) => candidatesOf(m).at(-1) ?? null;
/** 起駕的那一支 */
export const chosenOf = (m: Meal) => (m.decision ? pickOf(m, m.decision.rid) : null);
export const skipOf = (m: Meal, rid: string) => m.skips.findLast((s) => s.rid === rid) ?? null;

/** 現在能不能抽：還在進行、還沒起駕、我要去；第一支不用次數，之後要有剩 */
export const canDraw = (m: Meal, uid: string, now: number) =>
  isLive(m, now) && m.status === 'open' && isGoing(m, uid) && (m.picks.length === 0 || m.rerollsLeft > 0);
/** 現在能不能起駕：還在抽的階段、我要去、有候選 */
export const canDecide = (m: Meal, uid: string, now: number) =>
  isLive(m, now) && m.status === 'open' && isGoing(m, uid) && m.cands.length > 0;
/** 「這家去不了」：起駕前後都可以，只要這餐還沒結束 */
export const canSkip = (m: Meal, uid: string, now: number) => isLive(m, now) && isGoing(m, uid) && m.cands.length > 0;
/** 同一個餐別可以重新開張：取消了，或時間到了還沒起駕（重抽次數接續原本的） */
export const canReopen = (m: Meal, now: number) => m.status === 'cancelled' || (isEnded(m, now) && !m.decision);

/** 「進行中」要不要放這一餐：還在進行、跟我有關；起駕之後只留給還沒回覆的人 */
export function showsLive(m: Meal, uid: string, now: number) {
  if (!m.party.includes(uid) || !isLive(m, now)) return false;
  return m.status === 'open' || stateOf(m, uid) === 'wait';
}

/** 有事等我做（紅點）：還沒回的邀請 */
export const needsMe = (m: Meal, uid: string, now: number) =>
  isLive(m, now) && m.party.includes(uid) && stateOf(m, uid) === 'wait';

const newest = (a: Meal, b: Meal) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0);

/**
 * 首頁現在的那一餐（這一天、這個餐別）：
 * - live：我要去、還在進行的（好幾張時用最近動過的）
 * - done：已經起駕、我有去的（這一餐吃過了，不能再開一張）
 * - own：我自己發起的那一張（可能已經取消或過時間，可以重新開張）
 */
export function mealsFor(meals: Meal[], uid: string, date: string, slot: Slot, now: number) {
  const here = meals.filter((m) => m.date === date && sameSlot(m.slot, slot));
  const live = here.filter((m) => isLive(m, now) && isGoing(m, uid)).sort(newest)[0] ?? null;
  const done = here.filter((m) => m.status === 'decided' && !!m.decision && isGoing(m, uid)).sort(newest)[0] ?? null;
  const own = here.find((m) => m.id === mealIdOf(date, slot, uid)) ?? null;
  return { live, done, own };
}

/** 起駕過的餐（排行榜、常一起吃的人、最近吃過的店都看這個） */
export const decided = (meals: Meal[]) => meals.filter((m) => m.status === 'decided' && !!m.decision);
