'use client';

import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import gsap from 'gsap';
import { Seal } from '@/components/Seal';
import { chime, clack, paper, stamp } from '@/lib/sound';
import { playAfterGate, reducedMotion } from '@/lib/motion';
import { toChineseNumber } from '@/lib/format';
import type { PodiumEntry, PodiumProps } from '../types';
import { copy } from './copy';
import './Podium.css';

const nameSize = (name: string, big: boolean) => {
  const n = [...name].length;
  return big ? Math.min(30, Math.floor(260 / Math.max(n, 4))) : Math.min(17, Math.floor(190 / Math.max(n, 5)));
};

function Column({
  x,
  rank,
  unit,
  onOpen,
}: {
  x: PodiumEntry | undefined;
  rank: number;
  unit: string;
  onOpen?: PodiumProps['onOpen'];
}) {
  const big = rank < 3;
  const label = big ? copy.ranks.podium[rank] : copy.ranks.no(rank + 1);
  if (!x)
    return (
      <li className={`bang__col${big ? ' bang__col--big' : ''} is-vacant`} data-rank={rank}>
        <span className="bang__rank">{label}</span>
        <span className="bang__name">{copy.ranks.vacant}</span>
      </li>
    );
  const open = (e: MouseEvent<HTMLButtonElement>) => {
    if (!onOpen) return;
    const el = e.currentTarget;
    if (reducedMotion()) return onOpen(x.r);
    paper(0.15);
    gsap.fromTo(el, { '--ink-wash': 0 }, { '--ink-wash': 1, duration: 0.35, yoyo: true, repeat: 1 });
    window.setTimeout(() => onOpen(x.r), 260);
  };
  return (
    <li className={`bang__col${big ? ' bang__col--big' : ''}${rank === 0 ? ' bang__col--first' : ''}`} data-rank={rank}>
      <button type="button" className="bang__hit" onClick={open} aria-label={`${label} ${x.r.name}，${x.value}${unit}`}>
        {big ? (
          <Seal text={label} size={rank === 0 ? 54 : 44} className="bang__seal" color="var(--vermilion)" />
        ) : (
          <span className="bang__rank">{label}</span>
        )}
        <span className="bang__name" style={{ fontSize: nameSize(x.r.name, big) }}>
          {x.r.name}
        </span>
        <span className={`bang__val${x.value === 0 ? ' is-zero' : ''}`}>
          <b className="bang__num">{formal(x.value)}</b>
          <span className="bang__unit">{unit}</span>
        </span>
        {rank === 0 && <span className="bang__crown">{copy.ranks.crown}</span>}
      </button>
    </li>
  );
}

function PodiumName({ name, first }: { name: string; first: boolean }) {
  const n = [...name].length;
  const size = (first ? 1.25 : 1) * (n <= 4 ? 30 : n <= 6 ? 25 : 20);
  return (
    <h3 className="podium__name" style={{ fontSize: size }}>
      {name}
    </h3>
  );
}

const STEP = ['壹', '貳', '參'];
const FORMAL: Record<string, string> = {
  一: '壹',
  二: '貳',
  三: '參',
  四: '肆',
  五: '伍',
  六: '陸',
  七: '柒',
  八: '捌',
  九: '玖',
  十: '拾',
  百: '佰',
};
const formal = (n: number) => [...toChineseNumber(n)].map((c) => FORMAL[c] ?? c).join('');

/**
 * 金榜：上面是三階頒獎台（狀元站中間最高），下面接一卷由右往左讀的黃榜寫第四名以後。
 * 放榜時台子由下往上升起、名號章依序落下；黃榜由右往左攤開，名字一行一行寫上去。
 */
