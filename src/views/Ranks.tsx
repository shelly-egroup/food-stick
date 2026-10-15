'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { Loading } from '@/components/Loading';
import { NoteCard } from '@/components/NoteCard';
import { Pager } from '@/components/Pager';
import { ColdBackdrop, Particles, ShelfBoard } from '@/components/ShelfScene';
import { DustStudy } from '@/components/DustStudy';
import { useToast } from '@/components/Toast';
import { useAppData } from '@/lib/appData';
import { useTheme, type PodiumEntry } from '@/themes';
import { deleteRestaurant, useLatestNotes } from '@/lib/store';
import { reducedMotion } from '@/lib/motion';
import { flip, paper, sparkle, stamp, twinkle } from '@/lib/sound';
import { MONTHS, ago } from '@/lib/format';
import { categoryOf, type Member, type Restaurant } from '@/lib/types';
import { ShopSheet } from './ShopSheet';
import { ShopForm } from './ShopForm';
import './Ranks.css';

type Sort = 'likes' | 'draws';

/** 每張紙條歪一點點：只轉紙，不轉字，字才清楚 */
const TILTS = [-1.2, 0.8, -0.4, 1, -0.8, 0.5];
const SHELF = { temple: 5, magic: 4 } as const;
const NOTES = 3;
const NOTES_MIN = 2;
const NOTES_MAX = 6;

const posterFont = (name: string) => Math.min(15, Math.floor(92 / Math.max(1, [...name].length)));
const posterBoard = (name: string) =>
  Math.min(144, Math.max(100, Math.ceil([...name].length * posterFont(name) * 1.1) + 44));

