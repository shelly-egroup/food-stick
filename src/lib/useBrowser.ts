'use client';

import { useSyncExternalStore } from 'react';

const never = () => () => {};

/**
 * 只有瀏覽器才知道的值（例如是不是 iPhone）。預先產生的頁面先用 fallback，
 * 載入後再換成真正的值，不會造成 hydration 不一致。read 要回傳字串、數字、布林這類穩定的值。
 */
export function useBrowserValue<T extends string | number | boolean | null>(read: () => T, fallback: T): T {
  return useSyncExternalStore(never, read, () => fallback);
}

/** CSS media query 目前成不成立，視窗大小改變時跟著更新 */
export function useMedia(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

const MINUTE = 60_000;
const everyMinute = (cb: () => void) => {
  const t = setInterval(cb, MINUTE);
  return () => clearInterval(t);
};
const thisMinute = () => Math.floor(Date.now() / MINUTE) * MINUTE;

/** 現在時間（以分鐘為單位更新），算「今天」「最近三天」用 */
export function useNow(): number {
  return useSyncExternalStore(everyMinute, thisMinute, () => 0);
}
