'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { INK } from '@/art/ink';
import { reducedMotion } from '@/lib/motion';
import { door, fizzle, flutter, meow, paper, ping, scurry, sparkle, twinkle } from '@/lib/sound';
import './ShelfScene.css';

type Mode = 'snow' | 'dust' | 'fleck';
interface Mote {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  phase: number;
  spin: number;
  crystal: boolean;
}
interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  petal?: boolean;
  rot?: number;
}
type BurstDetail = { x: number; y: number; n?: number; dir?: number; petals?: number; gust?: number };

const pick = <T,>(items: [number, T][]) => {
  let r = Math.random() * items.reduce((s, [w]) => s + w, 0);
  for (const [w, v] of items) if ((r -= w) <= 0) return v;
  return items[items.length - 1][1];
};

function critter(host: Element, html: string, x: number, y: number, cls: string) {
  const el = document.createElement('span');
  el.className = `critter ${cls}`;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = html;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  host.appendChild(el);
  return el;
}

const MOTH = `<svg viewBox="-14 -10 28 20"><g class="critter__wings"><path d="M0 0 C -6 -10 -14 -8 -12 -1 C -11 4 -5 4 0 1 Z" fill="#e6d7b5" stroke="#26211d" stroke-width="1"/><path d="M0 0 C 6 -10 14 -8 12 -1 C 11 4 5 4 0 1 Z" fill="#e6d7b5" stroke="#26211d" stroke-width="1"/><circle cx="-7" cy="-2" r="1.6" fill="#a68a5b"/><circle cx="7" cy="-2" r="1.6" fill="#a68a5b"/></g><ellipse cx="0" cy="1" rx="1.6" ry="5" fill="#6e5638" stroke="#26211d" stroke-width="0.8"/><path d="M-1 -4 q-3 -4 -5 -4 M1 -4 q3 -4 5 -4" fill="none" stroke="#26211d" stroke-width="0.7"/></svg>`;

export const burst = (from: Element, detail: BurstDetail) =>
  from.dispatchEvent(new CustomEvent('shelfburst', { bubbles: true, detail }));

