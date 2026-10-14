/** 版畫的墨色：寫在 SVG 屬性裡的線條顏色 */
export const INK = '#26211d';

/** 三角函數在伺服器和各家瀏覽器的最後幾位小數可能不同，四捨五入避免 hydration 不一致 */
export const fx = (n: number) => Math.round(n * 100) / 100;
