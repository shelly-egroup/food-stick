'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import gsap from 'gsap';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Avatar } from '@/components/Avatar';
import { Candidates } from '@/components/Candidates';
import { Oracle } from '@/components/Oracle';
import { useToast } from '@/components/Toast';
import { LineIcon } from '@/components/CategoryIcon';
import { Loading } from '@/components/Loading';
import { Seal } from '@/components/Seal';
import { Tag, Tags } from '@/components/Tags';
import { MapLink } from '@/components/MapLink';
import { useAppData } from '@/lib/appData';
import {
  candidatesOf,
  chosenOf,
  isLive,
  latestOf,
  modeOf,
  pickOf,
  skipOf,
  slotIcon,
  taipeiDate,
  type Meal,
  type MealPick,
} from '@/lib/meal';
import { reducedMotion } from '@/lib/motion';
import { paper, stamp, twinkle } from '@/lib/sound';
import { setPref, useMealHistory } from '@/lib/store';
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

  // 彩蛋：封面的小圖一秒內連點三下，翻出今天的一句（同一天同一句，再點三下收回去）
  const [egg, setEgg] = useState<number | null>(null);
  const taps = useRef<number[]>([]);
  const cover = useRef<HTMLElement>(null);
  const magic = theme.id === 'magic';
  /** 魔法封面上劃過幾顆流星（臨時加進夜空，劃完就拿掉） */
  const meteors = (n: number) => {
    const sky = cover.current?.querySelector('.ledger__sky');
    if (!sky || reducedMotion()) return;
    for (let k = 0; k < n; k++) {
      const m = document.createElement('i');
      m.className = 'ledger__meteor ledger__meteor--now';
      m.style.top = `${4 + Math.random() * 46}%`;
      m.style.right = `${4 + Math.random() * 50}%`;
      m.style.animationDelay = `${k * 0.18 + Math.random() * 0.15}s`;
      m.addEventListener('animationend', () => m.remove());
      sky.appendChild(m);
    }
  };
  const tapEgg = (e: MouseEvent<HTMLButtonElement>) => {
    // 每點一下都有反應：簿子抖一抖、翻一頁（日誌轉一圈、閃一下），才會想再多點幾下
    if (!reducedMotion())
      gsap.fromTo(
        e.currentTarget,
        // 小圖本身用 CSS 的 rotate 歪著 -4°，這裡的旋轉是疊在上面的，從 0 回到 0
        { rotate: 0 },
        magic
          ? {
              keyframes: { rotate: [0, 360], scale: [1, 1.18, 1] },
              duration: 0.6,
              ease: 'back.out(1.6)',
              clearProps: 'transform',
            }
          : { keyframes: { rotate: [0, -10, 12, -5, 0] }, duration: 0.5, ease: 'sine.inOut', clearProps: 'transform' },
      );
    if (magic) twinkle(taps.current.length + 2);
    else paper(0.12);
    const t = Date.now();
    taps.current = [...taps.current.filter((x) => t - x < 1000), t];
    if (taps.current.length < 3) return;
    taps.current = [];
    if (egg !== null) return setEgg(null);
    const day = Number(taipeiDate(t).replaceAll('-', ''));
    setEgg((day * 7 + me.id.length) % copy.history.egg.lines.length);
    if (magic) {
      twinkle(9);
      meteors(6);
    } else stamp();
  };
  /** 點大標題：字一個一個跳起來（廟宇像毛筆字被吹動，魔法像咒語發光） */
  const tapTitle = (e: MouseEvent<HTMLHeadingElement>) => {
    if (reducedMotion()) return;
    const chars = e.currentTarget.querySelectorAll('span');
    if (magic) twinkle(6);
    else paper(0.2);
    gsap.fromTo(
      chars,
      { y: 0, rotate: 0 },
      {
        keyframes: { y: [0, -16, 0], rotate: [0, magic ? 0 : -8, 0], scale: [1, magic ? 1.2 : 1.08, 1] },
        duration: 0.55,
        stagger: 0.08,
        ease: 'power2.out',
      },
    );
  };
  /** 點日期章：抬起來、重新蓋下去 */
  const tapStamp = (e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (reducedMotion() || el.classList.contains('is-stamping')) return;
    el.classList.add('is-stamping');
    gsap
      .timeline({ onComplete: () => el.classList.remove('is-stamping') })
      .to(el, { y: -22, rotate: -10, scale: 1.12, duration: 0.2, ease: 'power2.out' })
      .to(el, { y: 0, rotate: 0, scale: 1, duration: 0.12, ease: 'power4.in' })
      .add(() => stamp())
      .to(el, { scaleX: 1.08, scaleY: 0.92, duration: 0.07, yoyo: true, repeat: 1 });
  };
  /** 點魔法封面的星座：星星一顆顆亮起來，劃過一顆流星 */
  const tapSky = () => {
    const sky = cover.current?.querySelector('.ledger__sky');
    if (!sky || reducedMotion()) return;
    twinkle(7);
    gsap.fromTo(
      sky.querySelectorAll('.ledger__star'),
      { scale: 1 },
      { scale: 2.2, duration: 0.18, yoyo: true, repeat: 1, stagger: 0.07, transformOrigin: '50% 50%' },
    );
    meteors(1);
  };

  return (
    <div className={`ledger ledger--${theme.id}`}>
      <header className="ledger__cover" ref={cover}>
        {magic && <NightSky onTap={tapSky} />}
        <div className="ledger__label">
          {/* 彩蛋：連點這顆小圖三下 */}
          <button type="button" className="ledger__glyph" onClick={tapEgg} aria-label={copy.history.title}>
            <theme.Glyph name="ledger" size={52} />
          </button>
          <div>
            <p className="eyebrow">{copy.history.eyebrow}</p>
            <h1 className="ledger__title" onClick={tapTitle} aria-label={copy.history.title}>
              {[...copy.history.title].map((c, k) => (
                <span key={k} aria-hidden="true">
                  {c}
                </span>
              ))}
            </h1>
          </div>
        </div>
        {egg !== null ? (
          <p key={egg} className="ledger__egg" aria-live="polite">
            <Seal text={copy.history.egg.seal} size={40} rotate={-8} className="ledger__egg-seal" />
            <span>
              <small>{copy.history.egg.title}</small>
              <b>{copy.history.egg.lines[egg]}</b>
            </span>
          </p>
        ) : (
          <p className="ledger__lede">{copy.history.lede}</p>
        )}
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
              <div className="ledger__date" onClick={tapStamp}>
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
function NightSky({ onTap }: { onTap: () => void }) {
  const line = [...DIPPER, DIPPER[3]].map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <span className="ledger__sky" aria-hidden="true">
      <svg className="ledger__constellation" viewBox="0 0 126 70" width="126" height="70" onClick={onTap}>
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
  // 點開的那一支籤卡（swap：左右翻過來的方向）
  const [view, setView] = useState<{ rid: string; swap?: 1 | -1 } | null>(null);
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
          {/* 跟供桌彈窗同一排籤（牌）：起駕的蓋定案章，去不了的褪色；點一支打開籤卡 */}
          <Candidates
            meal={m}
            picks={tried}
            hint={false}
            past
            onOpen={(rid) => setView({ rid, swap: undefined })}
            skipped={(rid) => {
              const s = skipOf(m, rid);
              if (!s || candidatesOf(m).some((c) => c.rid === rid)) return false;
              return s.why ? copy.meal.skipWhy[s.why].short : copy.history.skipped;
            }}
          />
        </details>
      )}
      {/* 籤卡蓋滿整個畫面：掛到 body 上，才不會被這一頁進場動畫的 transform 困住 */}
      {view &&
        createPortal(
          <PastCard m={m} tried={tried} view={view} onView={setView} onClosed={() => setView(null)} />,
          document.body,
        )}
    </li>
  );
}

