import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

/**
 * 連哪個 Firebase：
 * - 正式網站（next build）：用 .env.local 裡的 lunch-stick 專案
 * - npm run dev：本機模擬器與示範資料，不會碰到正式資料
 * - npm run dev:test：開發時連雲端測試專案（.env.test.local 裡的 food-stick-dev）
 * - npm run dev:live：開發時直接連正式專案
 */
const MODE = process.env.NEXT_PUBLIC_FIREBASE_MODE;
export const usingEmulator =
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  (process.env.NODE_ENV === 'development' && MODE !== 'live' && MODE !== 'test');

let instance: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

/** 只在瀏覽器裡初始化；伺服器預先產生頁面時不會碰到 Firebase */
export function fb() {
  if (instance) return instance;
  const config = usingEmulator
    ? {
        apiKey: 'demo-key',
        authDomain: 'demo-lunchstick.firebaseapp.com',
        projectId: 'demo-lunchstick',
        appId: 'demo-app',
      }
    : {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: usingEmulator
      ? memoryLocalCache()
      : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (usingEmulator) {
    // 本機模擬器只聽 127.0.0.1，不對外
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    // 自動截圖用的測試登入：只有「開發模式＋本機模擬器」才存在，正式網站完全沒有這個入口
    if (process.env.NODE_ENV === 'development') {
      (window as unknown as Record<string, unknown>).__devLogin = (email: string, password: string) =>
        signInWithEmailAndPassword(auth, email, password);
    }
  }
  instance = { app, auth, db };
  return instance;
}

export async function signInWithGoogle() {
  const { auth } = fb();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

export const signOutNow = () => signOut(fb().auth);
