'use client';

import { createContext, useContext, useEffect, useEffectEvent, useState, type MouseEvent, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { departedByMe, markDeparted, openMapSoon } from '@/lib/depart';
import { useAppData } from '@/lib/appData';
import {
  REROLLS,
  answerOuting,
  endOuting,
  ensureJoined,
  inTeam,
  replyOuting,
  useOutings,
  type Answer,
  type Outing,
} from '@/lib/store';
import { hoursAgo, seeded } from '@/lib/random';
import { paper, twinkle } from '@/lib/sound';
import { soloReading } from '@/lib/soloPicks';
import { useNow } from '@/lib/useBrowser';
import { usePersisted } from '@/lib/usePersisted';
import { useTheme, type ThemeCopy } from '@/themes';
import { categoryOf, walkOf, type DrawRecord, type Restaurant } from '@/lib/types';
import { Avatar } from './Avatar';
import { Charges } from './Charges';
import { Icon } from './Icon';
import { MateMarks, tallyOf } from './MateMarks';
import { Seal } from './Seal';
import { Sheet } from './Sheet';
import { useToast } from './Toast';
import './Herald.css';

/** 超過這麼久的揪團就不提了 */
const FRESH_MS = 3 * 3_600_000;
const NONE: string[] = [];

/** 通知處的三個分頁：別人揪我的、我發出的、我自己一個人抽的 */
type Tab = 'inbox' | 'sent' | 'solo';
const TABS: Tab[] = ['inbox', 'sent', 'solo'];

const WEEK = '日一二三四五六';

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

/** 本地時間的日期（YYYY-MM-DD）：自己抽的只列今天的 */
const dayOf = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface News {
  /** 第幾則：每來一則加一，橫幅與通知鈕的動畫跟著重播 */
  n: number;
  text: string;
  /** 有人揪你、抽到了、出發了：敲鑼（貓頭鷹叫）；其他（誰加入了）輕輕一聲 */
  big: boolean;
  /** 出發了：大家的畫面一起放鞭炮（掃帚起飛） */
  depart?: boolean;
  /** 不用回覆的邀請：預設已經加入，首頁切到揪團吃 */
  joined?: boolean;
}

interface HeraldValue {
  /** 別人揪我的（最近幾小時、沒被收回的） */
  invites: Outing[];
  /** 我發出、還在組隊或剛抽到的 */
  hosting: Outing | null;
  /** 我在的那一團：自己發的，或別人揪我、我說要加入的（還沒出發、沒收回） */
  team: Outing | null;
  /** 團裡有別人抽了新的一支：首頁的人一起翻開同一張籤（n 每次加一） */
  pulse: { id: string; n: number } | null;
  /** 用 id 找最近的揪團單（已經出發、收回的也找得到） */
  find: (id: string) => Outing | undefined;
  /** 通知裡按了「抽」：請首頁幫這一團抽（n 每次加一）；首頁接手後呼叫 doneDrawAsk */
  drawAsk: { id: string; n: number } | null;
  askDraw: (o: Outing) => void;
  doneDrawAsk: () => void;
  unread: number;
  ring: number;
  show: () => void;
}

const HeraldContext = createContext<HeraldValue | null>(null);

export function useHerald() {
  const v = useContext(HeraldContext);
  if (!v) throw new Error('useHerald 要放在 HeraldProvider 裡');
  return v;
}

/** 這一則揪團目前有哪些消息（用來算有幾則還沒看過） */
function keysOf(o: Outing, me: string): string[] {
  if (o.host !== me) return [`${o.id}:${o.status}:${o.seed}`];
  return o.party.flatMap((u) =>
    u === me
      ? []
      : [o.answers[u] && `${o.id}:a:${u}:${o.answers[u]}`, o.replies[u] && `${o.id}:r:${u}:${o.replies[u]}`].filter(
          (k): k is string => !!k,
        ),
  );
}

/** 這一支是不是剛抽出來的新籤（別人抽的） */
const freshDraw = (o: Outing, was: Outing | undefined, me: string) =>
  o.status === 'drawn' && !!o.by && o.by !== me && (!was || was.status !== 'drawn' || was.seed !== o.seed);

/** 跟上一次的資料比，挑出最新的一則消息 */
function describe(
  prev: Outing[],
  next: Outing[],
  me: string,
  copy: ThemeCopy,
  name: (uid: string) => string,
  shop: (rid: string) => string,
): Omit<News, 'n'> | null {
  const before = new Map(prev.map((o) => [o.id, o]));
  let out: Omit<News, 'n'> | null = null;
  for (const o of next) {
    const was = before.get(o.id);
    if (freshDraw(o, was, me)) {
      // 說這次不了的人也看得到抽到哪家（還能改變心意），但只輕輕一聲，不敲鑼
      out = { text: `${copy.outing.drew(name(o.by))}：${shop(o.rid)}`, big: o.answers[me] !== 'pass' };
      continue;
    }
    if (o.host !== me) {
      const host = name(o.host);
      const joined = o.answers[me] !== 'pass';
      if (!was) {
        if (o.status === 'gathering') out = { text: copy.outing.invited(host), big: true, joined: !o.confirm };
      } else if (o.status === 'go' && was.status !== 'go' && joined && !departedByMe(o.id))
        out = { text: copy.outing.depart, big: true, depart: true };
      else if (o.status === 'closed' && was.status !== 'closed' && joined)
        out = { text: copy.outing.closed(host), big: false };
      continue;
    }
    if (!was) continue;
    // 自己發的這一團：團員按了出發，也一起放動畫
    if (o.status === 'go' && was.status !== 'go' && !departedByMe(o.id)) {
      out = { text: copy.outing.depart, big: true, depart: true };
      continue;
    }
    for (const u of o.party) {
      if (u === me) continue;
      const a = o.answers[u];
      const r = o.replies[u];
      if (a && a !== was.answers[u])
        out = { text: a === 'go' ? copy.outing.joinedBy(name(u)) : copy.outing.skippedBy(name(u)), big: false };
      if (r && r !== was.replies[u])
        out = { text: r === 'go' ? copy.outing.goingBy(name(u)) : copy.outing.notGoingBy(name(u)), big: false };
    }
  }
  return out;
}

/**
 * 通知處（廟宇叫報馬仔，魔法叫貓頭鷹信差）：揪團的一切消息都即時送到這裡。
 * 有人揪你、抽到了、出發了、誰加入了，上方跳一條細細的橫幅（不擋住畫面，幾秒後自己收起來），
 * 上方的鑼（貓頭鷹）旁邊記著幾則還沒看；點開是一張張紅帖（封著火漆的信），直接在上面回覆。
 */
export function HeraldProvider({ children }: { children: ReactNode }) {
  const { me, memberMap, restaurantMap, draws } = useAppData();
  const { theme } = useTheme();
  const { copy } = theme;
  const [since] = useState(() => hoursAgo(6));
  const { data } = useOutings(me.id, since);
  const now = useNow();
  const [seen, setSeen] = usePersisted<string[]>(`lunchstick:herald:${me.id}`, NONE);
  const [open, setOpen] = useState(false);

  const fresh = (o: Outing) => !now || now - (o.createdAt?.getTime() ?? now) < FRESH_MS;
  const list = (data ?? []).filter(fresh);
  const invites = list.filter((o) => o.host !== me.id && o.status !== 'closed');
  const live = (o: Outing) => o.status === 'gathering' || o.status === 'drawn';
  const hosting = list.find((o) => o.host === me.id && live(o)) ?? null;
  const team = hosting ?? invites.find((o) => inTeam(o, me.id) && live(o)) ?? null;
  const keys = [...invites, ...(hosting ? [hosting] : [])].flatMap((o) => keysOf(o, me.id));
  const unread = open ? 0 : keys.filter((k) => !seen.includes(k)).length;
  // 今天自己一個人抽、沒有重抽掉的（最後定下來的那一支）
  const today = now ? dayOf(now) : '';
  const solos = draws
    .filter(
      (d) =>
        d.uid === me.id &&
        d.mode === 'solo' &&
        !d.rerolled &&
        !!d.createdAt &&
        dayOf(d.createdAt.getTime()) === today &&
        restaurantMap.has(d.rid),
    )
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
    // 只列最新定下來的那一支：今天要去哪
    .slice(0, 1);
  const markSeen = () => setSeen((s) => [...new Set([...s, ...keys])].slice(-160));

  // 資料一變就跟上一次比：有新消息就跳橫幅、通知鈕晃一下（第一次載入不跳）
  const [prev, setPrev] = useState(data);
  const [news, setNews] = useState<News | null>(null);
  const [ring, setRing] = useState(0);
  const [pulse, setPulse] = useState<HeraldValue['pulse']>(null);
  if (data !== prev) {
    setPrev(data);
    if (prev && data) {
      const before = new Map(prev.map((o) => [o.id, o]));
      const drawn = data.find((o) => freshDraw(o, before.get(o.id), me.id) && inTeam(o, me.id));
      if (drawn) setPulse({ id: drawn.id, n: (pulse?.n ?? 0) + 1 });
      const found = describe(
        prev,
        data,
        me.id,
        copy,
        (u) => memberMap.get(u)?.name ?? '同事',
        (rid) => restaurantMap.get(rid)?.name ?? '',
      );
      if (found) {
        setNews({ ...found, n: ring + 1 });
        setRing(ring + 1);
      }
    }
  }
  // 分頁：沒選過就停在第一個有東西的那一頁（有人揪你就先看收到的）
  const [tab, setTab] = useState<Tab | null>(null);
  const counts: Record<Tab, number> = { inbox: invites.length, sent: hosting ? 1 : 0, solo: solos.length };
  const active: Tab = tab ?? TABS.find((k) => counts[k] > 0) ?? 'inbox';
  const pickTab = (k: Tab) => {
    if (k === active) return;
    // 廟宇翻一頁簿子，魔法是信匣裡亮一下
    if (theme.id === 'magic') twinkle(3);
    else paper(0.12);
    setTab(k);
  };
  const show = () => {
    markSeen();
    setNews(null);
    setTab(null);
    setOpen(true);
  };
  const hide = () => {
    markSeen();
    setOpen(false);
  };
  const [, setMode] = usePersisted<string>(`lunchstick:mode:${me.id}`, 'solo');
  const ding = useEffectEvent((n: News) => {
    if (n.depart) {
      // 團裡有人按了出發：跟自己按的時候一樣，從自己畫面上的出發按鈕（籤卡或通知裡的；都沒開就用首頁的大按鈕）
      // 放出鞭炮（掃帚）。開著的通知先收起來（它蓋在最上層會擋住動畫），收好再放；籤卡由首頁自己收。
      const btn =
        document.querySelector('.oracle .oracle__go') ??
        document.querySelector('dialog[open] .invite__go') ??
        document.querySelector('.dock__cta') ??
        document.querySelector('.herald-news__glyph');
      const r = (btn?.querySelector('.glyph') ?? btn)?.getBoundingClientRect();
      // 按鈕被捲到畫面外時，拉回畫面裡
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
    // 預設已經加入：首頁切到揪團吃，看得到團的名單、隊友抽到時一起翻開籤卡
    if (n.joined) window.setTimeout(() => setMode('group'), 0);
  });
  useEffect(() => {
    if (!news) return;
    ding(news);
    const t = setTimeout(() => setNews(null), 6500);
    return () => clearTimeout(t);
  }, [news]);

  const find = (id: string) => data?.find((o) => o.id === id);

  // 通知裡按了「抽」：收起通知、回到首頁（切成揪團吃），由首頁幫這一團抽，整段儀式看得到
  const router = useRouter();
  const pathname = usePathname();
  const [drawAsk, setDrawAsk] = useState<HeraldValue['drawAsk']>(null);
  const askDraw = (o: Outing) => {
    void ensureJoined(o, me.id).catch(() => {});
    hide();
    setMode('group');
    setDrawAsk((d) => ({ id: o.id, n: (d?.n ?? 0) + 1 }));
    if (pathname !== '/') router.push('/');
  };
  const doneDrawAsk = () => setDrawAsk(null);

  return (
    <HeraldContext.Provider
      value={{ invites, hosting, team, pulse, find, drawAsk, askDraw, doneDrawAsk, unread, ring, show }}
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
          {!hosting && invites.length === 0 && solos.length === 0 ? (
            <theme.Vignette kind="herald-empty" />
          ) : (
            <>
              {/* 三個分頁，各蓋一顆章（收／發／獨）；分頁裡的標題是那一頁的說法 */}
              <div className="herald__tabs" role="tablist" aria-label={copy.herald.name}>
                {TABS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    id={`herald-tab-${k}`}
                    aria-selected={active === k}
                    aria-controls="herald-panel"
                    className={`herald__tab herald__tab--${k}${active === k ? ' is-on' : ''}`}
                    onClick={() => pickTab(k)}
                  >
                    <Seal text={copy.herald.marks[k]} size={34} color="var(--sec)" className="herald__mark" />
                    <span>{copy.herald.tabs[k]}</span>
                    {counts[k] > 0 && <b className="herald__tab-count">{counts[k]}</b>}
                  </button>
                ))}
              </div>
              <section
                key={active}
                id="herald-panel"
                role="tabpanel"
                aria-labelledby={`herald-tab-${active}`}
                className={`herald__sec herald__sec--${active}`}
              >
                <h3>{copy.herald[active]}</h3>
                {active === 'inbox' && invites.map((o) => <InviteCard key={o.id} o={o} />)}
                {active === 'sent' && hosting && <HostCard o={hosting} />}
                {active === 'solo' && solos.map((d) => <SoloCard key={d.id} d={d} />)}
                {counts[active] === 0 && <theme.Vignette kind={`herald-${active}`} />}
              </section>
            </>
          )}
        </div>
      </Sheet>
    </HeraldContext.Provider>
  );
}

