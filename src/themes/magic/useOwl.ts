'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { buzz, flutter, owlHoot } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
import type { OwlOutfit } from './parts';

/** 貓頭鷹能停的地方（書桌那張 SVG 的座標，貓頭鷹的腳底） */
const PERCH = {
  home: { x: 34, y: 218 },
  book: { x: 152, y: 160 },
  ball: { x: 270, y: 118 },
  potion: { x: 355, y: 163 },
} as const;
/** 還可以飛上去站在兩顆吊著的大星星上（在上層那張 SVG，位置要即時量） */
type Perch = keyof typeof PERCH | 'star0' | 'star1';
type Move = 'hop' | 'fly' | 'loop' | 'puzzle';
/** side：停在星星上（畫面上緣）時，對話框改到旁邊，才不會被切掉 */
export type OwlLine = { text: string; angry?: boolean; side?: boolean; n: number };
const isStar = (p: Perch) => p === 'star0' || p === 'star1';
/** 貓頭鷹從腳底到頭頂多高（書桌 SVG 的單位）；戴巫師帽要算到帽尖 */
const HEIGHT: Record<OwlOutfit, number> = { none: 64, cape: 64, hat: 96 };
/** 被惹毛時說的話 */
const HUFFS = ['歸剛！', '你禮貌嗎？', '煩！！！'];

const PATIENCE = 3;
const FORGET_MS = 9000;

/** 隨機的東西都放在元件外面：只會在點擊之後（或第一次出現時）才呼叫 */
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = <T>(list: T[], not?: T) => {
  const pool = list.filter((x) => x !== not);
  return pool[Math.floor(rand(0, pool.length))];
};

/** 偶爾才穿戴：大部分時候什麼都沒有 */
const randomOutfit = (not?: OwlOutfit): OwlOutfit => {
  const r = rand();
  const o: OwlOutfit = r < 0.6 ? 'none' : r < 0.8 ? 'hat' : 'cape';
  return o === not ? pick<OwlOutfit>(['none', 'hat', 'cape'], not) : o;
};
/** 一進來站在書桌的左邊或藥水瓶上，隨機 */
const randomStart = (): 'home' | 'potion' => (rand() < 0.5 ? 'home' : 'potion');

/**
 * 白色貓頭鷹的小脾氣：點一下就咕一聲、換個動作（跳一跳、飛去停在水晶球／魔法書／藥水瓶上、
 * 空中翻一圈、歪頭想事情）；連點三下會生氣飛走，過一陣子換一身打扮（巫師帽、斗篷）飛回來。
 * 畫面上要有 .owl-run（位置）和裡面的 .owl（壓扁、傾斜）。
 */
