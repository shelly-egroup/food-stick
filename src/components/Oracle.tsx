'use client';

import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { Charges } from './Charges';
import { Icon } from './Icon';
import { LoveButton } from './LoveButton';
import { MapLink } from './MapLink';
import { Seal } from './Seal';
import { ShareSheet } from './ShareSheet';
import { Sheet } from './Sheet';
import { useToast } from './Toast';
import { paper, stamp } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
import { makeShareImage } from '@/lib/shareImage';
import type { Reading, Theme } from '@/themes';
import { categoryOf, priceOf, walkOf, type Restaurant } from '@/lib/types';
import { SKIP_WHYS, type SkipWhy } from '@/lib/meal';
import './Oracle.css';

export interface OracleProps {
  theme: Theme;
  restaurant: Restaurant;
  reading: Reading;
  party: number;
  liked: boolean;
  /** 這一餐還能重抽幾次、總共幾次 */
  rerollsLeft: number;
  rerolls: number;
  /** 現在能不能再抽、能不能起駕、能不能說這家去不了 */
  canReroll: boolean;
  canDecide: boolean;
  canSkip: boolean;
  /** 這一支就是起駕（定案）的那一支 */
  decided?: boolean;
  /** 這張籤卡是重抽來的：籤額那一排一出現就播用掉的那一下 */
  spent?: boolean;
  busy: boolean;
  leaving: boolean;
  onReroll: () => void;
  onAccept: () => void;
  onSkip: (why: SkipWhy) => void;
  onToggleLike: () => void;
  onClose: () => void;
  onClosed: () => void;
  /** 「看供桌上的籤」：按了彈出這一餐抽過的籤 */
  candidates?: ReactNode;
  /** 揪團時：一行小小的消息（已經通知幾個人，或大家即時的回覆），不擋住籤卡 */
  crew?: ReactNode;
  /** 這一餐已經結束、被收回：不能再動，改顯示這句話 */
  note?: string;
  /** 供桌上有好幾支：籤卡上直接左右切換（箭頭、左右滑、鍵盤左右鍵），at 是現在第幾支（從 0 算） */
  deck?: { at: number; total: number; onStep: (dir: 1 | -1) => void };
  /** 這張是從旁邊那支切過來的：1 從右邊滑進來、-1 從左邊，不重播整段展開 */
  swap?: 1 | -1;
  /** 回頭挑了不是最後抽到的那支：籤卡搖搖頭、冒出一句虧人的話，然後才收起來 */
  tease?: string;
  /** 已經起駕了，這張是改去別家：原本要去的那家。起駕鈕換成「改去這家」，底下一行小字 */
  switching?: string;
}

/** 左右滑多遠才算切到下一支 */
const SWIPE_PX = 64;