/** 上方的鑼（貓頭鷹）：有新消息時晃一下，旁邊記著幾則還沒看 */
export function HeraldButton() {
  const { unread, ring, show } = useHerald();
  const { theme } = useTheme();
  return (
    <button
      type="button"
      className={`herald-btn${unread ? ' has-news' : ''}`}
      onClick={() => {
        // 廟宇：木槌碰一下鑼（有新消息就整個敲響）；魔法：貓頭鷹拍翅探頭（有新信就叫兩聲）
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

/** 今天自己一個人定下來的那一支：一張小帖（廟宇松綠帖頭、魔法夜綠色的信），幾點抽的、哪一家，有地圖就帶我去 */
function SoloCard({ d }: { d: DrawRecord }) {
  const { me, restaurantMap } = useAppData();
  const { theme } = useTheme();
  const { copy } = theme;
  const r = restaurantMap.get(d.rid);
  if (!r) return null;
  // 當時那一首籤詩（這台裝置記得的話原樣攤開）
  const reading = soloReading(theme, r, me.id, d.id);
  return (
    <article className="invite invite--solo">
      <span className="invite__paper" aria-hidden="true" />
      <header className="invite__head">
        <span className="invite__glyph">
          <theme.Glyph name="shake" size={32} />
        </span>
        <p>
          <b>{copy.herald.soloNote}</b>
          <span>
            {categoryOf(r.category).label}・步行{walkOf(r.walk).label}
          </span>
        </p>
        <i className="invite__seal" aria-hidden="true" />
      </header>
      <div className="invite__body">
        <Postmark at={d.createdAt} />
        <h4 className="invite__shop">{r.name}</h4>
        <p className="invite__lot">
          {reading.numberText}・{reading.grade.name}
        </p>
        <p className="invite__verse">
          {reading.lines.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </p>
        <p className="invite__solo-line">{copy.herald.soloLine}</p>
      </div>
      {r.mapUrl && (
        <div className="invite__actions">
          <a className="btn btn--zhu" href={r.mapUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="pin" size={20} />
            {copy.outing.map}
          </a>
        </div>
      )}
    </article>
  );
}

/** 別人揪我的一張紅帖（一封信）：組隊時回覆要不要加入，抽到了看是哪一家（要求的話回覆去不去），出發了帶我去 */
function InviteCard({ o }: { o: Outing }) {
  const { me, memberMap, restaurantMap } = useAppData();
  const { theme } = useTheme();
  const { copy } = theme;
  const toast = useToast();
  const host = memberMap.get(o.host) ?? { id: o.host, name: '同事', photoURL: '' };
  const r = o.rid ? restaurantMap.get(o.rid) : undefined;
  const mine = o.answers[me.id];
  const reply = o.replies[me.id];
  const t = tallyOf(o, '');
  const [, setMode] = usePersisted<string>(`lunchstick:mode:${me.id}`, 'solo');
  const oops = () => toast('沒有回覆成功，等一下再試', '咦');
  const answer = (a: Answer) => {
    // 加入了就把首頁切到揪團吃：在首頁也能幫大家抽
    if (a === 'go') setMode('group');
    return answerOuting(o.id, me.id, a).catch(oops);
  };
  const drawer = memberMap.get(o.by)?.name ?? host.name;
  const respond = (a: Answer) => {
    // 還沒回覆組隊邀請就直接回覆去不去：一併算加入（或這次不了）
    if (!mine) void answer(a);
    return replyOuting(o.id, me.id, a).catch(oops);
  };

  const sub =
    o.status === 'gathering'
      ? copy.crew.tally(t.go, t.wait, t.pass)
      : o.status === 'drawn'
        ? copy.outing.drew(drawer)
        : copy.outing.depart;

  return (
    <article className={`invite is-${o.status}${mine ? ` has-${mine}` : ''}`}>
      <span className="invite__paper" aria-hidden="true" />
      <header className="invite__head">
        <Avatar member={host} size={36} />
        <p>
          <b>{copy.outing.invited(host.name)}</b>
          <span>{sub}</span>
        </p>
        <i className="invite__seal" aria-hidden="true" />
      </header>
      <div className="invite__body">
        <Postmark at={o.createdAt} />
        {r && o.status !== 'gathering' && <Pick o={o} r={r} />}
        <MateMarks outing={o} size={32} />
      </div>
      <div className="invite__actions">
        {o.status === 'go' ? (
          <>
            {r?.mapUrl && (
              <a className="btn btn--zhu" href={r.mapUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="pin" size={20} />
                {copy.outing.map}
              </a>
            )}
          </>
        ) : mine === 'pass' ? (
          <>
            <p className="invite__note">{copy.outing.skipped}</p>
            <button type="button" className="btn btn--quiet" onClick={() => answer('go')}>
              <theme.Glyph name="rethink" size={22} />
              {copy.outing.rejoin}
            </button>
          </>
        ) : o.status === 'drawn' && o.confirm ? (
          reply ? (
            <>
              <p className="invite__note">
                {reply === 'go' ? copy.outing.yes : copy.outing.no}・{copy.outing.waiting(t.wait)}
              </p>
              {reply === 'go' && r && <Depart o={o} r={r} />}
              {mine === 'go' && <TeamDraw o={o} />}
              <button type="button" className="btn btn--quiet" onClick={() => respond(reply === 'go' ? 'pass' : 'go')}>
                <theme.Glyph name="rethink" size={22} />
                {copy.outing.rejoin}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn--zhu" onClick={() => respond('go')}>
                <theme.Glyph name="invite" size={22} />
                {copy.outing.yes}
              </button>
              <button type="button" className="btn btn--line" onClick={() => respond('pass')}>
                <theme.Glyph name="skip" size={20} />
                {copy.outing.no}
              </button>
            </>
          )
        ) : inTeam(o, me.id) ? (
          <>
            {o.status === 'drawn' && <p className="invite__note">{copy.outing.waiting(t.wait)}</p>}
            {o.status === 'drawn' && r && <Depart o={o} r={r} />}
            <TeamDraw o={o} />
            <button type="button" className="btn btn--quiet" onClick={() => answer('pass')}>
              <theme.Glyph name="skip" size={20} />
              {copy.outing.skip}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn--zhu" onClick={() => answer('go')}>
              <theme.Glyph name="invite" size={22} />
              {copy.outing.join}
            </button>
            <button type="button" className="btn btn--line" onClick={() => answer('pass')}>
              <theme.Glyph name="skip" size={20} />
              {copy.outing.skip}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

/** 我發出去的：大家回覆得怎樣、抽到哪一家；可以收回 */
function HostCard({ o }: { o: Outing }) {
  const { me, restaurantMap } = useAppData();
  const { theme } = useTheme();
  const { copy } = theme;
  const toast = useToast();
  const r = o.rid ? restaurantMap.get(o.rid) : undefined;
  const t = tallyOf(o, me.id);
  return (
    <article className={`invite invite--host is-${o.status}`}>
      <span className="invite__paper" aria-hidden="true" />
      <header className="invite__head">
        <span className="invite__glyph">
          <theme.Glyph name="invite" size={32} />
        </span>
        <p>
          <b>{copy.crew.sent}</b>
          <span>{copy.crew.tally(t.go, t.wait, t.pass)}</span>
        </p>
        <i className="invite__seal" aria-hidden="true" />
      </header>
      <div className="invite__body">
        <Postmark at={o.createdAt} />
        {r && o.status === 'drawn' && <Pick o={o} r={r} />}
        <MateMarks outing={o} skip={me.id} size={32} />
      </div>
      <div className="invite__actions">
        {o.status === 'drawn' && <p className="invite__note">{copy.outing.waiting(t.wait)}</p>}
        {o.status === 'drawn' && r && <Depart o={o} r={r} />}
        <TeamDraw o={o} />
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => endOuting(o.id, 'closed').catch(() => toast('沒有收回成功，等一下再試', '咦'))}
        >
          <theme.Glyph name="recall" size={20} />
          {copy.crew.recall}
        </button>
      </div>
    </article>
  );
}

/**
 * 團裡的人都能在這裡幫大家抽：還沒抽是第一支，抽到之後是重抽（扣全隊共用的次數）。
 * 按了會回到首頁抽，大家一起即時翻開同一張籤。
 */
function TeamDraw({ o }: { o: Outing }) {
  const { theme } = useTheme();
  const { copy } = theme;
  const { askDraw } = useHerald();
  const drawn = o.status === 'drawn' && !!o.by;
  if (drawn && o.rerolls <= 0) return <p className="invite__note">{copy.noMore}</p>;
  // 還沒抽是第一支（不扣次數），抽到之後是重抽；按鈕裡都是全隊剩下的香（魔力球）
  return (
    <button type="button" className="btn btn--zhu invite__draw" onClick={() => askDraw(o)}>
      <theme.Glyph name="shake" size={24} />
      {drawn ? copy.reroll : copy.drawCta}
      <Charges left={o.rerolls} total={REROLLS} label={copy.outing.left(o.rerolls, true)} />
    </button>
  );
}

/** 抽到了就可以出發：有地圖就順便打開，大家即時收到「出發囉」 */
function Depart({ o, r }: { o: Outing; r: Restaurant }) {
  const { me } = useAppData();
  const { theme } = useTheme();
  const toast = useToast();
  const go = (e: MouseEvent<HTMLElement>) => {
    theme.departFx(e.currentTarget);
    if (r.mapUrl) {
      e.preventDefault();
      openMapSoon(r.mapUrl);
    }
    markDeparted(o.id);
    ensureJoined(o, me.id)
      .then(() => endOuting(o.id, 'go'))
      .catch(() => toast('沒有成功，等一下再試', '咦'));
  };
  return r.mapUrl ? (
    <a className="btn btn--zhu invite__go" href={r.mapUrl} target="_blank" rel="noopener noreferrer" onClick={go}>
      <theme.Glyph name="depart" size={24} />
      {theme.copy.go}
    </a>
  ) : (
    <button type="button" className="btn btn--zhu invite__go" onClick={go}>
      <theme.Glyph name="depart" size={24} />
      {theme.copy.go}
    </button>
  );
}

/** 抽到的那一支：店名、籤號籤等、四句籤詩（AI 寫的，沒有就用原本的）；發起人和被揪的人看到的一樣 */
function Pick({ o, r }: { o: Outing; r: Restaurant }) {
  const { theme } = useTheme();
  const reading = theme.read(r, 'group', o.variant || undefined, seeded(o.seed));
  const lines = o.lines.length === 4 ? o.lines : reading.lines;
  return (
    <>
      <h4 className="invite__shop">{r.name}</h4>
      <p className="invite__lot">
        {reading.numberText}・{reading.grade.name}
      </p>
      <p className="invite__verse">
        {lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </p>
    </>
  );
}
