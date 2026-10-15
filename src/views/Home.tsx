'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Oracle } from '@/components/Oracle';
import { UnsealCard } from '@/components/UnsealCard';
import { Charges } from '@/components/Charges';
import { Seal } from '@/components/Seal';
import { Icon } from '@/components/Icon';
import { CategoryFilter } from '@/components/CategoryFilter';
import { CrewPicker } from '@/components/CrewPicker';
import { useHerald } from '@/components/Herald';
import { MateMarks, tallyOf } from '@/components/MateMarks';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { useAppData } from '@/lib/appData';
import { useUi } from '@/lib/uiContext';
import { useShake } from '@/lib/useShake';
import { candidates, drawOne, type DrawFilters, type Preference } from '@/lib/draw';
import {
  REROLLS,
  drawOuting,
  endOuting,
  markRerolled,
  recordDraw,
  saveToday,
  setPref,
  startGathering,
  type Outing,
  ensureJoined,
} from '@/lib/store';
import { newSeed, seeded } from '@/lib/random';
import { saveSoloPick, soloReading } from '@/lib/soloPicks';
import { askVerse } from '@/lib/verse';
import { markDeparted } from '@/lib/depart';
import { CATEGORIES, PRICES, type CategoryId, type DrawMode, type Price, type Restaurant } from '@/lib/types';
import { reducedMotion, sleep } from '@/lib/motion';
import { usePersisted } from '@/lib/usePersisted';
import { useNow } from '@/lib/useBrowser';
import { useTheme, type Reading, type StageHandle } from '@/themes';
import './Home.css';

const RECENT_MS = 3 * 86400_000;
/** 儀式動畫結束後，最多再等 AI 寫籤詩多久；來不及就用原本的籤詩 */
const VERSE_WAIT_MS = 1600;
const NO_CREW: string[] = [];
const NO_FILTERS: DrawFilters = { categories: [], prices: [] };

type Phase = 'idle' | 'drawing' | 'revealed' | 'leaving';

/**
 * 把舞台捲回畫面裡，捲完才回來：上緣被頂列蓋住就往上捲，下緣在畫面外就往下捲；整個舞台都看得到就不動。
 * 減少動態效果時直接跳過去，不用平滑捲動。
 */
function revealStage(el: HTMLElement | null): Promise<void> {
  if (!el) return Promise.resolve();
  const bar = document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0;
  const r = el.getBoundingClientRect();
  const by =
    r.top < bar
      ? r.top - bar
      : r.bottom > window.innerHeight
        ? Math.min(r.bottom - window.innerHeight, r.top - bar)
        : 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const top = Math.max(0, Math.min(max, window.scrollY + by));
  if (Math.abs(window.scrollY - top) < 2) return Promise.resolve();
  if (reducedMotion()) {
    window.scrollTo({ top });
    return Promise.resolve();
  }
  window.scrollTo({ top, behavior: 'smooth' });
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () =>
      Math.abs(window.scrollY - top) < 2 || performance.now() - start > 900 ? resolve() : requestAnimationFrame(tick);
    requestAnimationFrame(tick);
  });
}
/** 當地的日期：自己抽的額度每天重來 */
/** 重抽的碎念：看這是第幾次重抽，從那一組隨機挑一句 */
const tauntFor = (taunts: string[][], left: number) => {
  const set = taunts[REROLLS - left] ?? [];
  return set[Math.floor(Math.random() * set.length)] ?? '';
};

const dayOf = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** 把 AI 寫的籤詩換進網站抽好的籤（籤號、籤等不變） */
const withVerse = (
  reading: Reading,
  verse: { lines: readonly string[]; verdict: string } | null | undefined,
): Reading =>
  verse && verse.lines.length === 4 && verse.verdict
    ? { ...reading, lines: verse.lines as Reading['lines'], verdict: verse.verdict }
    : reading;

