'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useBrowserValue } from './useBrowser';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Android 的安裝提示：瀏覽器準備好時會發 beforeinstallprompt，先收起來等使用者按 */
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const hasPrompt = () => !!deferred;
const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIOS = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** 加到主畫面：Android 用系統的安裝提示；iOS 只能提示使用者從分享選單加入 */
export function useInstall() {
  const ready = useSyncExternalStore(subscribe, hasPrompt, () => false);
  const standalone = useBrowserValue(isStandalone, false);
  const ios = useBrowserValue(isIOS, false);

  const prompt = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    deferred = null;
    notify();
  }, []);

  return { canPrompt: ready && !standalone, iosHint: ios && !standalone, prompt };
}
