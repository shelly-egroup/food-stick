import { buzz, crackers } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';

const PAPER = ['var(--vermilion)', 'var(--vermilion)', 'var(--marigold)', '#f6e7c1'];

/** 在畫面最上層放一個小東西，播完就拿掉 */
function bit(x: number, y: number, css: string) {
  const el = document.createElement('span');
  el.style.cssText = `position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:200;${css}`;
  document.body.appendChild(el);
  return el;
}

/** 起駕出發：按鈕上的鞭炮「砰」地炸開，紅紙屑和火花往上噴、再飄落下來，劈哩啪啦響一串 */
export function departFx(from: Element) {
  crackers();
  buzz([25, 40, 25, 40, 60]);
  if (reducedMotion()) return;
  const glyph = from.querySelector('.glyph');
  glyph?.animate([{ translate: '0 0' }, { translate: '-2px 1px' }, { translate: '2px -1px' }, { translate: '0 0' }], {
    duration: 120,
    iterations: 4,
  });
  const b = (glyph ?? from).getBoundingClientRect();
  const x = b.left + b.width / 2;
  const y = b.top + b.height / 2;
  // 從畫面上方的橫幅炸開（別人按了出發）：火花和紙屑往下噴，不要一下就飛出畫面
  const down = y < window.innerHeight * 0.3;
  // 砰、啪、啪：三聲，一聲一團光、一個大字、一陣紙屑
  const WAVES = [
    { delay: 0, dx: 0, dy: 0, word: '砰' },
    { delay: 230, dx: -34, dy: -26, word: '啪' },
    { delay: 460, dx: 30, dy: -44, word: '啪' },
  ];
  WAVES.forEach(({ delay, dx: ox, dy: oy, word }, k) => {
    const cx = x + ox;
    const cy = down ? y - oy + 30 : y + oy;
    const flash = bit(
      cx - 48,
      cy - 48,
      'width:96px;height:96px;border-radius:50%;background:radial-gradient(circle,#fff6c8 0,#f2b940 34%,rgba(200,67,43,0.5) 52%,rgba(200,67,43,0) 70%)',
    );
    flash
      .animate(
        [
          { transform: 'scale(0.2)', opacity: 1 },
          { transform: 'scale(1.7)', opacity: 0 },
        ],
        {
          duration: 460,
          delay,
          easing: 'ease-out',
          fill: 'backwards',
        },
      )
      .finished.finally(() => flash.remove());
    const text = bit(
      cx - 22,
      down ? cy + 26 : cy - 64,
      `width:44px;text-align:center;font-family:var(--f-display);font-weight:900;font-size:${k ? 26 : 34}px;line-height:1;color:var(--vermilion);-webkit-text-stroke:1.2px #26211d;text-shadow:0 0 10px rgba(242,185,64,0.9)`,
    );
    text.textContent = word;
    const tilt = (k - 1) * 14;
    text
      .animate(
        [
          { transform: `translateY(14px) scale(0.3) rotate(${tilt}deg)`, opacity: 0 },
          { transform: `translateY(0) scale(1.25) rotate(${tilt}deg)`, opacity: 1, offset: 0.25 },
          { transform: `translateY(-26px) scale(1) rotate(${tilt}deg)`, opacity: 0 },
        ],
        { duration: 760, delay, easing: 'ease-out', fill: 'backwards' },
      )
      .finished.finally(() => text.remove());
    // 紅紙屑（長條）和火花（發光的小圓點）往上噴、再飄下來
    for (let i = 0; i < 16; i++) {
      const paper = i % 3 !== 0;
      const w = paper ? 11 + Math.random() * 5 : 6;
      const h = paper ? 6 : 6;
      const el = bit(
        cx - w / 2,
        cy - h / 2,
        `width:${w}px;height:${h}px;border-radius:${paper ? '1.5px' : '50%'};background:${
          paper ? PAPER[i % PAPER.length] : '#ffe08a'
        };${paper ? 'outline:1px solid rgba(38,33,29,0.4)' : 'box-shadow:0 0 8px 3px rgba(242,185,64,0.85)'}`,
      );
      const a = (((down ? 15 : -165) + Math.random() * 150) * Math.PI) / 180;
      const d = 70 + Math.random() * 140;
      const dx = Math.cos(a) * d;
      const dy = Math.sin(a) * d;
      const fall = 110 + Math.random() * 150;
      const spin = (Math.random() * 2 - 1) * 720;
      el.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.3 },
          { transform: `translate(${dx * 1.3}px, ${dy + fall}px) rotate(${spin}deg)`, opacity: 0 },
        ],
        {
          duration: 1200 + Math.random() * 600,
          delay: delay + Math.random() * 60,
          easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)',
          fill: 'backwards',
        },
      ).finished.finally(() => el.remove());
    }
  });
}
