'use client';

import { useEffect, type CSSProperties } from 'react';
import { Seal } from '@/components/Seal';
import { buzz, clack, paper, ping, thud } from '@/lib/sound';
import { categoryOf, walkOf } from '@/lib/types';
import type { ShopCardProps } from '../types';
import { Glyph } from './Glyph';
import { LoveStamp } from './LoveStamp';
import { PriceMark } from './PriceMark';
import { copy } from './copy';
import './ShopCard.css';

/** 落地時噴出去的木屑：[x, y, 轉幾度] */
const CHIPS = [
  [-38, -34, -80],
  [30, -44, 60],
  [-16, -58, 140],
  [44, -18, -30],
  [-50, -10, 40],
  [12, -52, -120],
  [58, -36, 90],
];

/**
 * 一塊菜牌：直書店名、類型印章、價位銅板、愛店章或封條。
 * 拆下來時：菜牌晃一晃、左邊的繩子先斷、吊在右邊晃兩下，釘子彈飛，整塊掉下去裂開、揚起木屑。
 */
export function ShopCard({ r, liked, blocked, likes, mine = false, big = false, state, onOpen }: ShopCardProps) {
  const cat = categoryOf(r.category);
  const gone = state === 'removing' || state === 'gone';

  // 聲音跟著動畫走：吱一聲、繩子斷、釘子彈飛、落地
  useEffect(() => {
    if (state !== 'removing') return;
    paper(0.15);
    const later = [
      setTimeout(clack, 330),
      setTimeout(ping, 860),
      setTimeout(() => {
        thud();
        buzz(18);
      }, 1070),
    ];
    return () => later.forEach(clearTimeout);
  }, [state]);
  const chars = [...r.name];
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      type={onOpen ? 'button' : undefined}
      className={`plaque${big ? ' plaque--big' : ''}${blocked ? ' is-blocked' : ''}${state ? ` is-${state}` : ''}`}
      onClick={onOpen}
      aria-label={
        onOpen
          ? `${r.name}，${cat.label}${mine ? '，你掛的' : ''}${liked ? '，你的愛店' : ''}${blocked ? '，你不吃' : ''}`
          : undefined
      }
    >
      <svg className="plaque__hook" viewBox="0 0 60 22" aria-hidden="true">
        <path className="hook__l" d="M10 22 L30 5" fill="none" stroke="#26211d" strokeWidth="1.5" />
        <path className="hook__r" d="M30 5 L50 22" fill="none" stroke="#26211d" strokeWidth="1.5" />
        <circle
          className="hook__nail"
          cx="30"
          cy="5"
          r="3.4"
          fill="var(--marigold)"
          stroke="#26211d"
          strokeWidth="1.4"
        />
      </svg>
      <span className="plaque__board">
        <Seal text={cat.seal} size={big ? 34 : 26} className="plaque__seal" />
        <span className="plaque__name" style={{ ['--n' as string]: chars.length }} aria-hidden="true">
          {r.name}
        </span>
        <span className="plaque__meta" aria-hidden="true">
          <PriceMark n={r.price} size={big ? 14 : 12} />
          <span>{walkOf(r.walk).label.replace(' ', '')}</span>
        </span>
        {likes > 0 && (
          <span className="plaque__likes" aria-hidden="true">
            ♥ {likes}
          </span>
        )}
        {liked && (
          <span className="plaque__love" data-part="love">
            <LoveStamp size={big ? 50 : 38} />
          </span>
        )}
        {/* 查封：兩條封條在菜牌上方交叉、正中蓋一顆朱紅官印；只壓到類型小章，不擋店名 */}
        {blocked && (
          <span className="plaque__ban" data-part="ban" aria-hidden="true">
            <span className="ban__strip ban__strip--a">查封</span>
            <span className="ban__strip ban__strip--b">{copy.shops.banned}</span>
            <span className="ban__stamp">{copy.blockSeal}</span>
          </span>
        )}
        {/* 自己掛的菜牌：底下垂一條紅流蘇 */}
        {mine && (
          <span className="plaque__tassel" aria-hidden="true">
            <Glyph name="mine" size={big ? 26 : 22} />
          </span>
        )}
        {gone && (
          <>
            <svg className="plaque__crack" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="22,0 36,20 27,37 47,56 38,73 56,100" pathLength={1} />
            </svg>
            {/* 掉到地上那一角揚起的木屑與灰塵 */}
            <span className="plaque__fx" aria-hidden="true">
              <span className="plaque__dust" />
              {CHIPS.map(([x, y, rot], i) => (
                <i key={i} style={{ '--x': `${x}px`, '--y': `${y}px`, '--r': `${rot}deg` } as CSSProperties} />
              ))}
            </span>
          </>
        )}
      </span>
    </Tag>
  );
}
