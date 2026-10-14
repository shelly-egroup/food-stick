import {
  SHARE_H,
  SHARE_W,
  dateText,
  deckle,
  loadFonts,
  rays,
  rounded,
  spaced,
  squareSeal,
  tags,
  vertical,
  wrap,
  type Ctx,
} from '@/lib/canvas';
import type { ShareCardData } from '../types';

const INK = '#26211d';
const PAPER = '#faf6ef';
const PAPER_HI = '#fffdf8';
const VERMILION = '#c8432a';
const MARIGOLD = '#f2b940';
const SERIF = '"Noto Serif TC"';
const CLASSIC = '"Cactus Classical Serif", "Noto Serif TC"';
const SANS = '"Noto Sans TC"';

/** 古錢：圓形方孔 */
function coin(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = MARIGOLD;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#b98a2c';
  ctx.stroke();
  const h = r * 0.3;
  ctx.fillStyle = PAPER_HI;
  ctx.fillRect(x - h, y - h, h * 2, h * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.strokeRect(x - h, y - h, h * 2, h * 2);
}

/**
 * 廟宇版分享圖：朱紅大樑上掛著「食在難選」匾額，正中是毛邊紙的直書籤詩，
 * 右上角籤等章、左下角（是愛店的話）蓋「欽點愛店」，最底下寫日期。
 */
export async function drawShare(ctx: Ctx, d: ShareCardData) {
  const { restaurant: r, reading: f } = d;
  const name = r.name;
  const lines = f.lines;
  await loadFonts([
    [`900 80px ${SERIF}`, `食在難選${f.numberText}${name}解曰${f.grade.seal}欽點愛店`],
    [`700 30px ${SERIF}`, `${f.brand}${d.place}`],
    [`500 34px ${SERIF}`, f.verdict],
    [`400 58px ${CLASSIC}`, lines.join('')],
    [`500 26px ${SANS}`, `${d.tags.join('')}${dateText(d.date)}${d.host}0123456789`],
  ]);

  // 紙底與放射光
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  rays(ctx, SHARE_W / 2, 690, 1300, 40, '#fcebc3');
  const fade = ctx.createRadialGradient(SHARE_W / 2, 690, 200, SHARE_W / 2, 690, 900);
  fade.addColorStop(0, 'rgba(250,246,239,0)');
  fade.addColorStop(1, 'rgba(250,246,239,0.95)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);

  // 大樑與匾額
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, SHARE_W, 14);
  ctx.fillStyle = VERMILION;
  ctx.fillRect(0, 14, SHARE_W, 96);
  ctx.fillStyle = MARIGOLD;
  ctx.fillRect(0, 22, SHARE_W, 3);
  ctx.fillRect(0, 100, SHARE_W, 3);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 110, SHARE_W, 6);
  const pw = 470;
  const px = (SHARE_W - pw) / 2;
  ctx.fillStyle = '#e07a60';
  ctx.fillRect(px + 12, 42, pw, 128);
  ctx.fillStyle = INK;
  ctx.fillRect(px, 30, pw, 128);
  ctx.strokeStyle = MARIGOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(px + 10, 40, pw - 20, 108);
  ctx.fillStyle = MARIGOLD;
  ctx.font = `900 80px ${SERIF}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  spaced(ctx, '食在難選', SHARE_W / 2, 96, 14);

  // 籤紙：朱紅錯版影子＋毛邊紙＋雙框
  const cx = 150;
  const cy = 222;
  const cw = 780;
  const ch = 930;
  deckle(ctx, cx + 16, cy + 18, cw, ch, f.number * 31 + 7);
  ctx.fillStyle = VERMILION;
  ctx.fill();
  deckle(ctx, cx, cy, cw, ch, f.number * 17 + 3);
  ctx.fillStyle = PAPER_HI;
  ctx.fill();
  ctx.strokeStyle = VERMILION;
  ctx.lineWidth = 4;
  ctx.strokeRect(cx + 24, cy + 24, cw - 48, ch - 48);
  ctx.lineWidth = 1.6;
  ctx.strokeRect(cx + 36, cy + 36, cw - 72, ch - 72);

  // 籤頭：第幾籤＋食神靈籤
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = VERMILION;
  ctx.font = `900 62px ${SERIF}`;
  ctx.fillText(f.numberText, cx + 70, cy + 120);
  const nw = ctx.measureText(f.numberText).width;
  ctx.fillStyle = '#514841';
  ctx.font = `700 30px ${SERIF}`;
  ctx.textAlign = 'center';
  const brandW = [...f.brand].length * 30 + ([...f.brand].length - 1) * 10;
  spaced(ctx, f.brand, cx + 70 + nw + 28 + brandW / 2, cy + 114, 10);
  ctx.fillStyle = VERMILION;
  ctx.fillRect(cx + 60, cy + 150, cw - 120, 3);

  // 直書：右邊一行大大的店名，左邊四行籤詩
  const top = cy + 210;
  const bodyH = 500;
  const n = [...name].length;
  const nameSize = Math.min(118, Math.floor(bodyH / (n * 1.06)));
  ctx.fillStyle = INK;
  ctx.font = `900 ${nameSize}px ${SERIF}`;
  vertical(ctx, name, cx + cw - 150, top + nameSize / 2, nameSize * 1.06);
  ctx.fillStyle = 'rgba(38,33,29,0.16)';
  ctx.fillRect(cx + cw - 232, top - 10, 2, bodyH + 20);
  ctx.fillStyle = INK;
  ctx.font = `400 58px ${CLASSIC}`;
  lines.forEach((l, i) => vertical(ctx, l, cx + cw - 300 - i * 84, top + 30, 70));

  // 籤等章（右上角，歪一點）
  squareSeal(ctx, f.grade.seal, cx + cw - 20, cy + 22, 136, { tilt: -8 });
  // 愛店章（左下，像落款）
  if (d.liked) squareSeal(ctx, '欽點愛店', cx + 150, cy + 640, 128, { tilt: -6, color: '#b3301e', paper: '#fff6ea' });

  // 解曰與店家資訊
  const footY = cy + ch - 230;
  ctx.fillStyle = VERMILION;
  ctx.fillRect(cx + 60, footY, cw - 120, 3);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 38px ${SERIF}`;
  ctx.fillStyle = VERMILION;
  ctx.fillText('解曰', cx + 70, footY + 66);
  ctx.font = `500 34px ${SERIF}`;
  ctx.fillStyle = INK;
  wrap(ctx, f.verdict, cw - 260)
    .slice(0, 2)
    .forEach((l, i) => ctx.fillText(l, cx + 170, footY + 64 + i * 48));
  const end = tags(ctx, d.tags, cx + 70, footY + 160);
  for (let i = 0; i < r.price; i++) coin(ctx, end + 14 + i * 34, footY + 160, 14);

  // 底下：求籤所與日期
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = `700 34px ${SERIF}`;
  spaced(ctx, d.place, SHARE_W / 2, SHARE_H - 92, 10);
  ctx.fillStyle = '#514841';
  ctx.font = `500 26px ${SANS}`;
  ctx.fillText(`${dateText(d.date)}・${d.host}`, SHARE_W / 2, SHARE_H - 46);

  // 外框
  rounded(ctx, 6, 6, SHARE_W - 12, SHARE_H - 12, 0);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
}
