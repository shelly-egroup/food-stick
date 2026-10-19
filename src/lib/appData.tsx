'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useDecidedSince, useLiveMeals, useMembers, useRestaurants } from './store';
import { taipeiDate, type Meal } from './meal';
import type { Member, Restaurant } from './types';

export interface AppData {
  me: Member;
  members: Member[];
  memberMap: Map<string, Member>;
  restaurants: Restaurant[];
  restaurantMap: Map<string, Restaurant>;
  /**
   * 餐單：跟我有關、還在進行的（即時），加上本月（含最近三天）大家起駕過的（打開時讀一次）。
   * 同一張以即時的為準
   */
  meals: Meal[];
  /** 只有即時的那幾張：通知用它比對有什麼新消息 */
  live: Meal[];
  ready: boolean;
}

const Ctx = createContext<AppData | null>(null);

/** 這個月一號、三天前，取比較早的那天（台北時間）：排行榜看本月，最近吃過的看三天 */
function sinceDate() {
  const now = Date.now();
  const today = taipeiDate(now);
  const monthStart = `${today.slice(0, 8)}01`;
  const threeDays = taipeiDate(now - 3 * 86400_000);
  return monthStart < threeDays ? monthStart : threeDays;
}

const SINCE = sinceDate();

export function AppDataProvider({ me, children }: { me: Member; children: ReactNode }) {
  const members = useMembers(true);
  const restaurants = useRestaurants(true);
  const live = useLiveMeals(me.id);
  const month = useDecidedSince(SINCE);

  const value = useMemo<AppData>(() => {
    const ms = members.data ?? [me];
    const rs = restaurants.data ?? [];
    return {
      me,
      members: ms,
      memberMap: new Map(ms.map((m) => [m.id, m])),
      restaurants: rs,
      restaurantMap: new Map(rs.map((r) => [r.id, r])),
      meals: [...new Map([...(month.data ?? []), ...(live.data ?? [])].map((m) => [m.id, m])).values()],
      live: live.data ?? [],
      // 餐單讀不到（例如資料庫規則還沒更新）也照常顯示畫面，只是沒有餐單
      ready: !!members.data && !!restaurants.data && (!!live.data || live.error) && (!!month.data || month.error),
    };
  }, [me, members.data, restaurants.data, live.data, live.error, month.data, month.error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData 需要在 AppDataProvider 裡使用');
  return v;
}
