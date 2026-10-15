'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { AltarTable } from '@/art/AltarTable';
import { INK, fx } from '@/art/ink';
import { CrystalBall } from './CrystalBall';
import { MagicCircle, playMagicCircle, stopMagicCircle } from './MagicCircle';
import { Owl, Star } from './parts';
import { useMagicOwl } from './useOwl';
import type { Artifact } from './reading';
import { Say } from '@/art/Say';
import { buzz, flip, sparkle } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
import type { StageFloorProps, StageHandle } from '../types';
import '@/art/art.css';
import './Stage.css';

const isArtifact = (v: unknown): v is Artifact => v === 'book' || v === 'ball';

/** 上層：星星布幔、兩盞星形吊燈 */
export function StageTop() {
  const scallops = Array.from({ length: 14 }, (_, i) => i * 30);
  return (
    <svg className="stage__top" viewBox="0 0 390 214" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      {[
        { x: 78, cord: 54, d: 0 },
        { x: 304, cord: 30, d: -1.6 },
      ].map(({ x, cord, d }) => (
        <g
          key={x}
          className="lantern-sway"
          style={{ transformOrigin: `${x}px 40px`, animationDelay: `${d}s` } as CSSProperties}
        >
          <line x1={x} y1="40" x2={x} y2={40 + cord} stroke={INK} strokeWidth="1.4" />
          <circle cx={x} cy={40 + cord + 34} r="44" fill="var(--marigold)" opacity="0.22" className="lantern-glow" />
          <Star x={x} y={40 + cord + 34} r={32} className="hang-star" />
          <circle cx={x} cy={40 + cord + 34} r="8" fill="var(--paper-hi)" stroke={INK} strokeWidth="1.3" />
          <path d={`M${x} ${40 + cord + 66} v18`} stroke="var(--marigold)" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      ))}
      <path
        className="valance"
        d={`M-10 0 H400 V30 ${scallops
          .map((x) => `A15 14 0 0 1 ${x} 30`)
          .reverse()
          .join(' ')} H-10 Z`}
        fill="var(--cobalt)"
        stroke={INK}
        strokeWidth="1.8"
      />
      <path
        d={`M0 30 ${scallops
          .slice(1)
          .map((x) => `A15 14 0 0 0 ${x} 30`)
          .join(' ')}`}
        fill="none"
        stroke={INK}
        strokeWidth="1.8"
      />
      <line x1="-10" y1="8" x2="400" y2="8" stroke="var(--marigold)" strokeWidth="1.4" />
      {[30, 90, 150, 210, 270, 330].map((x, i) => (
        <Star key={x} x={x + 15} y={20} r={5} className="tw" delay={i * 0.3} />
      ))}
    </svg>
  );
}

/**
 * 下層：夜空圓盤、書桌、白色貓頭鷹、藥水瓶、魔法書、水晶球。
 * 施法時沒指定就隨機挑水晶球或魔法書，回傳實際揭曉的那一個。
 */
