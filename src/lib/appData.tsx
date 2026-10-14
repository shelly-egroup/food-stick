'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useDrawsSince, useMembers, useRestaurants } from './store';
import type { DrawRecord, Member, Restaurant } from './types';

export interface AppData {
  me: Member;
  members: Member[];
  memberMap: Map<string, Member>;
  restaurants: Restaurant[];
  restaurantMap: Map<string, Restaurant>;
  /** 本月（含最近三天）的抽籤紀錄 */
  draws: DrawRecord[];
  ready: boolean;
}

const Ctx = createContext<AppData | null>(null);

function sinceDate() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeDays = new Date(now.getTime() - 3 * 86400_000);
  return monthStart < threeDays ? monthStart : threeDays;
}

const SINCE = sinceDate();

export function AppDataProvider({ me, children }: { me: Member; children: ReactNode }) {
  const members = useMembers(true);
  const restaurants = useRestaurants(true);
  const draws = useDrawsSince(SINCE, true);

  const value = useMemo<AppData>(() => {
    const ms = members.data ?? [me];
    const rs = restaurants.data ?? [];
    return {
      me,
      members: ms,
      memberMap: new Map(ms.map((m) => [m.id, m])),
      restaurants: rs,
      restaurantMap: new Map(rs.map((r) => [r.id, r])),
      draws: draws.data ?? [],
      ready: !!members.data && !!restaurants.data,
    };
  }, [me, members.data, restaurants.data, draws.data]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData 需要在 AppDataProvider 裡使用');
  return v;
}