export function Particles({ mode }: { mode: Mode }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return;
    const fleck = mode === 'fleck';
    const snow = mode !== 'dust';
    const still = reducedMotion();
    let w = 0;
    let h = 0;
    let motes: Mote[] = [];
    const bits: Bit[] = [];
    let wind = 0;
    let gust = 0;
    let gustT = 0;
    let light = 1;
    const pointer = { x: -999, y: -999, vx: 0, vy: 0, t: 0 };

    const spawn = (y?: number): Mote => {
      const z = 0.25 + Math.random() * 0.75;
      return {
        x: Math.random() * w,
        y: y ?? Math.random() * h,
        z,
        vx: 0,
        vy: 0,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.04,
        crystal: fleck ? false : snow ? z > 0.82 && Math.random() < 0.35 : z > 0.9 && Math.random() < 0.5,
      };
    };
    const resize = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const want = fleck
        ? Math.min(90, Math.round((w * h) / 3800))
        : Math.min(snow ? 150 : 160, Math.round((w * h) / (snow ? 2600 : 1100)));
      motes = motes.filter((m) => m.x < w && m.y < h).slice(0, want);
      while (motes.length < want) motes.push(spawn());
    };

    const crystal = (m: Mote, t: number, r: number) => {
      const len = r * 2.4;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.phase + t * m.spin * 60);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -len);
        ctx.moveTo(0, -len * 0.55);
        ctx.lineTo(-len * 0.28, -len * 0.8);
        ctx.moveTo(0, -len * 0.55);
        ctx.lineTo(len * 0.28, -len * 0.8);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawSnow = (m: Mote, t: number) => {
      if (fleck) {
        const fr = 0.5 + m.z * 1.5;
        ctx.beginPath();
        ctx.arc(m.x, m.y, fr, 0, Math.PI * 2);
        if (m.z > 0.5) {
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = '#eef0ee';
          ctx.fill();
          ctx.globalAlpha = 0.16;
          ctx.strokeStyle = '#2b3550';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          ctx.globalAlpha = 0.3 + m.z * 0.4;
          ctx.fillStyle = '#3a332b';
          ctx.fill();
        }
        return;
      }
      const r = 0.7 + m.z * 2.5;
      ctx.globalAlpha = 0.55 + m.z * 0.45;
      if (m.crystal) return crystal(m, t, r);
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      if (m.z > 0.78) {
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    };

    const drawDust = (m: Mote, t: number) => {
      const cx = w / 2;
      const cy = h * 0.62;
      const d = Math.hypot(m.x - cx, m.y - cy) / Math.max(w, h);
      const near = Math.max(0, 1 - d * 1.25);
      const tw = 0.6 + 0.4 * Math.sin(t * (1.5 + m.z * 2) + m.phase);
      const a = (0.12 + near * 0.85) * (0.35 + m.z * 0.65) * tw * (0.15 + light * 0.85);
      const r = 0.4 + m.z * 1.4;
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = near > 0.45 ? '#ffe7b0' : '#e9dcc0';
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (m.crystal && tw > 0.92 && near > 0.3 && light > 0.5) {
        const s = r * 4.5 * (tw - 0.9) * 10;
        ctx.globalAlpha = Math.min(1, a * 1.4);
        ctx.strokeStyle = '#fff3cf';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(m.x - s, m.y);
        ctx.lineTo(m.x + s, m.y);
        ctx.moveTo(m.x, m.y - s);
        ctx.lineTo(m.x, m.y + s);
        ctx.stroke();
      }
    };

    let raf = 0;
    let last = performance.now();
    let running = false;
    const frame = (now: number) => {
      const dt = Math.min(2.5, (now - last) / 16.67);
      last = now;
      const t = now / 1000;
      light += ((host.closest('.is-dark') ? 0 : 1) - light) * 0.04 * dt;
      if (snow) {
        gustT -= dt;
        if (gustT <= 0) {
          gust = (Math.random() - 0.45) * 1.6;
          gustT = 180 + Math.random() * 360;
        }
        wind += (gust - wind) * 0.006 * dt;
        host.style.setProperty('--wind', wind.toFixed(3));
      }
      const fresh = now - pointer.t < 220;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        if (fresh) {
          const dx = m.x - pointer.x;
          const dy = m.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 8100) {
            const k = (1 - Math.sqrt(d2) / 90) * 0.5;
            if (snow) {
              m.vx += (pointer.vx * 0.35 + (dx / 90) * 1.6) * k;
              m.vy += (pointer.vy * 0.25 + (dy / 90) * 1.2) * k;
            } else {
              m.vx += (-dy / 90) * 1.4 * k + pointer.vx * 0.2 * k;
              m.vy += (dx / 90) * 1.4 * k + pointer.vy * 0.2 * k;
            }
          }
        }
        m.vx *= snow ? 0.94 : 0.965;
        m.vy *= snow ? 0.94 : 0.965;
        if (snow) {
          const sway = Math.sin(t * (0.6 + m.z) + m.phase) * (0.25 + m.z * 0.45);
          m.x += (sway + wind * (0.6 + m.z) + m.vx) * dt;
          m.y += ((0.22 + m.z * 0.85) * (fleck ? 0.55 : 1) + m.vy) * dt;
          if (m.y > h + 6) Object.assign(m, spawn(-6));
        } else {
          const a = Math.sin(t * 0.21 + m.phase) * 2.4 + Math.cos(t * 0.13 + m.phase * 1.7) * 1.6;
          m.x += (Math.cos(a) * 0.12 * (0.4 + m.z) + m.vx) * dt;
          m.y += (Math.sin(a) * 0.1 * (0.4 + m.z) - 0.02 + m.vy) * dt;
          if (m.y < -6) m.y = h + 6;
          if (m.y > h + 6) m.y = -6;
        }
        if (m.x > w + 8) m.x = -8;
        if (m.x < -8) m.x = w + 8;
        if (snow) drawSnow(m, t);
        else drawDust(m, t);
      }
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        if (b.petal) {
          b.vy = Math.min(0.9, b.vy + 0.03 * dt);
          b.vx += Math.sin(t * 2.2 + b.r * 9) * 0.04 + wind * 0.01;
          b.vx *= 0.985;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.life += dt;
          b.rot = (b.rot ?? 0) + 0.06 * dt;
          if (b.life > b.max || b.y > h + 10) {
            bits.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = Math.min(1, (1 - b.life / b.max) * 1.6);
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(b.rot * 1.3)));
          ctx.beginPath();
          ctx.ellipse(0, 0, b.r * 1.5, b.r, 0, 0, Math.PI * 2);
          ctx.fillStyle = fleck ? '#b8362a' : b.r > 2.8 ? '#fffaf2' : '#f2d2cb';
          ctx.fill();
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = INK;
          ctx.stroke();
          ctx.restore();
          continue;
        }
        if (fleck) b.vy = Math.min(0.7, b.vy + 0.01 * dt);
        else if (snow) b.vy += 0.16 * dt;
        else b.vy -= 0.004 * dt;
        b.vx *= snow ? 0.99 : 0.97;
        b.vy *= snow ? 1 : 0.97;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life += dt;
        if (b.life > b.max || b.y > h + 10) {
          bits.splice(i, 1);
          continue;
        }
        const k = 1 - b.life / b.max;
        ctx.globalAlpha = snow ? k : k * 0.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, snow ? b.r * (fleck ? 0.7 : 1) : b.r * (1 + (1 - k) * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = snow ? '#fbf7ee' : k > 0.6 ? '#f1e4c6' : '#cdbf9f';
        ctx.fill();
        if (snow) {
          ctx.globalAlpha *= fleck ? 0.6 : 0.45;
          ctx.strokeStyle = fleck ? '#2b3550' : INK;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || still) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const gap = Math.max(8, e.timeStamp - pointer.t);
      if (pointer.t && gap < 120) {
        pointer.vx = Math.max(-6, Math.min(6, ((x - pointer.x) / gap) * 16));
        pointer.vy = Math.max(-6, Math.min(6, ((y - pointer.y) / gap) * 16));
        if (snow) wind += pointer.vx * 0.01;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.t = e.timeStamp;
    };
    const onBurst = (e: Event) => {
      const d = (e as CustomEvent<BurstDetail>).detail;
      const r = host.getBoundingClientRect();
      const n = d.n ?? 22;
      if (d.gust) {
        gust = d.gust;
        gustT = 160;
        wind += d.gust * 0.5;
      }
      for (let i = 0; i < (d.petals ?? 0); i++) {
        bits.push({
          x: d.x - r.left + (Math.random() - 0.5) * 50,
          y: d.y - r.top + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 1.4,
          vy: -Math.random() * 0.6,
          r: 2 + Math.random() * 1.6,
          life: 0,
          max: 200 + Math.random() * 120,
          petal: true,
          rot: Math.random() * 6,
        });
      }
      for (let i = 0; i < n; i++) {
        bits.push(
          fleck
            ? {
                x: d.x - r.left + (Math.random() - 0.5) * 26,
                y: d.y - r.top + (Math.random() - 0.5) * 4,
                vx: (Math.random() - 0.5) * 0.5 + (d.dir ?? 0) * 0.4,
                vy: Math.random() * 0.3,
                r: 1 + Math.random() * 1.4,
                life: 0,
                max: 110 + Math.random() * 60,
              }
            : snow
              ? {
                  x: d.x - r.left + (Math.random() - 0.5) * 30,
                  y: d.y - r.top + (Math.random() - 0.5) * 6,
                  vx: (Math.random() - 0.5) * 3.2 + (d.dir ?? 0) * 1.6,
                  vy: -Math.random() * 2.8 - 0.4,
                  r: 1.2 + Math.random() * 2.6,
                  life: 0,
                  max: 60 + Math.random() * 50,
                }
              : {
                  x: d.x - r.left + (Math.random() - 0.5) * 24,
                  y: d.y - r.top + (Math.random() - 0.5) * 8,
                  vx: (Math.random() - 0.5) * 2.2,
                  vy: -Math.random() * 1.3 - 0.1,
                  r: 0.5 + Math.random() * 1.3,
                  life: 0,
                  max: 80 + Math.random() * 70,
                },
        );
      }
    };

    resize();
    if (still) {
      ctx.clearRect(0, 0, w, h);
      motes.forEach((m) => (snow ? drawSnow(m, 0) : drawDust(m, 0)));
    }
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(host);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('shelfburst', onBurst);
    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('shelfburst', onBurst);
    };
  }, [mode]);

  return <canvas ref={ref} className={`particles particles--${mode}`} aria-hidden="true" />;
}

