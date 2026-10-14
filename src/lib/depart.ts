/**
 * 出發：先讓按鈕上的動畫跑一下，再開地圖。
 * 不到一秒，瀏覽器還認得是使用者按的，不會被當成彈出視窗擋掉；真的被擋了就直接在這頁打開。
 */
export function openMapSoon(url: string, delay = 650) {
  window.setTimeout(() => {
    const w = window.open(url, '_blank');
    if (w) w.opener = null;
    else location.href = url;
  }, delay);
}

/** 自己按下出發的那幾團：其他人收到時一起放出發的動畫，自己已經看過了就不再放一次 */
const mine = new Set<string>();
export const markDeparted = (id: string) => void mine.add(id);
export const departedByMe = (id: string) => mine.has(id);
