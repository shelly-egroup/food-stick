import gsap from 'gsap';
import { door } from '@/lib/sound';
import { COVER } from './Facade';
import type { GateRites } from '../types';

/** 以封面水晶球的球心為原點（SVG 座標） */
const origin = `${COVER.cx} ${COVER.cy}`;

/** 魔法入口：外人來了水晶球晃一晃，喚醒時符文環狂轉、光暈膨脹、一道白光鑽進球裡 */
export const rites: GateRites = {
  reject(q) {
    gsap.fromTo(q('.crystal'), { x: 0 }, { x: 6, duration: 0.06, repeat: 7, yoyo: true, ease: 'sine.inOut' });
  },

  close(tl, q) {
    // 水晶球從一片光裡慢慢收回來
    tl.fromTo(q('.gate__flash'), { opacity: 1 }, { opacity: 0, duration: 0.7 }, 0)
      .fromTo(
        q('.crystal'),
        { scale: 2.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.9, ease: 'power3.out', svgOrigin: origin },
        0,
      )
      .add(() => door(), 0.7);
  },

  enter(tl, q, root) {
    tl.to(q('.crystal__runes'), { rotate: '+=540', duration: 1.2, ease: 'power2.in', svgOrigin: origin }, 0.1)
      .to(q('.crystal__aura'), { scale: 1.9, opacity: 1, duration: 1, ease: 'power2.out', svgOrigin: origin }, 0.1)
      .to(q('.crystal__rays'), { scale: 1.6, opacity: 1, duration: 1, svgOrigin: origin }, 0.1)
      .to(q('.crystal__heart'), { scale: 2.4, opacity: 1, duration: 0.9, svgOrigin: origin }, 0.3)
      .add(() => door(), 0.9)
      .to(q('.crystal'), { scale: 7, duration: 0.9, ease: 'power3.in', svgOrigin: origin }, 0.95)
      .to(q('.gate__flash'), { opacity: 1, duration: 0.45, ease: 'power2.in' }, 1.1)
      .to(root, { opacity: 0, duration: 0.45, ease: 'power1.in' }, 1.55);
  },
};
