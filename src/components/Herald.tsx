'use client';

import { createContext, useContext, useEffect, useEffectEvent, useState, type MouseEvent, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { departedByMe, markDeparted } from '@/lib/depart';
import { useAppData } from '@/lib/appData';
import {
  candidatesOf,
  canDecide,
  canDraw,
  chosenOf,
  isLive,
  latestOf,
  modeOf,
  needsMe,
  showsLive,
  slotIcon,
  stateOf,
  type Answer,
  type Meal,
  type MealPick,
} from '@/lib/meal';
import { answerMeal, cancelMeal, decideMeal } from '@/lib/store';
import { paper } from '@/lib/sound';
import { useNow } from '@/lib/useBrowser';
import { usePersisted } from '@/lib/usePersisted';
import { useUi } from '@/lib/uiContext';
import { readingOf } from '@/lib/verse';
import { categoryOf, walkOf } from '@/lib/types';
import { useTheme, type ThemeCopy } from '@/themes';
import { Avatar } from './Avatar';
import { LineIcon } from './CategoryIcon';
import { MapLink } from './MapLink';
import { Charges } from './Charges';
import { MateMarks } from './MateMarks';
import { Tag, Tags, Tally } from './Tags';
import { Sheet } from './Sheet';
import { useToast } from './Toast';
import './Herald.css';

const WEEK = '日一二三四五六';

/** 卡片右上角的郵戳：幾月幾號、星期幾、幾點開的單 */
function Postmark({ at }: { at: Date | null | undefined }) {
  if (!at) return null;
  const hm = at.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <time className="postmark" dateTime={at.toISOString()}>
      <b>
        {at.getMonth() + 1}/{at.getDate()}
      </b>
      <span>
        週{WEEK[at.getDay()]} {hm}
      </span>
    </time>
  );
}

interface News {
  /** 第幾則：每來一則加一，橫幅與通知鈕的動畫跟著重播 */
  n: number;
  text: string;
  /** 有人揪你、抽到了、起駕了：敲鑼（貓頭鷹叫）；其他輕輕一聲 */
  big: boolean;
  /** 起駕了：要去的人畫面上一起放鞭炮（掃帚起飛） */
  depart?: boolean;
}

/** 某一餐剛剛發生了什麼（首頁跟著翻開籤卡、收起籤卡） */
export type MealEvent = 'drew' | 'decided' | 'skipped';

interface HeraldValue {
  /** 跟我有關、還在進行的餐（進行中清單） */
  live: Meal[];
  /** 別人在某一餐抽了、起駕了、說這家去不了（n 每次加一） */
  pulse: { id: string; kind: MealEvent; n: number } | null;
  /** 通知裡按了「抽」：請首頁幫這一餐抽（n 每次加一）；首頁接手後呼叫 doneDrawAsk */
  drawAsk: { id: string; n: number } | null;
  askDraw: (m: Meal) => void;
  doneDrawAsk: () => void;
  /** 通知裡點了某一支：回到首頁翻開那一支；rid 是 null 就攤開供桌（預言牌陣）彈窗 */
  openAsk: { id: string; rid: string | null; n: number } | null;
  askOpen: (m: Meal, rid: string | null) => void;
  doneOpenAsk: () => void;
  unread: number;
  ring: number;
  show: () => void;
  /** 收起通知（例如首頁要翻開同步來的籤卡，別擋在前面） */
  hide: () => void;
}

const HeraldContext = createContext<HeraldValue | null>(null);

export function useHerald() {
  const v = useContext(HeraldContext);
  if (!v) throw new Error('useHerald 要放在 HeraldProvider 裡');
  return v;
}