export function Home() {
  const { me, members, memberMap, restaurants, restaurantMap, draws, ready } = useAppData();
  const { theme } = useTheme();
  const { copy, StageTop, StageFloor, Loader } = theme;
  const toast = useToast();
  const router = useRouter();
  const { setAddOpen } = useUi();
  const stage = useRef<StageHandle>(null);
  const stageEl = useRef<HTMLElement>(null);

  const [mode, setMode] = usePersisted<DrawMode>(`lunchstick:mode:${me.id}`, 'solo');
  const [crew, setCrew] = usePersisted<string[]>(`lunchstick:crew:${me.id}`, NO_CREW);
  const [filters, setFilters] = usePersisted<DrawFilters>(`lunchstick:filters:${me.id}`, NO_FILTERS);
  const [prefer, setPrefer] = usePersisted<Preference>(`lunchstick:prefer:${me.id}`, 'favorites');

  const [phase, setPhase] = useState<Phase>('idle');
  // key 換了籤卡就重新展開一次（團裡有人重抽時，開著的籤卡直接翻成新的那一支）
  // team：這張籤卡是哪一團的那一支（團裡大家看的是同一張）
  const [result, setResult] = useState<{
    key: string;
    r: Restaurant;
    reading: Reading;
    spent?: boolean;
    team?: string;
  } | null>(null);
  const [taunt, setTaunt] = useState('');
  const chain = useRef<{ drawId: string | null; seen: string[] }>({ drawId: null, seen: [] });
  // 這一團抽過的店（隊友抽到、翻到我這邊的，和自己幫大家抽的）：重抽時避開，不會又抽回同一家。
  // 記在團上，關掉籤卡再從通知重抽也記得；換了一團就重來
  const [teamSeen, setTeamSeen] = useState<{ id: string; rids: string[] } | null>(null);
  const seeInTeam = (id: string, rid: string) =>
    setTeamSeen((s) =>
      s?.id === id ? (s.rids.includes(rid) ? s : { id, rids: [...s.rids, rid] }) : { id, rids: [rid] },
    );
  const pendingReroll = useRef(false);
  // 自己抽、重抽次數用完時最後看到的那一支：首頁大按鈕（點籤筒）可以再攤開來看
  const [finalPick, setFinalPick] = useState<{ r: Restaurant; reading: Reading } | null>(null);
  // 揪團：我在的那一團（自己發的，或加入別人的），一切都即時更新；團裡誰都可以幫大家抽
  const { team: liveTeam, pulse, find: findOuting, drawAsk, doneDrawAsk } = useHerald();
  const team = mode === 'group' ? liveTeam : null;

  // 常一起吃的人：這個月一起抽過（而且沒有被重抽）兩次以上的同事
  const regulars = useMemo(() => {
    const times = new Map<string, number>();
    draws
      .filter((d) => !d.rerolled && d.party.length > 1 && d.party.includes(me.id))
      .forEach((d) => d.party.forEach((u) => u !== me.id && times.set(u, (times.get(u) ?? 0) + 1)));
    return new Map([...times].filter(([, n]) => n >= 2));
  }, [draws, me.id]);
  // 常揪的排前面（一起吃越多次越前面），其他照名字
  const others = useMemo(
    () =>
      members
        .filter((m) => m.id !== me.id)
        .sort(
          (a, b) => (regulars.get(b.id) ?? 0) - (regulars.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'zh-Hant'),
        ),
    [members, me.id, regulars],
  );
  // 在團裡就照團的名單（說這次不了的人不算），還沒組團就照勾選的人
  const party = useMemo(() => {
    if (mode === 'solo') return [me];
    if (team) return [me, ...others.filter((m) => team.party.includes(m.id) && team.answers[m.id] !== 'pass')];
    return [me, ...others.filter((m) => crew.includes(m.id))];
  }, [mode, me, others, crew, team]);

  const now = useNow();
  // 重抽額度寫在資料庫：自己抽的每天三次（第一次不扣），團裡的全隊共用（誰抽都扣同一份）
  const today = now ? dayOf(now) : '';
  const soloUsed = !!today && me.today?.day === today;
  // 揪團吃但還沒成團：抽的時候會開一團新的，用的是那一團自己的三次，不扣自己今天的
  const solo = party.length <= 1;
  const rerollsLeft = team ? team.rerolls : solo && soloUsed ? (me.today?.left ?? REROLLS) : REROLLS;
  const charged = team ? !!team.by : solo && soloUsed;
  const canDraw = !charged || rerollsLeft > 0;
  // 自己抽的次數用完了：籤筒貼上封條，大按鈕換成「請看今日定案」，點了重新攤開今天最後那一支
  const spentAll = !team && charged && rerollsLeft <= 0;
  const finalCard = useMemo(() => {
    if (!spentAll) return null;
    const last = draws
      .filter(
        (d) =>
          d.uid === me.id &&
          d.mode === 'solo' &&
          !d.rerolled &&
          !!d.createdAt &&
          dayOf(d.createdAt.getTime()) === today,
      )
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))[0];
    const r = last && restaurantMap.get(last.rid);
    if (!r) return finalPick;
    if (finalPick?.r.id === r.id) return finalPick;
    // 重新整理過、記憶裡沒有那張籤卡：用這台裝置記下的那一首（沒有就用紀錄的 id 重寫，每次都一樣）
    return { r, reading: soloReading(theme, r, me.id, last.id) };
  }, [spentAll, draws, me.id, today, restaurantMap, finalPick, theme]);
  // 下面那行顯示剩幾次（香／魔力球）；揪團吃還沒成團時不提自己的次數
  const showCharges = charged && (mode === 'solo' || !!team) && !spentAll;
  const recent = useMemo(() => {
    const cut = now - RECENT_MS;
    return draws.filter((d) => d.uid === me.id && !d.rerolled && (d.createdAt?.getTime() ?? 0) > cut).map((d) => d.rid);
  }, [draws, me.id, now]);

  // 探店用：一起吃的人這陣子（這個月或最近三天）已經吃過的店
  const eaten = useMemo(() => {
    const ids = new Set(party.map((m) => m.id));
    return [
      ...new Set(
        draws.filter((d) => !d.rerolled && (ids.has(d.uid) || d.party.some((u) => ids.has(u)))).map((d) => d.rid),
      ),
    ];
  }, [draws, party]);

  const pool = useMemo(
    () => candidates({ restaurants, party, filters, recent, prefer, eaten }),
    [restaurants, party, filters, recent, prefer, eaten],
  );

  const toggleCat = (id: CategoryId) =>
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id],
    }));
  const togglePrice = (v: Price) =>
    setFilters((f) => ({ ...f, prices: f.prices.includes(v) ? f.prices.filter((p) => p !== v) : [...f.prices, v] }));
  const clearFilters = () => setFilters({ categories: [], prices: [] });
  const toggleCrew = (id: string) => setCrew((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  /**
   * 抽籤：先跑主題的儀式動畫，同時請 AI 寫一首新的籤詩；動畫結束就展開籤詩（AI 來不及就用原本的）。
   * pick 是使用者直接點的法器（魔法版）。額度寫回資料庫；在團裡就寫到揪團單上，全隊即時看到同一支籤。
   */
  async function runDraw(pick?: string) {
    if (!canDraw) {
      toast(copy.noMore, copy.acceptSeal);
      setTaunt('');
      setPhase('idle');
      return;
    }
    const hit = drawOne({
      restaurants,
      party,
      filters,
      recent,
      prefer,
      eaten,
      exclude: [
        ...chain.current.seen,
        ...(team && teamSeen?.id === team.id ? teamSeen.rids : []),
        // 幫大家重抽：團裡現在那一支一定要換掉
        ...(team?.by ? [team.rid] : []),
      ],
    });
    if (!hit) {
      toast(copy.emptyTitle, '空');
      setTaunt('');
      setPhase('idle');
      return;
    }
    const r = hit.restaurant;
    const ids = party.map((m) => m.id);
    const m: DrawMode = ids.length > 1 ? 'group' : 'solo';
    // 籤詩用固定的種子：籤號、籤等先決定好，AI 照著籤等寫；被揪的人用同一個種子，看到同一張籤
    const seed = newSeed();
    const draft = theme.read(r, m, pick, seeded(seed));
    const verse = askVerse({
      theme: theme.id,
      restaurant: r,
      party: ids.length,
      grade: draft.grade.name,
      variant: pick,
    });
    setPhase('drawing');
    // 頁面往下捲著的時候（例如揪團名單很長）先捲回舞台，整段儀式才看得到
    await revealStage(stageEl.current);
    const variant = (await stage.current?.draw(pick)) ?? pick;
    setTaunt('');
    chain.current.seen = [...chain.current.seen, r.id];
    if (team) seeInTeam(team.id, r.id);
    chain.current.drawId = null;
    const recorded = recordDraw(me.id, r.id, m, ids)
      .then((id) => (chain.current.drawId = id))
      .catch(() => null);
    const written = await Promise.race([verse, sleep(VERSE_WAIT_MS).then(() => null)]);
    // 自己抽的：把這一首記在這台裝置，報馬仔「自己來拜拜」、「請看今日定案」攤開的是同一首
    if (m === 'solo' && !team)
      void recorded.then(
        (id) =>
          id &&
          saveSoloPick(me.id, {
            id,
            rid: r.id,
            seed,
            variant: variant ?? '',
            lines: written?.lines ? [...written.lines] : [],
            verdict: written?.verdict ?? '',
          }),
      );
    setResult({
      key: `${r.id}:${seed}`,
      r,
      reading: withVerse(theme.read(r, m, variant, seeded(seed)), written),
      spent: charged,
      team: team?.id,
    });
    setPhase('revealed');

    const left = charged ? rerollsLeft - 1 : REROLLS;
    const shared = {
      rid: r.id,
      seed,
      variant: variant ?? '',
      lines: written?.lines ?? [],
      verdict: written?.verdict ?? '',
    };
    if (team) {
      ensureJoined(team, me.id)
        .then(() => drawOuting(team.id, me.id, team.by ? team.rerolls - 1 : team.rerolls, shared))
        .catch(() => toast(`有人搶先抽了，看看${copy.herald.name}`, '咦'));
    } else if (ids.length > 1) {
      // 勾了人但還沒發邀請：抽的時候順便發出去，大家即時收到抽到哪一家
      startGathering(me.id, ids, false)
        .then((id) => drawOuting(id, me.id, REROLLS, shared))
        .catch(() => {});
    } else if (today) {
      saveToday(me.id, { day: today, left: Math.max(0, left) }).catch(() => {});
    }
  }

  /** 團裡有人抽了（或我點了「看籤」）：直接翻開團裡那一支，不重抽、不扣額度 */
  const showTeamPick = (o: Outing) => {
    const r = restaurantMap.get(o.rid);
    if (!r) return;
    const reading = theme.read(r, 'group', o.variant || undefined, seeded(o.seed));
    setResult({ key: `${r.id}:${o.seed}`, r, reading: withVerse(reading, o), team: o.id });
    seeInTeam(o.id, r.id);
    setPhase('revealed');
  };
  // 團裡別人抽到新的一支：在首頁的人一起翻開同一張籤；正開著籤卡的人，籤卡直接翻成新的那一支
  const [pulseSeen, setPulseSeen] = useState(pulse?.n ?? 0);
  if (pulse && pulse.n !== pulseSeen) {
    setPulseSeen(pulse.n);
    if (team && team.id === pulse.id && team.status === 'drawn' && (phase === 'idle' || phase === 'revealed'))
      showTeamPick(team);
  }

  /** 攤開今天的定案：不扣次數、不另外記一筆，籤卡上落下定案章 */
  function showFinal() {
    if (phase !== 'idle' || !finalCard) return;
    setTaunt('');
    setResult({ key: `final-${Date.now()}`, r: finalCard.r, reading: finalCard.reading });
    setPhase('revealed');
  }

  const shake = useShake(() => {
    if (phase !== 'idle') return;
    if (spentAll && finalCard) showFinal();
    else if (pool.length) void runDraw();
  }, phase === 'idle');

  const startDraw = (pick?: string) => {
    if (phase !== 'idle') return;
    if (spentAll && finalCard) {
      showFinal();
      return;
    }
    // 關掉籤卡後從外面（大按鈕、籤筒、搖手機）再抽，一樣會扣一次：碎念也一樣跳出來
    if (charged && rerollsLeft > 0) setTaunt(tauntFor(copy.taunts, rerollsLeft));
    void runDraw(pick);
  };

  // 開著的是團裡那一支，但那一團已經出發、被收回，或我說不跟了：籤卡改成告訴你結果，不能再重抽
  const over = result?.team && result.team !== team?.id ? (findOuting(result.team) ?? null) : undefined;
  const overNote =
    over === undefined
      ? undefined
      : over?.status === 'closed'
        ? copy.outing.closed(memberMap.get(over.host)?.name ?? '同事')
        : over && over.status !== 'go' && over.answers[me.id] === 'pass'
          ? copy.outing.skipped
          : copy.outing.depart;

  // 團裡別人按了出發：開著的這張籤卡跟著收起來（跟自己按出發時一樣）
  const departed = over?.status === 'go';
  useEffect(() => {
    if (!departed || phase !== 'revealed') return;
    const t = setTimeout(() => setPhase('leaving'), 60);
    return () => clearTimeout(t);
  }, [departed, phase]);

  const reroll = () => {
    if (phase !== 'revealed' || rerollsLeft <= 0 || overNote) return;
    pendingReroll.current = true;
    setTaunt(tauntFor(copy.taunts, rerollsLeft));
    const prev = chain.current.drawId;
    if (prev) markRerolled(prev).catch(() => {});
    setPhase('leaving');
  };

  // 通知裡按了「抽」：等首頁切到那一團，再幫大家抽（籤卡開著就是重抽）
  const onDrawAsk = useEffectEvent(() => {
    if (!drawAsk || !team || team.id !== drawAsk.id) return;
    doneDrawAsk();
    if (phase === 'idle') startDraw();
    else if (phase === 'revealed') reroll();
  });
  useEffect(() => {
    if (!drawAsk) return;
    // 等通知收起來一下再抽
    const t = setTimeout(onDrawAsk, 120);
    return () => clearTimeout(t);
  }, [drawAsk, team?.id]);

  const close = (msg?: string) => {
    if (phase !== 'revealed') return;
    if (msg) toast(msg, copy.acceptSeal);
    // 揪團：決定了就通知大家出發；沒決定的話籤還留在團裡，大家都還看得到
    if (msg && team?.status === 'drawn') {
      markDeparted(team.id);
      ensureJoined(team, me.id)
        .then(() => endOuting(team.id, 'go'))
        .catch(() => {});
    }
    setPhase('leaving');
  };

  const onClosed = async () => {
    if (result && !result.team) setFinalPick({ r: result.r, reading: result.reading });
    setResult(null);
    await stage.current?.settle();
    if (pendingReroll.current) {
      pendingReroll.current = false;
      await sleep(160);
      await runDraw();
      return;
    }
    chain.current = { drawId: null, seen: [] };
    setPhase('idle');
  };

  const liked = result ? me.likes.includes(result.r.id) : false;
  const toggleLike = () => {
    if (!result) return;
    setPref(me.id, result.r.id, liked ? null : 'like').catch(() => toast('沒有存到，等一下再試', '咦'));
  };

  const addShop = () => {
    setAddOpen(true);
    router.push('/shops/');
  };

  const filtered = filters.categories.length + filters.prices.length > 0;
  const [filtersOpen, setFiltersOpen] = useState(false);
  // 搖手機被 iOS 拒絕了：點首頁的封印小標籤，攤開解封籤教怎麼重新允許
  const [unsealOpen, setUnsealOpen] = useState(false);
  const summary = [
    filters.categories.length
      ? CATEGORIES.filter((c) => filters.categories.includes(c.id))
          .map((c) => c.label)
          .join('、')
      : '全部類型',
    filters.prices.length
      ? PRICES.filter((p) => filters.prices.includes(p.v))
          .map((p) => p.label)
          .join('、')
      : '不限價位',
  ].join('・');
  const big = party.length >= 3;
  const busy = phase !== 'idle';
  // 資料還沒到之前供桌上不寫字，不會先閃一下「籤筒空空的」
  const label = !ready ? '' : pool.length > 0 ? copy.countLine(pool.length) : copy.emptyTitle;
  // 三人以上只抽適合多人的店：跟大家說一聲
  const hint = big && pool.length > 0 ? '三人以上只抽適合多人的店。' : '';
  // 團裡已經抽到了：大按鈕換成「看籤」，翻開團裡那一支
  const teamShop = team?.status === 'drawn' ? restaurantMap.get(team.rid) : undefined;
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setEntering(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="home">
      <section
        ref={stageEl}
        className={`stage${entering ? ' stage--enter' : ''}${phase === 'drawing' ? ' stage--busy' : ''}${spentAll && finalCard ? ' stage--spent' : ''}`}
        aria-label={copy.place}
      >
        <StageTop />
        {taunt && (
          <p className="stage__taunt" role="status">
            {taunt}
          </p>
        )}
        {spentAll && finalCard && (
          // 今天的籤（魔力）用完了：一張封條斜斜貼過籤筒（水晶球）
          <div className="stage__band" aria-hidden="true">
            <span className="stage__band-seal">
              <Seal text={copy.finalSeal} size={40} rotate={-6} />
            </span>
            <b>{copy.finalBand}</b>
            <i>{finalCard.r.name}</i>
          </div>
        )}
        <div className="stage__floor">
          <StageFloor
            ref={stage}
            count={pool.length}
            busy={busy}
            onTap={(pick) => (spentAll && finalCard ? showFinal() : pool.length > 0 && startDraw(pick))}
            label={label}
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {label}
        </p>
      </section>

      <section className="dock" aria-label="條件">
        <div className="dock__intro">
          <p className="eyebrow">
            {copy.eyebrow} · {copy.place}
          </p>
          <h1 className="dock__title">
            今天吃什麼，
            <br />
            <span className="dock__accent">{copy.tagline}</span>
          </h1>
          <p className="dock__lede">{copy.lede[prefer]}</p>
        </div>

        <div className="dock__row">
          <div className="seg" role="radiogroup" aria-label="誰要吃">
            <button type="button" role="radio" aria-checked={mode === 'solo'} onClick={() => setMode('solo')}>
              自己吃
            </button>
            <button type="button" role="radio" aria-checked={mode === 'group'} onClick={() => setMode('group')}>
              揪團吃
            </button>
          </div>
          <div className="seg" role="radiogroup" aria-label="怎麼抽">
            <button
              type="button"
              role="radio"
              aria-checked={prefer === 'favorites'}
              onClick={() => setPrefer('favorites')}
            >
              愛店優先
            </button>
            <button type="button" role="radio" aria-checked={prefer === 'explore'} onClick={() => setPrefer('explore')}>
              探店
            </button>
          </div>
        </div>

        {mode === 'group' && (
          <CrewPicker me={me} others={others} selected={crew} onToggle={toggleCrew} onSet={setCrew} />
        )}

        {/* 篩選：一行摘要，點了從下面拉出一張紙（電腦在中間），頁面本身不會被撐長、不用捲動 */}
        <button
          type="button"
          className={`filters__toggle${filtered ? ' is-set' : ''}`}
          aria-haspopup="dialog"
          onClick={() => setFiltersOpen(true)}
        >
          <span className="filters__label">篩選</span>
          <span className="filters__summary">{summary}</span>
          <svg className="filters__chev" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <Sheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          eyebrow="Filters"
          title="今天想吃哪一類？"
          icon={<Icon name="filter" size={34} />}
          footer={
            <>
              {filtered && (
                <button type="button" className="clear-chip" onClick={clearFilters}>
                  {copy.shops.clear}
                </button>
              )}
              <button type="button" className="btn btn--zhu" onClick={() => setFiltersOpen(false)}>
                就這樣
              </button>
            </>
          }
        >
          <div className="filters__panel">
            <p className="filters__count" key={pool.length}>
              {pool.length ? copy.countLine(pool.length) : copy.emptyTitle}
            </p>
            <CategoryFilter selected={filters.categories} onToggle={toggleCat} />
            <div className="pricegrid" role="group" aria-label="價位（可多選）">
              {PRICES.map((p) => (
                <button
                  key={p.v}
                  type="button"
                  className="chip"
                  aria-pressed={filters.prices.includes(p.v)}
                  onClick={() => togglePrice(p.v)}
                >
                  <theme.PriceMark n={p.v} size={13} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </Sheet>

        {!ready ? (
          <button type="button" className="btn btn--zhu btn--lg btn--block dock__cta is-busy" aria-disabled>
            <Loader size={30} label="讀取中" />
          </button>
        ) : restaurants.length === 0 ? (
          <button type="button" className="btn btn--zhu btn--lg btn--block dock__cta" onClick={addShop}>
            <Icon name="plus" />
            先新增第一家店
          </button>
        ) : spentAll && finalCard && !busy ? (
          <button
            type="button"
            className="btn btn--zhu btn--lg btn--block dock__cta dock__cta--final"
            onClick={showFinal}
          >
            <Seal text={copy.finalSeal} size={36} variant="outline" color="var(--accent)" rotate={-8} />
            {copy.finalCta}
          </button>
        ) : team && teamShop && !busy ? (
          <button
            type="button"
            className="btn btn--zhu btn--lg btn--block dock__cta"
            onClick={() => showTeamPick(team)}
          >
            {copy.outing.look(teamShop.name)}
          </button>
        ) : (
          <button
            type="button"
            className={`btn btn--zhu btn--lg btn--block dock__cta${busy ? ' is-busy' : ''}`}
            onClick={() => (pool.length ? startDraw() : clearFilters())}
            aria-disabled={busy}
          >
            {pool.length ? (
              busy ? (
                <>
                  <Loader size={30} label={copy.drawing} />
                  <span>{copy.drawing}</span>
                </>
              ) : (
                copy.drawCta
              )
            ) : (
              '放寬條件'
            )}
          </button>
        )}
        {(hint || showCharges || (shake.supported && canDraw)) && (
          <p className="dock__hint">
            {hint && <span>{hint}</span>}
            {showCharges && (
              // 跟通知卡片上「再抽一支」按鈕裡面一樣：籤筒（水晶球）、字、剩下的香（魔力球）；只是一行字，不是按鈕
              <span className="dock__charges">
                <theme.Glyph name="shake" size={22} />
                <span aria-hidden="true">{copy.reroll}</span>
                <Charges left={rerollsLeft} total={REROLLS} label={copy.outing.left(rerollsLeft, !!team)} />
              </span>
            )}
            {shake.supported &&
              canDraw &&
              (shake.denied ? (
                // iOS 拒絕過就不會再問：籤筒（水晶球）被封住、想搖卻卡住，點了攤開解封籤
                <button type="button" className="dock__shake is-sealed" onClick={() => setUnsealOpen(true)}>
                  <theme.Glyph name="shake" size={22} />
                  {copy.shake.denied}
                </button>
              ) : shake.enabled ? (
                <span className="dock__shake is-on">
                  <theme.Glyph name="shake" size={22} />
                  {copy.shake.on}
                </span>
              ) : (
                <button type="button" className="dock__shake" onClick={() => void shake.enable()}>
                  <theme.Glyph name="shake" size={22} />
                  {copy.shake.ask}
                </button>
              ))}
          </p>
        )}
      </section>

      {unsealOpen && <UnsealCard theme={theme} onClose={() => setUnsealOpen(false)} />}

      {result && (
        <Oracle
          key={result.key}
          theme={theme}
          restaurant={result.r}
          reading={result.reading}
          party={party.length}
          liked={liked}
          rerollsLeft={rerollsLeft}
          spent={result.spent}
          note={overNote}
          busy={phase !== 'revealed'}
          leaving={phase === 'leaving'}
          onReroll={reroll}
          onAccept={() => close(result.r.mapUrl ? copy.acceptedGo : copy.accepted)}
          onToggleLike={toggleLike}
          onClose={() => close()}
          onClosed={onClosed}
          crew={team && team.rid === result.r.id ? <CrewStrip outing={team} me={me.id} /> : undefined}
        />
      )}
    </div>
  );
}

/** 籤卡上的一行：要大家回覆時是頭像和回覆統計，不用回覆時是「報馬仔已通知幾位」 */
function CrewStrip({ outing, me }: { outing: Outing; me: string }) {
  const { theme } = useTheme();
  const { copy } = theme;
  const t = tallyOf(outing, me);
  return (
    <>
      <theme.Glyph name="herald" size={26} />
      {outing.confirm ? (
        <>
          <MateMarks outing={outing} skip={me} size={26} compact />
          <span>{copy.crew.tally(t.go, t.wait, t.pass)}</span>
        </>
      ) : (
        <span>{copy.outing.notified(outing.party.length - 1)}</span>
      )}
    </>
  );
}
