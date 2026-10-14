'use client';

import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { Charges } from './Charges';
import { Icon } from './Icon';
import { openMapSoon } from '@/lib/depart';
import { LoveButton } from './LoveButton';
import { ShareSheet } from './ShareSheet';
import { useToast } from './Toast';
import { paper, stamp } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
import { REROLLS } from '@/lib/store';
import { makeShareImage } from '@/lib/shareImage';
import type { Reading, Theme } from '@/themes';
import { categoryOf, priceOf, walkOf, type Restaurant } from '@/lib/types';
import './Oracle.css';

export interface OracleProps {
  theme: Theme;
  restaurant: Restaurant;
  reading: Reading;
  party: number;
  liked: boolean;
  rerollsLeft: number;
  /** 這張籤卡是重抽來的：籤額那一排一出現就播用掉的那一下 */
  spent?: boolean;
  busy: boolean;
  leaving: boolean;
  onReroll: () => void;
  onAccept: () => void;
  onToggleLike: () => void;
  onClose: () => void;
  onClosed: () => void;
  /** 揪團時：一行小小的消息（已經通知幾個人，或大家即時的回覆），不擋住籤卡 */
  crew?: ReactNode;
  /** 這一團已經有結果（出發了、收回了）：不能再重抽，改顯示這句話 */
  note?: string;
}

/** 毛邊紙：四邊細碎的不規則邊緣 */
function deckle(seed: number, n = 30, amp = 1.8) {
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

  // 展開
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    if (reducedMotion()) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      theme.sound();
      return;
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
      .fromTo(
        q('.oracle__actions > *'),
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'back.out(1.6)' },
        1.55,
      );
    return () => void tl.kill();
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
    tl.to(q('.oracle__actions > *'), { opacity: 0, y: 10, duration: 0.15 })
      .to(q('.card'), { clipPath: 'inset(0% 0% 100% 0%)', y: -30, duration: 0.36, ease: 'power2.in' }, 0.05)
      .to(q('.oracle__burst'), { opacity: 0, scale: 0.6, duration: 0.3 }, 0.05)
      .to(q('.oracle__veil'), { opacity: 0, duration: 0.3 }, 0.18);
    return () => void tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.leaving]);

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
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && !p.busy && !document.querySelector('dialog[open]') && p.onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
        <div className="card-shadow">
          <article className={`card ${card.className}`} style={{ ['--n' as string]: chars.length }}>
            <div className="card__paper" aria-hidden="true" style={card.deckle ? { clipPath: clip } : undefined} />
            <div className="card__frame" aria-hidden="true" />
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

        <div className="oracle__actions">
          {r.mapUrl ? (
            <a
              className="btn btn--zhu btn--lg oracle__go"
              href={r.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                // 先放出發的動畫，再開地圖
                e.preventDefault();
                theme.departFx(e.currentTarget);
                openMapSoon(r.mapUrl);
                p.onAccept();
              }}
            >
              <theme.Glyph name="depart" size={30} />
              {copy.go}
            </a>
          ) : (
            <button
              type="button"
              className="btn btn--zhu btn--lg oracle__go"
              onClick={(e) => {
                theme.departFx(e.currentTarget);
                p.onAccept();
              }}
            >
              <theme.Glyph name="depart" size={30} />
              {copy.go}
            </button>
          )}
          {p.note || p.rerollsLeft === 0 ? (
            <p className="oracle__taunt" aria-live="polite">
              {p.note || copy.noMore}
            </p>
          ) : (
            <button type="button" className="btn btn--line" onClick={p.onReroll} aria-disabled={p.busy}>
              {copy.reroll}
              <Charges left={p.rerollsLeft} total={REROLLS} spend={p.spent} label={`剩 ${p.rerollsLeft} 次`} />
            </button>
          )}
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
          {/* 揪團：一行小小的消息，不擋住籤卡 */}
          {p.crew && (
            <div className="oracle__crew" aria-live="polite">
              {p.crew}
            </div>
          )}
        </div>
      </div>
      <ShareSheet
        blob={preview}
        fileName={fileName}
        text={`${shareText}\n${location.origin}`}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
