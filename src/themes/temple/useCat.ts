'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { buzz, hiss, meow, preloadMeow } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';

/** 廟貓能去的地方（SVG 座標，貓的腳底） */
const FLOOR_Y = 308;
const TABLE_Y = 197;
/** 一進來趴的位置：供桌前的左下或右下，隨機 */
const HOMES = [112, 278];
/** 供桌前可以跑的範圍 */
const FLOOR: [number, number] = [92, 300];
/** 供桌上的兩個空位：香爐旁、柑橘旁 */
const TABLE = [104, 286];
/** 跑出畫面時要跑到多遠（舞台會裁掉） */
const OFF_L = -240;
const OFF_R = 630;
/** 第幾下就不耐煩跑掉 */
const PATIENCE = 3;
/** 多久沒被點，就忘記剛剛被點過幾下 */
const FORGET_MS = 9000;

type Spot = 'floor' | 'table';
type Move = 'dash' | 'leap' | 'roll' | 'pounce' | 'chase' | 'stretch' | 'hopdown' | 'backflip' | 'cross';
export type CatLine = { text: string; angry?: boolean; n: number };

const MOVES: Record<Spot, Move[]> = {
  floor: ['dash', 'leap', 'roll', 'pounce', 'chase', 'stretch', 'backflip', 'leap'],
  table: ['hopdown', 'chase', 'stretch', 'backflip', 'cross', 'hopdown'],
};
/** 被惹毛時說的話 */
const HUFFS = ['歸剛！', '你禮貌嗎？', '煩！！！'];
const LINES: Partial<Record<Move, string>> = {
  leap: '喵！',
  stretch: '喵啊～',
  roll: '喵～',
  backflip: '喵哈！',
  cross: '喵～喵！',
};

const clamp = (v: number, [a, b]: [number, number]) => Math.min(b, Math.max(a, v));
/** 隨機的東西都放在元件外面：只會在點擊之後（或一進來的時候）才呼叫 */
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const coin = () => Math.random() < 0.5;
const pick = <T>(list: T[], not?: T) => {
  const pool = list.filter((x) => x !== not);
  return pool[Math.floor(rand(0, pool.length))];
};
const randomHome = () => (coin() ? HOMES[0] : HOMES[1]);

/**
 * 廟貓的小脾氣：點一下就喵一聲、換個動作亂跑（衝刺、翻滾、撲、追尾巴、伸懶腰、跳上供桌）；
 * 連點三下會哈氣、炸毛，然後跑出畫面，過一陣子才慢慢走回來。
 * 畫面上要有 .cat-run（位置）和裡面的 .cat__flip（轉向、壓扁）。
 */
