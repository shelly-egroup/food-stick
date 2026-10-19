'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/** localStorage 不能用時（例如無痕模式）先記在記憶體裡，至少這次瀏覽有效 */
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 存不了就只留在記憶體 */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // 別的分頁改了也跟著變
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

function parse<T>(raw: string | null, initial: T, clean?: (v: unknown) => T): T {
  if (raw === null) return initial;
  try {
    const v: unknown = JSON.parse(raw);
    return clean ? clean(v) : (v as T);
  } catch {
    return initial;
  }
}

/**
 * 記在這台裝置上的偏好（例如上次選的篩選條件）。用法跟 useState 一樣。
 * initial 要是穩定的值（寫在元件外面的常數），預先產生的頁面會先用它。
 * clean：存著的可能是舊版的資料，讀出來先整理過再用；一樣要寫在元件外面。
 */
export function usePersisted<T>(key: string, initial: T, clean?: (v: unknown) => T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const value = useMemo(() => parse(raw, initial, clean), [raw, initial, clean]);
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = parse(read(key), initial, clean);
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      write(key, JSON.stringify(v));
    },
    [key, initial, clean],
  );
  return [value, set] as const;
}
