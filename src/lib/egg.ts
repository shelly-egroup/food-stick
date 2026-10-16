'use client';

import { fb } from './firebase';

/** 連續失敗幾次（例如伺服器沒設 key、網路不通）就先不叫了 */
let misses = 0;

/**
 * 請網站自己的伺服器（/api/egg）用 Groq 現寫一句封面彩蛋（口味由伺服器照比例抽，主題特色佔一半）。
 * 帶著 Firebase 的登入憑證；寫不出來、太慢，一律回傳 null，畫面就用準備好的句子。
 */
export async function askEgg(theme: string): Promise<string | null> {
  const user = fb().auth.currentUser;
  if (!user || misses >= 3) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch('/api/egg/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ theme }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`egg ${res.status}`);
    const data = (await res.json()) as { line: string | null };
    misses = 0;
    return typeof data?.line === 'string' && data.line ? data.line : null;
  } catch {
    misses += 1;
    return null;
  } finally {
    clearTimeout(timer);
  }
}