export function Podium({ top, rest = [], unit, revealKey, onOpen }: PodiumProps) {
  const board = useRef<HTMLDivElement>(null);
  const [today] = useState(() => {
    const d = new Date();
    return `${toChineseNumber(d.getMonth() + 1)}月${toChineseNumber(d.getDate())}日`;
  });
  const scroller = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = board.current;
    const sc = scroller.current;
    if (sc) sc.scrollLeft = sc.scrollWidth;
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    const order = [2, 1, 0].filter((i) => i < top.length);
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(
      q('.podium__rays'),
      { opacity: 0, rotate: -20 },
      { opacity: 1, rotate: 0, duration: 1.2, ease: 'power2.out' },
      0,
    );
    order.forEach((i, k) => {
      tl.fromTo(
        q(`[data-rank="${i}"]`),
        { clipPath: 'inset(100% 0 0 0)' },
        {
          clipPath: 'inset(0% 0 0 0)',
          duration: 0.55,
          ease: 'power3.out',
          clearProps: 'clipPath',
          onStart: () => (i === 0 ? chime() : clack()),
        },
        0.2 + k * 0.36,
      ).fromTo(
        q(`[data-rank="${i}"] .podium__title`),
        { scale: 2.2, opacity: 0, rotate: -20 },
        { scale: 1, opacity: 1, rotate: -6, duration: 0.3, ease: 'back.out(2.4)', onStart: () => stamp() },
        '>-0.12',
      );
    });
    tl.fromTo(
      q('.podium__crown'),
      { scaleX: 0 },
      { scaleX: 1, duration: 0.4, ease: 'back.out(2)', clearProps: 'transform' },
      '>',
    );
    const cancel = playAfterGate(tl);
    return () => {
      cancel();
      tl.kill();
    };
    // 第一次進來、或切換排序時放榜
  }, [revealKey, top.length, rest.length]);

  useLayoutEffect(() => {
    const el = board.current?.querySelector<HTMLElement>('.bang');
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    const paperEl = q('.bang__paper');
    const roller = q('.bang__frame > .bang__roller:first-child');
    const frame = el.querySelector<HTMLElement>('.bang__frame');
    const closed = () => Math.max(0, (frame?.clientWidth ?? 0) - 32);
    gsap.set(paperEl, { clipPath: 'inset(0 0 0 100%)' });
    gsap.set(roller, { x: closed() });
    gsap.set(q('.bang__num'), { opacity: 0 });
    let tl: gsap.core.Timeline | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        paper(0.5);
        tl = gsap
          .timeline()
          .to(paperEl, { clipPath: 'inset(0 0 0 0%)', duration: 0.9, ease: 'power2.inOut', clearProps: 'clipPath' }, 0)
          .to(roller, { x: 0, duration: 0.9, ease: 'power2.inOut', clearProps: 'transform' }, 0)
          .fromTo(
            q('.bang__name'),
            { clipPath: 'inset(0 0 100% 0)' },
            {
              clipPath: 'inset(0 0 0% 0)',
              duration: 0.38,
              stagger: 0.07,
              ease: 'power1.inOut',
              clearProps: 'clipPath',
            },
            0.4,
          )
          .fromTo(
            q('.bang__num'),
            { opacity: 0, scale: 2 },
            { opacity: 1, scale: 1, duration: 0.26, stagger: 0.07, ease: 'back.out(2.4)', clearProps: 'opacity,scale' },
            0.8,
          )
          .add(() => stamp(), 0.9);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      tl?.kill();
      gsap.set([paperEl, roller, q('.bang__num')], { clearProps: 'clipPath,transform,opacity,scale' });
    };
  }, [revealKey, rest.length]);

  const open = (e: MouseEvent<HTMLElement>, x: PodiumEntry) => {
    if (!onOpen) return;
    if (reducedMotion()) return onOpen(x.r);
    paper(0.15);
    gsap.fromTo(e.currentTarget, { '--ink-wash': 0 }, { '--ink-wash': 1, duration: 0.3, yoyo: true, repeat: 1 });
    window.setTimeout(() => onOpen(x.r), 240);
  };

  return (
    <div ref={board} className="hall">
      <section className="podium" aria-label="前三名">
        <span className="podium__rays" aria-hidden="true" />
        {[1, 0, 2].map((i) => {
          const x = top[i];
          if (!x)
            return (
              <div key={`vacant-${i}`} className={`podium__slot podium__slot--${i + 1} podium__slot--vacant`}>
                <span className="podium__vacant">{copy.ranks.vacant}</span>
                <span className="podium__step" aria-hidden="true">
                  {STEP[i]}
                </span>
              </div>
            );
          return (
            <article key={x.r.id} className={`podium__slot podium__slot--${i + 1}`} data-rank={i}>
              <Seal
                text={copy.ranks.podium[i]}
                size={i === 0 ? 64 : 52}
                className="podium__title"
                label={copy.ranks.podium[i]}
                color="var(--vermilion)"
              />
              <PodiumName name={x.r.name} first={i === 0} />
              {i === 0 && <span className="podium__crown">{copy.ranks.crown}</span>}
              <p className="podium__stat">
                <b>{x.value}</b>
                {unit}
              </p>
              <span className="podium__step" aria-hidden="true">
                {STEP[i]}
              </span>
              {onOpen && (
                <button
                  type="button"
                  className="podium__open"
                  onClick={(e) => open(e, x)}
                  aria-label={`看${x.r.name}`}
                />
              )}
            </article>
          );
        })}
      </section>

      {rest.length > 0 && (
        <section className="bang" aria-label="第四名以後">
          <div className="bang__head">
            <span className="bang__eyebrow">IMPERIAL LIST · 續榜</span>
            <span className="bang__hint">往左滑，看完整張榜</span>
          </div>
          <div className="bang__frame">
            <span className="bang__roller bang__roller--r" aria-hidden="true" />
            <div ref={scroller} className="bang__scroll">
              <div className="bang__paper">
                <ol className="bang__cols">
                  {rest.map((x, i) => (
                    <Column key={x.r.id} x={x} rank={i + 3} unit={unit} onOpen={onOpen} />
                  ))}
                  <li className="bang__colophon" aria-hidden="true">
                    <span className="bang__decree">
                      <span className="bang__words">右榜曉諭・咸使聞知</span>
                      <span className="bang__date">{today}</span>
                    </span>
                    <Seal text="放榜" size={46} color="var(--vermilion)" rotate={-6} className="bang__stamp" />
                  </li>
                </ol>
              </div>
            </div>
            <span className="bang__roller bang__roller--l" aria-hidden="true" />
          </div>
        </section>
      )}
    </div>
  );
}
