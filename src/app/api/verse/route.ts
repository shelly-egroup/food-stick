// AI 寫籤詩的伺服器端：瀏覽器帶著 Firebase 登入憑證來，確認是 egroup 同事後才代打 Groq。
// Groq 的 key 只放在伺服器的環境變數 GROQ_KEYS（逗號分隔多把），不會出現在瀏覽器裡。
// 部署到 Vercel 時這支會變成 serverless function；沒有設 GROQ_KEYS 就回傳 null，網站用原本的籤詩。
import { NextResponse } from 'next/server';
import { writeVerse, type VerseInput } from '@/server/verse';
import { caller, groqKeys, limiter } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 每個人十分鐘內最多叫幾次（粗略的限制，避免被拿來亂用） */
const allow = limiter(40, 10 * 60_000);

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const none = () => NextResponse.json({ lines: null, verdict: null, model: null });

export async function POST(req: Request) {
  const uid = await caller(req);
  if (!uid) return NextResponse.json({ error: '只有 egroup 的同事可以求籤' }, { status: 403 });

  if (!allow(uid)) return NextResponse.json({ error: '求籤太頻繁了，休息一下' }, { status: 429 });

  const keys = groqKeys();
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
