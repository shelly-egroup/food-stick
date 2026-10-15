// AI 寫籤詩的伺服器端：瀏覽器帶著 Firebase 登入憑證來，確認是 egroup 同事後才代打 Groq。
// Groq 的 key 只放在伺服器的環境變數 GROQ_KEYS（逗號分隔多把），不會出現在瀏覽器裡。
// 部署到 Vercel 時這支會變成 serverless function；沒有設 GROQ_KEYS 就回傳 null，網站用原本的籤詩。
import { NextResponse } from 'next/server';
import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload } from 'jose';
import { writeVerse, type VerseInput } from '@/server/verse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '';
const EGROUP = /^egroup\.[^@]+@gmail\.com$/i;
/** Firebase 登入憑證的公開金鑰 */
const KEYS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);
/** 本機開發連模擬器時，模擬器發的憑證沒有簽章：只有開發模式才接受（dev:test、dev:live 連的是雲端，照樣驗章） */
const MODE = process.env.NEXT_PUBLIC_FIREBASE_MODE;
const emulator =
  process.env.NODE_ENV === 'development' &&
  (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || (MODE !== 'live' && MODE !== 'test'));

/** 每個人十分鐘內最多叫幾次（粗略的限制，避免被拿來亂用） */
const LIMIT = 40;
const WINDOW_MS = 10 * 60_000;
const recent = new Map<string, number[]>();

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const none = () => NextResponse.json({ lines: null, verdict: null, model: null });

/** 看憑證是誰：要是信箱驗證過的 egroup 同事，不是就回傳 null */
async function caller(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const claims: JWTPayload = emulator
      ? decodeJwt(token)
      : (
          await jwtVerify(token, KEYS, {
            issuer: `https://securetoken.google.com/${PROJECT}`,
            audience: PROJECT,
          })
        ).payload;
    const email = typeof claims.email === 'string' ? claims.email : '';
    return claims.email_verified === true && EGROUP.test(email) && claims.sub ? claims.sub : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const uid = await caller(req);
  if (!uid) return NextResponse.json({ error: '只有 egroup 的同事可以求籤' }, { status: 403 });

  const now = Date.now();
  const mine = (recent.get(uid) ?? []).filter((t) => now - t < WINDOW_MS);
  if (mine.length >= LIMIT) return NextResponse.json({ error: '求籤太頻繁了，休息一下' }, { status: 429 });
  recent.set(uid, [...mine, now]);

  const keys = (process.env.GROQ_KEYS ?? '').split(/[\s,]+/).filter(Boolean);
  if (!keys.length) return none();

  const d = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const input: VerseInput = {
    theme: d.theme === 'magic' ? 'magic' : 'temple',
    shop: text(d.shop, 40),
    category: text(d.category, 12),
    price: text(d.price, 16),
    walk: text(d.walk, 16),
    group: d.group === true,
    party: Math.min(50, Math.max(1, Number.parseInt(String(d.party), 10) || 1)),
    grade: text(d.grade, 12),
    variant: d.variant === 'ball' || d.variant === 'book' ? d.variant : '',
  };
  if (!input.shop || !input.grade) return NextResponse.json({ error: '資料不完整' }, { status: 400 });

  // 寫不出合格的籤詩就回傳 null，網站會改用原本的籤詩
  return (await writeVerse(input, keys).then((v) => v && NextResponse.json(v))) ?? none();
}
