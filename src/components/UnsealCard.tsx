'use client';

import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { paper, stamp } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
import type { Theme } from '@/themes';
import { deckle } from './Oracle';
import './Oracle.css';

/**
 * 解封籤：iOS 拒絕了「動作與方向」之後，搖不了手機。
 * 長得跟解籤的籤卡一樣（廟宇直書籤詩、魔法預言卡），籤詩說明為什麼被封，「解曰／預言」寫白話的步驟。
 */
export function UnsealCard({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const { card, copy } = theme;
  const u = copy.shake.unseal;
  const chars = [...u.name];
  const clip = useMemo(() => deckle(97), []);
  const [leaving, setLeaving] = useState(false);
  const done = useEffectEvent(onClose);

  // 展開：跟籤卡一樣從上往下攤開，封印章最後蓋下去
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    if (reducedMotion()) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      return;
    }
    const tl = gsap.timeline();
    tl.fromTo(q('.oracle__veil'), { opacity: 0 }, { opacity: 1, duration: 0.3 })
      .add(() => paper(0.5), 0.05)
      .fromTo(
        q('.card'),
        { clipPath: 'inset(0% 0% 100% 0%)', y: -36, rotate: -1.5 },
        { clipPath: 'inset(0% 0% 0% 0%)', y: 0, rotate: 0, duration: 0.7, ease: 'power3.out', clearProps: 'clipPath' },
        0.05,
      )
      .fromTo(q('.card__head > *'), { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.06 }, 0.35)
      .fromTo(
        q('.card__name span'),
        { opacity: 0, y: card.vertical ? 0 : 10, scale: 1.3 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(2)' },
        0.45,
      )
      .fromTo(
        q('.card__lines p'),
        { clipPath: card.vertical ? 'inset(0% 0% 100% 0%)' : 'inset(0% 100% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.45, stagger: 0.14, ease: 'power1.inOut' },
        0.8,
      )
      .fromTo(
        q('.card__seal'),
        { opacity: 0, scale: 2.4, rotate: -30 },
        { opacity: 1, scale: 1, rotate: card.sealTilt, duration: 0.3, ease: 'back.out(2.2)' },
        1.3,
      )
      .add(() => stamp(), 1.42)
      .fromTo(q('.card__foot > *'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35 }, 1.45)
      .fromTo(
        q('.oracle__actions > *'),
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.6)' },
        1.55,
      );
    return () => void tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 收起：捲回去再拿掉
  useEffect(() => {
    if (!leaving) return;
    const el = root.current;
    if (!el || reducedMotion()) {
      done();
      return;
    }
    const q = gsap.utils.selector(el);
    paper(0.3);
    const tl = gsap.timeline({ onComplete: () => done() });
    tl.to(q('.oracle__actions > *'), { opacity: 0, y: 10, duration: 0.15 })
      .to(q('.card'), { clipPath: 'inset(0% 0% 100% 0%)', y: -30, duration: 0.36, ease: 'power2.in' }, 0.05)
      .to(q('.oracle__veil'), { opacity: 0, duration: 0.3 }, 0.18);
    return () => void tl.kill();
  }, [leaving]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLeaving(true);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = () => setLeaving(true);

  return (
    <div ref={root} className="oracle unseal" role="dialog" aria-modal="true" aria-labelledby="unseal-name">
      <div className="oracle__veil" onClick={close} />

      <div className="oracle__wrap">
        <div className="card-shadow">
          <article className={`card ${card.className}`} style={{ ['--n' as string]: chars.length }}>
            <div className="card__paper" aria-hidden="true" style={card.deckle ? { clipPath: clip } : undefined} />
            <div className="card__frame" aria-hidden="true" />

            <header className="card__head">
              <span className="card__no">{u.no}</span>
              <span className="card__brand">{u.brand}</span>
            </header>
            <card.Seal text={u.seal} label={u.sealLabel} />

            <div className="card__body">
              <h2 id="unseal-name" className="card__name" aria-label={u.name}>
                {chars.map((c, i) => (
                  <span key={i} aria-hidden="true">
                    {c}
                  </span>
                ))}
              </h2>
              <div className="card__lines">
                {u.lines.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
            </div>

            <footer className="card__foot">
              <p className="card__verdict">
                <b>{copy.verdictLabel}</b>
                {u.steps}
              </p>
            </footer>
          </article>
        </div>

        <div className="oracle__actions">
          <button type="button" className="btn btn--zhu btn--lg oracle__go" onClick={close}>
            <theme.Glyph name="shake" size={30} />
            {u.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
