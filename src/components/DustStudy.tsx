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

  const pokeOwl = () => {
    const el = root.current;
    if (!el || busy.current.owl || reducedMotion()) return;
    busy.current.owl = true;
    const q = gsap.utils.selector(el);
    const chance = roll();
    flutter(4);
    owlHoot(chance < 0.3 ? 1.3 : 1.05);
    const tl = gsap.timeline({ onComplete: () => void (busy.current.owl = false) });
    tl.to(
      q('.study__owl .owl__wing--l'),
      { rotate: 40, duration: 0.1, yoyo: true, repeat: 5, svgOrigin: '-17 -36' },
      0,
    ).to(q('.study__owl .owl__wing--r'), { rotate: -40, duration: 0.1, yoyo: true, repeat: 5, svgOrigin: '17 -36' }, 0);
    if (chance < 0.35) {
      tl.to(q('.study__owl'), { y: -12, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' }, 0).add(
        () => setHat((h) => !h),
        0.2,
      );
    } else if (chance < 0.6) {
      const owl = q('.study__owl');
      tl.to(
        q('.study__owl .owl__wing--l'),
        { rotate: 40, duration: 0.09, yoyo: true, repeat: 23, svgOrigin: '-17 -36' },
        0,
      )
        .to(
          q('.study__owl .owl__wing--r'),
          { rotate: -40, duration: 0.09, yoyo: true, repeat: 23, svgOrigin: '17 -36' },
          0,
        )
        .to(owl, { x: -46, duration: 1.1, ease: 'sine.inOut' }, 0)
        .to(owl, { y: -26, duration: 0.55, ease: 'sine.out' }, 0)
        .to(owl, { y: 6, duration: 0.55, ease: 'sine.in' }, 0.55)
        .to(owl, { x: 0, duration: 1.1, ease: 'sine.inOut' }, 1.1)
        .to(owl, { y: -20, duration: 0.55, ease: 'sine.out' }, 1.1)
        .to(owl, { y: 0, duration: 0.55, ease: 'sine.in' }, 1.65);
    } else {
      tl.to(q('.study__owl'), { y: -6, duration: 0.15, yoyo: true, repeat: 3 }, 0);
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
    const r = btn.getBoundingClientRect();
    burst(btn, { x: r.left + r.width / 2, y: r.top + 4, n: 30 });
    const chance = roll();
    if (chance < 0.15) {
      flutter(7);
      sparkle();
      gsap
        .timeline({ onComplete: () => onOpen(b.id) })
        .to(btn, { y: -60, rotate: -16, duration: 0.35, ease: 'power2.out' })
        .to(btn, {
          keyframes: { x: [0, 40, 10, -30, 0], y: [-60, -96, -112, -80, -60], rotate: [-16, 12, -8, 12, -6] },
          duration: 1.4,
          ease: 'sine.inOut',
        })
        .to(btn, { scaleX: 0.5, duration: 0.09, yoyo: true, repeat: 15, transformOrigin: '50% 50%' }, 0.3)
        .to(btn, { x: 0, y: 0, rotate: 0, scaleX: 1, duration: 0.45, ease: 'bounce.out' });
      return;
    }
    paper(0.2);
    twinkle(5);
    gsap
      .timeline({ onComplete: () => onOpen(b.id) })
      .to(btn, { y: -26, rotate: -5, duration: 0.3, ease: 'power2.out' })
      .to(btn, { y: 0, rotate: 0, duration: 0.5, ease: 'back.out(2)' }, '+=0.15');
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
        <g className="study__owl" pointerEvents="auto">
          <Owl x={OWL.x} y={OWL.y} s={OWL.s} onPoke={pokeOwl} outfit={hat ? 'hat' : 'none'} />
        </g>
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