export function useMagicOwl(svg: RefObject<SVGSVGElement | null>) {
  const [start] = useState(randomStart);
  const st = useRef({ taps: 0, last: 0, busy: false, gone: false, at: start as Perch, prev: '' as Move | '' });
  const [line, setLine] = useState<OwlLine | null>(null);
  const [outfit, setOutfit] = useState<OwlOutfit>(() => randomOutfit());
  const timers = useRef<number[]>([]);
  const anim = useRef<gsap.core.Timeline | null>(null);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      anim.current?.kill();
    },
    [],
  );

  const say = (text: string, angry = false, side = false) =>
    setLine((l) => ({ text, angry, side, n: (l?.n ?? 0) + 1 }));

  const parts = () => {
    const q = svg.current ? gsap.utils.selector(svg.current) : null;
    const run = q?.('.owl-run')[0] as SVGGElement | undefined;
    const body = q?.('.owl-run .owl')[0] as SVGGElement | undefined;
    return run && body ? { run, body } : null;
  };

  /**
   * 停靠點在書桌 SVG 裡的座標。星星在上層另一張 SVG 裡，而且會擺動，
   * 所以每次起飛前量一次它的畫面位置，再換算回書桌的座標（站在星星的頂端）。
   */
  const spot = (p: Perch): { x: number; y: number } => {
    if (!isStar(p)) return PERCH[p as keyof typeof PERCH];
    const el = svg.current;
    const star = el?.closest('.stage')?.querySelectorAll('.stage__top .hang-star')[p === 'star0' ? 0 : 1];
    const m = el?.getScreenCTM();
    if (!el || !star || !m) return PERCH.home;
    const b = star.getBoundingClientRect();
    const pt = new DOMPoint(b.left + b.width / 2, b.top + b.height * 0.06).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };

  /**
   * 上層星星布幔的下緣，換算成書桌 SVG 的座標。布幔畫在書桌上面一層，
   * 貓頭鷹整隻都要在這條線底下才看得到（手機上兩顆星星離布幔太近，站上去頭會被擋住）。
   */
  const ceiling = () => {
    const el = svg.current;
    const valance = el?.closest('.stage')?.querySelector('.stage__top .valance');
    const m = el?.getScreenCTM();
    if (!valance || !m) return -Infinity;
    const b = valance.getBoundingClientRect();
    return new DOMPoint(b.left, b.bottom).matrixTransform(m.inverse()).y;
  };
  /** 腳底在 y 的時候，頭頂（或帽尖）還在布幔底下 */
  const roomAt = (y: number) => y - HEIGHT[outfit] - 4 >= ceiling();

  /** 從現在的位置飛到 to：先蹲一下、拍翅膀飛一道弧線、落地壓扁 */
  const flyTo = (t: gsap.core.Timeline, run: Element, body: Element, from: Perch, to: Perch) => {
    const a = spot(from);
    const b = spot(to);
    const d = Math.min(1.5, Math.max(0.8, Math.hypot(b.x - a.x, b.y - a.y) / 240));
    const lean = b.x > a.x ? 10 : b.x < a.x ? -10 : 0;
    // 往星星飛的時候弧線低一點，免得飛出畫面上緣；也不要鑽進布幔裡
    const low = Math.min(a.y, b.y);
    const peak = Math.min(low, Math.max(low - (isStar(from) || isStar(to) ? 22 : 74), ceiling() + HEIGHT[outfit] + 4));
    t.to(body, { scaleY: 0.84, scaleX: 1.08, duration: 0.12, transformOrigin: '50% 100%' })
      .add(() => {
        run.classList.add('is-flying');
        flutter(Math.round(d * 8));
      })
      .to(body, { scaleY: 1.06, scaleX: 0.96, rotation: lean, duration: 0.14 })
      .to(run, { x: b.x, duration: d, ease: 'sine.inOut' }, '<')
      .to(run, { y: peak, duration: d * 0.5, ease: 'sine.out' }, '<')
      .to(run, { y: b.y, duration: d * 0.5, ease: 'sine.in' }, '>')
      .to(body, { rotation: 0, scaleY: 1, scaleX: 1, duration: 0.2 }, '<')
      .add(() => run.classList.remove('is-flying'))
      .to(body, { scaleY: 0.86, scaleX: 1.08, duration: 0.07, transformOrigin: '50% 100%' })
      .to(body, { scaleY: 1, scaleX: 1, duration: 0.26, ease: 'back.out(3)' })
      .add(() => buzz(10));
  };

  const play = (move: Move, to: Perch) => {
    const p = parts();
    if (!p) return;
    const { run, body } = p;
    const s = st.current;
    s.busy = true;
    s.prev = move;
    const t = gsap.timeline({
      onComplete: () => {
        s.busy = false;
      },
    });
    anim.current = t;
    const here = spot(s.at);

    if (move === 'fly') {
      flyTo(t, run, body, s.at, to);
      s.at = to;
    } else if (move === 'hop') {
      // 原地蹦兩下，左右各一
      [-12, 12].forEach((dx) => {
        t.to(body, { scaleY: 0.86, duration: 0.08, transformOrigin: '50% 100%' })
          .to(body, { scaleY: 1, duration: 0.1 })
          .to(run, { x: here.x + dx, duration: 0.26, ease: 'power1.inOut' }, '<')
          .to(run, { y: here.y - 16, duration: 0.13, ease: 'power2.out' }, '<')
          .to(run, { y: here.y, duration: 0.13, ease: 'power2.in' }, '>');
      });
      t.to(run, { x: here.x, duration: 0.2 });
    } else if (move === 'loop') {
      // 往上飛、在空中翻一圈，再落回原地
      t.add(() => {
        run.classList.add('is-flying');
        flutter(9);
      })
        .to(run, { y: here.y - 60, duration: 0.3, ease: 'power2.out' })
        .to(run, {
          keyframes: [
            { x: here.x + 30, y: here.y - 92, duration: 0.22 },
            { x: here.x, y: here.y - 122, duration: 0.22 },
            { x: here.x - 30, y: here.y - 92, duration: 0.22 },
            { x: here.x, y: here.y - 60, duration: 0.22 },
          ],
          ease: 'none',
        })
        .to(body, { rotation: -360, duration: 0.88, ease: 'none', transformOrigin: '50% 50%' }, '<')
        .set(body, { rotation: 0 })
        .to(run, { y: here.y, duration: 0.32, ease: 'power2.in' })
        .add(() => run.classList.remove('is-flying'))
        .to(body, { scaleY: 0.86, scaleX: 1.08, duration: 0.07, transformOrigin: '50% 100%' })
        .to(body, { scaleY: 1, scaleX: 1, duration: 0.26, ease: 'back.out(3)' });
    } else {
      // 歪頭想事情
      run.classList.add('is-puzzled');
      t.to({}, { duration: 1.3 }).add(() => run.classList.remove('is-puzzled'));
    }
  };

  /** 被惹毛：羽毛炸開、急促地咕咕叫，往右上角飛走；過一陣子換一身打扮飛回來 */
  const flee = () => {
    const p = parts();
    const s = st.current;
    owlHoot(1.15, true);
    buzz([30, 30, 30]);
    say(pick(HUFFS), true, isStar(s.at));
    if (!p || reducedMotion()) {
      s.taps = 0;
      return;
    }
    const { run, body } = p;
    s.busy = true;
    s.gone = true;
    s.taps = 0;
    const t = gsap.timeline();
    anim.current = t;
    t.to(body, { scale: 1.16, duration: 0.12, transformOrigin: '50% 100%' })
      .to(body, { x: 2.4, duration: 0.04, yoyo: true, repeat: 11 })
      .to(body, { x: 0, scale: 1, duration: 0.1 })
      .add(() => {
        run.classList.add('is-flying');
        flutter(12);
      })
      .to(body, { rotation: 14, duration: 0.2 })
      .to(run, { x: 640, duration: 1.2, ease: 'power2.in' }, '<')
      .to(run, { y: -260, duration: 1.2, ease: 'power1.in' }, '<')
      .set(run, { autoAlpha: 0 })
      .set(body, { rotation: 0 })
      .add(() => run.classList.remove('is-flying'));
    timers.current.push(
      window.setTimeout(
        () => {
          // 不在畫面上的時候換衣服
          setOutfit((o) => randomOutfit(o));
          timers.current.push(window.setTimeout(comeBack, 300));
        },
        rand(9000, 13000),
      ),
    );
  };

  /** 從左上角飛回書桌（左邊或藥水瓶上，隨機），咕一聲 */
  const comeBack = () => {
    const p = parts();
    const s = st.current;
    if (!p) return;
    const { run, body } = p;
    const target = randomStart();
    const home = spot(target);
    gsap.set(run, { x: -240, y: -200, autoAlpha: 1 });
    gsap.set(body, { x: 0, y: 0, rotation: 0, scale: 1 });
    const t = gsap.timeline({
      onComplete: () => {
        s.busy = false;
        s.gone = false;
      },
    });
    anim.current = t;
    t.add(() => {
      run.classList.add('is-flying');
      flutter(14);
    })
      .to(body, { rotation: 12, duration: 0.2 })
      .to(run, { x: home.x, duration: 1.6, ease: 'power2.out' }, '<')
      .to(run, { y: home.y, duration: 1.6, ease: 'power1.inOut' }, '<')
      .to(body, { rotation: 0, duration: 0.3 }, '-=0.4')
      .add(() => run.classList.remove('is-flying'))
      .to(body, { scaleY: 0.86, scaleX: 1.08, duration: 0.07, transformOrigin: '50% 100%' })
      .to(body, { scaleY: 1, scaleX: 1, duration: 0.26, ease: 'back.out(3)' })
      .add(() => {
        owlHoot(1.1);
        say('咕～');
      });
    s.at = target;
  };

  const poke = () => {
    const s = st.current;
    if (s.busy || s.gone) return;
    const now = Date.now();
    s.taps = now - s.last > FORGET_MS ? 1 : s.taps + 1;
    s.last = now;
    if (s.taps >= PATIENCE) {
      flee();
      return;
    }
    // 站在星星上不翻跟斗（會飛出畫面），在書桌左邊才會原地蹦；上面空間不夠翻一圈（會鑽進布幔）也不翻
    const canLoop = roomAt(spot(s.at).y - 122);
    const moves: Move[] = isStar(s.at)
      ? ['fly', 'puzzle', 'fly']
      : s.at === 'home'
        ? ['hop', 'fly', 'puzzle', 'fly', ...(canLoop ? (['loop'] as const) : [])]
        : ['fly', 'puzzle', 'fly', ...(canLoop ? (['loop'] as const) : [])];
    const move = pick(moves, s.prev || undefined);
    // 星星離布幔太近（手機上常常這樣）就不飛上去，免得頭被布幔擋住
    const perches: Perch[] = ['home', 'book', 'ball', 'potion', 'star0', 'star1', 'ball', 'star0'];
    const to = pick<Perch>(
      perches.filter((p) => !isStar(p) || roomAt(spot(p).y)),
      s.at,
    );
    owlHoot(move === 'puzzle' ? 1.2 : 1);
    say(
      move === 'puzzle' ? '咕？' : move === 'loop' ? '咕～咕！' : '咕咕',
      false,
      isStar(s.at) || (move === 'fly' && isStar(to)),
    );
    if (reducedMotion()) return;
    play(move, to);
  };

  return { poke, line, outfit, start: PERCH[start] };
}
