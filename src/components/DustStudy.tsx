'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import { INK } from '@/art/ink';
import { BookStack, Owl, Star } from '@/themes/magic/parts';
import { CrystalBall } from '@/themes/magic/CrystalBall';
import { reducedMotion } from '@/lib/motion';
import { fizzle, flutter, owlHoot, paper, scurry, sparkle, twinkle } from '@/lib/sound';
import { Candle, Particles, burst } from './ShelfScene';
import './DustStudy.css';

export interface StudyBook {
  id: string;
  name: string;
  cat: string;
}

const W = 390;
const H = 430;
const CAVITY = { x0: 92, x1: 298, y0: 184, y1: 352 };
const COLORS = [
  { bg: 'var(--cobalt)', fg: 'var(--paper-hi)', emblem: 'var(--marigold)' },
  { bg: 'var(--vermilion)', fg: 'var(--paper-hi)', emblem: 'var(--marigold)' },
  { bg: 'var(--marigold)', fg: INK, emblem: 'var(--cobalt)' },
  { bg: 'var(--jade)', fg: 'var(--paper-hi)', emblem: 'var(--marigold)' },
];
const SIGILS = ['✦', '☾', '✧', '◇'];
const WINDOW_STARS: [number, number, number][] = [
  [172, 54, 3.4],
  [214, 40, 2.8],
  [182, 96, 2.4],
  [224, 82, 3],
];
const SKY_LINES = WINDOW_STARS;
const SPINE_TONES = ['#c9d4e6', '#d9cdb3', '#b9c7dd', '#e3d8c2', '#c2cbd9', '#d4c3a3'];

function TallShelf({ x0, x1, seed }: { x0: number; x1: number; seed: number }) {
  const rows = [8, 62, 116, 170, 224, 278, 332, 386];
  return (
    <g className="study__tall">
      <rect x={x0} y="0" width={x1 - x0} height="430" fill="#d8cfbf" stroke={INK} strokeWidth="1.4" />
      {rows.map((y, r) => {
        let x = x0 + 6;
        const spines = [];
        let k = 0;
        while (x < x1 - 8) {
          const w = 5 + ((seed + r * 7 + k * 13) % 5);
          const h = 30 + ((seed + r * 11 + k * 5) % 16);
          const lean = (seed + r + k) % 9 === 0;
          spines.push(
            <rect
              key={k}
              x={x}
              y={y + 46 - h}
              width={w}
              height={h}
              fill={SPINE_TONES[(seed + r * 3 + k) % SPINE_TONES.length]}
              stroke={INK}
              strokeWidth="0.7"
              strokeOpacity="0.55"
              transform={lean ? `rotate(9 ${x + w} ${y + 46})` : undefined}
            />,
          );
          x += w + (lean ? 4 : 0.6);
          k++;
        }
        return (
          <g key={y}>
            {spines}
            <rect x={x0} y={y + 46} width={x1 - x0} height="6" fill="#b8a585" stroke={INK} strokeWidth="1" />
          </g>
        );
      })}
      <rect x={x0} y="0" width={x1 - x0} height="430" fill="url(#study-haze)" />
    </g>
  );
}

const fontFor = (name: string) => Math.min(15, Math.floor(98 / Math.max(1, [...name].length)));
const heightFor = (name: string) =>
  Math.min(150, Math.max(104, Math.ceil([...name].length * fontFor(name) * 1.14) + 62));
