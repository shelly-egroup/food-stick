'use client';

import { fb } from './firebase';
import { categoryOf, priceOf, walkOf, type Restaurant } from './types';

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
