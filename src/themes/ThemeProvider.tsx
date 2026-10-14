'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { DEFAULT_THEME, isThemeId, type ThemeId } from './ids';
import { THEMES } from './registry';
import type { Theme } from './types';
import { reducedMotion } from '@/lib/motion';

const KEY = 'lunchstick:theme';
/** 早期版本用的名字，讀得到就沿用 */
const OLD_KEY = 'lunchstick:faith';

/** 存不進 localStorage 時（無痕模式）記在這裡，至少這次瀏覽有效 */
let fallback: ThemeId | null = null;
const listeners = new Set<() => void>();

function loadThemeId(): ThemeId {
  try {
    const v = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (isThemeId(v)) return v;
  } catch {
    /* 讀不到就用記憶體裡的 */
  }
  return fallback ?? DEFAULT_THEME;
}

function saveThemeId(id: ThemeId) {
  fallback = id;
  try {
    localStorage.setItem(KEY, id);
    localStorage.removeItem(OLD_KEY);
  } catch {
    /* 存不了就算了 */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // 別的分頁換了主題也跟著換
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

interface ThemeState {
  theme: Theme;
  /** 切換主題：從 origin 畫一個圓擴散開來，圓蓋滿時換主題 */
  setTheme: (id: ThemeId, origin?: { x: number; y: number }) => void;
}

const Ctx = createContext<ThemeState>({ theme: THEMES[DEFAULT_THEME], setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 預先產生的頁面用預設主題，載入後換成這台裝置上次選的
  const id = useSyncExternalStore(subscribe, loadThemeId, () => DEFAULT_THEME);
  const [wipe, setWipe] = useState<{ to: ThemeId; x: number; y: number; key: number } | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    document.documentElement.dataset.theme = id;
  }, [id]);

  const setTheme = useCallback(
    (next: ThemeId, origin?: { x: number; y: number }) => {
      if (next === id) return;
      THEMES[next].sound();
      if (reducedMotion()) {
        saveThemeId(next);
        return;
      }
      const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      setWipe({ to: next, x: o.x, y: o.y, key: ++seq.current });
      // 圓蓋滿畫面時才真的換主題
      setTimeout(() => saveThemeId(next), 420);
      setTimeout(() => setWipe(null), 1000);
    },
    [id],
  );

  const value = useMemo(() => ({ theme: THEMES[id], setTheme }), [id, setTheme]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {wipe && (
        <div
          key={wipe.key}
          className="theme-wipe"
          data-theme={wipe.to}
          style={{ ['--x' as string]: `${wipe.x}px`, ['--y' as string]: `${wipe.y}px` }}
          aria-hidden="true"
        />
      )}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
