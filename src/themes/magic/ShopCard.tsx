'use client';

import { useEffect, type CSSProperties } from 'react';
import { dissolve, twinkle } from '@/lib/sound';
import { categoryOf, walkOf, type CategoryId } from '@/lib/types';
import type { ShopCardProps } from '../types';
import { LoveStamp } from './LoveStamp';
import { PriceMark } from './PriceMark';
import { copy } from './copy';
import './ShopCard.css';

/**
 * 書皮只用三種深色，配燙金：
 * 夜幕藍＝飯、麵、便當（正餐），古林綠＝小吃、輕食、早午餐，星雲紫＝異國與其他。
 */
const NIGHT = '#2b3b78';
const FOREST = '#1f5d57';
const NEBULA = '#56408c';
const COVER: Record<CategoryId, string> = {
  rice: NIGHT,
  noodle: NIGHT,
  bento: NIGHT,
  snack: FOREST,
  light: FOREST,
  brunch: FOREST,
  world: NEBULA,
  other: NEBULA,
};

/**
 * 書名怎麼分行。店名多半是「地名或品牌＋吃的」（巷口＋牛肉麵），
 * 所以五、六個字時讓第二行一樣長或比較長：巷口／牛肉麵、綠盒子／健康餐。
 * 有空白就從最靠近中間的空白斷開；有英數字或太長的，交給瀏覽器自己斷行。
 */
function titleLines(name: string): { lines: string[]; per: number } {
  const chars = [...name];
  const n = chars.length;
  if (n <= 4) return { lines: [name], per: n };
  const spaces = [...name.matchAll(/\s+/g)].map((m) => m.index ?? 0);
  if (spaces.length) {
    const mid = name.length / 2;
    const at = spaces.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
    const lines = [name.slice(0, at).trim(), name.slice(at).trim()];
    return { lines, per: Math.max(...lines.map((l) => [...l].length)) };
  }
  if (/[A-Za-z0-9]/.test(name) || n > 10) return { lines: [name], per: Math.min(5, Math.ceil(n / 2)) };
  const k = Math.floor(n / 2);
  return { lines: [chars.slice(0, k).join(''), chars.slice(k).join('')], per: n - k };
}

/** 化成星塵時，從消失的那條光線上飄起來的星屑：[x%, 第幾顆（0～1，越後面越靠上）] */
const MOTES = [
  [22, 0],
  [70, 0.08],
  [45, 0.17],
  [84, 0.25],
  [30, 0.33],
  [62, 0.42],
  [18, 0.5],
  [52, 0.58],
  [78, 0.67],
  [36, 0.75],
  [66, 0.83],
  [48, 0.92],
  [26, 1],
];

/**
 * 一本魔法書：封面朝外立在書架上，燙金框、金屬護角、類型徽章、價位金幣；被貶為麻瓜的書會褪色。
 * 收起來時：書發出紫光浮起來、腳下轉出一圈法陣，書從下往上化成星塵（一道光掃過去），最後一團紫煙散掉。
 */
export function ShopCard({ r, liked, blocked, likes, mine = false, big = false, state, onOpen }: ShopCardProps) {
  const cat = categoryOf(r.category);
  const title = titleLines(r.name);
  const gone = state === 'removing' || state === 'gone';

  useEffect(() => {
    if (state !== 'removing') return;
    twinkle(4);
    const later = [setTimeout(() => dissolve(1), 400), setTimeout(() => twinkle(-7), 1080)];
    return () => later.forEach(clearTimeout);
  }, [state]);
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      type={onOpen ? 'button' : undefined}
      className={`book${big ? ' book--big' : ''}${blocked ? ' is-blocked' : ''}${state ? ` is-${state}` : ''}`}
      onClick={onOpen}
      style={{ '--cover': COVER[r.category], '--per': title.per } as CSSProperties}
      aria-label={
        onOpen
          ? `${r.name}，${cat.label}${mine ? '，你放的' : ''}${liked ? '，你的愛店' : ''}${blocked ? '，你不吃' : ''}`
          : undefined
      }
    >
      <span className="book__cover">
        <span className="book__emblem" aria-hidden="true">
          {cat.seal}
        </span>
        <span className="book__title" aria-hidden="true">
          {title.lines.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </span>
        <span className="book__meta" aria-hidden="true">
          <PriceMark n={r.price} size={big ? 14 : 12} />
          <span>{walkOf(r.walk).label.replace(' ', '')}</span>
        </span>
      </span>
      {/* 自己放的魔法書：書頁間夾著一條紅色書籤緞帶，垂過書架 */}
      {mine && <span className="book__ribbon" aria-hidden="true" />}
      {likes > 0 && (
        <span className="book__likes" aria-hidden="true">
          ♥ {likes}
        </span>
      )}
      {liked && (
        <span className="book__love" data-part="love">
          <LoveStamp size={big ? 52 : 40} seed={r.id} />
        </span>
      )}
      {/* 封印：兩條紫色緞帶在書的上方交叉、正中一顆火漆；只壓到類型徽章，不擋書名 */}
      {blocked && (
        <span className="book__ban" data-part="ban" aria-hidden="true">
          <span className="ban__strip ban__strip--a">封印</span>
          <span className="ban__strip ban__strip--b">{copy.shops.banned}</span>
          <span className="ban__stamp">{copy.blockSeal}</span>
        </span>
      )}
      {gone && (
        <span className="book__fx" aria-hidden="true">
          <span className="book__ring" />
          <span className="book__edge" />
          <span className="book__puff" />
          {MOTES.map(([x, d], i) => (
            <i key={i} style={{ '--x': `${x}%`, '--d': d } as CSSProperties} />
          ))}
        </span>
      )}
    </Tag>
  );
}
