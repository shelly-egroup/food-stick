'use client';

import { useEffect, useEffectEvent, useSyncExternalStore } from 'react';
import { useBrowserValue } from './useBrowser';
import { usePersisted } from './usePersisted';

type MotionWithPermission = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

/** 手機（觸控螢幕＋有動作感應）才支援搖一搖 */
const canShake = () => 'DeviceMotionEvent' in window && matchMedia('(pointer: coarse)').matches;
/** iOS 要使用者點過畫面、同意之後才能讀動作感應 */
const needsPermission = () =>
  'DeviceMotionEvent' in window && typeof (DeviceMotionEvent as MotionWithPermission).requestPermission === 'function';

/** 搖手機抽籤的開關：預設開，在「我的設定」裡可以關掉 */
export const useShakePref = () => usePersisted('lunchstick:shake', true);
/** 這台裝置能不能搖 */
export const useShakeSupported = () => useBrowserValue(canShake, false);

/** iOS 的動作感應權限：問過一次，這次瀏覽就記得結果 */
type Motion = 'unknown' | 'granted' | 'denied';
let motion: Motion = 'unknown';
const subs = new Set<() => void>();
const subscribeMotion = (cb: () => void) => {
  subs.add(cb);
  return () => void subs.delete(cb);
};
export const useMotionPermission = () =>
  useSyncExternalStore(
    subscribeMotion,
    () => motion,
    () => 'unknown' as Motion,
  );

/** 同一次點擊可能有兩個地方同時問（整頁的第一次點擊、按鈕本身），只問一次 */
let asking: Promise<boolean> | null = null;

function setMotion(m: Motion) {
  motion = m;
  subs.forEach((cb) => cb());
}

/**
 * 問動作感應的權限。iOS 一定要在使用者點擊的當下問；
 * silent 是不靠點擊先試一次：Android 的 Chrome 這樣就會直接答應，iOS 會被擋下來（不算拒絕，等第一次點擊再問）。
 */
export function askMotion(silent = false): Promise<boolean> {
  const M = DeviceMotionEvent as MotionWithPermission;
  if (typeof M.requestPermission !== 'function') return Promise.resolve(true);
  asking ??= M.requestPermission()
    .then((r) => {
      setMotion(r === 'granted' ? 'granted' : 'denied');
      return r === 'granted';
    })
    .catch(() => {
      if (!silent) setMotion('denied');
      return false;
    })
    .finally(() => {
      asking = null;
    });
  return asking;
}

/**
 * 搖手機觸發。預設開：Android 直接可用；
 * iOS 不能自己打開，就在使用者第一次點畫面（任何地方都可以）的時候順便問一次權限。
 */
export function useShake(onShake: () => void, active: boolean) {
  const supported = useShakeSupported();
  const askFirst = useBrowserValue(needsPermission, true);
  const [on] = useShakePref();
  const permission = useMotionPermission();
  const usable = supported && on;
  const enabled = usable && (!askFirst || permission === 'granted');
  const fire = useEffectEvent(onShake);

  useEffect(() => {
    if (!usable || !askFirst || permission !== 'unknown') return;
    void askMotion(true);
    const once = () => void askMotion();
    document.addEventListener('click', once, { once: true, capture: true });
    return () => document.removeEventListener('click', once, { capture: true });
  }, [usable, askFirst, permission]);

  useEffect(() => {
    if (!enabled || !active) return;
    let last = { x: 0, y: 0, z: 0 };
    let lastHit = 0;
    let streak = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      const d = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z);
      last = { x: a.x, y: a.y, z: a.z };
      const now = Date.now();
      if (d > 28) {
        streak += 1;
        if (streak >= 3 && now - lastHit > 2000) {
          lastHit = now;
          streak = 0;
          fire();
        }
      } else if (d < 8) {
        streak = Math.max(0, streak - 1);
      }
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [enabled, active]);

  return {
    /** 這台裝置可以搖，而且使用者沒有在設定裡關掉 */
    supported: usable,
    enabled,
    /** 使用者拒絕了動作感應（要到瀏覽器設定裡開） */
    denied: usable && permission === 'denied',
    enable: askMotion,
  };
}
