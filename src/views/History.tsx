'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { LineIcon } from '@/components/CategoryIcon';
import { Loading } from '@/components/Loading';
import { Seal } from '@/components/Seal';
import { Tag, Tags } from '@/components/Tags';
import { MapLink } from '@/components/MapLink';
import { useAppData } from '@/lib/appData';
import { candidatesOf, chosenOf, isLive, latestOf, modeOf, skipOf, slotIcon, taipeiDate, type Meal } from '@/lib/meal';
import { reducedMotion } from '@/lib/motion';
import { paper, twinkle } from '@/lib/sound';
import { useMealHistory } from '@/lib/store';
import { useNow } from '@/lib/useBrowser';
import { readingOf } from '@/lib/verse';
import { categoryOf, type Member } from '@/lib/types';
import { useTheme } from '@/themes';
import type { HistoryTab } from '@/themes/types';
import './History.css';

type Result = 'decided' | 'none' | 'cancelled' | 'live';

const resultOf = (m: Meal, now: number): Result =>
  m.status === 'cancelled' ? 'cancelled' : m.decision ? 'decided' : isLive(m, now) ? 'live' : 'none';

const TABS: HistoryTab[] = ['all', 'inbox', 'sent', 'solo'];
/** 這一餐是哪一類：別人揪我的、我揪大家的、我一個人的 */
const kindOf = (m: Meal, me: string): Exclude<HistoryTab, 'all'> =>
  m.host !== me ? 'inbox' : m.party.length > 1 ? 'sent' : 'solo';

/** YYYY-MM-DD → 那一天（只拿來顯示） */
const dayOf = (d: string) => {
  const [y, m, n] = d.split('-').map(Number);
  return new Date(y, (m || 1) - 1, n || 1);
};

/**
 * 歷史：廟宇是食籤簿（朱紅封面、白色題簽、朱絲欄的紙頁），魔法是冒險日誌（皮面、燙金、星圖紙）。
 * 依日期一頁一頁往下：每一天頁首蓋一顆日期章，底下是那天的每一餐——
 * 哪一餐、起駕的店、籤詩、跟誰去、誰起駕的、求過哪些籤（哪家去不了）。
 * 捲到哪一頁，那一頁的章才蓋下去、字才一行一行寫出來。
 */