function usePageMotion(page: number, run: (el: HTMLElement, dir: number) => gsap.core.Tween | void) {
  const ref = useRef<HTMLUListElement>(null);
  const last = useRef(page);
  useLayoutEffect(() => {
    const el = ref.current;
    const dir = page === last.current ? 0 : page > last.current ? 1 : -1;
    last.current = page;
    if (!el || dir === 0 || reducedMotion()) return;
    const t = run(el, dir);
    return () => void t?.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
  return ref;
}

export function Ranks() {
  const { members, restaurants, restaurantMap, memberMap, draws, ready } = useAppData();
  const { theme } = useTheme();
  const { copy, Podium, Badge } = theme;
  const notes = useLatestNotes(true);
  const toast = useToast();
  const [sort, setSort] = useState<Sort>('likes');
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [coldPage, setColdPage] = useState(0);
  const [notesPage, setNotesPage] = useState(0);
  const [notesPer, setNotesPer] = useState(NOTES);
  const moreRef = useRef<HTMLDivElement>(null);
  const openShop = (r: Restaurant) => setOpenId(r.id);
  const shiver = (h: HTMLElement) => {
    if (reducedMotion() || h.classList.contains('is-shiver')) return;
    h.classList.add('is-shiver');
    paper(0.4);
    const r = h.getBoundingClientRect();
    h.dispatchEvent(
      new CustomEvent('shelfburst', {
        bubbles: true,
        detail: { x: r.right + 30, y: r.top + r.height / 2, n: 30, gust: 2.4 },
      }),
    );
    window.setTimeout(() => h.classList.remove('is-shiver'), 900);
  };
  const honorsRef = useRef<HTMLUListElement>(null);
  const pokeHonor = (card: HTMLButtonElement) => {
    if (theme.id === 'magic') {
      const open = card.classList.toggle('is-open');
      if (open) sparkle();
      else flip();
      return;
    }
    if (reducedMotion()) return;
    paper(0.2);
    gsap.fromTo(
      card,
      { rotate: 0 },
      { keyframes: { rotate: [7, -5, 3.2, -1.6, 0.6, 0] }, duration: 1.8, ease: 'sine.out', transformOrigin: '50% 0%' },
    );
  };

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
  const rest: PodiumEntry[] = rows.slice(3, 10).map((x) => ({ r: x.r, value: valueOf(x) }));
  const cold = rows.filter((x) => x.picked === 0).reverse();
  const per = SHELF[theme.id];
  const coldPages = Math.ceil(cold.length / per);
  const coldAt = Math.min(coldPage, Math.max(0, coldPages - 1));
  const shelf = cold.slice(coldAt * per, coldAt * per + per);
  const shelfRef = usePageMotion(coldAt, (el, dir) =>
    gsap.fromTo(
      el.children,
      { opacity: 0, x: 46 * dir, y: -18, rotate: 9 * dir },
      {
        opacity: 1,
        x: 0,
        y: 0,
        rotate: 0,
        duration: 0.5,
        stagger: 0.05 * dir,
        ease: 'back.out(1.7)',
        clearProps: 'all',
      },
    ),
  );

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

  useEffect(() => {
    const ul = honorsRef.current;
    if (!ul) return;
    const cards = [...ul.querySelectorAll<HTMLButtonElement>('.honor__card')];
    if (reducedMotion()) {
      ul.classList.add('is-in');
      cards.forEach((c) => c.classList.add('is-open'));
      return;
    }
    const timers: number[] = [];
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        ul.classList.add('is-in');
        if (theme.id === 'magic')
          cards.forEach((c, i) =>
            timers.push(
              window.setTimeout(
                () => {
                  c.classList.add('is-open');
                  twinkle(i * 4);
                },
                500 + i * 380,
              ),
            ),
          );
        else timers.push(window.setTimeout(() => stamp(), 900));
      },
      { threshold: 0.4 },
    );
    io.observe(ul);
    return () => {
      io.disconnect();
      timers.forEach((t) => clearTimeout(t));
      ul.classList.remove('is-in');
      cards.forEach((c) => c.classList.remove('is-open'));
    };
  }, [theme.id, titles.length]);

  const month = MONTHS[new Date().getMonth()];
  const latest = notes.data?.filter((n) => restaurantMap.has(n.rid));
  const per2 = notesPer;
  const notePages = Math.ceil((latest?.length ?? 0) / per2);
  const notesAt = Math.min(notesPage, Math.max(0, notePages - 1));
  const notesShown = latest?.slice(notesAt * per2, notesAt * per2 + per2);
  const notesRef = usePageMotion(notesAt, (el, dir) =>
    theme.id === 'magic'
      ? undefined
      : gsap.fromTo(
          el.children,
          { opacity: 0, rotate: -14 * dir, y: -22, transformOrigin: '50% 0%' },
          {
            opacity: 1,
            rotate: 0,
            y: 0,
            duration: 0.7,
            stagger: 0.07,
            ease: 'elastic.out(1, 0.55)',
            clearProps: 'all',
          },
        ),
  );
  useEffect(() => {
    const more = moreRef.current;
    if (!more) return;
    const wide = matchMedia('(min-width: 900px)');
    const fit = () => {
      if (!wide.matches) return setNotesPer(NOTES);
      const latestEl = more.querySelector<HTMLElement>('.latest');
      const notes = [...more.querySelectorAll<HTMLElement>('.latest .note')];
      const left = [...more.children].filter((c) => c !== latestEl) as HTMLElement[];
      if (!latestEl || !notes.length || !left.length) return;
      const top = more.getBoundingClientRect().top;
      const leftH = Math.max(...left.map((c) => c.getBoundingClientRect().bottom)) - top;
      const list = notes[0].parentElement!;
      const gap = parseFloat(getComputedStyle(list).rowGap) || 14;
      const each = notes.reduce((h, n) => h + n.offsetHeight, 0) / notes.length + gap;
      const chrome = latestEl.offsetHeight - list.offsetHeight + gap;
      const n = Math.max(NOTES_MIN, Math.min(NOTES_MAX, Math.floor((leftH - chrome) / each)));
      setNotesPer((p) => (p === n ? p : n));
    };
    const ro = new ResizeObserver(() => fit());
    [...more.children].forEach((c) => ro.observe(c));
    wide.addEventListener('change', fit);
    fit();
    return () => {
      ro.disconnect();
      wide.removeEventListener('change', fit);
    };
  }, [theme.id, latest?.length]);
  const notesSeen = useRef(false);
  useEffect(() => {
    const ul = notesRef.current;
    if (!ul || theme.id !== 'magic') return;
    const cards = [...ul.querySelectorAll<HTMLLIElement>('.note')];
    if (reducedMotion()) {
      cards.forEach((c) => c.classList.add('is-open'));
      return;
    }
    const timers: number[] = [];
    const deal = () =>
      cards.forEach((c, i) =>
        timers.push(
          window.setTimeout(
            () => {
              c.classList.add('is-open');
              if (i % 2 === 0) flip();
            },
            260 + i * 220,
          ),
        ),
      );
    if (notesSeen.current) {
      deal();
      return () => timers.forEach((t) => clearTimeout(t));
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        notesSeen.current = true;
        deal();
      },
      { threshold: 0.3 },
    );
    io.observe(ul);
    return () => {
      io.disconnect();
      timers.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.id, notesAt, notesShown?.length]);
  const hasShelf = shelf.length > 0;
  useEffect(() => {
    const el = shelfRef.current;
    if (!el || !hasShelf || reducedMotion()) return;
    const items = [...el.children];
    gsap.set(items, { opacity: 0 });
    let tween: gsap.core.Tween | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        tween =
          theme.id === 'magic'
            ? gsap.fromTo(
                items,
                { opacity: 0, x: 60, rotate: 6 },
                { opacity: 1, x: 0, rotate: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out', clearProps: 'all' },
              )
            : gsap.fromTo(
                items,
                { opacity: 0, y: 26 },
                { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', clearProps: 'all' },
              );
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      tween?.kill();
      gsap.set(items, { clearProps: 'opacity' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShelf, theme.id]);
  const open = openId ? (restaurantMap.get(openId) ?? null) : null;
  const editing = editId ? (restaurantMap.get(editId) ?? null) : null;

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
          <Podium
            top={top}
            rest={rest}
            unit={sort === 'likes' ? '人愛' : '次命定'}
            revealKey={sort}
            onOpen={openShop}
          />
        </>
      )}

      <div className="ranks__more" ref={moreRef}>
        {ready && (
          <section className="titles" aria-label="本月稱號">
            <h2>本月稱號</h2>
            {titles.length === 0 && <theme.Vignette kind="titles-empty" />}
            {/* 廟宇是掛在木桿上的三面錦旗，魔法是三張塔羅牌；每一張都寫明是怎麼選出來的 */}
            {titles.length > 0 && (
              <ul ref={honorsRef} className="honors">
                {titles.map((t, i) => (
                  <li key={t.key} className="honor" style={{ '--i': i } as CSSProperties}>
                    <button
                      type="button"
                      className="honor__card"
                      onClick={(e) => pokeHonor(e.currentTarget)}
                      aria-label={`${t.name}：${t.m.name}，${t.d}`}
                    >
                      <span className="honor__back" aria-hidden="true">
                        <i />
                      </span>
                      <span className="honor__silk">
                        <span className="honor__rule">{t.rule}</span>
                        <span className="honor__mark">
                          <Badge text={t.mark} size={40} />
                        </span>
                        <b className="honor__name">{t.name}</b>
                        <span className="honor__who">
                          <Avatar member={t.m} size={34} />
                          <span>{t.m.name}</span>
                        </span>
                        <span className="honor__stat">{t.d}</span>
                      </span>
                      <svg className="honor__tail" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M0 0 H100 V26 L50 8 L0 26 Z" />
                        <path
                          className="honor__tail-line"
                          d="M5 0 V18 L50 3 L95 18 V0"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {cold.length > 0 &&
          (theme.id === 'magic' ? (
            <section className="cold cold--study" aria-label={copy.ranks.cold}>
              <DustStudy
                books={shelf.map((x) => ({ id: x.r.id, name: x.r.name, cat: categoryOf(x.r.category).label }))}
                title={copy.ranks.cold}
                phrase={copy.ranks.coldPhrase(cold.length)}
                page={coldAt}
                onOpen={(id) => setOpenId(id)}
              />
              <div className="poster__foot">
                <Pager
                  page={coldAt}
                  pages={coldPages}
                  onPage={setColdPage}
                  prev={copy.ranks.pager.shelfPrev}
                  next={copy.ranks.pager.shelfNext}
                  label={copy.ranks.cold}
                />
              </div>
            </section>
          ) : (
            <section className="cold cold--poster" aria-label={copy.ranks.cold}>
              <Particles mode="fleck" />
              <p className="poster__archive">{copy.ranks.archive(cold.length)}</p>
              <header className="poster__head">
                <div className="poster__title">
                  <h2 onClick={(e) => shiver(e.currentTarget)}>
                    {[...copy.ranks.cold].map((ch, i) => (
                      <span key={i}>{ch}</span>
                    ))}
                  </h2>
                  <p>{copy.ranks.coldPhrase(cold.length)}</p>
                </div>
              </header>
              <div className="shelf">
                <ColdBackdrop />
                <ul className="shelf__row" ref={shelfRef}>
                  {shelf.map((x, i) => (
                    <li key={x.r.id}>
                      <ShelfBoard
                        theme={theme.id}
                        name={x.r.name}
                        cat={categoryOf(x.r.category).label}
                        height={posterBoard(x.r.name)}
                        fontSize={posterFont(x.r.name)}
                        index={i}
                        onOpen={() => openShop(x.r)}
                      />
                    </li>
                  ))}
                </ul>
                <span className="shelf__plank" aria-hidden="true" />
              </div>
              <div className="poster__foot">
                <Pager
                  page={coldAt}
                  pages={coldPages}
                  onPage={setColdPage}
                  prev={copy.ranks.pager.shelfPrev}
                  next={copy.ranks.pager.shelfNext}
                  label={copy.ranks.cold}
                />
              </div>
            </section>
          ))}

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
              <ul
                ref={notesRef}
                onClickCapture={(e) => {
                  const card = (e.target as HTMLElement).closest('.note');
                  if (theme.id === 'magic' && card && !card.classList.contains('is-open')) {
                    e.stopPropagation();
                    card.classList.add('is-open');
                    flip();
                  }
                }}
              >
                {notesShown?.map((n, i) => (
                  <NoteCard
                    key={n.id}
                    text={n.text}
                    author={memberMap.get(n.uid) ?? { id: n.uid, name: '同事', photoURL: '' }}
                    when={ago(n.createdAt)}
                    shop={restaurantMap.get(n.rid)?.name}
                    tilt={TILTS[i]}
                    onOpen={() => {
                      const r = restaurantMap.get(n.rid);
                      if (r) openShop(r);
                    }}
                  />
                ))}
              </ul>
            </div>
          )}
          <Pager
            page={notesAt}
            pages={notePages}
            onPage={setNotesPage}
            prev={copy.ranks.pager.notesPrev}
            next={copy.ranks.pager.notesNext}
            label="最新紙條"
          />
        </section>
      </div>

      <ShopSheet
        restaurant={open}
        onClose={() => setOpenId(null)}
        onEdit={() => {
          setEditId(openId);
          setOpenId(null);
        }}
        onRemove={(id) => {
          setOpenId(null);
          deleteRestaurant(id).catch(() => toast(copy.shops.removeFailed, '咦'));
        }}
      />
      <ShopForm open={!!editing} editing={editing} onClose={() => setEditId(null)} onSaved={() => setEditId(null)} />
    </div>
  );
}