/**
 * 食籤簿裡點開的籤卡：跟首頁同一張，只是這一餐已經過去了，沒有起駕、重抽這些按鈕。
 * 起駕的那支蓋定案章、可以帶我去；去不了的寫原因；其他的寫最後去了哪家。左右翻同一餐求過的每一支。
 */
function PastCard({
  m,
  tried,
  view,
  onView,
  onClosed,
}: {
  m: Meal;
  tried: MealPick[];
  view: { rid: string; swap?: 1 | -1 };
  onView: (v: { rid: string; swap?: 1 | -1 }) => void;
  onClosed: () => void;
}) {
  const { me, restaurantMap } = useAppData();
  const { theme } = useTheme();
  const { copy } = theme;
  const toast = useToast();
  const [leaving, setLeaving] = useState(false);
  const r = restaurantMap.get(view.rid);
  const p = pickOf(m, view.rid);
  if (!r || !p) return null;
  const at = tried.findIndex((x) => x.rid === view.rid);
  const chosen = chosenOf(m);
  const skip = skipOf(m, view.rid);
  const isChosen = chosen?.rid === view.rid;
  const skipped = !isChosen && !!skip && !candidatesOf(m).some((c) => c.rid === view.rid);
  const note = isChosen
    ? undefined
    : skipped
      ? skip.why
        ? `${copy.history.skipped}：${copy.meal.skipWhy[skip.why].title}`
        : copy.history.skipped
      : chosen
        ? copy.meal.departedTo(restaurantMap.get(chosen.rid)?.name ?? chosen.name)
        : copy.meal.ended;
  const liked = me.likes.includes(r.id);
  return (
    <Oracle
      key={`${m.id}:${view.rid}`}
      theme={theme}
      restaurant={r}
      reading={readingOf(theme, r, p, modeOf(m))}
      party={m.going.length}
      liked={liked}
      rerollsLeft={0}
      rerolls={0}
      canReroll={false}
      canDecide={false}
      canSkip={false}
      decided={isChosen}
      note={note}
      busy={leaving}
      leaving={leaving}
      swap={view.swap}
      deck={
        tried.length > 1 && at >= 0
          ? {
              at,
              total: tried.length,
              onStep: (dir) => tried[at + dir] && onView({ rid: tried[at + dir].rid, swap: dir }),
            }
          : undefined
      }
      onReroll={() => {}}
      onAccept={() => {}}
      onSkip={() => {}}
      onToggleLike={() => setPref(me.id, r.id, liked ? null : 'like').catch(() => toast('沒有存到，等一下再試', '咦'))}
      onClose={() => setLeaving(true)}
      onClosed={onClosed}
    />
  );
}