export function useTempleCat(svg: RefObject<SVGSVGElement | null>) {
  // 一進來一定趴在供桌前，左邊或右邊隨機；在右邊的話面向左
  const [start] = useState(randomHome);
  const st = useRef({
    taps: 0,
    last: 0,
    busy: false,
    gone: false,
    spot: 'floor' as Spot,
    x: start,
    face: (start > 196 ? -1 : 1) as 1 | -1,
    prev: '' as Move | '',
  });
  const [line, setLine] = useState<CatLine | null>(null);
  const timers = useRef<number[]>([]);
  const anim = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    const flip = svg.current?.querySelector('.cat__flip');
    if (flip && st.current.face < 0) gsap.set(flip, { scaleX: -1, transformOrigin: '50% 50%' });
  }, [svg]);

  useEffect(() => {
    // 先把真的貓叫錄音抓下來，第一次點就有聲音
    preloadMeow();
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      anim.current?.kill();
    };
  }, []);

  const say = (text: string, angry = false) => setLine((l) => ({ text, angry, n: (l?.n ?? 0) + 1 }));

  const parts = () => {
    const q = svg.current ? gsap.utils.selector(svg.current) : null;
    const run = q?.('.cat-run')[0] as SVGGElement | undefined;
    const flip = q?.('.cat__flip')[0] as SVGGElement | undefined;
    return run && flip ? { run, flip } : null;
  };

  /** 落地：壓扁一下再彈回來 */
  const land = (t: gsap.core.Timeline, flip: Element, dir: number) =>
    t
      .to(flip, { scaleY: 0.84, scaleX: dir * 1.07, duration: 0.07, transformOrigin: '50% 100%' })
      .to(flip, { scaleY: 1, scaleX: dir, duration: 0.24, ease: 'back.out(3)' });

  const play = (move: Move) => {
    const p = parts();
    if (!p) return;
    const { run, flip } = p;
    const s = st.current;
    s.busy = true;
    s.prev = move;
    const t = gsap.timeline({
      onComplete: () => {
        s.busy = false;
      },
    });
    anim.current = t;
    const y = s.spot === 'table' ? TABLE_Y : FLOOR_Y;

    if (move === 'dash') {
      let tx = rand(FLOOR[0], FLOOR[1]);
      if (Math.abs(tx - s.x) < 80) tx = s.x < 196 ? s.x + 130 : s.x - 130;
      tx = clamp(tx, FLOOR);
      const dir = tx > s.x ? 1 : -1;
      const dur = Math.max(0.5, Math.abs(tx - s.x) / 300);
      const hops = Math.max(2, Math.round(dur / 0.2));
      t.to(flip, { scaleX: dir, duration: 0.12, transformOrigin: '50% 50%' })
        .add(() => run.classList.add('is-running'))
        .to(run, { x: tx, duration: dur, ease: 'power1.inOut' })
        .to(flip, { y: -5, duration: dur / hops / 2, yoyo: true, repeat: hops * 2 - 1, ease: 'sine.out' }, '<')
        .add(() => run.classList.remove('is-running'));
      land(t, flip, dir);
      s.x = tx;
      s.face = dir;
    } else if (move === 'leap') {
      // 跳上供桌：香爐旁或柑橘旁，隨機
      const tx = coin() ? TABLE[0] : TABLE[1];
      const dir = tx >= s.x ? 1 : -1;
      t.to(flip, { scaleX: dir, duration: 0.12, transformOrigin: '50% 50%' })
        .to(flip, { scaleY: 0.74, scaleX: dir * 1.1, duration: 0.22, ease: 'power2.out', transformOrigin: '50% 100%' })
        .to(flip, { scaleY: 1.14, scaleX: dir * 0.94, duration: 0.12 })
        .to(run, { x: tx, duration: 0.58, ease: 'none' }, '<')
        .to(run, { y: TABLE_Y - 54, duration: 0.3, ease: 'power2.out' }, '<')
        .to(flip, { scaleY: 1, scaleX: dir, duration: 0.2 }, '<0.12')
        .to(run, { y: TABLE_Y, duration: 0.28, ease: 'power2.in' }, '>-0.02')
        .add(() => buzz(12));
      land(t, flip, dir);
      s.x = tx;
      s.face = dir;
      s.spot = 'table';
    } else if (move === 'hopdown') {
      const dir = coin() ? -1 : 1;
      const tx = clamp(s.x + dir * rand(60, 120), FLOOR);
      const d = tx >= s.x ? 1 : -1;
      t.to(flip, { scaleX: d, duration: 0.12, transformOrigin: '50% 50%' })
        .to(flip, { scaleY: 0.8, duration: 0.14, transformOrigin: '50% 100%' })
        .to(flip, { scaleY: 1.08, duration: 0.1 })
        .to(run, { x: tx, duration: 0.52, ease: 'none' }, '<')
        .to(run, { y: TABLE_Y - 28, duration: 0.18, ease: 'power2.out' }, '<')
        .to(run, { y: FLOOR_Y, duration: 0.34, ease: 'power2.in' })
        .add(() => buzz(10));
      land(t, flip, d);
      s.x = tx;
      s.face = d;
      s.spot = 'floor';
    } else if (move === 'roll') {
      let dir = s.face;
      if ((dir > 0 && s.x > FLOOR[1] - 60) || (dir < 0 && s.x < FLOOR[0] + 60)) dir = -dir as 1 | -1;
      const tx = clamp(s.x + dir * 76, FLOOR);
      t.to(flip, { scaleX: dir, duration: 0.1, transformOrigin: '50% 50%' })
        .to(flip, { scaleY: 0.86, duration: 0.1, transformOrigin: '50% 100%' })
        .to(flip, { rotation: 360, scaleY: 1, duration: 0.62, ease: 'power1.inOut', transformOrigin: '50% 50%' })
        .to(run, { x: tx, duration: 0.62, ease: 'power1.inOut' }, '<')
        .to(run, { y: y - 10, duration: 0.31, yoyo: true, repeat: 1, ease: 'sine.out' }, '<')
        .set(flip, { rotation: 0 });
      land(t, flip, dir);
      s.x = tx;
      s.face = dir;
    } else if (move === 'pounce') {
      let dir = s.face;
      if ((dir > 0 && s.x > FLOOR[1] - 50) || (dir < 0 && s.x < FLOOR[0] + 50)) dir = -dir as 1 | -1;
      const tx = clamp(s.x + dir * 66, FLOOR);
      t.to(flip, { scaleX: dir, duration: 0.1, transformOrigin: '50% 50%' })
        .to(flip, { scaleY: 0.76, scaleX: dir * 1.1, duration: 0.2, transformOrigin: '50% 100%' })
        // 屁股扭一扭
        .to(flip, { x: 2.6, duration: 0.05, yoyo: true, repeat: 7, ease: 'sine.inOut' })
        .to(flip, { x: 0, scaleY: 1.12, scaleX: dir * 0.95, duration: 0.08 })
        .to(run, { x: tx, duration: 0.4, ease: 'power2.out' }, '<')
        .to(run, { y: y - 30, duration: 0.2, ease: 'power2.out' }, '<')
        .to(run, { y, duration: 0.2, ease: 'power2.in' }, '>');
      land(t, flip, dir);
      s.x = tx;
      s.face = dir;
    } else if (move === 'backflip') {
      // 後空翻：蹲低、跳高、往後翻一圈，落在後面一點
      const f = s.face;
      const back = s.spot === 'table' ? s.x : clamp(s.x - f * 26, FLOOR);
      const t0 = t.duration();
      t.to(flip, { scaleY: 0.72, scaleX: f * 1.1, duration: 0.18, transformOrigin: '50% 100%' }, t0)
        .to(flip, { scaleY: 1.06, scaleX: f * 0.96, duration: 0.1 }, t0 + 0.18)
        .to(run, { y: y - 78, duration: 0.32, ease: 'power2.out' }, t0 + 0.18)
        .to(run, { x: back, duration: 0.62, ease: 'none' }, t0 + 0.18)
        .to(flip, { rotation: -f * 360, duration: 0.56, ease: 'power1.inOut', transformOrigin: '50% 50%' }, t0 + 0.2)
        .to(run, { y, duration: 0.3, ease: 'power2.in' }, t0 + 0.5)
        .set(flip, { rotation: 0 }, t0 + 0.8)
        .add(() => buzz(12), t0 + 0.8);
      land(t, flip, f);
      s.x = back;
    } else if (move === 'cross') {
      // 從供桌這頭一躍跳到那頭（越過籤筒前面）
      const tx = s.x < 196 ? TABLE[1] : TABLE[0];
      const dir = tx > s.x ? 1 : -1;
      t.to(flip, { scaleX: dir, duration: 0.12, transformOrigin: '50% 50%' })
        .to(flip, { scaleY: 0.74, scaleX: dir * 1.1, duration: 0.2, transformOrigin: '50% 100%' })
        .to(flip, { scaleY: 1.12, scaleX: dir * 0.94, duration: 0.12 })
        .to(run, { x: tx, duration: 0.8, ease: 'none' }, '<')
        .to(run, { y: TABLE_Y - 96, duration: 0.4, ease: 'power2.out' }, '<')
        .to(flip, { scaleY: 1, scaleX: dir, duration: 0.2 }, '<0.15')
        .to(run, { y: TABLE_Y, duration: 0.4, ease: 'power2.in' }, '>-0.05')
        .add(() => buzz(12));
      land(t, flip, dir);
      s.x = tx;
      s.face = dir;
    } else if (move === 'chase') {
      // 追自己的尾巴：原地轉好幾圈
      const f = s.face;
      [-f, f, -f, f, -f, f].forEach((dir, i) =>
        t.to(flip, { scaleX: dir, y: i % 2 ? 0 : -7, duration: 0.12, transformOrigin: '50% 50%', ease: 'sine.inOut' }),
      );
      land(t, flip, f);
    } else {
      // 伸懶腰
      const f = s.face;
      t.to(flip, { scaleX: f * 1.26, scaleY: 0.8, duration: 0.5, ease: 'sine.inOut', transformOrigin: '50% 100%' }).to(
        flip,
        { scaleX: f, scaleY: 1, duration: 0.4, ease: 'back.out(2)' },
        '+=0.3',
      );
    }
  };

  /** 被惹毛：炸毛、哈氣，跑出畫面；過一陣子才慢慢走回來 */
  const flee = () => {
    const p = parts();
    const s = st.current;
    hiss();
    buzz([30, 30, 30]);
    say(pick(HUFFS), true);
    if (!p || reducedMotion()) {
      s.taps = 0;
      return;
    }
    const { run, flip } = p;
    s.busy = true;
    s.gone = true;
    s.taps = 0;
    const edge = s.x < 196 ? -1 : 1;
    const t = gsap.timeline();
    anim.current = t;
    t.to(flip, { scaleY: 1.22, scaleX: s.face * 1.14, duration: 0.12, transformOrigin: '50% 100%' })
      .to(flip, { x: 2.6, duration: 0.04, yoyo: true, repeat: 11 })
      .to(flip, { x: 0, scaleY: 1, scaleX: edge, duration: 0.12, transformOrigin: '50% 50%' });
    if (s.spot === 'table')
      t.to(run, { x: s.x + edge * 50, duration: 0.42, ease: 'none' })
        .to(run, { y: TABLE_Y - 26, duration: 0.16, ease: 'power2.out' }, '<')
        .to(run, { y: FLOOR_Y, duration: 0.26, ease: 'power2.in' }, '>');
    t.add(() => run.classList.add('is-running'))
      .to(run, { x: edge < 0 ? OFF_L : OFF_R, duration: 1, ease: 'power2.in' })
      .to(flip, { y: -6, duration: 0.09, yoyo: true, repeat: 10 }, '<')
      .set(run, { autoAlpha: 0 })
      .add(() => run.classList.remove('is-running'));
    timers.current.push(window.setTimeout(comeBack, rand(9000, 13000)));
  };

  /** 氣消了：從畫面外慢慢走回供桌前（左下或右下，隨機），喵一聲 */
  const comeBack = () => {
    const p = parts();
    const s = st.current;
    if (!p) return;
    const { run, flip } = p;
    const home = randomHome();
    const from = coin() ? OFF_L : OFF_R;
    const dir = from < home ? 1 : -1;
    gsap.set(run, { x: from, y: FLOOR_Y, autoAlpha: 1 });
    gsap.set(flip, { x: 0, y: 0, rotation: 0, scaleY: 1, scaleX: dir, transformOrigin: '50% 50%' });
    const t = gsap.timeline({
      onComplete: () => {
        s.busy = false;
        s.gone = false;
      },
    });
    anim.current = t;
    t.add(() => run.classList.add('is-running'))
      .to(run, { x: home, duration: 2.6, ease: 'power2.out' })
      .to(flip, { y: -3, duration: 0.13, yoyo: true, repeat: 15 }, '<')
      .add(() => run.classList.remove('is-running'))
      .add(() => {
        meow(1.25);
        say('喵。');
      });
    s.x = home;
    s.spot = 'floor';
    s.face = dir;
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
    const move = pick(MOVES[s.spot], s.prev || undefined);
    meow(s.taps === 1 ? 1.08 : 0.94, move === 'stretch');
    say(LINES[move] ?? (s.taps === 1 ? '喵～' : '喵？'));
    if (reducedMotion()) return;
    play(move);
  };

  return { poke, line, start };
}
