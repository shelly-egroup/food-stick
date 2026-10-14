/**
 * 分享圖用的畫布小工具：把籤卡重新畫成一張 1080×1350 的圖。
 * 只在瀏覽器裡、使用者按下分享（或籤卡展開後）才會用到。
 */
import { seeded } from './random';

/** 固定的亂數：同一張籤每次畫出來都一樣 */
export { seeded };

export const SHARE_W = 1080;
export const SHARE_H = 1350;

export type Ctx = CanvasRenderingContext2D;

/** 先把要用到的字型與字載好（中文字型是分片的，只載需要的那幾片） */
export async function loadFonts(specs: [font: string, text: string][]) {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(specs.map(([font, text]) => document.fonts.load(font, text).catch(() => [])));
}

/** 字距拉開的一行字，cx 是中心 */
export function spaced(ctx: Ctx, text: string, cx: number, y: number, gap: number) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = cx - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + gap;
  });
  ctx.textAlign = align;
  return total;
}

/** 直書：一個字一個字往下排，(x, y) 是第一個字的中心 */
export function vertical(ctx: Ctx, text: string, x: number, y: number, step: number) {
  const align = ctx.textAlign;
  const base = ctx.textBaseline;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...text].forEach((c, i) => ctx.fillText(c, x, y + i * step));
  ctx.textAlign = align;
  ctx.textBaseline = base;
}

/** 中文斷行：一個字一個字量，超過寬度就換行；標點不放行首 */
export function wrap(ctx: Ctx, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const c of text) {
    if (line && ctx.measureText(line + c).width > maxWidth && !'，。、！？：；」）'.includes(c)) {
      lines.push(line);
      line = c;
    } else line += c;
  }
  if (line) lines.push(line);
  return lines;
}

/** 圓角矩形路徑 */
export function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 毛邊紙：四邊細碎不規則 */
export function deckle(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number, amp = 5) {
  const rnd = seeded(seed);
  const n = 46;
  const j = () => (rnd() - 0.5) * 2 * amp;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) ctx.lineTo(x + (w * i) / n, y + Math.abs(j()));
  for (let i = 0; i <= n; i++) ctx.lineTo(x + w - Math.abs(j()), y + (h * i) / n);
  for (let i = n; i >= 0; i--) ctx.lineTo(x + (w * i) / n, y + h - Math.abs(j()));
  for (let i = n; i >= 0; i--) ctx.lineTo(x + Math.abs(j()), y + (h * i) / n);
  ctx.closePath();
}

/** 放射光：從 (cx, cy) 往外的扇形條紋 */
export function rays(ctx: Ctx, cx: number, cy: number, r: number, count: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a0 = (i / count) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / count / 2.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** 四角星 */
export function star4(ctx: Ctx, x: number, y: number, r: number) {
  const k = r * 0.3;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + k, y - k);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + k, y + k);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - k, y + k);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - k, y - k);
  ctx.closePath();
}

/** 心形，(x, y) 是中心 */
export function heart(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + 9 * s);
  ctx.bezierCurveTo(x - 10 * s, y + 2 * s, x - 13 * s, y - 4 * s, x - 9 * s, y - 8.5 * s);
  ctx.bezierCurveTo(x - 6 * s, y - 11.5 * s, x - 1.5 * s, y - 10.5 * s, x, y - 7 * s);
  ctx.bezierCurveTo(x + 1.5 * s, y - 10.5 * s, x + 6 * s, y - 11.5 * s, x + 9 * s, y - 8.5 * s);
  ctx.bezierCurveTo(x + 13 * s, y - 4 * s, x + 10 * s, y + 2 * s, x, y + 9 * s);
  ctx.closePath();
}

/** 方形印章：一個字、兩個字（上下）或四個字（右起直讀），中心在 (x, y) */
export function squareSeal(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  size: number,
  { tilt = 0, color = '#c8432a', paper = '#fffdf8', ink = '#26211d', font = '"Noto Serif TC"' } = {},
) {
  const chars = [...text];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((tilt * Math.PI) / 180);
  const h = size / 2;
  rounded(ctx, -h, -h, size, size, size * 0.06);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = size * 0.025;
  ctx.strokeStyle = ink;
  ctx.stroke();
  rounded(ctx, -h + size * 0.08, -h + size * 0.08, size * 0.84, size * 0.84, size * 0.03);
  ctx.lineWidth = size * 0.025;
  ctx.strokeStyle = paper;
  ctx.stroke();
  ctx.fillStyle = paper;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (chars.length === 1) {
    ctx.font = `900 ${size * 0.62}px ${font}`;
    ctx.fillText(chars[0], 0, size * 0.03);
  } else if (chars.length === 2) {
    ctx.font = `900 ${size * 0.4}px ${font}`;
    ctx.fillText(chars[0], 0, -size * 0.2);
    ctx.fillText(chars[1], 0, size * 0.22);
  } else {
    // 四個字：右上、右下、左上、左下
    ctx.font = `900 ${size * 0.33}px ${font}`;
    const d = size * 0.19;
    ctx.fillText(chars[0], d, -d);
    ctx.fillText(chars[1], d, d + size * 0.02);
    ctx.fillText(chars[2], -d, -d);
    ctx.fillText(chars[3], -d, d + size * 0.02);
  }
  ctx.restore();
}

/** 店家資訊的小標籤，一個接一個往右排，回傳結束的 x */
export function tags(
  ctx: Ctx,
  items: string[],
  x: number,
  y: number,
  { size = 26, color = '#514841', line = 'rgba(38,33,29,0.62)', radius = 0, font = '"Noto Sans TC"' } = {},
) {
  ctx.save();
  ctx.font = `500 ${size}px ${font}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let cx = x;
  for (const t of items) {
    const w = ctx.measureText(t).width + size * 0.9;
    rounded(ctx, cx, y - size * 0.8, w, size * 1.6, radius);
    ctx.lineWidth = 2;
    ctx.strokeStyle = line;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(t, cx + size * 0.45, y + 1);
    cx += w + size * 0.45;
  }
  ctx.restore();
  return cx;
}

export function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('畫不出來'))), 'image/png'),
  );
}

/** 台灣習慣的日期：2026 年 10 月 14 日 */
export const dateText = (d: Date) => `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
