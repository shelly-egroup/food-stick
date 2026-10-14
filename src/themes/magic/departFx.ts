import { buzz, twinkle, whoosh } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';

const INK = '#26211d';
const STAR = 'M0-4.6 1.1-1.1 4.6 0 1.1 1.1 0 4.6-1.1 1.1-4.6 0-1.1-1.1Z';
/** 跟按鈕上的掃帚同一支（Glyph 的 depart），自己畫一份：從別人的橫幅起飛時也是掃帚 */
const BROOM = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
  <path d="M6.4 15.6 20.6 6.4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M6.4 15.6 20.6 6.4" stroke="var(--wood)" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M7.6 14.4 2 15.6 2.6 19.2 4.4 21.4 9.2 17.2Z" fill="var(--marigold)" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>
  <path d="M3.4 17.2 7.6 16M4.4 19.6l4-2.6" stroke="#c08a20" stroke-width="0.9" stroke-linecap="round"/>
  <path d="M7 13.6l2.2 3.4" stroke="#5b3f8c" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
/** 掃帚的柄在小圖裡斜斜往右上（約 -33 度），轉向時要扣掉 */
const NOSE = -33;
const DUR = 1700;
const BROOM_SIZE = 64;

type Pt = { x: number; y: number };

/** 在畫面最上層放一個小東西 */
function layer(css: string, html = '') {
  const el = document.createElement('span');
  el.style.cssText = `position:fixed;left:0;top:0;pointer-events:none;z-index:200;${css}`;
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

/** 通過這幾個點的平滑曲線（Catmull-Rom），取 n 個點 */
function curve(points: Pt[], n: number): Pt[] {
  const out: Pt[] = [];
  const seg = points.length - 1;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * seg;
    const k = Math.min(seg - 1, Math.floor(u));
    const t = u - k;
    const p0 = points[Math.max(0, k - 1)];
    const p1 = points[k];
    const p2 = points[k + 1];
    const p3 = points[Math.min(seg, k + 2)];
    const f = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
  }
  return out;
}

/**
 * 啟程冒險：掃帚從按鈕（或別人畫面上的橫幅）蹲一下、「咻～」地起飛，
 * 繞過畫面中間再往右上衝出去，一路拖著發光的魔法尾巴和一顆顆星星。
 */
export function departFx(from: Element) {
  whoosh();
  buzz([20, 30, 40]);
  [0, 3, 7].forEach((s, i) => window.setTimeout(() => twinkle(s + 5), 500 + i * 260));
  if (reducedMotion()) return;
  const b = (from.querySelector('.glyph') ?? from).getBoundingClientRect();
  const W = window.innerWidth;
  const H = window.innerHeight;
  const start = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  const path = curve(
    [
      start,
      { x: start.x - 18, y: start.y + 20 },
      { x: W * 0.28, y: H * 0.58 },
      { x: W * 0.62, y: H * 0.36 },
      { x: W + 160, y: -160 },
    ],
    44,
  );
  // 起步慢、越飛越快：路線上第 i 個點在動畫的哪個時間
  const at = (i: number) => (i / (path.length - 1)) ** 0.62;
  const angle = (i: number) => {
    const a = path[Math.max(0, i - 1)];
    const c = path[Math.min(path.length - 1, i + 1)];
    return (Math.atan2(c.y - a.y, c.x - a.x) * 180) / Math.PI - NOSE;
  };

  // 起飛的那一圈光
  const ring = layer(
    `left:${start.x - 40}px;top:${start.y - 40}px;width:80px;height:80px;border-radius:50%;border:3px solid #c9b8ff;box-shadow:0 0 18px 4px rgba(155,123,255,0.7)`,
  );
  ring
    .animate(
      [
        { transform: 'scale(0.2)', opacity: 1 },
        { transform: 'scale(2.2)', opacity: 0 },
      ],
      {
        duration: 600,
        easing: 'ease-out',
      },
    )
    .finished.finally(() => ring.remove());

  // 「咻～」
  const word = layer(
    `left:${start.x - 10}px;top:${start.y - 70}px;font-family:var(--f-display);font-weight:900;font-size:30px;line-height:1;color:#5b3f8c;-webkit-text-stroke:1px ${INK};text-shadow:0 0 12px rgba(242,185,64,0.9);white-space:nowrap`,
  );
  word.textContent = '咻～';
  word
    .animate(
      [
        { transform: 'translate(0, 12px) scale(0.4) rotate(-10deg)', opacity: 0 },
        { transform: 'translate(10px, 0) scale(1.2) rotate(-6deg)', opacity: 1, offset: 0.3 },
        { transform: 'translate(40px, -20px) scale(1) rotate(-6deg)', opacity: 0 },
      ],
      { duration: 900, delay: 120, easing: 'ease-out', fill: 'backwards' },
    )
    .finished.finally(() => word.remove());

  // 掃帚沿著曲線飛，頭朝著前進的方向、越飛越大
  const broom = layer(
    `width:${BROOM_SIZE}px;height:${BROOM_SIZE}px;display:grid;filter:drop-shadow(0 0 6px rgba(155,123,255,0.95)) drop-shadow(0 0 16px rgba(242,185,64,0.65))`,
    BROOM,
  );
  broom
    .animate(
      path.map((p, i) => ({
        offset: at(i),
        transform: `translate(${p.x - BROOM_SIZE / 2}px, ${p.y - BROOM_SIZE / 2}px) rotate(${angle(i)}deg) scale(${
          0.75 + (i / path.length) * 1.6
        })`,
      })),
      { duration: DUR, easing: 'linear', fill: 'forwards' },
    )
    .finished.finally(() => broom.remove());

  // 尾巴：一路留下發光的小點，每隔幾個點一顆星星
  path.forEach((p, i) => {
    if (i < 2 || i > path.length - 3) return;
    const delay = at(i) * DUR;
    const glow = layer(
      `left:${p.x - 5}px;top:${p.y - 5}px;width:10px;height:10px;border-radius:50%;background:#efe6ff;box-shadow:0 0 10px 4px rgba(155,123,255,0.85)`,
    );
    glow
      .animate(
        // 掃帚飛到這裡才亮起來（開頭是透明的，等待的時候看不到）
        [
          { transform: 'scale(0.2)', opacity: 0 },
          { transform: 'scale(1.2)', opacity: 0.95, offset: 0.08 },
          { transform: 'scale(0.2)', opacity: 0 },
        ],
        {
          duration: 700,
          delay,
          easing: 'ease-in',
          fill: 'backwards',
        },
      )
      .finished.finally(() => glow.remove());
    if (i % 3) return;
    const size = 14 + Math.random() * 12;
    const star = layer(
      `left:${p.x - size / 2}px;top:${p.y - size / 2}px;width:${size}px;height:${size}px;display:grid`,
      `<svg viewBox="-5 -5 10 10" width="100%" height="100%"><path d="${STAR}" fill="${
        i % 2 ? 'var(--marigold)' : '#c9b8ff'
      }" stroke="${INK}" stroke-width="0.5"/></svg>`,
    );
    star
      .animate(
        [
          { transform: 'scale(0) rotate(0deg)', opacity: 0 },
          { transform: 'scale(1.4) rotate(45deg)', opacity: 1, offset: 0.25 },
          { transform: `translate(${(Math.random() - 0.5) * 24}px, 26px) scale(0) rotate(140deg)`, opacity: 0 },
        ],
        { duration: 1000, delay, easing: 'ease-out', fill: 'backwards' },
      )
      .finished.finally(() => star.remove());
  });
}