const CROW = `<svg viewBox="-16 -10 32 20"><g class="critter__wings"><path d="M-1 -1 C -7 -9 -14 -8 -16 -4 C -10 -4 -5 -1 -1 2 Z" fill="#1d1a17"/><path d="M1 -1 C 6 -8 12 -9 15 -6 C 10 -4 5 -2 1 2 Z" fill="#2b2620"/></g><path d="M-7 2 C -3 -1 4 -2 8 0 C 10 -1 12 0 12 2 C 9 3 6 4 3 4 C -1 5 -5 4 -7 2 Z" fill="#1d1a17"/><path d="M-7 2 l-6 -1 l2 3 Z" fill="#1d1a17"/></svg>`;

const STUD_ROWS = [180, 206, 232, 258, 284, 310, 336, 362];
const STUD_L = [72, 84, 96, 108];
const STUD_R = [126, 138, 150, 162];

export function ColdBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const el = root.current;
    const section = el?.closest('.cold');
    const shelf = el?.closest('.shelf, .study');
    if (!el || !section || !shelf) return;
    const fit = () => {
      const h = shelf.getBoundingClientRect().bottom - section.getBoundingClientRect().top;
      el.style.setProperty('--wall-h', `${Math.round(h - 4)}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(section);
    return () => ro.disconnect();
  }, []);

  const lock = (ms: number) => {
    busy.current = true;
    window.setTimeout(() => (busy.current = false), ms);
  };
  const q = <T extends Element>(sel: string) => root.current?.querySelector<T>(sel) ?? null;

  const snowSlide = () => {
    const eave = q('.cold-gate__eave');
    const r = eave?.getBoundingClientRect();
    if (!eave || !r) return;
    paper(0.25);
    [0.12, 0.3, 0.5, 0.7, 0.9].forEach((k, i) =>
      window.setTimeout(() => burst(eave, { x: r.left + r.width * k, y: r.bottom - 2, n: 9, dir: -0.4 }), i * 70),
    );
  };

  const knockGate = () => {
    if (busy.current || reducedMotion()) return;
    const leaf = q('.cold-gate__leaf');
    const glow = q('.cold-gate__glow');
    const eyes = q('.cold-gate__eyes');
    if (!leaf) return;
    const event = pick<'creak' | 'eyes' | 'snow'>([
      [4, 'creak'],
      [3, 'eyes'],
      [3, 'snow'],
    ]);
    gsap.fromTo(leaf, { x: 0 }, { x: 1.2, duration: 0.05, yoyo: true, repeat: 3 });
    if (event === 'snow') {
      lock(1200);
      snowSlide();
      return;
    }
    if (event === 'creak') {
      lock(3200);
      door();
      const r = leaf.getBoundingClientRect();
      gsap
        .timeline()
        .to(leaf, { scaleX: 0.6, duration: 1, ease: 'power2.out', transformOrigin: '100% 50%' }, 0.2)
        .to(glow, { opacity: 0.85, duration: 0.6 }, 0.3)
        .add(() => burst(leaf, { x: r.left, y: r.bottom - 10, n: 6, gust: -2.2 }), 0.5)
        .to(leaf, { scaleX: 1, duration: 1.2, ease: 'power2.in' }, '+=0.7')
        .to(glow, { opacity: 0, duration: 0.5 }, '<0.7');
      return;
    }
    lock(3400);
    gsap
      .timeline()
      .to(leaf, { scaleX: 0.6, duration: 0.7, ease: 'power2.out', transformOrigin: '100% 50%' }, 0.15)
      .to(eyes, { opacity: 1, duration: 0.2 }, 0.75)
      .add(() => meow(0.85), 1)
      .to(eyes, { scaleY: 0.1, duration: 0.09, yoyo: true, repeat: 3, transformOrigin: '50% 50%' }, 1.2)
      .to(eyes, { opacity: 0, duration: 0.2 }, 2.2)
      .to(leaf, { scaleX: 1, duration: 0.8, ease: 'power2.in' }, 2.3);
  };

  const swingLantern = () => {
    const lantern = q('.cold-gate__lantern');
    if (!lantern || reducedMotion()) return;
    paper(0.12);
    gsap.fromTo(
      lantern,
      { rotate: 0 },
      { keyframes: { rotate: [16, -12, 8, -5, 2, 0] }, duration: 2.4, ease: 'sine.out', svgOrigin: '30 74' },
    );
    gsap.fromTo(q('.cold-gate__flame'), { opacity: 1 }, { opacity: 0.15, duration: 0.08, yoyo: true, repeat: 5 });
  };

  const pokeCat = () => {
    const cat = q<SVGGElement>('.cold-gate__cat-body');
    if (!cat || reducedMotion() || cat.dataset.busy) return;
    cat.dataset.busy = '1';
    meow(1 + Math.random() * 0.25);
    gsap
      .timeline({ onComplete: () => void delete cat.dataset.busy })
      .to(cat, { y: -12, duration: 0.22, ease: 'power2.out' })
      .to(cat, { y: 10, opacity: 0, duration: 0.3, ease: 'power2.in' })
      .set(cat, { y: 0 })
      .to(cat, { opacity: 1, duration: 0.6 }, '+=3.2');
  };

  const shakeTree = () => {
    if (busy.current || reducedMotion()) return;
    lock(1400);
    const tree = q('.cold-gate__tree');
    const r = tree?.getBoundingClientRect();
    if (!tree || !r) return;
    gsap.fromTo(tree, { rotate: 0 }, { keyframes: { rotate: [-2.5, 2, -1, 0] }, duration: 0.8, svgOrigin: '232 64' });
    if (Math.random() < 0.6) {
      [0.2, 0.45, 0.7].forEach((k, i) =>
        window.setTimeout(() => burst(tree, { x: r.left + r.width * k, y: r.top + r.height * 0.4, n: 10 }), i * 90),
      );
      return;
    }
    flutter(6);
    const host = tree.closest('.cold');
    const box = host?.getBoundingClientRect();
    if (!host || !box) return;
    const crow = critter(
      host,
      CROW,
      r.left - box.left + r.width * 0.3,
      r.top - box.top + r.height * 0.3,
      'critter--crow',
    );
    gsap.to(crow, {
      keyframes: { x: [0, -60, -150, -260], y: [0, -30, -20, -80], scale: [1, 1.1, 0.9, 0.6] },
      duration: 2.2,
      ease: 'sine.in',
      onComplete: () => crow.remove(),
    });
  };

  return (
    <div ref={root} className="cold-gate" aria-hidden="true">
      <svg viewBox="0 0 224 420" preserveAspectRatio="xMaxYMax meet">
        <defs>
          <pattern id="cold-hatch" width="3" height="10" patternUnits="userSpaceOnUse">
            <path d="M1 0 V10" stroke="#26211d" strokeOpacity="0.08" strokeWidth="0.6" />
          </pattern>
          <pattern id="cold-brick" width="14" height="8" patternUnits="userSpaceOnUse">
            <rect width="14" height="8" fill="#c6bcab" />
            <path d="M0 0.5 H14 M0 4.5 H14 M7 0.5 V4.5 M0 4.5 V8 M14 4.5 V8" stroke="#8f8676" strokeWidth="0.7" />
          </pattern>
        </defs>
        <g className="cold-gate__tree hit" onClick={shakeTree}>
          <path
            d="M240 70 C 214 46, 196 34, 168 8"
            fill="none"
            stroke="#2b2620"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <path
            d="M206 44 C 202 28, 208 16, 220 4 M190 32 C 176 28, 170 20, 160 24 M178 22 C 176 12, 182 4, 188 -2"
            fill="none"
            stroke="#2b2620"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M214 50 c -6 -5 -12 -9 -18 -12 M184 22 c -4 -3 -8 -6 -12 -8"
            stroke="#fbf7ee"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <rect x="150" y="-6" width="90" height="80" fill="transparent" />
        </g>
        <rect x="0" y="78" width="224" height="342" fill="#9b4431" />
        <rect x="0" y="78" width="224" height="342" fill="url(#cold-hatch)" />
        <path
          d="M14 176 c 8 -6 22 -4 32 2 c 8 5 10 18 4 26 c -9 8 -28 9 -36 0 c -6 -8 -6 -20 0 -28 Z"
          fill="url(#cold-brick)"
          stroke="#26211d"
          strokeOpacity="0.4"
          strokeWidth="0.8"
        />
        <path
          d="M186 258 c 7 -4 20 -2 26 4 c 5 7 3 18 -4 22 c -9 5 -22 2 -26 -6 c -3 -7 -2 -16 4 -20 Z"
          fill="url(#cold-brick)"
          stroke="#26211d"
          strokeOpacity="0.4"
          strokeWidth="0.8"
        />
        <path d="M30 380 c 4 -10 14 -14 22 -10" fill="none" stroke="#7a2f22" strokeWidth="1" opacity="0.6" />
        <g className="cold-gate__eave">
          <path d="M-14 30 Q 8 40 26 36 L 224 36 L 224 70 L 22 70 Q 4 66 -14 30 Z" fill="#2e4442" />
          {Array.from({ length: 33 }, (_, i) => (
            <path key={i} d={`M${28 + i * 6} 40 V68`} stroke="#1d2b2a" strokeWidth="1.8" />
          ))}
          <path d="M-14 30 Q 8 40 26 36 L 224 36" fill="none" stroke="#26211d" strokeWidth="1.3" />
          <path d="M-10 28 Q 8 36 26 32 L 224 32 L 224 36 L 26 36 Q 8 40 -14 30 Z" fill="#fbf7ee" />
          {[40, 76, 118, 160, 200].map((x) => (
            <path key={x} d={`M${x} 36 q 1.5 5 0 8 q -1.5 -3 0 -8 Z`} fill="#fbf7ee" />
          ))}
          <rect x="16" y="70" width="208" height="8" fill="#5c3e2b" />
          {[34, 74, 114, 154, 194].map((x) => (
            <rect key={x} x={x} y="70" width="10" height="8" fill="#7d5a3c" stroke="#26211d" strokeWidth="0.5" />
          ))}
        </g>
        <g className="cold-gate__cat hit" onClick={pokeCat}>
          <g className="cold-gate__cat-walk">
            <g className="cold-gate__cat-body">
              <path
                d="M0 0 c 0 -5 3 -8 8 -8 h 8 c 1 -3 3 -4 4 -4 l 1 -3 l 1.5 3 l 1.5 -3 l 1 3 c 2 1 3 3 3 6 c 0 3 -2 5 -5 5 h -1 l 1 4 h -2 l -1 -4 h -8 l -1 4 h -2 l 0 -4 c -3 0 -5 0 -7 2 c -2 2 -5 1 -5 -1 c 0 -1 1 -1 2 -1 c 2 0 3 -1 3 -3 Z"
                fill="#1d1a17"
              />
              <circle cx="24.5" cy="-8.5" r="0.9" fill="#f2c14e" />
            </g>
          </g>
          <rect x="-6" y="-24" width="44" height="30" fill="transparent" />
        </g>
        <g className="cold-gate__lantern hit" onClick={swingLantern}>
          <g className="cold-gate__sway">
            <path d="M30 78 V96" stroke="#26211d" strokeWidth="1" />
            <rect x="24" y="94" width="12" height="4" fill="#2b2620" />
            <ellipse cx="30" cy="112" rx="12" ry="15" fill="#b4533b" stroke="#26211d" strokeWidth="1" />
            <ellipse className="cold-gate__flame" cx="30" cy="114" rx="5" ry="7" fill="#e9b45c" opacity="0.55" />
            <path
              d="M22 100 Q 18 112 22 124 M30 97 V127 M38 100 Q 42 112 38 124"
              fill="none"
              stroke="#7a2f22"
              strokeWidth="0.8"
            />
            <path d="M33 104 l5 3 l-2 6 l-5 -2 Z" fill="#2b2620" opacity="0.75" />
            <rect x="24" y="126" width="12" height="4" fill="#2b2620" />
            <path d="M30 130 V142 M27 130 L26 140 M33 130 L34 140" stroke="#8a6f3e" strokeWidth="0.9" />
          </g>
          <rect x="10" y="78" width="40" height="70" fill="transparent" />
        </g>
        <g className="cold-gate__door hit" onClick={knockGate}>
          <rect x="54" y="146" width="126" height="262" fill="#2a1d17" />
          <rect x="50" y="140" width="134" height="10" fill="#5a3a28" stroke="#26211d" strokeWidth="0.8" />
          <rect x="117" y="156" width="55" height="250" fill="#120d0a" />
          <rect className="cold-gate__glow" x="117" y="156" width="55" height="250" fill="#f3dfae" opacity="0" />
          <g className="cold-gate__eyes" opacity="0">
            <ellipse cx="123" cy="178" rx="2.8" ry="2.2" fill="#f2c14e" />
            <ellipse cx="132" cy="178" rx="2.8" ry="2.2" fill="#f2c14e" />
            <circle cx="123" cy="178" r="0.9" fill="#120d0a" />
            <circle cx="132" cy="178" r="0.9" fill="#120d0a" />
          </g>
          <g>
            <rect x="62" y="156" width="55" height="250" fill="#8a3a2b" stroke="#26211d" strokeWidth="0.8" />
            <path d="M70 170 v60 M98 200 v90 M84 300 v80" stroke="#a65a44" strokeWidth="3" opacity="0.5" />
            {STUD_ROWS.flatMap((y) =>
              STUD_L.map((x) => (
                <circle
                  key={`${x}-${y}`}
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill="#7d6a45"
                  stroke="#26211d"
                  strokeOpacity="0.45"
                  strokeWidth="0.6"
                />
              )),
            )}
            <circle
              className="cold-gate__knocker"
              cx="110"
              cy="292"
              r="6"
              fill="none"
              stroke="#7d6a45"
              strokeWidth="2"
            />
            <circle cx="110" cy="286" r="3" fill="#6b5a3a" />
          </g>
          <g className="cold-gate__leaf">
            <rect x="117" y="156" width="55" height="250" fill="#8a3a2b" stroke="#26211d" strokeWidth="0.8" />
            <path d="M150 180 v50 M128 240 v70 M160 320 v60" stroke="#a65a44" strokeWidth="3" opacity="0.5" />
            {STUD_ROWS.flatMap((y) =>
              STUD_R.map((x) => (
                <circle
                  key={`${x}-${y}`}
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill="#7d6a45"
                  stroke="#26211d"
                  strokeOpacity="0.45"
                  strokeWidth="0.6"
                />
              )),
            )}
            <circle cx="124" cy="292" r="6" fill="none" stroke="#7d6a45" strokeWidth="2" />
            <circle cx="124" cy="286" r="3" fill="#6b5a3a" />
          </g>
          <path
            d="M56 150 l14 10 M56 150 l8 16 M56 150 l18 4 M62 154 q 4 2 6 6"
            fill="none"
            stroke="#fbf7ee"
            strokeWidth="0.5"
            opacity="0.8"
          />
          <g className="cold-gate__plaque-g" transform="rotate(-5 117 118)">
            <path d="M104 100 L 98 108 M130 100 L 136 108" stroke="#26211d" strokeWidth="0.8" />
            <rect x="94" y="106" width="46" height="26" fill="#2b2420" stroke="#8a6f3e" strokeWidth="1.6" />
            <rect x="97" y="109" width="40" height="20" fill="none" stroke="#8a6f3e" strokeWidth="0.5" />
            <text x="117" y="124.5" textAnchor="middle" className="cold-gate__plaque">
              冷宮
            </text>
          </g>
        </g>
        <rect x="46" y="404" width="142" height="8" fill="#b9b2a6" stroke="#26211d" strokeWidth="0.8" />
        <rect x="36" y="412" width="162" height="8" fill="#a8a094" stroke="#26211d" strokeWidth="0.8" />
        <path d="M46 405 H188 M36 413 H198" stroke="#fbf7ee" strokeWidth="2.4" />
        <path
          d="M48 404 l-2 -9 M51 404 l1 -11 M54 404 l3 -8 M186 404 l-3 -9 M189 404 l1 -12 M8 420 l-2 -10 M12 420 l2 -12 M15 420 l4 -8 M212 420 l-2 -11 M216 420 l3 -8"
          stroke="#6b5a3a"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function ShelfBoard({
  theme,
  name,
  cat,
  height,
  fontSize,
  index,
  onOpen,
}: {
  theme: 'temple' | 'magic';
  name: string;
  cat: string;
  height: number;
  fontSize: number;
  index: number;
  onOpen: () => void;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const last = useRef(0);
  const stir = () => {
    if (Date.now() - last.current < 900) return;
    last.current = Date.now();
    const b = btn.current;
    if (!b || reducedMotion()) return;
    const shelf = b.closest('.shelf');
    const r = b.getBoundingClientRect();
    const box = shelf?.getBoundingClientRect();
    if (theme === 'temple') {
      gsap.fromTo(
        b,
        { rotate: 0 },
        {
          keyframes: { rotate: [-6, 4.5, -3, 1.6, -0.6, 0] },
          duration: 1.4,
          ease: 'sine.out',
          transformOrigin: '50% 100%',
        },
      );
      burst(b, { x: r.left + r.width / 2, y: r.top + 2, n: 5 });
      const roll = Math.random();
      if (roll < 0.25) burst(b, { x: r.left + r.width / 2, y: r.top - 30, n: 0, petals: 1 });
      else if (roll < 0.4) burst(b, { x: r.left, y: r.top, n: 0, gust: -2.6 });
    } else {
      if (b.classList.contains('is-unsealed')) return;
      b.classList.add('is-unsealed');
      ping();
      window.setTimeout(() => twinkle(7), 90);
      const chain = b.querySelector('.shelf__chain')?.getBoundingClientRect();
      if (chain) burst(b, { x: chain.left + chain.width / 2, y: chain.top + chain.height / 2, n: 22 });
      if (shelf && box && Math.random() < 0.2) {
        flutter(5);
        const moth = critter(shelf, MOTH, r.left - box.left + r.width / 2 - 12, r.top - box.top, 'critter--moth');
        const dx = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 80);
        gsap.to(moth, {
          keyframes: { x: [0, dx * 0.3, dx * 0.6, dx], y: [0, -40, -20, -110], rotate: [0, -20, 15, -10] },
          opacity: 0,
          duration: 2.4,
          ease: 'sine.inOut',
          onComplete: () => moth.remove(),
        });
      }
      window.setTimeout(() => b.classList.remove('is-unsealed'), 2600);
    }
  };
  return (
    <button
      ref={btn}
      type="button"
      className="shelf__item"
      style={{ height, ['--i' as string]: index }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && stir()}
      onClick={() => {
        stir();
        window.setTimeout(onOpen, reducedMotion() ? 0 : 320);
      }}
      aria-label={`看${name}`}
    >
      {theme === 'magic' && <span className="shelf__rune">{SIGILS[index % SIGILS.length]}</span>}
      {theme === 'magic' && (
        <span className="shelf__chain" aria-hidden="true">
          <i className="shelf__chain-l" />
          <i className="shelf__chain-r" />
          <b className="shelf__lock" />
        </span>
      )}
      <span className="shelf__name" style={{ fontSize }}>
        {name}
      </span>
      <span className="shelf__cat">{cat}</span>
    </button>
  );
}

const SIGILS = ['ᚠ', '✧', 'ᛟ', '☽', 'ᚱ', '✦', 'ᛉ', '◈'];
const SKY: [number, number][] = [
  [18, 22],
  [44, 12],
  [70, 30],
  [92, 18],
  [120, 34],
  [104, 58],
];
const starPath = (x: number, y: number) =>
  `M${x} ${y - 3} L${x + 0.9} ${y - 0.9} L${x + 3} ${y} L${x + 0.9} ${y + 0.9} L${x} ${y + 3} L${x - 0.9} ${y + 0.9} L${x - 3} ${y} L${x - 0.9} ${y - 0.9} Z`;

export function ArcaneSky() {
  return (
    <svg className="arcane-sky" viewBox="0 0 140 70" aria-hidden="true">
      <path
        d={'M' + SKY.map(([x, y]) => `${x} ${y}`).join(' L')}
        fill="none"
        stroke="#c9b8ff"
        strokeOpacity="0.35"
        strokeWidth="0.6"
        strokeDasharray="2 2"
      />
      {SKY.map(([x, y], i) => (
        <path
          key={i}
          className="arcane-sky__star"
          style={{ animationDelay: `${i * 0.5}s` }}
          d={starPath(x, y)}
          fill="#f2d98a"
        />
      ))}
    </svg>
  );
}

const RADIALS = Array.from({ length: 9 }, (_, i) => (i * Math.PI) / 2 / 8);
const RINGS = [12, 22, 33, 45, 58, 72];

export function Cobweb() {
  const web = useRef<SVGGElement>(null);
  const spider = useRef<HTMLSpanElement>(null);
  const thread = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);
  const rings = useMemo(
    () =>
      RINGS.map((rad) =>
        RADIALS.slice(0, -1)
          .map((a, i) => {
            const b = RADIALS[i + 1];
            const sag = rad * 0.86;
            const m = (a + b) / 2;
            return `${i === 0 ? `M${Math.cos(a) * rad} ${Math.sin(a) * rad}` : ''} Q ${Math.cos(m) * sag} ${Math.sin(m) * sag} ${Math.cos(b) * rad} ${Math.sin(b) * rad}`;
          })
          .join(' '),
      ),
    [],
  );
  const poke = () => {
    const s = spider.current;
    const t = thread.current;
    const g = web.current;
    if (!s || !t || !g || busy.current || reducedMotion()) return;
    busy.current = true;
    flutterWeb(g);
    scurry(7);
    s.classList.add('is-moving');
    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false;
        s.classList.remove('is-moving');
      },
    });
    const move = pick<'flee' | 'spin' | 'plunge'>([
      [4, 'flee'],
      [3, 'spin'],
      [3, 'plunge'],
    ]);
    if (move === 'flee') {
      tl.to(t, { scaleY: 3.4, duration: 0.55, ease: 'power2.in' })
        .to(s, { y: 62, duration: 0.55, ease: 'power2.in' }, '<')
        .to(s, { rotate: 14, duration: 0.12, yoyo: true, repeat: 5 })
        .to(t, { scaleY: 1.2, duration: 0.35, ease: 'power2.out' })
        .to(s, { y: 6, duration: 0.35, ease: 'power2.out' }, '<')
        .to(t, { opacity: 0, duration: 0.1 })
        .to(s, { x: 160, y: -6, rotate: 90, duration: 0.9, ease: 'power1.in' }, '<')
        .to(s, { opacity: 0, duration: 0.2 }, '-=0.2')
        .set(s, { x: 0, y: -40, rotate: 0 })
        .set(t, { scaleY: 0 })
        .to(t, { opacity: 1, scaleY: 1, duration: 0.8, ease: 'power2.out' }, '+=1.6')
        .to(s, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '<');
    } else if (move === 'spin') {
      tl.to(t, { scaleY: 2.4, duration: 0.5, ease: 'back.out(2)' })
        .to(s, { y: 36, duration: 0.5, ease: 'back.out(2)' }, '<')
        .to(s, { rotate: 720, duration: 1.1, ease: 'power2.inOut' })
        .to(t, { scaleY: 1, duration: 0.9, ease: 'power1.inOut' })
        .to(s, { y: 0, rotate: 720, duration: 0.9, ease: 'power1.inOut' }, '<')
        .set(s, { rotate: 0 });
    } else {
      tl.to(t, { scaleY: 5.2, duration: 0.32, ease: 'power3.in' })
        .to(s, { y: 110, duration: 0.32, ease: 'power3.in' }, '<')
        .to(s, { scaleX: 1.3, scaleY: 0.7, duration: 0.08, yoyo: true, repeat: 1 })
        .add(() => {
          const r = s.getBoundingClientRect();
          burst(s, { x: r.left + r.width / 2, y: r.bottom, n: 10 });
        })
        .to(t, { scaleY: 1, duration: 2.2, ease: 'steps(14)' }, '+=0.3')
        .to(s, { y: 0, duration: 2.2, ease: 'steps(14)' }, '<');
    }
  };
  return (
    <div className="cobweb">
      <button type="button" className="cobweb__hit" onClick={poke} aria-label="戳一下蜘蛛網" />
      <svg viewBox="0 0 90 90" aria-hidden="true">
        <g ref={web} className="cobweb__web">
          {RADIALS.map((a, i) => (
            <line key={i} x1="0" y1="0" x2={Math.cos(a) * 86} y2={Math.sin(a) * 86} />
          ))}
          {rings.map((d, i) => (
            <path key={i} d={d} />
          ))}
          {[
            [30, 18],
            [52, 34],
            [20, 50],
            [62, 12],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.3" className="cobweb__dew" style={{ animationDelay: `${i * 0.7}s` }} />
          ))}
        </g>
      </svg>
      <span ref={thread} className="cobweb__thread" />
      <span ref={spider} className="cobweb__spider" aria-hidden="true">
        <svg viewBox="-14 -12 28 26">
          <g className="cobweb__legs" stroke="#120c08" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M-3 -1 Q -9 -7 -12 -2" />
            <path d="M-3 1 Q -10 -2 -13 4" />
            <path d="M-3 3 Q -9 4 -12 10" />
            <path d="M-3 5 Q -7 9 -9 13" />
            <path d="M3 -1 Q 9 -7 12 -2" />
            <path d="M3 1 Q 10 -2 13 4" />
            <path d="M3 3 Q 9 4 12 10" />
            <path d="M3 5 Q 7 9 9 13" />
          </g>
          <ellipse cx="0" cy="5" rx="5" ry="6" fill="#1a120c" />
          <circle cx="0" cy="-2.5" r="3.4" fill="#2a1d14" />
          <circle cx="-1.2" cy="-3.4" r="0.8" fill="#ffd27a" />
          <circle cx="1.2" cy="-3.4" r="0.8" fill="#ffd27a" />
          <path d="M-2 4 h4 M-1.4 7 h2.8" stroke="#8b5b36" strokeWidth="0.9" />
        </svg>
      </span>
    </div>
  );
}

function flutterWeb(g: SVGGElement) {
  gsap.fromTo(
    g,
    { skewX: 0, skewY: 0, scale: 1 },
    {
      keyframes: { skewX: [6, -4, 2, 0], skewY: [-4, 3, -1, 0], scale: [1.04, 0.98, 1.01, 1] },
      duration: 0.9,
      transformOrigin: '0 0',
    },
  );
}

export function Candle() {
  const [lit, setLit] = useState(true);
  const root = useRef<HTMLButtonElement>(null);
  const toggle = () => {
    const el = root.current;
    const next = !lit;
    setLit(next);
    el?.closest('.shelf, .study')?.classList.toggle('is-dark', !next);
    if (next) twinkle(4);
    else {
      fizzle();
      if (Math.random() < 0.25)
        window.setTimeout(() => {
          setLit(true);
          el?.closest('.shelf, .study')?.classList.remove('is-dark');
          sparkle();
        }, 1800);
    }
    if (!el || reducedMotion()) return;
    const flame = el.querySelector('.candle__flame');
    if (next)
      gsap.fromTo(
        flame,
        { scale: 0 },
        { scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.4)', transformOrigin: '50% 100%' },
      );
  };
  useEffect(() => {
    const el = root.current;
    return () => el?.closest('.shelf, .study')?.classList.remove('is-dark');
  }, []);
  return (
    <button
      ref={root}
      type="button"
      className={`candle${lit ? '' : ' is-out'}`}
      onClick={toggle}
      aria-label={lit ? '吹熄蠟燭' : '點亮蠟燭'}
      aria-pressed={!lit}
    >
      <svg viewBox="0 0 40 90" aria-hidden="true">
        <g className="candle__smoke" fill="none" stroke="#cfc6b8" strokeWidth="1.6" strokeLinecap="round">
          <path d="M20 26 C 14 18, 26 12, 18 2" />
          <path d="M21 26 C 28 18, 16 10, 24 -2" />
        </g>
        <g className="candle__flame">
          <ellipse cx="20" cy="22" rx="11" ry="14" fill="#ffcf6a" opacity="0.25" className="candle__halo" />
          <path d="M20 8 C 26 16, 26 24, 20 28 C 14 24, 14 16, 20 8 Z" fill="#f08a24" stroke={INK} strokeWidth="1" />
          <path d="M20 14 C 23 19, 23 24, 20 26 C 17 24, 17 19, 20 14 Z" fill="#ffd96a" />
          <ellipse cx="20" cy="24" rx="1.6" ry="2.4" fill="#fffbe6" />
        </g>
        <line x1="20" y1="27" x2="20" y2="32" stroke={INK} strokeWidth="1.4" />
        <circle cx="20" cy="27.5" r="1.2" className="candle__ember" fill="#ff7a2a" />
        <path d="M12 32 h16 v40 h-16 Z" fill="#fbf1dc" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
        <path
          d="M12 32 h16 v4 c-2 0 -2 7 -4 7 s-1 -5 -3 -5 s-1 9 -3 9 s-2 -6 -3 -6 s-1 3 -3 3 Z"
          fill="#fff"
          stroke={INK}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path d="M15 40 v26" stroke="#fff" strokeWidth="2" opacity="0.8" />
        <ellipse cx="20" cy="74" rx="17" ry="5" fill="#c9952f" stroke={INK} strokeWidth="1.4" />
        <path d="M5 74 q15 10 30 0" fill="#a8771f" stroke={INK} strokeWidth="1.4" />
        <path d="M35 72 c6 0 7 7 1 8" fill="none" stroke={INK} strokeWidth="1.6" />
      </svg>
    </button>
  );
}