export function History() {
  const { me, meals, memberMap } = useAppData();
  const { theme } = useTheme();
  const { copy } = theme;
  const now = useNow();
  const hist = useMealHistory(me.id, 12);

  // 這個月的即時資料（最新）＋往前翻的頁，同一張以即時的為準
  const list = useMemo(() => {
    const byId = new Map<string, Meal>();
    (hist.meals ?? []).forEach((m) => byId.set(m.id, m));
    meals.filter((m) => m.going.includes(me.id)).forEach((m) => byId.set(m.id, m));
    return [...byId.values()].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }, [hist.meals, meals, me.id]);

  // 四個分頁：全部，跟原本的收、發、獨
  const [tab, setTab] = useState<HistoryTab>('all');
  const counts = useMemo(() => {
    const c: Record<HistoryTab, number> = { all: list.length, inbox: 0, sent: 0, solo: 0 };
    list.forEach((m) => (c[kindOf(m, me.id)] += 1));
    return c;
  }, [list, me.id]);
  const pickTab = (k: HistoryTab) => {
    if (k === tab) return;
    // 廟宇翻一頁簿子，魔法是日誌裡亮一下
    if (theme.id === 'magic') twinkle(3);
    else paper(0.12);
    setTab(k);
  };
  const shownList = useMemo(
    () => (tab === 'all' ? list : list.filter((m) => kindOf(m, me.id) === tab)),
    [list, tab, me.id],
  );

  const days = useMemo(() => {
    const out: { date: string; meals: Meal[] }[] = [];
    shownList.forEach((m) => {
      const last = out.at(-1);
      if (last?.date === m.date) last.meals.push(m);
      else out.push({ date: m.date, meals: [m] });
    });
    return out;
  }, [shownList]);

  // 這個月的小統計：起駕幾餐、最常吃哪家、最常跟誰同桌
  const stats = useMemo(() => {
    const month = taipeiDate(now || 0).slice(0, 7);
    const mine = list.filter((m) => m.date.startsWith(month) && m.decision);
    const shops = new Map<string, { name: string; n: number }>();
    const mates = new Map<string, number>();
    mine.forEach((m) => {
      const p = chosenOf(m);
      if (p) shops.set(p.rid, { name: p.name, n: (shops.get(p.rid)?.n ?? 0) + 1 });
      m.going.forEach((u) => u !== me.id && mates.set(u, (mates.get(u) ?? 0) + 1));
    });
    const top = [...shops.values()].sort((a, b) => b.n - a.n)[0];
    const mateId = [...mates.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return { count: mine.length, top, mate: mateId ? memberMap.get(mateId) : undefined };
  }, [list, now, me.id, memberMap]);

  // 捲到哪一頁，那一頁的章才蓋下去
  const pages = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const root = pages.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLElement>('.ledger__day:not(.is-in)')];
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }),
      { rootMargin: '0px 0px -12% 0px' },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [days.length, tab]);

  const empty = !hist.loading && shownList.length === 0;

  return (
    <div className={`ledger ledger--${theme.id}`}>
      <header className="ledger__cover">
        {theme.id === 'magic' && <NightSky />}
        <div className="ledger__label">
          <span className="ledger__glyph">
            <theme.Glyph name="ledger" size={52} />
          </span>
          <div>
            <p className="eyebrow">{copy.history.eyebrow}</p>
            <h1 className="ledger__title">{copy.history.title}</h1>
          </div>
        </div>
        <p className="ledger__lede">{copy.history.lede}</p>
        <ul className="ledger__stats" aria-label="這個月">
          <li>
            <NumberSeal n={stats.count} />
            <b>這個月</b>
            <span>{copy.history.count(stats.count)}</span>
          </li>
          <li>
            {stats.top ? <NumberSeal n={stats.top.n} /> : <theme.Glyph name="empty" size={38} />}
            <b className="ledger__stat-name">{stats.top?.name ?? copy.history.noTop}</b>
            <span>{stats.top ? copy.history.topShop : copy.history.noTopHint}</span>
          </li>
          <li>
            {stats.mate ? <Avatar member={stats.mate} size={30} /> : <theme.Glyph name="alone" size={38} />}
            <b className="ledger__stat-name">{stats.mate?.name ?? copy.history.alone}</b>
            <span>{stats.mate ? copy.history.topMate : copy.history.noMateHint}</span>
          </li>
        </ul>
      </header>

      {/* 四個分頁，各蓋一顆章（簿／收／發／獨）；選到的那一頁章才是紅（金、綠）的 */}
      <div className="ledger__tabs" role="tablist" aria-label={copy.history.title}>
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`ledger-tab-${k}`}
            aria-selected={tab === k}
            aria-controls="ledger-panel"
            className={`ledger__tab ledger__tab--${k}${tab === k ? ' is-on' : ''}`}
            onClick={() => pickTab(k)}
          >
            <Seal text={copy.history.marks[k]} size={34} color="var(--sec)" className="ledger__mark" />
            <span>{copy.history.tabs[k]}</span>
            {counts[k] > 0 && <b className="ledger__tab-count">{counts[k]}</b>}
          </button>
        ))}
      </div>

      {empty ? (
        <div className="ledger__empty" id="ledger-panel" role="tabpanel" aria-labelledby={`ledger-tab-${tab}`}>
          <theme.Vignette kind={tab === 'all' ? 'history-empty' : `history-${tab}`} />
          <Link href="/" className="btn btn--zhu">
            <theme.Glyph name="shake" size={24} />
            {copy.drawCta}
          </Link>
        </div>
      ) : (
        <ol
          className={`ledger__days ledger__days--${tab}`}
          ref={pages}
          key={tab}
          id="ledger-panel"
          role="tabpanel"
          aria-labelledby={`ledger-tab-${tab}`}
        >
          {days.map((d) => (
            <li key={d.date} className="ledger__day">
              <div className="ledger__date">
                <theme.DateStamp date={dayOf(d.date)} size={70} />
              </div>
              <ol className="ledger__meals">
                {d.meals.map((m, i) => (
                  <Entry key={m.id} m={m} i={i} now={now} />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}

      <footer className="ledger__foot">
        {hist.error ? (
          <p className="ledger__end">{copy.history.error}</p>
        ) : hist.loading ? (
          <Loading size={40} label="翻簿子中" />
        ) : hist.done ? (
          !empty && (
            <p className="ledger__end">
              <theme.Glyph name="ledger" size={20} />
              {copy.history.end}
            </p>
          )
        ) : (
          <button type="button" className="btn btn--line ledger__more" onClick={hist.more}>
            <theme.Glyph name="ledger" size={22} />
            {copy.history.more}
          </button>
        )}
      </footer>
    </div>
  );
}

/** 數字章：廟宇是一顆方形朱印、白色數字；魔法是一顆帶光環的小星球，數字寫在星球上 */
function NumberSeal({ n }: { n: number }) {
  const { theme } = useTheme();
  if (theme.id === 'magic') return <Planet n={n} />;
  return (
    <span className="num-seal" aria-hidden="true">
      {n}
    </span>
  );
}

/** 帶紫色光環的金色小星球：光環後半圈先畫（被星球擋住），星球、條紋、數字，再畫光環前半圈；旁邊一顆小衛星 */
function Planet({ n }: { n: number }) {
  const id = useId();
  const text = String(n);
  return (
    <svg className="num-planet" width="58" height="46" viewBox="0 0 58 46" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-p`} cx="36%" cy="30%" r="72%">
          <stop offset="0" stopColor="#fff1c2" />
          <stop offset="0.55" stopColor="#f2b940" />
          <stop offset="1" stopColor="#c47f28" />
        </radialGradient>
      </defs>
      <path d="M6.7 27.6A23 7 -14 0 1 51.3 16.4" fill="none" stroke="#6a5acd" strokeWidth="2.4" opacity="0.55" />
      <circle cx="29" cy="22" r="15.5" fill={`url(#${id}-p)`} stroke="var(--ink)" strokeWidth="1.5" />
      <path
        d="M16.5 16.5c6.5 2 17 2 24.5-1.2M14.6 25.5c8 2.6 19.4 2 27.4-1.6"
        fill="none"
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x="29"
        y={text.length > 2 ? 26.4 : 27.4}
        textAnchor="middle"
        fontFamily="var(--f-display)"
        fontWeight="900"
        fontSize={text.length > 2 ? 12 : 15}
        fill="var(--ink)"
      >
        {text}
      </text>
      <path d="M51.3 16.4A23 7 -14 0 1 6.7 27.6" fill="none" stroke="#6a5acd" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="50.5" cy="37.5" r="2.6" fill="#cbc5ea" stroke="var(--ink)" strokeWidth="1" />
    </svg>
  );
}

/** 北斗七星：斗柄三顆、斗身四顆（x, y, 大小）；第五顆最亮，多一道十字光 */
const DIPPER: [number, number, number][] = [
  [6, 60, 1.6],
  [30, 47, 1.9],
  [52, 50, 1.7],
  [74, 38, 2],
  [108, 22, 2.6],
  [118, 52, 2.1],
  [84, 64, 1.8],
];

/** 魔法封面上的夜空：右上角一組會一閃一閃的星座，偶爾一顆流星劃過 */
function NightSky() {
  const line = [...DIPPER, DIPPER[3]].map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <span className="ledger__sky" aria-hidden="true">
      <svg className="ledger__constellation" viewBox="0 0 126 70" width="126" height="70">
        <polyline points={line} fill="none" stroke="rgba(242, 185, 64, 0.5)" strokeWidth="1.1" strokeDasharray="2 3" />
        {DIPPER.map(([x, y, r], i) => (
          <circle key={i} className="ledger__star" cx={x} cy={y} r={r} style={{ '--i': i } as CSSProperties} />
        ))}
        <path d="M108 15v14M101 22h14" stroke="#fff6d8" strokeWidth="0.9" strokeLinecap="round" />
      </svg>
      <i className="ledger__meteor" />
      <i className="ledger__meteor ledger__meteor--late" />
    </span>
  );
}

/** 一餐的紀錄：哪一餐、結果、起駕的店與籤詩、跟誰、誰起駕的、求過哪些籤 */
function Entry({ m, i, now }: { m: Meal; i: number; now: number }) {
  const { me, memberMap, restaurantMap } = useAppData();
  const { theme } = useTheme();
  const { copy } = theme;
  const result = resultOf(m, now);
  const shown = chosenOf(m) ?? latestOf(m);
  const r = shown ? restaurantMap.get(shown.rid) : undefined;
  const reading = shown && r ? readingOf(theme, r, shown, modeOf(m)) : null;
  const mates = m.going
    .filter((u) => u !== me.id)
    .flatMap((u): Member[] => {
      const x = memberMap.get(u);
      return x ? [x] : [];
    });
  const by = m.decision ? (m.decision.by === me.id ? '你' : (memberMap.get(m.decision.by)?.name ?? '同事')) : '';
  // 求過的每一支（照抽到的順序，同一家只列一次）：起駕的、去不了的都標出來
  const tried = [...new Map(m.picks.map((p) => [p.rid, p])).values()];
  const at = m.createdAt;

  return (
    <li className={`entry is-${result}`} style={{ '--i': i } as CSSProperties}>
      <div className="entry__head">
        <span className="entry__slot">
          <LineIcon d={slotIcon(m.slot)} size={16} />
          {m.slot.label}
        </span>
        {at && (
          <time className="entry__time" dateTime={at.toISOString()}>
            {at.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </time>
        )}
        <span className="entry__result">{copy.history.result[result]}</span>
      </div>

      <h3 className={`entry__shop${shown ? '' : ' is-empty'}`}>
        {result === 'decided' && <span className="entry__seal">{copy.finalSeal}</span>}
        {r ? (
          <>
            <LineIcon d={categoryOf(r.category).icon} size={20} />
            {r.name}
          </>
        ) : shown ? (
          shown.name
        ) : (
          <>
            <theme.Glyph name="empty" size={30} />
            還沒求到籤
          </>
        )}
      </h3>
      {reading && (
        <>
          <Tags className="entry__lot">
            <Tag tone="accent">{reading.numberText}</Tag>
            <Tag>{reading.grade.name}</Tag>
          </Tags>
          {result === 'decided' && (
            <>
              <p className="entry__verse">
                {reading.lines.map((l, k) => (
                  <span key={k} style={{ '--k': k } as CSSProperties}>
                    {l}
                  </span>
                ))}
              </p>
              <p className="entry__verdict">
                <b>{copy.verdictLabel}</b>
                {reading.verdict}
              </p>
            </>
          )}
        </>
      )}

      <div className="entry__meta">
        <span className="entry__with">
          <theme.Glyph name="invite" size={20} />
          {mates.length ? (
            <>
              <b>{copy.history.with}</b>
              <span className="entry__faces">
                {mates.slice(0, 6).map((x) => (
                  <Avatar key={x.id} member={x} size={24} />
                ))}
                {mates.length > 6 && <i>+{mates.length - 6}</i>}
              </span>
            </>
          ) : (
            <>
              <theme.Glyph name="alone" size={22} />
              <b>{copy.history.alone}</b>
            </>
          )}
        </span>
        {by && (
          <span className="entry__by">
            <theme.Glyph name="depart" size={20} />
            {copy.history.by(by)}
          </span>
        )}
      </div>
      {r?.mapUrl && result === 'decided' && <MapLink r={r} title={copy.meal.map} className="entry__map" />}

      {tried.length > 1 && (
        <details className="entry__tried">
          <summary>
            <theme.Glyph name="altar" size={22} />
            {copy.history.cands}
            <b className="entry__tried-n">{tried.length}</b>
          </summary>
          <ul>
            {tried.map((p) => {
              const skipped = !!skipOf(m, p.rid) && !candidatesOf(m).some((c) => c.rid === p.rid);
              const chosen = m.decision?.rid === p.rid;
              return (
                <li key={p.rid} className={chosen ? 'is-chosen' : skipped ? 'is-skipped' : ''}>
                  <span>{p.name}</span>
                  {chosen && <em>{copy.finalSeal}</em>}
                  {skipped && (
                    <em>
                      <theme.Glyph name="closed" size={14} />
                      {copy.history.skipped}
                    </em>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </li>
  );
}
