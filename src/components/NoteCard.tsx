'use client';

import { useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import { useTheme } from '@/themes';
import { paper } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
import type { Member } from '@/lib/types';
import { Avatar } from './Avatar';
import './NoteCard.css';

/** 等 CSS 動畫播完（保險起見最多等 ms） */
const afterAnimation = (el: Element, ms: number) =>
  new Promise<void>((resolve) => {
    const done = () => resolve();
    el.addEventListener('animationend', done, { once: true });
    setTimeout(done, ms);
  });

/**
 * 一張紙條。廟宇是掛著紅繩的繪馬（五角形的祈福木牌）；魔法是捲起一角、封著火漆的羊皮紙。
 * 下面是作者的頭像、名字與時間。自己的紙條可以「取下」（魔法：「抹去」）：
 * 先問一次（木牌會晃、羊皮紙會發亮），確定了才播離開的動畫（木牌從繩子上掉下去、羊皮紙化成光），
 * 播完、收合之後才真的刪掉；刪不掉就把紙條放回原位。
 * 歪的是後面那塊木牌（羊皮紙），字本身不轉，才清楚。
 */
export function NoteCard({
  text,
  author,
  when,
  shop,
  tilt = 0,
  onDelete,
  onOpen,
}: {
  text: string;
  author: Pick<Member, 'id' | 'name' | 'photoURL'>;
  when: string;
  /** 排行榜上的最新紙條要寫是哪一家 */
  shop?: string;
  tilt?: number;
  /** 有給才能拿掉；失敗要 reject，紙條會放回原位 */
  onDelete?: () => Promise<void>;
  onOpen?: () => void;
}) {
  const { copy } = useTheme().theme;
  const root = useRef<HTMLLIElement>(null);
  const [asking, setAsking] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const remove = async () => {
    const el = root.current;
    if (!el || !onDelete || leaving) return;
    setLeaving(true);
    paper(0.3);
    if (!reducedMotion()) {
      await afterAnimation(el, 900);
      // 收合，下面的紙條往上補
      await gsap.to(el, {
        height: 0,
        paddingTop: 0,
        paddingBottom: 0,
        marginTop: 0,
        duration: 0.26,
        ease: 'power2.in',
      });
    }
    try {
      await onDelete();
    } catch {
      // 沒刪成功：放回原位
      gsap.set(el, { clearProps: 'height,paddingTop,paddingBottom,marginTop' });
      setLeaving(false);
      setAsking(false);
    }
  };

  return (
    <li
      ref={root}
      className={`note${asking ? ' is-asking' : ''}${leaving ? ' is-leaving' : ''}${onOpen ? ' is-link' : ''}`}
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
      onClick={onOpen}
    >
      <span className="note__paper" aria-hidden="true" />
      <span className="note__hang" aria-hidden="true" />
      {shop &&
        (onOpen ? (
          <button
            type="button"
            className="note__shop note__shop--link"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            {shop}
            <i aria-hidden="true">›</i>
          </button>
        ) : (
          <b className="note__shop">{shop}</b>
        ))}
      <p className="note__text">{text}</p>
      <footer className="note__foot">
        <span className="note__face">
          <Avatar member={author} size={26} />
        </span>
        {asking ? (
          <span className="note__ask" role="group" aria-label={copy.notes.removeAsk}>
            <span className="note__q">{copy.notes.removeAsk}</span>
            <button type="button" className="note__yes" onClick={remove} aria-disabled={leaving}>
              {copy.notes.remove}
            </button>
            <button type="button" className="note__no" onClick={() => setAsking(false)}>
              {copy.notes.keep}
            </button>
          </span>
        ) : (
          <>
            <span className="note__by">
              <b>{author.name}</b>
              <time>{when}</time>
            </span>
            {onDelete && (
              <button
                type="button"
                className="note__del"
                onClick={() => setAsking(true)}
                aria-label={`${copy.notes.remove}這張紙條`}
              >
                {copy.notes.remove}
              </button>
            )}
          </>
        )}
      </footer>
    </li>
  );
}
