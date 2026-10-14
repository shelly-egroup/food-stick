import {
  SHARE_H,
  SHARE_W,
  dateText,
  heart,
  loadFonts,
  rounded,
  seeded,
  spaced,
  star4,
  tags,
  wrap,
  type Ctx,
} from '@/lib/canvas';
import type { ShareCardData } from '../types';

const INK = '#26211d';
const PAPER_HI = '#fffdf8';
const COBALT = '#3a68ad';
const MARIGOLD = '#f2b940';
const VERMILION = '#c8432a';
const SERIF = '"Noto Serif TC"';
const SANS = '"Noto Sans TC"';

/** 魔力球：紫藍色的小水晶球 */
function orb(ctx: Ctx, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#e9e2ff');
  g.addColorStop(0.45, '#9b7bff');
  g.addColorStop(1, '#3a3f9e');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
}

/** 金色四角星（帶墨線） */
function goldStar(ctx: Ctx, x: number, y: number, r: number) {
  star4(ctx, x, y, r);
  ctx.fillStyle = MARIGOLD;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/**
 * 魔法版分享圖：一片夜空，上方鈷藍緞帶掛著「食在難選」，正中是圓角預言卡，
 * 右上角火漆印、右下角（是愛店的話）亮著愛心水晶球，最底下寫日期。
 */
export async function drawShare(ctx: Ctx, d: ShareCardData) {
  const { restaurant: r, reading: f } = d;
  const name = r.name;
  await loadFonts([
    [`900 80px ${SERIF}`, `食在難選${f.numberText}${name}預言${f.grade.seal}`],
    [`700 30px ${SERIF}`, `${f.brand}${d.place}`],
    [`500 40px ${SERIF}`, `${f.lines.join('')}${f.verdict}`],
    [`500 26px ${SANS}`, `${d.tags.join('')}${dateText(d.date)}${d.host}0123456789`],
  ]);

  // 夜空：漸層、紫色光暈、星塵、星軌
  const sky = ctx.createLinearGradient(0, 0, 0, SHARE_H);
  sky.addColorStop(0, '#19204b');
  sky.addColorStop(0.6, '#251f60');
  sky.addColorStop(1, '#1a1846');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  const glow = ctx.createRadialGradient(SHARE_W / 2, 620, 40, SHARE_W / 2, 620, 720);
  glow.addColorStop(0, 'rgba(155,123,255,0.45)');
  glow.addColorStop(1, 'rgba(155,123,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  const rnd = seeded(f.number * 97 + 13);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 140; i++) {
    const x = rnd() * SHARE_W;
    const y = rnd() * SHARE_H;
    const s = rnd() < 0.12 ? 2.6 : rnd() < 0.4 ? 1.7 : 1.1;
    ctx.globalAlpha = 0.35 + rnd() * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(242,185,64,0.28)';
  ctx.lineWidth = 2;
  [380, 520, 660].forEach((rx, i) => {
    ctx.setLineDash(i === 1 ? [4, 14] : []);
    ctx.beginPath();
    ctx.ellipse(SHARE_W / 2, 690, rx, rx * 0.86, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // 緞帶與匾額
  ctx.fillStyle = COBALT;
  ctx.beginPath();
  ctx.moveTo(0, 70);
  ctx.lineTo(SHARE_W, 70);
  ctx.lineTo(SHARE_W - 34, 112);
  ctx.lineTo(SHARE_W, 154);
  ctx.lineTo(0, 154);
  ctx.lineTo(34, 112);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = MARIGOLD;
  ctx.fillRect(40, 82, SHARE_W - 80, 3);
  ctx.fillRect(40, 140, SHARE_W - 80, 3);
  const pw = 470;
  const px = (SHARE_W - pw) / 2;
  ctx.fillStyle = COBALT;
  ctx.fillRect(px + 12, 60, pw, 116);
  ctx.fillStyle = INK;
  ctx.fillRect(px, 48, pw, 116);
  ctx.strokeStyle = MARIGOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(px + 10, 58, pw - 20, 96);
  ctx.fillStyle = MARIGOLD;
  ctx.font = `900 78px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  spaced(ctx, '食在難選', SHARE_W / 2, 108, 14);

  // 預言卡：鈷藍錯版影子、圓角白卡、雙框、兩角的星
  const cx = 150;
  const cy = 236;
  const cw = 780;
  const ch = 900;
  rounded(ctx, cx + 16, cy + 18, cw, ch, 22);
  ctx.fillStyle = COBALT;
  ctx.fill();
  rounded(ctx, cx, cy, cw, ch, 22);
  ctx.fillStyle = PAPER_HI;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  rounded(ctx, cx + 24, cy + 24, cw - 48, ch - 48, 12);
  ctx.lineWidth = 4;
  ctx.strokeStyle = COBALT;
  ctx.stroke();
  rounded(ctx, cx + 36, cy + 36, cw - 72, ch - 72, 8);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  goldStar(ctx, cx + 26, cy + 26, 26);
  goldStar(ctx, cx + cw - 26, cy + ch - 26, 26);

  // 卡頭
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COBALT;
  ctx.font = `900 58px ${SERIF}`;
  ctx.fillText(f.numberText, cx + 70, cy + 122);
  const nw = ctx.measureText(f.numberText).width;
  ctx.fillStyle = '#514841';
  ctx.font = `700 30px ${SERIF}`;
  ctx.textAlign = 'center';
  const brandW = [...f.brand].length * 30 + ([...f.brand].length - 1) * 10;
  spaced(ctx, f.brand, cx + 70 + nw + 26 + brandW / 2, cy + 116, 10);
  ctx.fillStyle = COBALT;
  ctx.fillRect(cx + 60, cy + 152, cw - 120, 3);

  // 火漆印：歪的是蠟，字是正的
  ctx.save();
  ctx.translate(cx + cw - 30, cy + 30);
  ctx.rotate((-10 * Math.PI) / 180);
  ctx.beginPath();
  ctx.ellipse(0, 0, 80, 76, 0, 0, Math.PI * 2);
  ctx.fillStyle = VERMILION;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 64, 60, 0, 0, Math.PI * 2);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = PAPER_HI;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = PAPER_HI;
  ctx.font = `900 44px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(f.grade.seal, cx + cw - 30, cy + 32);

  // 店名：正中、大大的
  const n = [...name].length;
  const nameSize = Math.min(118, Math.floor(620 / (n * 1.08)));
  ctx.fillStyle = INK;
  ctx.font = `900 ${nameSize}px ${SERIF}`;
  ctx.textBaseline = 'middle';
  spaced(ctx, name, SHARE_W / 2, cy + 280, nameSize * 0.08);
  ctx.strokeStyle = 'rgba(38,33,29,0.3)';
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 150, cy + 360);
  ctx.lineTo(cx + cw - 150, cy + 360);
  ctx.stroke();
  ctx.setLineDash([]);

  // 預言：兩欄兩列
  ctx.font = `500 40px ${SERIF}`;
  ctx.fillStyle = INK;
  f.lines.forEach((l, i) => {
    const x = i % 2 ? cx + cw * 0.72 : cx + cw * 0.28;
    const y = cy + 440 + Math.floor(i / 2) * 76;
    spaced(ctx, l, x, y, 4);
  });

  // 預言結語與店家資訊
  const footY = cy + ch - 270;
  ctx.fillStyle = COBALT;
  ctx.fillRect(cx + 60, footY, cw - 120, 3);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 38px ${SERIF}`;
  ctx.fillText('預言', cx + 70, footY + 70);
  ctx.font = `500 34px ${SERIF}`;
  ctx.fillStyle = INK;
  wrap(ctx, f.verdict, cw - 260)
    .slice(0, 2)
    .forEach((l, i) => ctx.fillText(l, cx + 170, footY + 68 + i * 48));
  const end = tags(ctx, d.tags, cx + 70, footY + 170, { radius: 22 });
  for (let i = 0; i < r.price; i++) orb(ctx, end + 16 + i * 38, footY + 170, 15);

  // 是愛店：右下角一顆亮著愛心的水晶球
  if (d.liked) {
    const hx = cx + cw - 120;
    const hy = cy + ch - 140;
    ctx.beginPath();
    ctx.moveTo(hx - 34, hy + 62);
    ctx.lineTo(hx - 26, hy + 40);
    ctx.lineTo(hx + 26, hy + 40);
    ctx.lineTo(hx + 34, hy + 62);
    ctx.closePath();
    ctx.fillStyle = '#c39a4a';
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hx, hy, 44, 0, Math.PI * 2);
    ctx.fillStyle = '#dbe4ff';
    ctx.fill();
    ctx.stroke();
    heart(ctx, hx, hy + 4, 1.9);
    ctx.fillStyle = '#e8697c';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#7d1b2c';
    ctx.stroke();
  }

  // 底下：水晶球的名字與日期
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = MARIGOLD;
  ctx.font = `700 34px ${SERIF}`;
  spaced(ctx, d.place, SHARE_W / 2, SHARE_H - 98, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = `500 26px ${SANS}`;
  ctx.fillText(`${dateText(d.date)}・${d.host}`, SHARE_W / 2, SHARE_H - 52);
  goldStar(ctx, SHARE_W / 2 - 200, SHARE_H - 110, 12);
  goldStar(ctx, SHARE_W / 2 + 200, SHARE_H - 110, 12);
}
