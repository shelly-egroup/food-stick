// 封面彩蛋的伺服器端：確認是 egroup 同事後，請 Groq（先用 gpt-oss-120b）現寫一句。
// 沒有設 GROQ_KEYS、或寫不出合格的，就回傳 null，網站改用準備好的句子。
import { NextResponse } from 'next/server';
import { caller, groqKeys, limiter } from '@/server/auth';
import { EGG_FLAVORS, randomFlavor, writeEgg, type EggFlavor } from '@/server/egg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 彩蛋點得比較快：每個人十分鐘內最多 60 句 */
const allow = limiter(60, 10 * 60_000);
const none = () => NextResponse.json({ line: null, model: null });

export async function POST(req: Request) {
  const uid = await caller(req);
  if (!uid) return NextResponse.json({ error: '只有 egroup 的同事可以看' }, { status: 403 });
  if (!allow(uid)) return NextResponse.json({ error: '點太快了，休息一下' }, { status: 429 });

  const keys = groqKeys();
  if (!keys.length) return none();

  const d = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const theme = d.theme === 'magic' ? 'magic' : 'temple';
  // 沒指定口味就照比例抽（主題特色佔一半）
  const flavor: EggFlavor = EGG_FLAVORS.find((f) => f === d.flavor) ?? randomFlavor();
  return (await writeEgg(theme, flavor, keys).then((v) => v && NextResponse.json(v))) ?? none();
}
