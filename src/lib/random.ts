/**
 * 固定種子的亂數：同一個種子在每台裝置上算出來都一樣。
 * 揪團時發起人把種子存起來，被揪的人用同一個種子寫籤詩，大家看到的是同一張籤。
 */
export function seeded(seed: number) {
  let s = ((Math.trunc(seed) % 233280) + 233280) % 233280 || 1;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

/** 抽一個新的種子（只在按下去之後呼叫） */
export const newSeed = () => Math.floor(Math.random() * 2_000_000_000);

/** 幾個小時以前（揪團只看最近的） */
export const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
