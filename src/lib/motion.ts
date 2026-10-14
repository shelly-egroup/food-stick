export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 重新播放用 class 觸發的 CSS 動畫：先拿掉 class、讓瀏覽器重算一次，再加回去 */
export function replay(el: Element | null | undefined, cls = 'is-on') {
  if (!el) return;
  el.classList.remove(cls, 'is-off');
  void el.getBoundingClientRect();
  el.classList.add(cls);
}

/** 讓 replay() 打開的效果淡出（CSS 的 .is-off），淡完再收起來 */
export function fadeOff(el: Element | null | undefined, ms = 450) {
  if (!el?.classList.contains('is-on')) return;
  el.classList.add('is-off');
  setTimeout(() => el.classList.remove('is-on', 'is-off'), ms);
}