/** 跟上一次的資料比，挑出最新的一則消息與首頁要跟著做的事 */
function describe(
  prev: Map<string, Meal>,
  next: Meal[],
  me: string,
  copy: ThemeCopy,
  name: (uid: string) => string,
): { news: Omit<News, 'n'> | null; pulse: { id: string; kind: MealEvent } | null } {
  let news: Omit<News, 'n'> | null = null;
  let pulse: { id: string; kind: MealEvent } | null = null;
  for (const m of next) {
    if (!m.party.includes(me)) continue;
    const was = prev.get(m.id);
    const slot = m.slot.label;
    const st = stateOf(m, me);
    // 剛被揪進來（新開的單、或後來被加進名單）
    if (!was || !was.party.includes(me)) {
      if (m.host !== me && m.status !== 'cancelled') news = { text: copy.meal.invited(name(m.host), slot), big: true };
      continue;
    }
    if (m.picks.length > was.picks.length && m.skips.length === was.skips.length) {
      const p = m.picks.at(-1)!;
      if (p.by !== me && st !== 'out') {
        news = { text: `${copy.meal.drew(name(p.by))}：${p.name}`, big: st === 'in' };
        pulse = { id: m.id, kind: 'drew' };
      }
    }
    if (m.skips.length > was.skips.length) {
      const s = m.skips.at(-1)!;
      if (s.by !== me && st !== 'out') {
        news = {
          text: copy.meal.cantGoBy(name(s.by), was.picks.findLast((p) => p.rid === s.rid)?.name ?? ''),
          big: true,
        };
        pulse = { id: m.id, kind: 'skipped' };
      }
    }
    if (m.status === 'decided' && was.status !== 'decided' && m.decision && m.decision.by !== me) {
      const shop = chosenOf(m)?.name ?? '';
      if (st !== 'out') {
        news = {
          text: copy.meal.decided(name(m.decision.by), shop),
          big: true,
          depart: st === 'in' && !departedByMe(m.id),
        };
        pulse = { id: m.id, kind: 'decided' };
      }
    }
    if (m.status === 'cancelled' && was.status !== 'cancelled' && m.host !== me && st !== 'out')
      news = { text: copy.meal.closed(name(m.host)), big: false };
    // 自己發起的：誰回覆了
    if (m.host === me) {
      for (const u of m.party) {
        const a = m.answers[u];
        if (u !== me && a && a !== was.answers[u])
          news = { text: a === 'in' ? copy.meal.joinedBy(name(u)) : copy.meal.skippedBy(name(u)), big: false };
      }
    }
  }
  return { news, pulse };
}

/**
 * 通知處（廟宇叫報馬仔，魔法叫貓頭鷹宅急便）：還在進行、跟你有關的每一餐都在這裡。
 * 有人揪你、抽到了、起駕了、說這家去不了，上方跳一條細細的橫幅（幾秒後自己收起來）；
 * 上方的鑼（貓頭鷹）旁邊記著幾件事等你回。點開是一張張紅帖（封著火漆的信），直接在上面回覆。
 */
