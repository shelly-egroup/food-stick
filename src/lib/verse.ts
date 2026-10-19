'use client';

import type { Reading, Theme } from '@/themes';
import { fb } from './firebase';
import type { MealPick } from './meal';
import { seeded } from './random';
import { categoryOf, priceOf, walkOf, type DrawMode, type Restaurant } from './types';

/** AI 寫的四句籤詩與一句解籤 */
export interface Verse {
  lines: [string, string, string, string];
  verdict: string;
}

/** 連續失敗幾次（例如伺服器沒設 key、網路不通）就先不叫了，免得每次都白等 */
let misses = 0;

/**
 * 請網站自己的伺服器（/api/verse）用 Groq 寫一支新的籤詩（預言）。籤號、籤等還是網站自己抽，這裡只要四句和解籤。
 * 帶著 Firebase 的登入憑證，伺服器確認是 egroup 同事才會寫。寫不出來、太慢，一律回傳 null，網站就用原本的籤詩。
 */
export async function askVerse(input: {
  theme: string;
  restaurant: Restaurant;
  party: number;
  grade: string;
  variant?: string;
}): Promise<Verse | null> {
  const user = fb().auth.currentUser;
  if (!user || misses >= 3) return null;
  const r = input.restaurant;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch('/api/verse/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({
        theme: input.theme,
        shop: r.name,
        category: categoryOf(r.category).label,
        price: priceOf(r.price).label,
        walk: walkOf(r.walk).label,
        group: r.group,
        party: input.party,
        grade: input.grade,
        variant: input.variant ?? '',
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`verse ${res.status}`);
    const data = (await res.json()) as { lines: string[] | null; verdict: string | null };
    misses = 0;
    if (!data?.lines || data.lines.length !== 4 || !data.verdict) return null;
    return { lines: data.lines as Verse['lines'], verdict: data.verdict };
  } catch {
    misses += 1;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 餐單上的一支籤要怎麼攤開：籤號、籤等用種子照「看的人」的主題寫；
 * AI 寫的四句是照抽的人當下的主題寫的，主題一樣才換上（不一樣就用網站原本的籤詩，風格不會混在一起）。
 */
export function readingOf(theme: Theme, r: Restaurant, pick: MealPick, mode: DrawMode): Reading {
  const base = theme.read(r, mode, pick.variant || undefined, seeded(pick.seed));
  return pick.theme === theme.id && pick.lines.length === 4 && pick.verdict
    ? { ...base, lines: pick.lines as Reading['lines'], verdict: pick.verdict }
    : base;
}
