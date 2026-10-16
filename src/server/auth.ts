// 伺服器端 API 共用的身分檢查：瀏覽器帶著 Firebase 登入憑證來，確認是信箱驗證過的 egroup 同事。
// 籤詩（/api/verse）和封面彩蛋（/api/egg）都用這一份，Groq 的 key 只在伺服器上。
import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload } from 'jose';

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

/** 看憑證是誰：要是信箱驗證過的 egroup 同事就回傳 uid，不是就回傳 null */
export async function caller(req: Request) {
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

/** 粗略的次數限制：同一個人在 windowMs 內最多叫 limit 次，超過回傳 false（每支 API 各自一份紀錄） */
export function limiter(limit: number, windowMs: number) {
  const recent = new Map<string, number[]>();
  return (uid: string) => {
    const now = Date.now();
    const mine = (recent.get(uid) ?? []).filter((t) => now - t < windowMs);
    if (mine.length >= limit) return false;
    recent.set(uid, [...mine, now]);
    return true;
  };
}

/** 伺服器環境變數裡的 Groq key（逗號或空白分隔多把） */
export const groqKeys = () => (process.env.GROQ_KEYS ?? '').split(/[\s,]+/).filter(Boolean);