export const StageFloor = forwardRef<StageHandle, StageFloorProps>(function StageFloor(
  { count, busy, onTap, label },
  ref,
) {
  const svg = useRef<SVGSVGElement | null>(null);
  // 貓頭鷹畫在整個舞台最上層的另一張同尺寸 SVG：不會被布幔、吊星、封條擋住，飛起來也一樣
  const owlSvg = useRef<SVGSVGElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const attach = useCallback((el: SVGSVGElement | null) => {
    svg.current = el;
    if (el) setHost(el.closest<HTMLElement>('.stage'));
  }, []);
  const last = useRef<Artifact | null>(null);

  useImperativeHandle(ref, () => ({
    draw: (pick) =>
      new Promise<Artifact>((resolve) => {
        const el = svg.current;
        const which: Artifact = isArtifact(pick) ? pick : Math.random() < 0.5 ? 'book' : 'ball';
        last.current = which;
        if (!el) return resolve(which);
        const q = gsap.utils.selector(el);
        el.dataset.active = which;
        if (reducedMotion()) {
          sparkle();
          return resolve(which);
        }
        buzz([20, 40, 20, 40, 20]);
        playMagicCircle(el, which);
        const tl = gsap.timeline({ onComplete: () => resolve(which) });
        // 選中的法器先亮一下，另一個暗下來
        tl.to(q(`.artifact--${which === 'book' ? 'ball' : 'book'}`), { opacity: 0.35, duration: 0.3 }, 0);
        tl.fromTo(
          q(`.artifact--${which} .artifact__halo`),
          { scale: 0.6, opacity: 0 },
          {
            scale: 1.2,
            opacity: 0.3,
            duration: 0.5,
            ease: 'back.out(2)',
            svgOrigin: which === 'book' ? '122 170' : '270 156',
          },
          0,
        );
        if (which === 'ball') {
          tl.to(
            q('.artifact--ball .crystal__nebula'),
            { rotate: '+=1080', duration: 1.7, ease: 'power2.inOut', svgOrigin: '270 160' },
            0,
          )
            .to(
              q('.artifact--ball .crystal__glass'),
              { scale: 1.1, duration: 0.18, yoyo: true, repeat: 7, ease: 'sine.inOut', svgOrigin: '270 160' },
              0.1,
            )
            .to(
              q('.artifact--ball .crystal__aura'),
              { scale: 1.6, opacity: 1, duration: 1.2, svgOrigin: '270 160' },
              0.2,
            )
            .to(
              q('.artifact--ball .crystal__heart'),
              { scale: 2.6, opacity: 1, duration: 1, svgOrigin: '270 160' },
              0.6,
            );
        } else {
          const pages = q('.book__flip');
          pages.forEach((p, i) => {
            tl.fromTo(
              p,
              { scaleX: 1, opacity: 1 },
              { scaleX: -1, duration: 0.2, ease: 'power1.inOut', svgOrigin: '122 184', onStart: () => flip() },
              0.1 + i * 0.14,
            );
            tl.set(p, { opacity: 0 }, 0.3 + i * 0.14);
          });
          tl.to(q('.book__glow'), { opacity: 1, duration: 0.4 }, '>-0.1').to(
            q('.book__lift'),
            { y: -46, rotate: -7, duration: 0.5, ease: 'back.out(1.6)', svgOrigin: '122 204' },
            '<',
          );
        }
        tl.add(() => {
          sparkle();
          buzz(60);
        });
        tl.fromTo(
          q(`.artifact--${which} .burst path`),
          { scale: 0.2, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            stagger: 0.03,
            ease: 'back.out(2)',
            svgOrigin: which === 'book' ? '122 160' : '270 150',
          },
          '-=0.1',
        );
      }),
    settle: () =>
      new Promise<void>((resolve) => {
        const el = svg.current;
        if (!el || !last.current) return resolve();
        const q = gsap.utils.selector(el);
        delete el.dataset.active;
        last.current = null;
        if (reducedMotion()) return resolve();
        stopMagicCircle(el);
        const tl = gsap.timeline({ onComplete: resolve });
        tl.to(q('.artifact'), { opacity: 1, duration: 0.3 }, 0)
          .to(q('.artifact__halo, .burst path'), { opacity: 0, duration: 0.3 }, 0)
          .set(
            q(
              '.artifact--ball .crystal__nebula, .artifact--ball .crystal__glass, .artifact--ball .crystal__aura, .artifact--ball .crystal__heart',
            ),
            { clearProps: 'all' },
            0.3,
          )
          .to(q('.book__glow'), { opacity: 0, duration: 0.3 }, 0)
          .to(q('.book__lift'), { y: 0, rotate: 0, duration: 0.4, ease: 'power2.in', svgOrigin: '122 204' }, 0)
          .set(q('.book__flip'), { scaleX: 1, opacity: 1 });
      }),
  }));

  const owl = useMagicOwl(owlSvg);

  const tap = (a: Artifact) => (busy ? undefined : () => onTap(a));
  const burst = (cx: number, cy: number) => (
    <g className="burst" stroke={INK} strokeWidth="1.2">
      {Array.from({ length: 6 }, (_, k) => {
        const a = (-160 + k * 28) * (Math.PI / 180);
        return (
          <path
            key={k}
            d={starPath(fx(cx + Math.cos(a) * 70), fx(cy + Math.sin(a) * 70), 7 + (k % 2) * 3)}
            fill={k % 2 ? 'var(--marigold)' : 'var(--paper-hi)'}
            opacity="0"
          />
        );
      })}
    </g>
  );

  return (
    <svg
      ref={attach}
      className={`stage__art study-floor${count === 0 ? ' is-empty' : ''}${busy ? ' is-busy' : ''}`}
      viewBox="0 0 390 330"
      overflow="visible"
      aria-hidden="true"
    >
      {/* 夜空圓盤 */}
      <g className="night-disc">
        <circle cx="195" cy="96" r="122" fill="var(--cobalt)" />
        <circle cx="195" cy="96" r="108" fill="none" stroke="var(--marigold)" strokeWidth="1.4" strokeDasharray="2 7" />
        <g className="sun__rays" style={{ transformOrigin: '195px 96px' }}>
          {Array.from({ length: 20 }, (_, i) => {
            const a = (i / 20) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={fx(195 + Math.cos(a) * 140)}
                cy={fx(96 + Math.sin(a) * 140)}
                r={i % 2 ? 2.4 : 3.6}
                fill="var(--cobalt)"
              />
            );
          })}
        </g>
        <Star x={140} y={50} r={7} className="tw" delay={0.2} />
        <Star x={256} y={36} r={9} className="tw" delay={1} />
        <Star x={292} y={110} r={6} className="tw" delay={1.8} />
        <Star x={106} y={120} r={5} className="tw" delay={2.4} />
      </g>

      {/* 右邊藥水（貓頭鷹畫在最後面，才能停在水晶球、魔法書、藥水瓶上） */}
      <g className="potion">
        <path
          d="M348 170 h14 v14 c12 6 18 16 18 26 c0 6 -4 8 -8 8 h-34 c-4 0 -8 -2 -8 -8 c0 -10 6 -20 18 -26 Z"
          fill="var(--jade)"
          stroke={INK}
          strokeWidth="1.5"
        />
        <rect x="346" y="162" width="18" height="9" fill="var(--wood)" stroke={INK} strokeWidth="1.3" />
        <circle cx="352" cy="204" r="3" fill="var(--paper-hi)" className="bubble" />
        <circle cx="362" cy="198" r="2" fill="var(--paper-hi)" className="bubble bubble--2" />
      </g>

      <AltarTable x0={10} x1={380} top={218} label={label} apron="var(--wood-lo)" />
      <rect x="54" y="292" width="282" height="38" fill="url(#hatch-d)" opacity="0.3" />
      <MagicCircle cx={122} cy={214} which="book" />
      <MagicCircle cx={270} cy={214} which="ball" />

      {/* 魔法書 */}
      <g className="artifact artifact--book" onClick={tap('book')}>
        <circle className="artifact__halo" cx="122" cy="170" r="70" fill="var(--marigold)" opacity="0" />
        <rect x="56" y="140" width="132" height="80" fill="transparent" />
        <path d="M100 218 l22 -18 l22 18" fill="none" stroke={INK} strokeWidth="3" />
        <path
          d="M58 166 C 80 160, 104 162, 122 170 C 140 162, 164 160, 186 166 L 186 206 C 164 200, 140 202, 122 210 C 104 202, 80 200, 58 206 Z"
          fill="var(--cobalt)"
          stroke={INK}
          strokeWidth="1.6"
        />
        <path
          d="M62 160 C 82 154, 104 156, 122 164 L 122 204 C 104 196, 82 194, 62 200 Z"
          fill="var(--paper-hi)"
          stroke={INK}
          strokeWidth="1.4"
        />
        <g className="book__lift">
          {/* 右頁本身是紙色（之前是透明的，底下的藍色書皮會透出來） */}
          <path
            d="M122 164 C 140 156, 162 154, 182 160 L 182 200 C 162 194, 140 196, 122 204 Z"
            fill="var(--paper-hi)"
          />
          <path
            className="book__glow"
            d="M122 164 C 140 156, 162 154, 182 160 L 182 200 C 162 194, 140 196, 122 204 Z"
            fill="var(--marigold)"
            opacity="0"
          />
          <path
            d="M122 164 C 140 156, 162 154, 182 160 L 182 200 C 162 194, 140 196, 122 204 Z"
            fill="none"
            stroke={INK}
            strokeWidth="1.4"
          />
          <g stroke={INK} strokeWidth="1" opacity="0.6">
            <path d="M132 172 q20 -8 40 -6 M132 180 q20 -8 40 -6 M132 188 q14 -5 28 -5" fill="none" />
          </g>
          <Star x={152} y={192} r={5} fill="var(--vermilion)" />
        </g>
        <g stroke={INK} strokeWidth="1" opacity="0.6" fill="none">
          <path d="M72 168 q20 -6 40 0 M72 176 q20 -6 40 0 M72 184 q20 -6 40 0 M72 192 q12 -4 24 0" />
        </g>
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            className="book__flip"
            d="M122 164 C 140 156, 162 154, 182 160 L 182 200 C 162 194, 140 196, 122 204 Z"
            fill={i % 2 ? 'var(--paper-hi)' : '#f3ecdf'}
            stroke={INK}
            strokeWidth="1.2"
            style={{ opacity: 0 }}
          />
        ))}
        {burst(122, 160)}
      </g>

      {/* 水晶球 */}
      <g className="artifact artifact--ball" onClick={tap('ball')}>
        <circle className="artifact__halo" cx="270" cy="156" r="70" fill="var(--marigold)" opacity="0" />
        <CrystalBall id="desk" cx={270} cy={160} r={44} runes={false} />
        {burst(270, 150)}
      </g>

      {host &&
        createPortal(
          <div className="stage__floor stage__owl" aria-hidden="true">
            <svg ref={owlSvg} className="stage__art" viewBox="0 0 390 330" overflow="visible">
              {/* 白色貓頭鷹：點了會亂飛，連點三下會生氣飛走 */}
              <g className="owl-run" transform={`translate(${owl.start.x} ${owl.start.y})`}>
                <Owl x={0} y={0} onPoke={owl.poke} outfit={owl.outfit} />
                {owl.line && (
                  <Say
                    key={owl.line.n}
                    text={owl.line.text}
                    angry={owl.line.angry}
                    x={owl.line.side ? 64 : 0}
                    y={owl.line.side ? -20 : owl.outfit === 'hat' ? -98 : -66}
                  />
                )}
              </g>
            </svg>
          </div>,
          host,
        )}
    </svg>
  );
});

function starPath(x: number, y: number, r: number) {
  const k = r * 0.3;
  return `M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`;
}
