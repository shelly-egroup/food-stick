/** 畫面上的文字格式：中文數字、相對時間、月份、頭像底色 */

const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 1–100 轉中文數字：十八、四十二、一百 */
export function toChineseNumber(n: number): string {
  if (n === 100) return '一百';
  if (n < 10) return DIGITS[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${tens === 1 ? '' : DIGITS[tens]}十${ones ? DIGITS[ones] : ''}`;
}

/** 1–39 轉羅馬數字：IV、XII（魔法版的名次） */
export function toRoman(n: number): string {
  const tens = ['', 'X', 'XX', 'XXX'][Math.floor(n / 10)] ?? '';
  const ones = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][n % 10];
  return tens + ones;
}

/** 依名字給一個固定的顏色（頭像底色） */
const HUES = ['#c8432a', '#3a68ad', '#2e9c83', '#c39a4a', '#9d6b3c', '#6f948e', '#b3542f', '#4b5d8f'];
export function hueFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

/** 台灣習慣的相對時間 */
export function ago(d: Date | null) {
  if (!d) return '剛剛';
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return '剛剛';
  if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小時前`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export const MONTHS = [
  '正月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '臘月',
];