/** 毛邊紙：四邊細碎的不規則邊緣 */
export function deckle(seed: number, n = 30, amp = 1.8) {
  let s = seed;
  const rnd = () => Math.max(0, ((s = (s * 9301 + 49297) % 233280) / 233280 - 0.5) * 2 * amp) + 0.6;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${(i / n) * 100}% ${rnd()}px`);
  for (let i = 0; i <= n; i++) pts.push(`calc(100% - ${rnd()}px) ${(i / n) * 100}%`);
  for (let i = n; i >= 0; i--) pts.push(`${(i / n) * 100}% calc(100% - ${rnd()}px)`);
  for (let i = n; i >= 0; i--) pts.push(`${rnd()}px ${(i / n) * 100}%`);
  return `polygon(${pts.join(',')})`;
}

const CONFETTI = ['var(--vermilion)', 'var(--marigold)', 'var(--jade)', 'var(--cobalt)'];

/**
 * 抽中的結果：籤卡從上往下展開、店名一個字一個字蓋上去、籤等章落下、彩紙炸開。
 * 卡片長相由主題決定（theme.card：直書籤詩或預言卡），動畫和按鈕是共用的。
 */
export function Oracle(p: OracleProps) {
  const root = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { restaurant: r, reading: f, theme } = p;
  const { card, copy } = theme;
  const chars = [...r.name];
  const clip = useMemo(() => deckle(f.number * 31 + 7), [f.number]);
  // 這家去不了：跳出彈窗選原因（人太多、沒開…），選了才算
  const [whyOpen, setWhyOpen] = useState(false);

  // 展開
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    if (reducedMotion()) {
      if (p.swap) return;
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      theme.sound();
      return;
    }
    if (p.swap) {
      // 從旁邊切過來：背景本來就在，只有籤卡從那一側甩進來，店名、籤詩、籤等章快快補上，再掃過一道光
      const d = p.swap;
      const sw = gsap.timeline();
      sw.add(() => paper(0.25), 0)
        .fromTo(
          q('.card-shadow'),
          { x: () => d * Math.min(window.innerWidth * 0.6, 320), rotate: d * 9, opacity: 0 },
          { x: 0, rotate: 0, opacity: 1, duration: 0.46, ease: 'back.out(1.3)' },
          0,
        )
        .fromTo(
          q('.card__name span'),
          { opacity: 0, scale: 1.25 },
          { opacity: 1, scale: 1, duration: 0.3, stagger: 0.035, ease: 'back.out(2)' },
          0.16,
        )
        .fromTo(
          q('.card__lines p'),
          { clipPath: card.vertical ? 'inset(0% 0% 100% 0%)' : 'inset(0% 100% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.3, stagger: 0.07, ease: 'power1.inOut' },
          0.26,
        )
        .fromTo(
          q('.card__seal'),
          { opacity: 0, scale: 1.9, rotate: -24 },
          { opacity: 1, scale: 1, rotate: card.sealTilt, duration: 0.26, ease: 'back.out(2.2)' },
          0.42,
        )
        .add(() => stamp(), 0.52)
        .fromTo(
          q('.card__shine'),
          { backgroundPosition: d > 0 ? '160% 0' : '-60% 0', opacity: 1 },
          { backgroundPosition: d > 0 ? '-60% 0' : '160% 0', opacity: 0, duration: 0.7, ease: 'power2.out' },
          0.3,
        )
        .fromTo(q('.oracle__actions > *'), { opacity: 0.35 }, { opacity: 1, duration: 0.25 }, 0.2);
      return () => void sw.kill();
    }
    const tl = gsap.timeline();
    tl.fromTo(q('.oracle__veil'), { opacity: 0 }, { opacity: 1, duration: 0.3 })
      .fromTo(
        q('.oracle__burst'),
        { opacity: 0, scale: 0.4 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' },
        0,
      )
      .add(() => paper(0.5), 0.05)
      .fromTo(
        q('.card'),
        { clipPath: 'inset(0% 0% 100% 0%)', y: -36, rotate: -1.5 },
        { clipPath: 'inset(0% 0% 0% 0%)', y: 0, rotate: 0, duration: 0.7, ease: 'power3.out', clearProps: 'clipPath' },
        0.05,
      )
      .fromTo(q('.card__head > *'), { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.06 }, 0.35)
      .add(() => theme.sound(), 0.45)
      .fromTo(
        q('.card__name span'),
        { opacity: 0, y: card.vertical ? 0 : 10, scale: 1.3 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(2)' },
        0.45,
      )
      .fromTo(
        q('.card__lines p'),
        // 直書一行一行由上往下寫出來，橫書由左往右
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
      .fromTo(
        q('.confetti i'),
        { x: 0, y: 0, opacity: 1, rotate: 0 },
        {
          x: (i: number) => Math.cos((i / 18) * Math.PI * 2) * (120 + (i % 4) * 40),
          y: (i: number) => Math.sin((i / 18) * Math.PI * 2) * (90 + (i % 3) * 50) + 60,
          rotate: (i: number) => i * 67,
          opacity: 0,
          duration: 1.2,
          ease: 'power2.out',
        },
        1.42,
      )
      .fromTo(q('.card__foot > *'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.08 }, 1.45)

      // 整排按鈕先藏著：資料晚一點才到才長出來的（例如「這家去不了」）也跟著這一拍出場，不會先跳出來
      .fromTo(
        q('.oracle__actions'),
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.2, clearProps: 'opacity,visibility' },
        1.5,
      )
      .fromTo(
        q('.oracle__actions > *'),
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'back.out(1.6)' },
        1.55,
      );
    // 左右切換的箭頭、底下那排小點：展開的這段先藏著（資料晚到才長出來的也一樣），展開好了才一起淡入
    el.classList.add('is-opening');
    tl.add(() => el.classList.remove('is-opening'), 1.4);
    // 起駕的那一支：定案章落下、店名慢慢收攏（還沒起駕的籤卡沒有這兩樣，不要叫 GSAP 白找）
    if (el.querySelector('.oracle__final'))
      tl.fromTo(
        q('.oracle__final'),
        { opacity: 0, scale: 2.6, rotate: -36 },
        { opacity: 1, scale: 1, rotate: -8, duration: 0.32, ease: 'back.out(2.4)' },
        1.85,
      ).add(() => stamp(), 1.98);
    if (el.querySelector('.oracle__final-words b'))
      tl.fromTo(
        q('.oracle__final-words b'),
        { opacity: 0, y: 6, letterSpacing: '0.5em' },
        { opacity: 1, y: 0, letterSpacing: '0.16em', duration: 0.5, ease: 'power3.out' },
        2.1,
      );
    return () => {
      tl.kill();
      el.classList.remove('is-opening');
    };
    // 換一支籤就重新展開
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.id, f.number]);

  // 收起
  useEffect(() => {
    if (!p.leaving) return;
    const el = root.current;
    if (!el || reducedMotion()) {
      p.onClosed();
      return;
    }
    const q = gsap.utils.selector(el);
    paper(0.3);
    const tl = gsap.timeline({ onComplete: p.onClosed });
    tl.to(q('.oracle__actions > *, .oracle__nav, .oracle__deck, .oracle__tease'), { opacity: 0, y: 10, duration: 0.15 })
      .to(q('.card'), { clipPath: 'inset(0% 0% 100% 0%)', y: -30, duration: 0.36, ease: 'power2.in' }, 0.05)
      .to(q('.oracle__burst'), { opacity: 0, scale: 0.6, duration: 0.3 }, 0.05)
      .to(q('.oracle__veil'), { opacity: 0, duration: 0.3 }, 0.18);
    return () => void tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.leaving]);

  // ---------- 左右切換供桌上的籤 ----------
  const deck = p.deck;
  const canPrev = !!deck && deck.at > 0;
  const canNext = !!deck && deck.at < deck.total - 1;
  const stepping = useRef(false);
  const shadowEl = () => root.current?.querySelector<HTMLElement>('.card-shadow') ?? null;

  /** 切到旁邊那支：這張先往反方向甩出去，換下一張從另一側進來（進場在展開那段） */
  const step = (dir: 1 | -1) => {
    const el = shadowEl();
    if (!deck || p.busy || stepping.current || !el) return;
    if (dir > 0 ? !canNext : !canPrev) {
      // 已經是最邊邊那支：輕輕頂一下就彈回來
      if (!reducedMotion())
        gsap.fromTo(el, { x: 0 }, { x: -dir * 14, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.out' });
      return;
    }
    if (reducedMotion()) return deck.onStep(dir);
    stepping.current = true;
    const q = gsap.utils.selector(root.current);
    gsap
      .timeline({ onComplete: () => deck.onStep(dir) })
      .to(
        el,
        {
          x: -dir * Math.min(window.innerWidth * 0.7, 360),
          rotate: -dir * 12,
          opacity: 0,
          duration: 0.22,
          ease: 'power2.in',
        },
        0,
      )
      .to(q('.oracle__actions > *'), { opacity: 0.35, duration: 0.18 }, 0);
  };

  // 手指（滑鼠）按住籤卡左右拖：卡片跟著走、微微傾斜；放開時拖夠遠就切，不夠就彈回原位
  const drag = useRef<{ id: number; x: number; y: number; dx: number; on: boolean } | null>(null);
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!deck || p.busy || stepping.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, on: false };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.on) {
      // 往上下捲的就放給頁面捲
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) < 8) return;
      d.on = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    // 拉到沒有下一支的那一邊：越拉越緊
    const edge = dx < 0 ? !canNext : !canPrev;
    d.dx = edge ? dx / 4 : dx;
    gsap.set(e.currentTarget, { x: d.dx, rotate: d.dx / 22 });
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.on) return;
    const dir = d.dx < 0 ? 1 : -1;
    if (Math.abs(d.dx) >= SWIPE_PX && (dir > 0 ? canNext : canPrev)) step(dir);
    else gsap.to(e.currentTarget, { x: 0, rotate: 0, duration: 0.45, ease: 'elastic.out(1, 0.6)' });
  };

  // 回頭挑：籤卡左右搖兩下、歪一下頭（虧人的那句話由 CSS 彈出來）
  useEffect(() => {
    const el = root.current;
    if (!p.tease || !el || reducedMotion()) return;
    const tw = gsap.fromTo(
      el.querySelector('.card-shadow'),
      { rotate: 0, x: 0 },
      { keyframes: { rotate: [-4, 3.5, -2.5, 1.5, 0], x: [-8, 7, -4, 2, 0] }, duration: 0.9, ease: 'sine.inOut' },
    );
    return () => void tw.kill();
  }, [p.tease]);

  // 蓋愛店章：按鈕上的石章（或咒語）落下的那一刻，章也蓋到籤卡上；聲音由按鈕負責。
  // 在畫面更新前接手，章不會先閃出來
  const firstLike = useRef(true);
  useLayoutEffect(() => {
    if (firstLike.current) {
      firstLike.current = false;
      return;
    }
    if (!p.liked || !root.current || reducedMotion()) return;
    const tween = gsap.fromTo(
      root.current.querySelector('.card__love'),
      { opacity: 0, scale: 2.2, rotate: 24 },
      {
        opacity: 1,
        scale: 1,
        rotate: 0,
        duration: 0.3,
        delay: 0.26,
        ease: 'back.out(2.4)',
        clearProps: 'opacity,transform',
      },
    );
    return () => void tween.kill();
  }, [p.liked]);

  useEffect(() => {
    // 分享預覽（<dialog>）開著的時候，Esc 只關預覽，不要連籤卡一起收掉
    const onKey = (e: KeyboardEvent) => {
      if (p.busy || document.querySelector('dialog[open]')) return;
      if (e.key === 'Escape') p.onClose();
      else if (p.deck && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) step(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  // ---------- 分享：把籤卡畫成一張圖 ----------
  const cat = categoryOf(r.category);
  const shareText = `我在「食在難選」${f.shareHead}：${r.name}！\n${f.lines.join('，')}。\n${f.verdict}`;
  const fileName = `食在難選-${f.numberText}-${r.name}.png`;
  const shareKey = `${theme.id}:${r.id}:${f.number}:${p.liked}`;
  const shot = useRef<{ key: string; blob: Promise<Blob> } | null>(null);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [sharing, setSharing] = useState(false);
  const imageFor = () => {
    if (shot.current?.key !== shareKey)
      shot.current = {
        key: shareKey,
        blob: makeShareImage(theme, {
          restaurant: r,
          reading: f,
          liked: p.liked,
          tags: [cat.label, `步行 ${walkOf(r.walk).label}`, ...(r.group ? ['可揪團'] : [])],
          place: copy.place,
          date: new Date(),
          host: location.host,
        }),
      };
    return shot.current.blob;
  };
  // 籤卡展開後先在背景畫好：手機按下分享時就能立刻叫出系統的分享（太晚叫會被瀏覽器擋掉）
  const prepare = useEffectEvent(() => void imageFor().catch(() => undefined));
  useEffect(() => {
    const t = setTimeout(prepare, 1900);
    return () => clearTimeout(t);
  }, [shareKey]);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    let blob: Blob | null = null;
    try {
      blob = await imageFor();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '食在難選', text: shareText });
      } else {
        setPreview(blob);
      }
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name !== 'AbortError') {
        // 系統分享被擋（或叫不出來）：改開預覽，讓人自己下載或複製
        if (blob) setPreview(blob);
        else toast('圖片沒有畫出來，再試一次', '咦');
      }
    } finally {
      setSharing(false);
    }
  };

  const meta = (
    <ul className="card__meta" aria-label="店家資訊">
      <li>{cat.label}</li>
      <li>
        <theme.PriceMark n={r.price} size={13} /> {priceOf(r.price).label}
      </li>
      <li>步行{walkOf(r.walk).label}</li>
      {r.group && <li>可揪團</li>}
    </ul>
  );

  return (
    <div ref={root} className="oracle" role="dialog" aria-modal="true" aria-labelledby="oracle-name">
      {/* 不放關閉鈕：點籤卡外面、按 Esc 都會收起來 */}
      <div className="oracle__veil" onClick={p.busy ? undefined : p.onClose} />
      <div className="oracle__burst" aria-hidden="true" />

      <div className="oracle__wrap">
        {deck && (
          <>
            <button
              type="button"
              className="oracle__nav oracle__nav--prev"
              onClick={() => step(-1)}
              aria-disabled={!canPrev || p.busy}
              aria-label="上一支"
            >
              <Icon name="chevron-left" size={22} />
            </button>
            <button
              type="button"
              className="oracle__nav oracle__nav--next"
              onClick={() => step(1)}
              aria-disabled={!canNext || p.busy}
              aria-label="下一支"
            >
              <Icon name="chevron-right" size={22} />
            </button>
          </>
        )}
        <div
          className={`card-shadow${deck ? ' is-deck' : ''}`}
          onPointerDown={deck ? onDown : undefined}
          onPointerMove={deck ? onMove : undefined}
          onPointerUp={deck ? onUp : undefined}
          onPointerCancel={deck ? onUp : undefined}
        >
          <article className={`card ${card.className}`} style={{ ['--n' as string]: chars.length }}>
            <div className="card__paper" aria-hidden="true" style={card.deckle ? { clipPath: clip } : undefined} />
            <div className="card__frame" aria-hidden="true" />
            {deck && <div className="card__shine" aria-hidden="true" />}
            <div className="confetti" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <i key={i} style={{ background: CONFETTI[i % 4] }} />
              ))}
            </div>

            <header className="card__head">
              <span className="card__no">{f.numberText}</span>
              <span className="card__brand">{f.brand}</span>
            </header>
            <card.Seal text={f.grade.seal} label={f.grade.name} />
            {p.liked && (
              <theme.LoveStamp size={56} className="card__love" label="你的愛店" variant={f.variant} seed={r.id} />
            )}

            <div className="card__body">
              <h2 id="oracle-name" className="card__name" aria-label={r.name}>
                {chars.map((c, i) => (
                  <span key={i} aria-hidden="true">
                    {c}
                  </span>
                ))}
              </h2>
              <div className="card__lines">
                {f.lines.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
            </div>

            <footer className="card__foot">
              <p className="card__verdict">
                <b>{copy.verdictLabel}</b>
                {f.verdict}
              </p>
              {meta}
            </footer>
          </article>
        </div>

        {p.tease && (
          <p className="oracle__tease" role="status">
            <theme.Glyph name="shake" size={26} />
            {p.tease}
          </p>
        )}
        {deck && (
          // 第幾支：一排小點，現在這支拉長；也告訴讀螢幕的人
          <p className="oracle__deck" aria-live="polite">
            <span className="sr-only">{`第 ${deck.at + 1} 支，共 ${deck.total} 支，左右滑可以切換`}</span>
            {Array.from({ length: deck.total }, (_, i) => (
              <i key={i} className={i === deck.at ? 'is-on' : undefined} aria-hidden="true" />
            ))}
          </p>
        )}

        <div className="oracle__actions">
          {p.decided ? (
            // 已經起駕：籤卡上蓋著定案章；有地圖就帶我去
            <p className="oracle__taunt oracle__taunt--final" aria-live="polite">
              <Seal text={copy.finalSeal} size={48} rotate={-8} className="oracle__final" label={copy.finalSeal} />
              <span className="oracle__final-words">
                <span>{copy.meal.depart}</span>
                <b>{r.name}</b>
              </span>
            </p>
          ) : (
            p.canDecide && (
              <button
                type="button"
                className="btn btn--zhu btn--lg oracle__go"
                onClick={(e) => {
                  theme.departFx(e.currentTarget);
                  p.onAccept();
                }}
              >
                <theme.Glyph name="depart" size={30} />
                {p.switching ? (
                  <span className="oracle__go-words">
                    <b>{copy.meal.switchTo}</b>
                    <small>{copy.meal.switchFrom(p.switching)}</small>
                  </span>
                ) : (
                  copy.go
                )}
              </button>
            )
          )}
          {p.note ? (
            <p className="oracle__taunt" aria-live="polite">
              {p.note}
            </p>
          ) : p.canReroll ? (
            <button type="button" className="btn btn--line" onClick={p.onReroll} aria-disabled={p.busy}>
              {copy.reroll}
              <Charges left={p.rerollsLeft} total={p.rerolls} spend={p.spent} label={copy.meal.left(p.rerollsLeft)} />
            </button>
          ) : (
            !p.decided &&
            !p.switching && (
              // 次數用完：從候選挑一支起駕
              <p className="oracle__taunt oracle__taunt--spent" aria-live="polite">
                <theme.Glyph name="shake" size={26} />
                <span className="oracle__final-words">
                  <span>{copy.noMore}</span>
                  <b>{p.deck ? copy.pickSwipe : copy.pickOnly}</b>
                </span>
              </p>
            )
          )}
          {p.decided && <MapLink r={r} title={copy.meal.map} withName />}
          <div className="oracle__minor">
            <LoveButton liked={p.liked} onToggle={p.onToggleLike} />
            <button
              type="button"
              className="btn btn--line oracle__share"
              onClick={share}
              aria-busy={sharing}
              aria-label={p.party > 1 ? '把籤詩圖傳給大家' : '分享籤詩圖'}
            >
              {sharing ? <theme.Loader size={22} label="畫圖中" /> : <Icon name="share" size={20} />}
              {p.party > 1 ? '傳給大家' : '分享'}
            </button>
          </div>
          {(p.canSkip || p.crew || p.candidates) && (
            <div className="oracle__extra">
              {p.candidates}
              {/* 揪團：一行小小的消息，不擋住籤卡 */}
              {p.crew && (
                <div className="oracle__crew" aria-live="polite">
                  {p.crew}
                </div>
              )}
              {p.canSkip && (
                <button
                  type="button"
                  className="oracle__skip"
                  aria-haspopup="dialog"
                  onClick={() => !p.busy && setWhyOpen(true)}
                  aria-disabled={p.busy}
                >
                  <theme.Glyph name="closed" size={22} />
                  {copy.meal.cantGo}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <Sheet
        open={whyOpen}
        onClose={() => setWhyOpen(false)}
        eyebrow={r.name}
        title={copy.meal.cantGoTitle}
        icon={<theme.Glyph name="closed" size={44} />}
      >
        <p className="skipwhy__hint">{copy.meal.cantGoHint}</p>
        <ul className="skipwhy">
          {SKIP_WHYS.map((w, i) => (
            <li key={w} style={{ ['--i' as string]: i }}>
              <button
                type="button"
                className={`skipwhy__opt skipwhy__opt--${w}`}
                onClick={() => {
                  setWhyOpen(false);
                  // 等彈窗收起來再收籤卡
                  window.setTimeout(() => p.onSkip(w), 220);
                }}
              >
                <b>{copy.meal.skipWhy[w].title}</b>
                <span>{copy.meal.skipWhy[w].hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
      <ShareSheet
        blob={preview}
        fileName={fileName}
        text={`${shareText}\n${location.origin}`}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