export function HeraldProvider({ children }: { children: ReactNode }) {
  const { me, live: mine, memberMap, ready } = useAppData();
  const { theme } = useTheme();
  const { copy } = theme;
  const now = useNow();
  const [open, setOpen] = useState(false);
  const { setSlot, setFocus } = useUi();

  const live = mine
    .filter((m) => showsLive(m, me.id, now))
    .sort(
      (a, b) =>
        Number(needsMe(b, me.id, now)) - Number(needsMe(a, me.id, now)) ||
        (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
    );
  const unread = live.filter((m) => needsMe(m, me.id, now)).length;
  // 通知開著的時候，剛回覆完的帖子先留著（例如起駕之後才補按「我要去」，不會一按就消失）；關掉再收
  const [kept, setKept] = useState<string[]>([]);
  const listed = open
    ? [
        ...live,
        ...mine.filter((m) => kept.includes(m.id) && !live.includes(m) && isLive(m, now) && m.party.includes(me.id)),
      ]
    : live;

  // 資料一變就跟上一次比：有新消息就跳橫幅、通知鈕晃一下（資料第一次到齊時不跳）
  const [prev, setPrev] = useState<Meal[] | null>(null);
  const [news, setNews] = useState<News | null>(null);
  const [ring, setRing] = useState(0);
  const [pulse, setPulse] = useState<HeraldValue['pulse']>(null);
  if (ready && mine !== prev) {
    setPrev(mine);
    if (prev) {
      const found = describe(new Map(prev.map((m) => [m.id, m])), mine, me.id, copy, (u) =>
        u === me.id ? '你' : (memberMap.get(u)?.name ?? '同事'),
      );
      if (found.pulse) setPulse({ ...found.pulse, n: (pulse?.n ?? 0) + 1 });
      if (found.news) {
        setNews({ ...found.news, n: ring + 1 });
        setRing(ring + 1);
      }
    }
  }

  const show = () => {
    setNews(null);
    setKept(live.map((m) => m.id));
    setOpen(true);
  };
  const hide = () => setOpen(false);
  const ding = useEffectEvent((n: News) => {
    if (n.depart) {
      // 團裡有人起駕：跟自己按的時候一樣，從畫面上的起駕按鈕（籤卡或通知裡的；都沒開就用首頁的大按鈕）
      // 放出鞭炮（掃帚）。開著的通知先收起來（它蓋在最上層會擋住動畫），收好再放；籤卡由首頁自己收。
      const btn =
        document.querySelector('.oracle .oracle__go') ??
        document.querySelector('dialog[open] .invite__go') ??
        document.querySelector('.dock__cta') ??
        document.querySelector('.herald-news__glyph');
      const r = (btn?.querySelector('.glyph') ?? btn)?.getBoundingClientRect();
      const x = r ? r.left + r.width / 2 : window.innerWidth / 2;
      const y = r ? Math.min(window.innerHeight - 90, Math.max(90, r.top + r.height / 2)) : window.innerHeight / 2;
      const inSheet = !!btn?.closest('dialog');
      if (open) window.setTimeout(hide, 60);
      window.setTimeout(
        () => {
          const mark = document.createElement('span');
          mark.style.cssText = `position:fixed;left:${x - 12}px;top:${y - 12}px;width:24px;height:24px;pointer-events:none`;
          document.body.appendChild(mark);
          theme.departFx(mark);
          mark.remove();
        },
        inSheet ? 340 : 0,
      );
    } else if (n.big) theme.heraldSound();
    else paper(0.15);
  });
  useEffect(() => {
    if (!news) return;
    ding(news);
    const t = setTimeout(() => setNews(null), 6500);
    return () => clearTimeout(t);
  }, [news]);

  // 通知裡按了「抽」或點了候選：收起通知、回到首頁、切到那一餐，整段儀式看得到
  const router = useRouter();
  const pathname = usePathname();
  const goHome = (m: Meal) => {
    hide();
    setSlot(m.slot);
    setFocus(m.id);
    if (pathname !== '/') router.push('/');
  };
  const [drawAsk, setDrawAsk] = useState<HeraldValue['drawAsk']>(null);
  const [openAsk, setOpenAsk] = useState<HeraldValue['openAsk']>(null);
  const askDraw = (m: Meal) => {
    goHome(m);
    setDrawAsk((d) => ({ id: m.id, n: (d?.n ?? 0) + 1 }));
  };
  const askOpen = (m: Meal, rid: string | null) => {
    goHome(m);
    setOpenAsk((d) => ({ id: m.id, rid, n: (d?.n ?? 0) + 1 }));
  };

  return (
    <HeraldContext.Provider
      value={{
        live,
        pulse,
        drawAsk,
        askDraw,
        doneDrawAsk: () => setDrawAsk(null),
        openAsk,
        askOpen,
        doneOpenAsk: () => setOpenAsk(null),
        unread,
        ring,
        show,
        hide,
      }}
    >
      {children}
      {news && (
        <button type="button" className="herald-news" key={news.n} onClick={show} aria-live="polite">
          <span className="herald-news__glyph">
            <theme.Glyph name="herald" size={30} />
          </span>
          <span className="herald-news__text">
            <small>{copy.herald.name}</small>
            <b>{news.text}</b>
          </span>
        </button>
      )}
      <Sheet
        open={open}
        onClose={hide}
        eyebrow={copy.herald.eyebrow}
        title={copy.herald.name}
        icon={<theme.Glyph name="herald" size={46} />}
      >
        <div className="herald">
          <p className="herald__lede">{copy.herald.lede}</p>
          {listed.length === 0 ? (
            <theme.Vignette kind="herald-empty" />
          ) : (
            <div className="herald__list">
              {listed.map((m, i) => (
                <MealCard key={m.id} m={m} i={i} />
              ))}
            </div>
          )}
        </div>
      </Sheet>
    </HeraldContext.Provider>
  );
}

/** 上方的鑼（貓頭鷹）：有新消息時晃一下，旁邊記著幾件事等你回 */
export function HeraldButton() {
  const { unread, ring, show } = useHerald();
  const { theme } = useTheme();
  return (
    <button
      type="button"
      className={`herald-btn${unread ? ' has-news' : ''}`}
      onClick={() => {
        // 廟宇：木槌碰一下鑼（有事等你回就整個敲響）；魔法：貓頭鷹拍翅探頭（有信就叫兩聲）
        theme.heraldTap(unread > 0);
        show();
      }}
      aria-label={theme.copy.herald.unread(unread)}
    >
      <span className={`herald-btn__glyph${ring ? ' is-ring' : ''}`} key={`ring-${ring}`}>
        <theme.Glyph name="herald" size={30} />
      </span>
      {unread > 0 && (
        <b className="herald-btn__count" key={`count-${unread}`} aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </b>
      )}
    </button>
  );
}

/**
 * 一張餐的帖子（信）：誰揪的、哪一餐、抽到了什麼、大家的回覆；
 * 還沒回就回覆，要去的人可以抽、起駕、看全部候選，發起人可以收回。
 */
function MealCard({ m, i }: { m: Meal; i: number }) {
  const { me, memberMap, restaurantMap } = useAppData();
  const { theme } = useTheme();
  const { copy } = theme;
  const toast = useToast();
  const now = useNow();
  const { askDraw, askOpen } = useHerald();
  const [, setMode] = usePersisted<string>(`lunchstick:mode:${me.id}`, 'solo');
  const host = memberMap.get(m.host) ?? { id: m.host, name: '同事', photoURL: '' };
  const st = stateOf(m, me.id);
  const mine = m.host === me.id;
  const solo = modeOf(m) === 'solo';
  const shown = chosenOf(m) ?? latestOf(m);
  const cands = candidatesOf(m);
  const oops = () => toast('沒有成功，等一下再試', '咦');
  const answer = (a: Answer) => {
    if (a === 'in') setMode('group');
    answerMeal(m.id, me.id, a).catch(oops);
  };

  const title = mine
    ? solo
      ? copy.meal.solo(m.slot.label)
      : copy.meal.mine(m.slot.label)
    : copy.meal.invited(host.name, m.slot.label);
  const tag = mine ? (solo ? copy.herald.tags.solo : copy.herald.tags.mine) : copy.herald.tags.invited;

  return (
    <article
      className={`invite is-${m.status} is-${st}${mine ? (solo ? ' invite--solo' : ' invite--host') : ''}`}
      style={{ animationDelay: `${i * 70}ms` }}
    >
      <span className="invite__paper" aria-hidden="true" />
      <header className="invite__head">
        {mine ? (
          <span className="invite__glyph">
            <theme.Glyph name={solo ? 'shake' : 'invite'} size={32} />
          </span>
        ) : (
          <Avatar member={host} size={36} />
        )}
        <p>
          <span className="invite__tag">
            <LineIcon d={slotIcon(m.slot)} size={14} />
            {tag}
          </span>
          <b>{title}</b>
        </p>
        <i className="invite__seal" aria-hidden="true" />
      </header>
      <div className="invite__body">
        <Postmark at={m.createdAt} />
        {shown && <Pick m={m} p={shown} />}
        {!solo && (
          // 大家的回覆：一排數字章，底下每個人的頭像和記號
          <div className="invite__crew">
            <Tally meal={m} />
            <MateMarks meal={m} size={32} />
          </div>
        )}
        {m.status === 'decided' && shown && restaurantMap.get(shown.rid) && (
          <MapLink r={restaurantMap.get(shown.rid)!} title={copy.meal.map} withName />
        )}
      </div>
      <div className="invite__actions">
        {st === 'wait' ? (
          <>
            <button type="button" className="btn btn--zhu" onClick={() => answer('in')}>
              <theme.Glyph name="invite" size={22} />
              {copy.meal.join}
            </button>
            <button type="button" className="btn btn--line" onClick={() => answer('out')}>
              <theme.Glyph name="skip" size={20} />
              {copy.meal.skip}
            </button>
          </>
        ) : st === 'out' ? (
          <>
            <p className="invite__note">{copy.meal.skipped}</p>
            <button type="button" className="btn btn--quiet" onClick={() => answer('in')}>
              <theme.Glyph name="rethink" size={22} />
              {copy.meal.rejoin}
            </button>
          </>
        ) : (
          <>
            {shown && canDecide(m, me.id, now) && <Depart m={m} p={shown} />}
            {canDraw(m, me.id, now) && (
              <button type="button" className="btn btn--zhu invite__draw" onClick={() => askDraw(m)}>
                <theme.Glyph name="shake" size={24} />
                {m.picks.length ? copy.reroll : copy.drawCta}
                {m.picks.length > 0 && (
                  <Charges left={m.rerollsLeft} total={m.rerolls} label={copy.meal.left(m.rerollsLeft)} />
                )}
              </button>
            )}
            {cands.length > 0 && (
              // 回到首頁，彈出這一餐的供桌（預言牌陣）
              <button
                type="button"
                className="btn btn--quiet invite__altar"
                aria-haspopup="dialog"
                onClick={() => askOpen(m, null)}
              >
                <theme.Glyph name="altar" size={22} />
                {copy.meal.lookAll}
                <b className="tag__n">{cands.length}</b>
              </button>
            )}
            {mine ? (
              <button type="button" className="btn btn--quiet" onClick={() => cancelMeal(m.id).catch(oops)}>
                <theme.Glyph name="recall" size={20} />
                {copy.crew.recall}
              </button>
            ) : (
              <button type="button" className="btn btn--quiet" onClick={() => answer('out')}>
                <theme.Glyph name="skip" size={20} />
                {copy.meal.skip}
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

/** 起駕：就是這一家（定案），有地圖就順便打開，大家即時收到 */
function Depart({ m, p }: { m: Meal; p: MealPick }) {
  const { me } = useAppData();
  const { theme } = useTheme();
  const toast = useToast();
  const go = (e: MouseEvent<HTMLElement>) => {
    theme.departFx(e.currentTarget);
    markDeparted(m.id);
    decideMeal(m.id, me.id, p.rid).catch(() => toast('沒有成功，等一下再試', '咦'));
  };
  return (
    <button type="button" className="btn btn--zhu invite__go" onClick={go}>
      <theme.Glyph name="depart" size={24} />
      {theme.copy.go}
    </button>
  );
}

/** 抽到的那一支（起駕了就是定案的那一支）：店名、籤號籤等、四句籤詩 */
function Pick({ m, p }: { m: Meal; p: MealPick }) {
  const { restaurantMap } = useAppData();
  const { theme } = useTheme();
  const r = restaurantMap.get(p.rid);
  const reading = r ? readingOf(theme, r, p, modeOf(m)) : null;
  return (
    <>
      <h4 className="invite__shop">
        {m.decision?.rid === p.rid && <span className="invite__final">{theme.copy.finalSeal}</span>}
        {r?.name ?? p.name}
      </h4>
      {reading && r && (
        <>
          <Tags className="invite__lot">
            <Tag tone="accent">{reading.numberText}</Tag>
            <Tag>{reading.grade.name}</Tag>
            <Tag icon={<LineIcon d={categoryOf(r.category).icon} size={14} />}>{categoryOf(r.category).label}</Tag>
            <Tag icon={<LineIcon d={walkOf(r.walk).icon} size={14} />}>{walkOf(r.walk).label}</Tag>
          </Tags>
          <p className="invite__verse">
            {reading.lines.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </p>
        </>
      )}
    </>
  );
}
