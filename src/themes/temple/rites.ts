import gsap from 'gsap';
import { door } from '@/lib/sound';
import type { GateRites } from '../types';

/** 廟宇入口：外人來了叩門環，進廟時朱門往兩邊打開、穿過門裡的金光 */
export const rites: GateRites = {
  reject(q) {
    gsap.fromTo(
      q('.knocker'),
      { rotate: 0 },
      { rotate: 12, duration: 0.08, repeat: 5, yoyo: true, ease: 'sine.inOut', clearProps: 'rotate' },
    );
  },

  close(tl, q) {
    tl.fromTo(q('.door--l'), { rotateY: -100 }, { rotateY: 0, duration: 0.8, ease: 'power3.in' }, 0)
      .fromTo(q('.door--r'), { rotateY: 100 }, { rotateY: 0, duration: 0.8, ease: 'power3.in' }, 0)
      .add(() => door(), 0.75)
      .fromTo(q('.gate__doors'), { x: 0 }, { x: 3, duration: 0.05, repeat: 3, yoyo: true, clearProps: 'x' }, 0.8);
  },

  enter(tl, q, root) {
    tl.add(() => door(), 0.2)
      .to(q('.door--l'), { rotateY: -106, duration: 1.05, ease: 'power3.inOut' }, 0.25)
      .to(q('.door--r'), { rotateY: 106, duration: 1.05, ease: 'power3.inOut' }, 0.25)
      .fromTo(
        q('.gate__inside'),
        { opacity: 0.4, scale: 0.9 },
        { opacity: 1, scale: 1.15, duration: 1, ease: 'power2.out' },
        0.3,
      )
      .to(q('.gate__facade'), { scale: 1.7, opacity: 0, duration: 0.7, ease: 'power2.in' }, 1)
      .to(root, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 1.3);
  },
};
