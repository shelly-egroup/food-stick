'use client';

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { Loading } from '@/components/Loading';
import { NoteCard } from '@/components/NoteCard';
import { useAppData } from '@/lib/appData';
import { useTheme, type PodiumEntry } from '@/themes';
import { useLatestNotes } from '@/lib/store';
import { reducedMotion } from '@/lib/motion';
import { MONTHS, ago } from '@/lib/format';
import { categoryOf, type Member } from '@/lib/types';
import './Ranks.css';

type Sort = 'likes' | 'draws';

/** 每張紙條歪一點點：只轉紙，不轉字，字才清楚 */
const TILTS = [-1.2, 0.8, -0.4, 1, -0.8, 0.5];

export function Ranks() {
  const { members, restaurants, restaurantMap, memberMap, draws, ready } = useAppData();
  const { theme } = useTheme();
  const { copy, Podium, Badge } = theme;
  const notes = useLatestNotes(true);
  const [sort, setSort] = useState<Sort>('likes');
  const list = useRef<HTMLOListElement>(null);

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, []);

  const rows = useMemo(() => {
    const likes = new Map<string, number>();
    members.forEach((m) => m.likes.forEach((id) => likes.set(id, (likes.get(id) ?? 0) + 1)));
    const picked = new Map<string, number>();
    draws
      .filter((d) => !d.rerolled && (d.createdAt?.getTime() ?? 0) >= monthStart)
      .forEach((d) => picked.set(d.rid, (picked.get(d.rid) ?? 0) + 1));
    return restaurants
      .map((r) => ({ r, likes: likes.get(r.id) ?? 0, picked: picked.get(r.id) ?? 0 }))
      .sort((a, b) =>
        sort === 'likes' ? b.likes - a.likes || b.picked - a.picked : b.picked - a.picked || b.likes - a.likes,
      );
  }, [members, restaurants, draws, monthStart, sort]);

  const valueOf = (x: (typeof rows)[number]) => (sort === 'likes' ? x.likes : x.picked);
  const top: PodiumEntry[] = rows.slice(0, 3).map((x) => ({ r: x.r, value: valueOf(x) }));
  const rest = rows.slice(3, 10);
  const maxVal = Math.max(1, ...rows.map(valueOf));
  const cold = rows.filter((x) => x.picked === 0).slice(-3);

  const titles = useMemo(() => {
    const by = <T,>(list: T[], score: (t: T) => number) =>
      list.reduce<T | null>((best, t) => (best === null || score(t) > score(best) ? t : best), null);
    const t = copy.ranks.titles;
    const picky = by(members, (m) => m.blocks.length);
    const collector = by(members, (m) => m.likes.length);
    const adds = new Map<string, number>();
    restaurants.forEach((r) => adds.set(r.createdBy, (adds.get(r.createdBy) ?? 0) + 1));
    const pioneerId = [...adds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const pioneer = pioneerId ? memberMap.get(pioneerId) : undefined;
    return [
      picky && picky.blocks.length > 0 && { key: 'picky', ...t.picky, m: picky, d: t.picky.desc(picky.blocks.length) },
      pioneer && { key: 'pioneer', ...t.pioneer, m: pioneer, d: t.pioneer.desc(adds.get(pioneer.id) ?? 0) },
      collector &&
        collector.likes.length > 0 && {
          key: 'collector',
          ...t.collector,
          m: collector,
          d: t.collector.desc(collector.likes.length),
        },
    ].filter(Boolean) as { key: string; name: string; mark: string; rule: string; m: Member; d: string }[];
  }, [members, restaurants, memberMap, copy]);

  // 前三名揭曉之後，其他名次一列一列滑進來
  useLayoutEffect(() => {
    const el = list.current;
    if (!el || reducedMotion()) return;
    const tween = gsap.fromTo(
      el.children,
      { opacity: 0, x: -12 },
      { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, delay: 1.7, clearProps: 'all' },
    );
    return () => void tween.kill();
  }, [sort, rest.length]);

  const month = MONTHS[new Date().getMonth()];
  const latest = notes.data?.filter((n) => restaurantMap.has(n.rid)).slice(0, 6);

  return (
    <div className="ranks">
      <header className="ranks__head">
        <div>
          <p className="eyebrow">{copy.ranks.eyebrow}</p>
          <h1 className="ranks__title">{copy.ranks.title}</h1>
          <p className="ranks__sub">
            <b>
              {month}
              {copy.ranks.announce}
            </b>
            <span aria-hidden="true">・</span>
            {sort === 'likes' ? '依大家的愛店數排名' : `依本月${copy.verb}定案的次數排名`}
          </p>
        </div>
        <div className="seg" role="radiogroup" aria-label="排名方式">
          <button type="button" role="radio" aria-checked={sort === 'likes'} onClick={() => setSort('likes')}>
            人氣
          </button>
          <button type="button" role="radio" aria-checked={sort === 'draws'} onClick={() => setSort('draws')}>
            命定
          </button>
        </div>
      </header>

      {!ready ? (
        <Loading size={56} label="排行讀取中" className="ranks__loading" />
      ) : rows.length === 0 ? (
        <div className="ranks__empty">
          <theme.Vignette kind="ranks-empty" />
          <Link href="/shops/" className="btn btn--zhu">
            {copy.ranks.emptyCta}
          </Link>
        </div>
      ) : (
        <>
          <Podium top={top} unit={sort === 'likes' ? '人愛' : '次命定'} revealKey={sort} />

          {rest.length > 0 && (
            <ol className="ranklist" start={4} ref={list}>
              {rest.map((x, k) => (
                <li key={x.r.id}>
                  <span className="ranklist__no">{copy.ranks.no(k + 4)}</span>
                  <span className="ranklist__name">{x.r.name}</span>
                  <span className="ranklist__cat">{categoryOf(x.r.category).label}</span>
                  <span className="ranklist__bar" aria-hidden="true">
                    <i style={{ width: `${(valueOf(x) / maxVal) * 100}%` }} />
                  </span>
                  <span className="ranklist__val">{valueOf(x)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <div className="ranks__more">
        {titles.length > 0 && (
          <section className="titles" aria-label="本月稱號">
            <h2>本月稱號</h2>
            {/* 廟宇是掛在木桿上的三面錦旗，魔法是三張塔羅牌；每一張都寫明是怎麼選出來的 */}
            <ul className="honors">
              {titles.map((t, i) => (
                <li key={t.key} className="honor" style={{ '--i': i } as CSSProperties}>
                  <span className="honor__silk">
                    <span className="honor__rule">{t.rule}</span>
                    <span className="honor__mark">
                      <Badge text={t.mark} size={38} />
                    </span>
                    <b className="honor__name">{t.name}</b>
                    <span className="honor__who">
                      <Avatar member={t.m} size={30} />
                      <span>{t.m.name}</span>
                    </span>
                    <span className="honor__stat">{t.d}</span>
                  </span>
                  <span className="honor__fringe" aria-hidden="true" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {cold.length > 0 && (
          <section className="cold" aria-label={copy.ranks.cold}>
            <h2>{copy.ranks.cold}</h2>
            <p>這個月還沒被{copy.picked}過：</p>
            <ul>
              {cold.map((x) => (
                <li key={x.r.id}>{x.r.name}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="latest" aria-label="最新紙條">
          <h2>最新紙條</h2>
          {latest === undefined && !notes.error ? (
            <Loading size={40} label="紙條讀取中" />
          ) : !latest?.length ? (
            <theme.Vignette kind={notes.error ? 'notes-error' : 'notes-empty'} />
          ) : (
            // 廟宇是廟口的繪馬掛架（屋簷、兩根柱子、一排排橫木），魔法是一面星空留言板
            <div className="rack">
              <span className="rack__top" aria-hidden="true" />
              <ul>
                {latest.map((n, i) => (
                  <NoteCard
                    key={n.id}
                    text={n.text}
                    author={memberMap.get(n.uid) ?? { id: n.uid, name: '同事', photoURL: '' }}
                    when={ago(n.createdAt)}
                    shop={restaurantMap.get(n.rid)?.name}
                    tilt={TILTS[i]}
                  />
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