const roll = () => Math.random();
const spark = (x: number, y: number, r: number) => {
  const k = r * 0.32;
  return `M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`;
};
const ORB = { x: 34, y: 352 };
const MOTES = 18;
const OWL = { x: 300, y: 132, s: 0.64 };
/** 貓頭鷹會飛去停的地方（腳底座標）：吊燈頂、梯子、左下角書堆上的水晶球頂 */
const SPOTS: { x: number; y: number; lamp?: boolean; orb?: boolean }[] = [
  { x: 108, y: 45, lamp: true },
  { x: 334, y: 236 },
  { x: 34, y: 336, orb: true },
];
/** 飛回來之後多久沒人理就睡著 */
const OWL_NAP_MS = 12000;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export function DustStudy({
  books,
  title,
  phrase,
  page,
  onOpen,
}: {
  books: StudyBook[];
  title: string;
  phrase: string;
  page: number;
  onOpen: (id: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLUListElement>(null);
  const busy = useRef({ spider: false, orb: false, owl: false });
  const [hat, setHat] = useState(false);
  // 貓頭鷹平常在書櫃頂上打盹；點醒了會飛去書架叼一本書出來轉一圈，飛回來一陣子沒人理又睡著
  const [asleep, setAsleep] = useState(true);
  const nap = useRef(0);
  useEffect(() => () => clearTimeout(nap.current), []);
  const napLater = () => {
    clearTimeout(nap.current);
    nap.current = window.setTimeout(() => setAsleep(true), OWL_NAP_MS);
  };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (reducedMotion()) {
      el.classList.add('is-in');
      return;
    }
    const q = gsap.utils.selector(el);
    let tl: gsap.core.Timeline | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        el.classList.add('is-in');
        tl = gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from(q('.study__tall'), { y: 50, opacity: 0, duration: 1.1, stagger: 0.12 }, 0)
          .from(q('.study__window'), { opacity: 0, y: -16, duration: 0.9 }, 0.2)
          .from(q('.study__beam'), { opacity: 0, scaleY: 0.2, duration: 1.4, transformOrigin: '50% 0%' }, 0.6)
          .from(
            q('.study__window-star'),
            { scale: 0, duration: 0.4, stagger: 0.12, ease: 'back.out(3)', transformOrigin: '50% 50%' },
            0.8,
          )
          .from(q('.study__ladder'), { x: 30, opacity: 0, duration: 0.8 }, 0.5)
          .from(q('.study__lamp'), { y: -80, duration: 1, ease: 'bounce.out' }, 0.5)
          .from(q('.study__case'), { y: 26, opacity: 0, duration: 0.8 }, 0.7)
          .from(q('.study__pile'), { y: 14, opacity: 0, duration: 0.6 }, 0.9)
          .from(q('.study__title, .study__phrase'), { opacity: 0, y: 8, duration: 0.5, stagger: 0.1 }, 1.1)
          .from(q('.study__book'), { y: 70, opacity: 0, duration: 0.6, stagger: 0.09, ease: 'back.out(1.4)' }, 1.2)
          .from(
            q('.candle__flame'),
            { scale: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)', transformOrigin: '50% 100%' },
            1.7,
          )
          .add(() => twinkle(4), 1.7)
          .from(q('.study__orb'), { opacity: 0, duration: 1.4 }, 1.9)
          .from(q('.study__owl'), { opacity: 0, y: -24, duration: 0.6, ease: 'back.out(2.4)' }, 2.1);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      tl?.kill();
    };
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || reducedMotion() || !matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      el.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    };
    const onLeave = () => {
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const lastPage = useRef(page);
  useLayoutEffect(() => {
    const dir = page === lastPage.current ? 0 : page > lastPage.current ? 1 : -1;
    lastPage.current = page;
    const el = row.current;
    if (!el || !dir || reducedMotion()) return;
    const t = gsap.fromTo(
      el.querySelectorAll('.study__book'),
      { x: 40 * dir, opacity: 0, rotate: 8 * dir },
      {
        x: 0,
        opacity: 1,
        rotate: 0,
        duration: 0.55,
        stagger: 0.06 * dir,
        ease: 'back.out(1.6)',
        clearProps: 'transform',
      },
    );
    return () => void t.kill();
  }, [page]);

  const lightLamp = () => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    twinkle(7);
    gsap.fromTo(
      q('.study__lamp'),
      { rotate: 0 },
      { keyframes: { rotate: [10, -7, 4, -2, 0] }, duration: 2, ease: 'sine.out', svgOrigin: '108 0' },
    );
    gsap
      .timeline()
      .to(q('.study__lamp-glow'), { opacity: 0.55, duration: 0.25 })
      .to(q('.study__lamp-fire'), { opacity: 1, duration: 0.25 }, 0)
      .to(q('.study__lamp-glow'), { opacity: 0.2, duration: 0.08, yoyo: true, repeat: 5 }, 1.6)
      .to(q('.study__lamp-glow, .study__lamp-fire'), { opacity: 0, duration: 0.8 }, 2.4);
  };

  /** 一本書轉著飄出書架、在空中晃一下，再轉回原位 */
  const floatBook = (book: HTMLElement, onDone?: () => void) => {
    const cavity = book.closest('.study__cavity');
    cavity?.classList.add('is-float');
    const r = book.getBoundingClientRect();
    burst(book, { x: r.left + r.width / 2, y: r.top + 4, n: 22 });
    twinkle(6);
    return gsap
      .timeline({
        onComplete: () => {
          gsap.set(book, { clearProps: 'transform' });
          cavity?.classList.remove('is-float');
          onDone?.();
        },
      })
      .to(book, {
        y: -r.height * 0.16,
        rotationY: 360,
        rotation: -8,
        scale: 1.22,
        transformPerspective: 600,
        duration: 0.85,
        ease: 'power2.out',
      })
      .to(book, { y: -r.height * 0.1, rotation: 6, duration: 0.45, yoyo: true, repeat: 1, ease: 'sine.inOut' })
      .to(book, { y: 0, rotationY: 720, rotation: 0, scale: 1, duration: 0.7, ease: 'back.out(1.6)' })
      .add(() => paper(0.15), '-=0.3');
  };

  const pokeOwl = () => {
    const el = root.current;
    if (!el || busy.current.owl) return;
    clearTimeout(nap.current);
    const wasAsleep = asleep;
    setAsleep(false);
    if (reducedMotion()) return napLater();
    busy.current.owl = true;
    const q = gsap.utils.selector(el);
    // run：整隻的位移（外層，沒有位置屬性）；body：身體那層，負責蹲、伸、傾斜、壓扁（以腳底為軸）
    const run = q('.study__owl')[0];
    const body = q('.study__owl .owl__hop')[0];
    const tl = gsap.timeline({
      onComplete: () => {
        run.classList.remove('is-flying');
        // 飛完一定回到書櫃頂上：位移、透明度、身體的變形都清掉
        gsap.set(run, { clearProps: 'transform,opacity' });
        gsap.set(body, { clearProps: 'transform' });
        busy.current.owl = false;
        napLater();
      },
    });
    gsap.set(body, { transformOrigin: '50% 100%' });

    if (wasAsleep) {
      // 驚醒：整隻彈起來、臉放大一下，咕一聲
      owlHoot(1.3);
      tl.to(run, { y: -14, duration: 0.16, ease: 'power2.out' })
        .to(run, { y: 0, duration: 0.3, ease: 'bounce.out' })
        .fromTo(
          q('.study__owl .owl__face'),
          { scale: 0.86 },
          { scale: 1.12, duration: 0.18, yoyo: true, repeat: 1, transformOrigin: '50% 50%' },
          0.05,
        )
        .to({}, { duration: 0.1 });
    } else owlHoot(1.05);

    // 跟施法頁同一套飛法：蹲一下、伸展起飛、拍翅膀飛一道弧線（身體往飛的方向斜），落地壓扁再彈回來。
    // 座標都是相對書櫃頂的位移；air：起點在空中（不用蹲）、land: false：停在空中（不壓扁、翅膀繼續拍）
    let at = { x: 0, y: 0 };
    const flyTo = (to: { x: number; y: number }, { air = false, land = true } = {}) => {
      const d = Math.min(1.5, Math.max(0.8, Math.hypot(to.x - at.x, to.y - at.y) / 240));
      const lean = to.x > at.x ? 10 : to.x < at.x ? -10 : 0;
      // 弧線最高點：頭頂不要飛出畫面上緣
      const peak = Math.max(Math.min(at.y, to.y) - 50, 46 - OWL.y);
      if (!air) tl.to(body, { scaleY: 0.84, scaleX: 1.08, duration: 0.12 });
      tl.add(() => {
        run.classList.add('is-flying');
        flutter(Math.round(d * 8));
      })
        .to(body, { scaleY: 1.06, scaleX: 0.96, rotation: lean, duration: 0.14 })
        .to(run, { x: to.x, duration: d, ease: 'sine.inOut' }, '<')
        .to(run, { y: peak, duration: d * 0.5, ease: 'sine.out' }, '<')
        .to(run, { y: to.y, duration: d * 0.5, ease: 'sine.in' }, '>')
        .to(body, { rotation: 0, scaleY: 1, scaleX: 1, duration: 0.2 }, '<');
      if (land)
        tl.add(() => run.classList.remove('is-flying'))
          .to(body, { scaleY: 0.86, scaleX: 1.08, duration: 0.07 })
          .to(body, { scaleY: 1, scaleX: 1, duration: 0.26, ease: 'back.out(3)' });
      at = to;
    };
    const home = { x: 0, y: 0 };

    const r = roll();
    // 睡醒一定會飛（去吊燈、梯子、水晶球，或飛出去再回來）；醒著的時候也可能只是跳一跳、歪頭
    const plan = wasAsleep
      ? r < 0.8
        ? 'spot'
        : 'away'
      : r < 0.45
        ? 'spot'
        : r < 0.65
          ? 'away'
          : r < 0.85
            ? 'hop'
            : 'tilt';

    if (plan === 'spot') {
      // 飛去別的地方停一下（吊燈、梯子、水晶球），左右張望就飛回來；吊燈會被壓得晃一晃、水晶球會亮一下
      // 戴著巫師帽就不去吊燈：帽尖會被畫面上緣切掉
      const spots = SPOTS.filter((x) => !(x.lamp && hat));
      const spot = spots[Math.floor(roll() * spots.length)];
      flyTo({ x: spot.x - OWL.x, y: spot.y - OWL.y });
      const face = q('.study__owl .owl__face');
      tl.addLabel('perch');
      if (spot.lamp)
        tl.fromTo(
          q('.study__lamp'),
          { rotate: 0 },
          { keyframes: { rotate: [7, -5, 3, -1.5, 0] }, duration: 1.6, ease: 'sine.out', svgOrigin: '108 0' },
          'perch',
        ).fromTo(
          body,
          { rotation: 0 },
          { keyframes: { rotation: [6, -4, 2.5, -1, 0] }, duration: 1.6, ease: 'sine.out' },
          'perch',
        );
      if (spot.orb)
        // 停到水晶球上：球被壓得一亮、晃一下
        tl.add(() => twinkle(8), 'perch')
          .fromTo(
            q('.study__orb .crystal'),
            { scale: 1 },
            { scale: 1.14, duration: 0.16, yoyo: true, repeat: 3, ease: 'sine.inOut', svgOrigin: `${ORB.x} ${ORB.y}` },
            'perch',
          )
          .fromTo(
            q('.study__orb-glow'),
            { scale: 1 },
            { scale: 2, duration: 0.35, yoyo: true, repeat: 1, ease: 'power2.out', svgOrigin: `${ORB.x} ${ORB.y}` },
            'perch',
          );
      tl.to(face, { x: -3, duration: 0.2 }, 'perch+=0.15')
        .to(face, { x: 3, duration: 0.24 }, 'perch+=0.55')
        .to(face, { x: 0, duration: 0.2 }, 'perch+=0.95')
        .to({}, { duration: 0.1 });
      flyTo(home);
    } else if (plan === 'away') {
      // 跟施法頁被惹毛時一樣：往右上角加速飛出畫面，過一下換一身打扮，從左上角減速飛回來
      tl.to(body, { scaleY: 0.84, scaleX: 1.08, duration: 0.12 })
        .add(() => {
          run.classList.add('is-flying');
          flutter(12);
        })
        .to(body, { scaleY: 1, scaleX: 1, rotation: 14, duration: 0.2 })
        .to(run, { x: 200, duration: 1.1, ease: 'power2.in' }, '<')
        .to(run, { y: -240, duration: 1.1, ease: 'power1.in' }, '<')
        .set(run, { autoAlpha: 0 })
        .add(() => run.classList.remove('is-flying'))
        .add(() => setHat((h) => !h), '+=0.6')
        .set(run, { x: -320, y: -200, autoAlpha: 1 }, '+=1.4')
        .set(body, { rotation: 12 })
        .add(() => {
          run.classList.add('is-flying');
          flutter(14);
        })
        .to(run, { x: 0, duration: 1.5, ease: 'power2.out' })
        .to(run, { y: 0, duration: 1.5, ease: 'power1.inOut' }, '<')
        .to(body, { rotation: 0, duration: 0.3 }, '-=0.4')
        .add(() => run.classList.remove('is-flying'))
        .to(body, { scaleY: 0.86, scaleX: 1.08, duration: 0.07 })
        .to(body, { scaleY: 1, scaleX: 1, duration: 0.26, ease: 'back.out(3)' })
        .add(() => owlHoot(1.1));
    } else if (plan === 'hop') {
      // 原地蹦兩下，蹦起來時換一下帽子
      [-12, 12].forEach((dx, k) => {
        tl.to(body, { scaleY: 0.86, duration: 0.08 })
          .to(body, { scaleY: 1, duration: 0.1 })
          .to(run, { x: dx, duration: 0.26, ease: 'power1.inOut' }, '<')
          .to(run, { y: -16, duration: 0.13, ease: 'power2.out' }, '<')
          .to(run, { y: 0, duration: 0.13, ease: 'power2.in' }, '>');
        if (k === 0) tl.add(() => setHat((h) => !h), '<');
      });
      tl.to(run, { x: 0, duration: 0.2 });
    } else {
      // 歪頭想一下（斜身體那層，以腳底為軸）
      tl.to(body, { rotation: -14, duration: 0.25 })
        .to(body, { rotation: 10, duration: 0.3 }, '+=0.35')
        .to(body, { rotation: 0, duration: 0.3, ease: 'back.out(2)' }, '+=0.2');
    }
  };

  const vision = (el: HTMLDivElement) => {
    const q = gsap.utils.selector(el);
    const books = q('.study__book');
    const pick = books[Math.floor(roll() * books.length)];
    el.classList.remove('is-orb-dim');
    el.classList.add('is-vision');
    sparkle();
    const done = () => {
      el.classList.remove('is-vision', 'has-chosen');
      pick?.classList.remove('is-chosen');
      busy.current.orb = false;
    };
    const choose = () => {
      if (!pick) return;
      pick.classList.add('is-chosen');
      el.classList.add('has-chosen');
      twinkle(10);
    };
    if (reducedMotion()) {
      choose();
      window.setTimeout(done, 3200);
      return;
    }
    const sr = el.getBoundingClientRect();
    const br = pick?.getBoundingClientRect();
    const to = br
      ? { x: ((br.left + br.width / 2 - sr.left) / sr.width) * W, y: ((br.top - sr.top) / sr.height) * H }
      : { x: W / 2, y: H / 2 };
    const motes = q('.study__mote');
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(motes, { clearProps: 'transform,opacity' });
        done();
      },
    });
    tl.to(q('.study__orb-glow'), { scale: 3.4, duration: 0.45, ease: 'power2.out', svgOrigin: `${ORB.x} ${ORB.y}` }, 0)
      .to(q('.study__orb .crystal'), { scale: 1.16, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0)
      .to(q('.study__orb-glow'), { scale: 1, duration: 1.2, ease: 'power2.inOut', clearProps: 'transform' }, 3.4);
    motes.forEach((m, i) => {
      const at = 0.12 + i * 0.035;
      tl.fromTo(
        m,
        { x: 0, y: 0, scale: 0.2, opacity: 0, rotate: 0 },
        {
          x: 26 + roll() * 330 - ORB.x,
          y: 26 + roll() * 290 - ORB.y,
          scale: 0.8 + roll() * 0.7,
          opacity: 1,
          rotate: 120 + roll() * 180,
          duration: 1 + roll() * 0.5,
          ease: 'expo.out',
          transformOrigin: '50% 50%',
          onStart: i % 3 === 0 ? () => twinkle(i) : undefined,
        },
        at,
      ).to(m, { opacity: 0.3, duration: 0.22 + roll() * 0.3, yoyo: true, repeat: 3, ease: 'sine.inOut' }, at + 1.1);
    });
    tl.to(
      motes,
      {
        x: to.x - ORB.x,
        y: to.y - ORB.y,
        scale: 0.3,
        opacity: 0,
        rotate: '+=180',
        duration: 0.7,
        ease: 'power3.in',
        stagger: 0.03,
      },
      2.9,
    )
      .add(choose, 3.5)
      .add(() => pick && burst(pick, { x: br!.left + br!.width / 2, y: br!.top + 4, n: 24 }), 3.5)
      .to({}, { duration: 2.4 });
  };

  const touchOrb = () => {
    const el = root.current;
    if (!el || busy.current.orb) return;
    busy.current.orb = true;
    if (el.classList.contains('is-dark')) return vision(el);
    const dimming = !el.classList.contains('is-orb-dim');
    el.classList.toggle('is-orb-dim', dimming);
    if (dimming) fizzle();
    else twinkle(8);
    window.setTimeout(() => {
      busy.current.orb = false;
      if (dimming && roll() < 0.3 && el.classList.contains('is-orb-dim')) {
        el.classList.remove('is-orb-dim');
        twinkle(10);
      }
    }, 3600);
  };

  const pokeWeb = () => {
    const el = root.current;
    if (!el || busy.current.spider || reducedMotion()) return;
    busy.current.spider = true;
    const q = gsap.utils.selector(el);
    scurry(6);
    const flee = roll() < 0.4;
    const tl = gsap.timeline({ onComplete: () => void (busy.current.spider = false) });
    tl.fromTo(
      q('.study__web'),
      { skewX: 0 },
      { keyframes: { skewX: [5, -3, 1.5, 0] }, duration: 0.7, svgOrigin: `${CAVITY.x0} ${CAVITY.y0}` },
      0,
    )
      .to(q('.study__thread'), { attr: { y2: CAVITY.y0 + 96 }, duration: 0.5, ease: 'power2.in' }, 0)
      .to(q('.study__spider'), { y: 64, duration: 0.5, ease: 'power2.in' }, 0)
      .to(q('.study__spider'), {
        rotate: 16,
        duration: 0.1,
        yoyo: true,
        repeat: 5,
        svgOrigin: `${CAVITY.x0 + 34} ${CAVITY.y0 + 38}`,
      });
    if (flee) {
      tl.to(q('.study__thread'), { opacity: 0, duration: 0.1 })
        .to(q('.study__spider'), { x: 160, y: 120, rotate: 80, opacity: 0, duration: 0.9, ease: 'power1.in' })
        .set(q('.study__spider'), { x: 0, y: -40, rotate: 0 })
        .set(q('.study__thread'), { attr: { y2: CAVITY.y0 + 32 } })
        .to(q('.study__thread'), { opacity: 1, duration: 0.6 }, '+=1.4')
        .to(q('.study__spider'), { y: 0, opacity: 1, duration: 0.7 }, '<');
    } else {
      tl.to(q('.study__thread'), { attr: { y2: CAVITY.y0 + 32 }, duration: 1.6, ease: 'steps(12)' }).to(
        q('.study__spider'),
        { y: 0, duration: 1.6, ease: 'steps(12)' },
        '<',
      );
    }
  };

  const openBook = (e: React.MouseEvent<HTMLButtonElement>, b: StudyBook) => {
    const btn = e.currentTarget;
    if (reducedMotion()) return onOpen(b.id);
    // 點一本書：它轉著飄出書架、晃一下再轉回去，才翻開
    sparkle();
    floatBook(btn, () => onOpen(b.id));
  };

  const u = (v: number) => `calc(${v} * var(--u))`;

  return (
    <div ref={root} className="study">
      <svg className="study__art" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id="study-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9b897" stopOpacity="0.9" />
            <stop offset="0.6" stopColor="#d9cbb1" stopOpacity="0.35" />
            <stop offset="1" stopColor="#d9cbb1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="study-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffcf0" stopOpacity="0.9" />
            <stop offset="0.75" stopColor="#fffcf0" stopOpacity="0.22" />
            <stop offset="1" stopColor="#fffcf0" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="study-orb-glow">
            <stop offset="0" stopColor="#c9b8ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#9b7bff" stopOpacity="0" />
          </radialGradient>
          <clipPath id="study-window">
            <path d="M152 140 V70 A43 43 0 0 1 238 70 V140 Z" />
          </clipPath>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="#d9cbb1" />
        <path d="M0 0 H390 V18 H0 Z" fill="#c9b897" />

        <g className="study__window">
          <path d="M146 146 V70 A49 49 0 0 1 244 70 V146 Z" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.6" />
          <g clipPath="url(#study-window)">
            <rect x="150" y="18" width="90" height="130" fill="var(--cobalt)" />
            <path
              d="M212 46 a12 12 0 1 0 10 20 a9.5 9.5 0 0 1 -10 -20 Z"
              fill="var(--paper-hi)"
              stroke={INK}
              strokeWidth="1.1"
            />
            <polyline
              className="study__sky-lines"
              points={SKY_LINES.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="var(--marigold)"
              strokeWidth="1"
              strokeDasharray="2.5 4"
            />
            {WINDOW_STARS.map(([x, y, r], i) => (
              <g key={i} className="study__window-star">
                <Star x={x} y={y} r={r} className="tw" delay={i * 0.5} />
              </g>
            ))}
          </g>
          <path d="M152 140 V70 A43 43 0 0 1 238 70 V140 Z" fill="none" stroke={INK} strokeWidth="1.4" />
          <path d="M195 27 V140 M152 92 H238" stroke={INK} strokeWidth="2.6" />
          <path d="M195 27 V140 M152 92 H238" stroke="var(--wood)" strokeWidth="1.2" />
          <rect x="140" y="140" width="110" height="8" fill="var(--wood)" stroke={INK} strokeWidth="1.3" />
        </g>

        <TallShelf x0={-14} x1={62} seed={3} />
        <TallShelf x0={328} x1={404} seed={8} />

        <g className="study__ladder">
          <path d="M306 430 L338 10 M332 430 L360 10" stroke="var(--wood-lo)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M306 430 L338 10 M332 430 L360 10" stroke={INK} strokeWidth="1" strokeOpacity="0.5" />
          {Array.from({ length: 11 }, (_, i) => {
            const t = (i + 0.6) / 11.5;
            const y = 430 - t * 420;
            return (
              <path key={i} d={`M${306 + t * 32} ${y} L${332 + t * 28} ${y}`} stroke="var(--wood-lo)" strokeWidth="3" />
            );
          })}
          <circle cx="340" cy="10" r="4" fill="var(--marigold)" stroke={INK} strokeWidth="1" />
        </g>

        <g className="study__lamp" onClick={lightLamp}>
          <path d="M108 0 V40" stroke={INK} strokeWidth="1.3" />
          <circle className="study__lamp-glow" cx="108" cy="64" r="40" fill="var(--marigold)" opacity="0" />
          <path d="M96 44 H120 L116 50 H100 Z" fill="var(--gold)" stroke={INK} strokeWidth="1.2" />
          <path d="M98 50 H118 L121 78 H95 Z" fill="#efe3c8" fillOpacity="0.85" stroke={INK} strokeWidth="1.3" />
          <ellipse className="study__lamp-fire" cx="108" cy="66" rx="4" ry="6.5" fill="var(--marigold)" opacity="0" />
          <path d="M108 50 V78 M95 78 H121" stroke={INK} strokeWidth="1" />
          <path d="M93 78 H123 L119 84 H97 Z" fill="var(--gold)" stroke={INK} strokeWidth="1.2" />
          <path d="M101 52 l-6 -8 M115 52 l7 -9" stroke="var(--paper-hi)" strokeWidth="0.6" opacity="0.8" />
          <rect x="84" y="0" width="48" height="90" fill="transparent" />
        </g>

        <g className="study__case">
          <rect x="70" y="140" width="250" height="32" fill="var(--wood)" stroke={INK} strokeWidth="1.8" />
          <rect x="62" y="132" width="266" height="9" rx="2" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.6" />
          <path d="M70 166 H320" stroke="var(--wood-lo)" strokeWidth="1.2" />
          <rect x="137" y="143" width="116" height="25" rx="3" fill="var(--cobalt)" stroke={INK} strokeWidth="1.5" />
          <rect
            x="141"
            y="146.5"
            width="108"
            height="18"
            rx="2"
            fill="none"
            stroke="var(--marigold)"
            strokeWidth="1.1"
          />
          {[96, 294].map((x) => (
            <Star key={x} x={x} y={155} r={5} />
          ))}
          <rect x="74" y="170" width="242" height="200" fill="var(--wood)" stroke={INK} strokeWidth="1.8" />
          <rect
            x={CAVITY.x0}
            y={CAVITY.y0}
            width={CAVITY.x1 - CAVITY.x0}
            height={CAVITY.y1 - CAVITY.y0}
            fill="#3a3027"
            stroke={INK}
            strokeWidth="1.5"
          />
          <rect x={CAVITY.x0} y={CAVITY.y0} width={CAVITY.x1 - CAVITY.x0} height="22" fill="#241d17" opacity="0.6" />
          {[74, 298].map((x) => (
            <g key={x}>
              <rect x={x} y="170" width="18" height="200" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.4" />
              <path d={`M${x + 9} 186 V352`} stroke={INK} strokeWidth="1" opacity="0.4" />
              <circle cx={x + 9} cy="176" r="5" fill="var(--marigold)" stroke={INK} strokeWidth="1.2" />
            </g>
          ))}
          <rect x="74" y="352" width="242" height="12" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.6" />
          <rect x="82" y="364" width="226" height="44" fill="var(--cobalt)" stroke={INK} strokeWidth="1.5" />
          <rect x="92" y="371" width="206" height="30" fill="none" stroke="var(--marigold)" strokeWidth="1.3" />
          <rect x="96" y="408" width="16" height="18" fill={INK} />
          <rect x="278" y="408" width="16" height="18" fill={INK} />
          <path
            d="M74 172 l18 14 M74 172 l10 22 M74 172 l24 6 M298 186 l18 -14"
            stroke="var(--paper-hi)"
            strokeWidth="0.6"
            opacity="0.7"
          />
        </g>
        <rect x="0" y="420" width={W} height="10" fill="#c7b594" />
        <path d="M0 420 H390" stroke={INK} strokeWidth="1.2" strokeOpacity="0.5" />
        <ellipse cx="195" cy="428" rx="160" ry="4" fill={INK} opacity="0.14" />

        <g className="study__pile">
          <BookStack x={34} base={428} w={50} />
        </g>

        <g className="study__sparks" pointerEvents="none" />
      </svg>

      <h2 className="study__title" style={{ top: pct(155.5, H) }}>
        {title}
      </h2>
      <p className="study__phrase" style={{ top: pct(386, H) }}>
        {phrase}
      </p>

      <span className="study__shade" aria-hidden="true" />
      <div className="study__candle" style={{ bottom: pct(H - 133, H) }}>
        <Candle />
      </div>
      <span className="study__beam" aria-hidden="true" />
      <svg className="study__top" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <g>
          <g className="study__web" onClick={pokeWeb} pointerEvents="auto">
            <rect x={CAVITY.x0} y={CAVITY.y0} width="70" height="60" fill="transparent" />
            <g fill="none" stroke="var(--paper-hi)" strokeWidth="0.7" opacity="0.75">
              {[0, 1, 2, 3, 4, 5].map((k) => {
                const ang = (k / 5) * (Math.PI / 2);
                return (
                  <line
                    key={k}
                    x1={CAVITY.x0}
                    y1={CAVITY.y0}
                    x2={CAVITY.x0 + Math.cos(ang) * 66}
                    y2={CAVITY.y0 + Math.sin(ang) * 58}
                  />
                );
              })}
              {[16, 30, 46].map((r) => (
                <path
                  key={r}
                  d={`M${CAVITY.x0 + r} ${CAVITY.y0} Q ${CAVITY.x0 + r * 0.8} ${CAVITY.y0 + r * 0.55}, ${CAVITY.x0 + r * 0.62} ${CAVITY.y0 + r * 0.7} Q ${CAVITY.x0 + r * 0.45} ${CAVITY.y0 + r * 0.8}, ${CAVITY.x0} ${CAVITY.y0 + r * 0.88}`}
                />
              ))}
            </g>
          </g>
          <line
            className="study__thread"
            x1={CAVITY.x0 + 34}
            y1={CAVITY.y0 + 20}
            x2={CAVITY.x0 + 34}
            y2={CAVITY.y0 + 32}
            stroke="var(--paper-hi)"
            strokeWidth="0.6"
          />
          <g className="study__spider" pointerEvents="none">
            <g
              transform={`translate(${CAVITY.x0 + 34} ${CAVITY.y0 + 38})`}
              stroke={INK}
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
            >
              <path
                d="M-2 -1 q-5 -5 -8 -1 M-2 1 q-6 -1 -9 3 M2 -1 q5 -5 8 -1 M2 1 q6 -1 9 3 M-2 3 q-4 2 -6 6 M2 3 q4 2 6 6"
                stroke="#d8cfbf"
              />
              <ellipse cx="0" cy="2" rx="3.4" ry="4" fill="#120d0a" stroke="#d8cfbf" strokeWidth="0.5" />
              <circle cx="0" cy="-3" r="2.4" fill="#120d0a" stroke="#d8cfbf" strokeWidth="0.5" />
              <circle cx="-0.9" cy="-3.6" r="0.5" fill="var(--marigold)" stroke="none" />
              <circle cx="0.9" cy="-3.6" r="0.5" fill="var(--marigold)" stroke="none" />
            </g>
          </g>
        </g>

        <g className="study__orb" onClick={touchOrb} pointerEvents="auto">
          <circle className="study__orb-glow" cx={ORB.x} cy={ORB.y} r="34" fill="url(#study-orb-glow)" />
          <CrystalBall id="study-orb" cx={ORB.x} cy={ORB.y} r={14} runes={false} />
          <rect x="10" y="326" width="48" height="52" fill="transparent" />
        </g>
        <g className="study__owl owl-run" pointerEvents="auto">
          <Owl x={OWL.x} y={OWL.y} s={OWL.s} onPoke={pokeOwl} outfit={hat ? 'hat' : 'none'} asleep={asleep} />
        </g>
        {asleep && (
          <g className="study__zzz" pointerEvents="none" aria-hidden="true">
            {['z', 'z', 'Z'].map((z, i) => (
              <text key={i} x={OWL.x + 14 + i * 7} y={OWL.y - 40 - i * 9} style={{ '--i': i } as CSSProperties}>
                {z}
              </text>
            ))}
          </g>
        )}
        <g className="study__motes" pointerEvents="none">
          {Array.from({ length: MOTES }, (_, i) => (
            <path
              key={i}
              className="study__mote"
              d={spark(ORB.x, ORB.y, i % 3 === 0 ? 5 : 3.2)}
              fill={i % 4 === 0 ? '#c9b8ff' : '#fff3c4'}
              opacity="0"
            />
          ))}
        </g>
      </svg>
      <div
        className="study__cavity"
        style={{
          left: pct(CAVITY.x0, W),
          right: pct(W - CAVITY.x1, W),
          top: pct(CAVITY.y0, H),
          bottom: pct(H - CAVITY.y1, H),
        }}
      >
        <Particles mode="dust" />
        <span className="study__dark" aria-hidden="true" />
        <ul ref={row} className="study__row">
          {books.map((b, i) => {
            const c = COLORS[i % COLORS.length];
            return (
              <li key={b.id}>
                <button
                  type="button"
                  className="study__book"
                  style={
                    {
                      height: u(heightFor(b.name)),
                      '--bg': c.bg,
                      '--fg': c.fg,
                      '--em': c.emblem,
                    } as CSSProperties
                  }
                  onClick={(e) => openBook(e, b)}
                  aria-label={`看${b.name}`}
                >
                  <span className="study__tag" aria-hidden="true">
                    就這本
                  </span>
                  <span className="study__sigil" aria-hidden="true">
                    {SIGILS[i % SIGILS.length]}
                  </span>
                  <span className="study__name" style={{ fontSize: u(fontFor(b.name)) }}>
                    {b.name}
                  </span>
                  <span className="study__cat">{b.cat}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
