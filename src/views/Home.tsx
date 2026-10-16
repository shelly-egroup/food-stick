'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Oracle } from '@/components/Oracle';
import { UnsealCard } from '@/components/UnsealCard';
import { Candidates } from '@/components/Candidates';
import { Charges } from '@/components/Charges';
import { Seal } from '@/components/Seal';
import { Icon } from '@/components/Icon';
import { CategoryFilter, FilterRow, ROW_ICONS, WalkFilter } from '@/components/CategoryFilter';
import { CrewPicker } from '@/components/CrewPicker';
import { useHerald } from '@/components/Herald';
import { MateMarks } from '@/components/MateMarks';
import { Sheet } from '@/components/Sheet';
import { SlotPicker } from '@/components/SlotPicker';
import { StockPicker } from '@/components/StockPicker';
import { Tag, Tags } from '@/components/Tags';
import { LineIcon } from '@/components/CategoryIcon';
import { useToast } from '@/components/Toast';
import { useAppData } from '@/lib/appData';
import { useUi } from '@/lib/uiContext';
import { useShake } from '@/lib/useShake';
import { candidates, cleanFilters, drawOne, type DrawFilters, type Preference } from '@/lib/draw';
import {
  MAX_REROLLS,
  REROLLS,
  slotIcon,
  canDecide,
  canSwitch,
  canDraw,
  canReopen,
  canSkip,
  chosenOf,
  decided,
  isGoing,
  isLive,
  candidatesOf,
  latestOf,
  momentOf,
  repeatOf,
  mealIdOf,
  mealsFor,
  modeOf,
  pickOf,
  taipeiDate,
  type Meal,
  type MealFilters,
  type SkipWhy,
} from '@/lib/meal';
import {
  MealError,
  decideMeal,
  drawMeal,
  openMeal,
  setMealFilters,
  setPref,
  skipMeal,
  type PickInput,
} from '@/lib/store';
import { newSeed, seeded } from '@/lib/random';
import { askVerse, readingOf } from '@/lib/verse';
import { markDeparted } from '@/lib/depart';
import {
  CATEGORIES,
  PRICES,
  WALKS,
  type CategoryId,
  type DrawMode,
  type Member,
  type Price,
  type Restaurant,
  type Walk,
} from '@/lib/types';
import { reducedMotion, sleep } from '@/lib/motion';
import { usePersisted } from '@/lib/usePersisted';
import { useBrowserValue, useNow } from '@/lib/useBrowser';
import { useTheme, type Reading, type StageHandle } from '@/themes';
import './Home.css';

const RECENT_MS = 3 * 86400_000;
/** 儀式動畫結束後，最多再等 AI 寫籤詩多久；來不及就用原本的籤詩 */
const VERSE_WAIT_MS = 1600;
const NO_CREW: string[] = [];
/** 記著的重抽次數：0–5，壞掉的值回到預設 3 次 */
const cleanRerolls = (v: unknown) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_REROLLS ? v : REROLLS;
const NO_FILTERS: DrawFilters = { categories: [], prices: [], walks: [] };

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

/** 重抽的碎念：看這是第幾次重抽，從那一組隨機挑一句（次數比碎念多時，一直用最後一組） */
const tauntFor = (taunts: string[][], used: number) => {
  const set = taunts[Math.min(used, taunts.length - 1)] ?? [];
  return set[Math.floor(Math.random() * set.length)] ?? '';
};

/** 籤卡上現在攤開的那一支 */
interface Shown {
  key: string;
  mealId: string;
  r: Restaurant;
  reading: Reading;
  spent?: boolean;
  /** 在籤卡上左右切過來的：從哪一側滑進來 */
  swap?: 1 | -1;
}

/** 開發時強制切到某個彩蛋時段（只有 npm run dev 系列會讀） */
const readDevMoment = (): 'late' | null => {
  if (process.env.NODE_ENV !== 'development') return null;
  try {
    const v = localStorage.getItem('lunchstick:dev-moment');
    return v === 'late' ? v : null;
  } catch {
    return null;
  }
};

export function Home() {
  const { me, members, memberMap, restaurants, restaurantMap, meals, ready } = useAppData();
  const { theme } = useTheme();
  const { copy, StageTop, StageFloor, Loader } = theme;
  const toast = useToast();
  const router = useRouter();
  const { setAddOpen, slot, setSlot, focus, setFocus } = useUi();
  const stage = useRef<StageHandle>(null);
  const stageEl = useRef<HTMLElement>(null);

  const [mode, setMode] = usePersisted<DrawMode>(`lunchstick:mode:${me.id}`, 'solo');
  const [crew, setCrew] = usePersisted<string[]>(`lunchstick:crew:${me.id}`, NO_CREW);
  // 自己記在這台裝置的篩選：開新的一餐時帶進去
  const [savedFilters, setSavedFilters] = usePersisted(`lunchstick:filters:${me.id}`, NO_FILTERS, cleanFilters);
  const [savedPrefer, setSavedPrefer] = usePersisted<Preference>(`lunchstick:prefer:${me.id}`, 'favorites');
  const [savedRerolls, setSavedRerolls] = usePersisted(`lunchstick:rerolls:${me.id}`, REROLLS, cleanRerolls);

  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Shown | null>(null);
  const [taunt, setTaunt] = useState('');
  const pendingReroll = useRef(false);
  // 這家去不了：籤卡收起來之後，補抽一家時要拿掉的那一家
  const pendingSkip = useRef<{ rid: string; why: SkipWhy } | null>(null);
  const { pulse, drawAsk, doneDrawAsk, openAsk, doneOpenAsk, hide: hideHerald } = useHerald();

  // ---------- 現在的這一餐 ----------
  const t = useNow();
  const today = taipeiDate(t);
  const { live, done, own } = useMemo(() => mealsFor(meals, me.id, today, slot, t), [meals, me.id, today, slot, t]);
  // 從通知點進來的那一餐優先
  const focused = focus ? (meals.find((m) => m.id === focus && isLive(m, t) && isGoing(m, me.id)) ?? null) : null;
  /** 我要去、還在進行的那一餐 */
  const meal = focused ?? live;
  /** 首頁顯示的那一餐：還在進行的，或今天這一餐已經起駕過的 */
  const shown = meal ?? done;
  /** 沒有在進行的：我自己那張可以重新開張（次數接續） */
  const reopen = !meal && own && canReopen(own, t) ? own : null;
  const chosen = shown ? chosenOf(shown) : null;
  const finished = !!shown && shown.status === 'decided' && !!chosen;
  const isHost = !!meal && meal.host === me.id;

  // 篩選：這一餐開了就照這一餐的（發起人可以改），還沒開就照自己記的
  const filters: DrawFilters = meal ? meal.filters : savedFilters;
  const prefer: Preference = meal ? meal.filters.prefer : savedPrefer;
  const canEditFilters = !meal || (isHost && meal.status === 'open');
  const writeFilters = (next: MealFilters) => {
    setSavedFilters({ categories: next.categories, prices: next.prices, walks: next.walks });
    setSavedPrefer(next.prefer);
    if (meal && isHost) setMealFilters(meal.id, next).catch(() => toast('篩選沒有存到，等一下再試', '咦'));
  };
  const updateFilters = (fn: (f: DrawFilters) => DrawFilters) => {
    if (!canEditFilters) return;
    writeFilters({ ...fn(filters), prefer });
  };

  // 常一起吃的人：這個月一起起駕過兩次以上的同事
  const regulars = useMemo(() => {
    const times = new Map<string, number>();
    decided(meals)
      .filter((m) => m.going.length > 1 && m.going.includes(me.id))
      .forEach((m) => m.going.forEach((u) => u !== me.id && times.set(u, (times.get(u) ?? 0) + 1)));
    return new Map([...times].filter(([, n]) => n >= 2));
  }, [meals, me.id]);
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
  const group = meal ? modeOf(meal) === 'group' : mode === 'group';
  // 一起抽的人：這一餐要去的人；還沒開就照勾選的人
  const party = useMemo<Member[]>(() => {
    if (meal) return [me, ...meal.going.filter((u) => u !== me.id).flatMap((u) => memberMap.get(u) ?? [])];
    if (mode === 'solo') return [me];
    return [me, ...others.filter((m) => crew.includes(m.id))];
  }, [meal, mode, me, others, crew, memberMap]);

  // 最近吃過的店（自己）：降低機率；探店用：一起吃的人這陣子起駕過的店
  const recent = useMemo(
    () =>
      decided(meals)
        .filter((m) => m.going.includes(me.id) && (m.decision?.at?.getTime() ?? 0) > t - RECENT_MS)
        .map((m) => m.decision!.rid),
    [meals, me.id, t],
  );
  const eaten = useMemo(() => {
    const ids = new Set(party.map((m) => m.id));
    return [
      ...new Set(
        decided(meals)
          .filter((m) => m.going.some((u) => ids.has(u)))
          .map((m) => m.decision!.rid),
      ),
    ];
  }, [meals, party]);

  // 已經在供桌上（候選）、或說過去不了的店，不會再抽到
  const base = meal ?? reopen;
  const taken = useMemo(() => (base ? [...base.cands, ...base.skips.map((s) => s.rid)] : []), [base]);
  const pool = useMemo(
    () => candidates({ restaurants, party, filters, recent, prefer, eaten, exclude: taken }),
    [restaurants, party, filters, recent, prefer, eaten, taken],
  );

  // 重抽次數：第一支不扣
  const rerolls = base ? base.rerolls : savedRerolls;
  const rerollsLeft = base ? base.rerollsLeft : savedRerolls;
  const charged = !!base && base.picks.length > 0;
  const canDrawNow = meal ? canDraw(meal, me.id, t) : !finished;
  const used = rerolls - rerollsLeft;

  // 篩選紙、供桌（預言牌陣）彈窗：籤卡翻開時要一起收起來，所以宣告在 openPick 前面
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [candsOpen, setCandsOpen] = useState(false);

  // ---------- 翻開某一支 ----------
  const openPick = (m: Meal, rid: string, spent = false, swap?: 1 | -1) => {
    const p = pickOf(m, rid);
    const r = restaurantMap.get(rid);
    if (!p || !r) return;
    setResult({
      key: `${m.id}:${rid}:${p.seed}`,
      mealId: m.id,
      r,
      reading: readingOf(theme, r, p, modeOf(m)),
      spent,
      swap,
    });
    setPhase('revealed');
    // 籤卡翻開時，前面開著的彈窗（供桌、篩選）都收起來，不要擋住籤卡
    setCandsOpen(false);
    setFiltersOpen(false);
  };

  const pickFor = (
    r: Restaurant,
    seed: number,
    variant: string | undefined,
    verse: { lines: readonly string[]; verdict: string } | null,
  ): PickInput => ({
    rid: r.id,
    name: r.name,
    seed,
    variant: variant ?? '',
    theme: theme.id,
    lines: verse?.lines ? [...verse.lines] : [],
    verdict: verse?.verdict ?? '',
  });

  /**
   * 抽籤：先跑主題的儀式動畫，同時請 AI 寫一首新的籤詩；寫進這一餐之後才展開籤卡（AI 來不及就用原本的）。
   * skip：這家去不了，補抽一家（不扣次數）。pick 是使用者直接點的法器（魔法版）。
   */
  async function runDraw(opts: { pick?: string; skip?: string; why?: SkipWhy } = {}) {
    const target = meal;
    if (!opts.skip && !canDrawNow) {
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
      exclude: [...taken, ...(opts.skip ? [opts.skip] : [])],
    });
    if (!hit && opts.skip && target) {
      // 沒有別家可以補：只把這家拿掉
      skipMeal(target.id, me.id, opts.skip, null, opts.why).catch(() => toast('沒有成功，等一下再試', '咦'));
      toast(copy.meal.cantGoNone, copy.acceptSeal);
      setPhase('idle');
      return;
    }
    if (!hit) {
      toast(copy.emptyTitle, '空');
      setTaunt('');
      setPhase('idle');
      return;
    }
    const r = hit.restaurant;
    const m: DrawMode = party.length > 1 ? 'group' : 'solo';
    // 籤詩用固定的種子：籤號、籤等先決定好，AI 照著籤等寫；同一餐的人用同一個種子，看到同一張籤
    const seed = newSeed();
    const draft = theme.read(r, m, opts.pick, seeded(seed));
    const verse = askVerse({
      theme: theme.id,
      restaurant: r,
      party: party.length,
      grade: draft.grade.name,
      variant: opts.pick,
    });
    setPhase('drawing');
    // 頁面往下捲著的時候（例如揪團名單很長）先捲回舞台，整段儀式才看得到
    await revealStage(stageEl.current);
    const variant = (await stage.current?.draw(opts.pick)) ?? opts.pick;
    setTaunt('');
    const written = await Promise.race([verse, sleep(VERSE_WAIT_MS).then(() => null)]);
    const input = pickFor(r, seed, variant, written);

    // 寫進這一餐：有人搶先一步的話，改翻開他抽到的那一支
    const id = target?.id ?? mealIdOf(today, slot, me.id);
    try {
      if (opts.skip && target) await skipMeal(target.id, me.id, opts.skip, input, opts.why);
      else if (target) await drawMeal(target.id, me.id, target.picks.length, input);
      else {
        const how = await openMeal({
          id,
          host: me.id,
          date: today,
          slot,
          party: mode === 'group' ? crew : [],
          rerolls: savedRerolls,
          filters: { ...savedFilters, prefer: savedPrefer },
          first: reopen ? undefined : input,
        });
        if (how === 'reopened') await drawMeal(id, me.id, reopen?.picks.length ?? 0, input);
      }
    } catch (err) {
      const why = err instanceof MealError ? err.reason : 'closed';
      // exists：這一餐其實已經開了（畫面還沒同步到），不是香燒完了
      toast(why === 'raced' ? copy.meal.raced : why === 'exists' ? copy.meal.syncing : '沒有寫成功，等一下再試', '咦');
      setPhase('idle');
      return;
    }
    setResult({
      key: `${id}:${r.id}:${seed}`,
      mealId: id,
      r,
      reading: readingOf(theme, r, { ...input, by: me.id, at: null }, m),
      spent: charged && !opts.skip,
    });
    setPhase('revealed');
  }

  // ---------- 別人在同一餐做了什麼 ----------
  const [pulseSeen, setPulseSeen] = useState(pulse?.n ?? 0);
  if (pulse && pulse.n !== pulseSeen) {
    setPulseSeen(pulse.n);
    const m = meals.find((x) => x.id === pulse.id);
    if (m && shown?.id === m.id) {
      if (pulse.kind === 'decided') {
        if (phase === 'revealed') setPhase('leaving');
      } else if (phase === 'idle' || phase === 'revealed') {
        const p = latestOf(m);
        if (p) openPick(m, p.rid);
      }
    }
  }

  // 搖太大力：籤筒（水晶球）晃一下，神明（水晶球）說頭暈
  const dizzy = () => {
    toast(copy.quip.hard, copy.acceptSeal);
    const el = stageEl.current;
    if (el && !reducedMotion())
      gsap.fromTo(
        el,
        { x: 0, rotate: 0 },
        { keyframes: { x: [-10, 9, -7, 5, -2, 0], rotate: [-1.2, 1, -0.6, 0.4, 0] }, duration: 0.6, ease: 'sine.out' },
      );
  };
  const shake = useShake(
    () => {
      if (phase !== 'idle') return;
      onStage();
    },
    phase === 'idle',
    dizzy,
  );

  const startDraw = (pick?: string) => {
    if (phase !== 'idle') return;
    // 關掉籤卡後從外面（大按鈕、籤筒、搖手機）再抽，一樣會扣一次：碎念也一樣跳出來
    if (charged && rerollsLeft > 0) setTaunt(tauntFor(copy.taunts, used));
    void runDraw({ pick });
  };

  /** 點籤筒（水晶球）、搖手機：起駕過就翻開定案；還能抽就抽；抽完了就翻開最新那支 */
  function onStage(pick?: string) {
    if (finished && shown && chosen) return openPick(shown, chosen.rid);
    if (canDrawNow && pool.length) return startDraw(pick);
    const latest = shown && latestOf(shown);
    if (shown && latest) openPick(shown, latest.rid);
  }

  // 籤卡對應的那一餐（現在的狀態）
  const resultMeal = result ? (meals.find((m) => m.id === result.mealId) ?? null) : null;
  // 小彩蛋的時段：宵夜。開發時可以用 localStorage 的 lunchstick:dev-moment（late）直接切換來看，正式網站不讀
  const devMoment = useBrowserValue(readDevMoment, null);
  const moment = devMoment ?? momentOf(t);
  const lateToast = useEffectEvent(() => {
    const key = `lunchstick:late:${today}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* 存不了就照樣說一次 */
    }
    toast(copy.quip.late, copy.quip.lateSeal);
  });
  useEffect(() => {
    if (moment !== 'late') return;
    const tm = setTimeout(lateToast, 1600);
    return () => clearTimeout(tm);
  }, [moment]);
  // 籤卡翻開時（例如同一餐的人抽了、同步翻開），開著的報馬仔通知先收起來，不要擋在籤卡前面
  const resultKey = result?.key;
  const closeHerald = useEffectEvent(() => hideHerald());
  useEffect(() => {
    if (resultKey) closeHerald();
  }, [resultKey]);
  const resultLive = !!resultMeal && isLive(resultMeal, t);
  const isChosen = !!result && resultMeal?.decision?.rid === result.r.id;
  const inCands = !!result && !!resultMeal?.cands.includes(result.r.id);
  // 不是定案的那支：起駕過、這餐還沒結束、我也能改，就把起駕鈕換成「改往這裡」（鈕上寫原本要去哪家）；
  // 不能改了（結束了、我不去）就說最後去了哪家；沒起駕、時間到了就說這餐結束了
  const departed = resultMeal && !isChosen ? chosenOf(resultMeal) : null;
  const departedName = departed ? (restaurantMap.get(departed.rid)?.name ?? departed.name) : '';
  const switching = !!departed && !!resultMeal && canSwitch(resultMeal, me.id, t) && inCands;
  const note = departed
    ? switching
      ? undefined
      : copy.meal.departedTo(departedName)
    : resultMeal && !resultLive && !isChosen
      ? copy.meal.ended
      : undefined;
  // 小彩蛋：連續好幾天吃同一家、這個月吃很多次就吐槽一句
  const repeat = result ? repeatOf(meals, me.id, result.r.id, today) : null;
  const quip = !repeat
    ? undefined
    : repeat.streak >= 2
      ? copy.quip.streak(repeat.streak + 1)
      : repeat.month >= 4
        ? copy.quip.month(repeat.month + 1)
        : undefined;
  // 用完最後一次重抽才起駕：定案章旁邊蓋「壓線」
  const closeCall =
    isChosen && !!resultMeal && resultMeal.rerolls > 0 && resultMeal.rerollsLeft === 0 && resultMeal.picks.length > 1;
  /** 供桌（預言牌陣）彈窗攤開的那一餐：籤卡開著就是籤卡那一餐 */
  const altar = resultMeal ?? shown;
  // 供桌上有好幾支：籤卡上直接左右切到旁邊那支，不用回到供桌彈窗
  const deck = resultMeal ? candidatesOf(resultMeal) : [];
  const deckAt = result ? deck.findIndex((x) => x.rid === result.r.id) : -1;
  const stepDeck = (dir: 1 | -1) => {
    const next = deck[deckAt + dir];
    if (phase === 'revealed' && resultMeal && next) openPick(resultMeal, next.rid, false, dir);
  };

  const reroll = () => {
    if (phase !== 'revealed' || !resultMeal || !canDraw(resultMeal, me.id, t)) return;
    pendingReroll.current = true;
    setTaunt(tauntFor(copy.taunts, used));
    setPhase('leaving');
  };

  // 通知裡按了「抽」、點了候選：等首頁切到那一餐再動作
  const onDrawAsk = useEffectEvent(() => {
    if (!drawAsk || !meal || meal.id !== drawAsk.id) return;
    doneDrawAsk();
    if (phase === 'idle') startDraw();
    else if (phase === 'revealed') reroll();
  });
  useEffect(() => {
    if (!drawAsk) return;
    // 等通知收起來一下再抽
    const tm = setTimeout(onDrawAsk, 120);
    return () => clearTimeout(tm);
  }, [drawAsk, meal?.id]);
  const onOpenAsk = useEffectEvent(() => {
    if (!openAsk || !shown || shown.id !== openAsk.id) return;
    doneOpenAsk();
    if (openAsk.rid === null) {
      if (phase === 'idle') setCandsOpen(true);
    } else if (phase === 'idle' || phase === 'revealed') openPick(shown, openAsk.rid);
  });
  useEffect(() => {
    if (!openAsk) return;
    const tm = setTimeout(onOpenAsk, 120);
    return () => clearTimeout(tm);
  }, [openAsk, shown?.id]);

  /** 起駕：這一支就是定案，大家同時收到 */
  const [tease, setTease] = useState<string | undefined>();
  const lastTease = useRef('');
  const accept = () => {
    if (phase !== 'revealed' || !result || !resultMeal || tease) return;
    toast(result.r.mapUrl ? copy.acceptedGo : copy.accepted, copy.acceptSeal);
    markDeparted(resultMeal.id);
    decideMeal(resultMeal.id, me.id, result.r.id, resultMeal.decision?.rid ?? null).catch((err) =>
      toast(err instanceof MealError && err.reason === 'raced' ? copy.meal.raced : '沒有成功，等一下再試', '咦'),
    );
    // 起駕（或改去）的不是最後抽到的那支：籤卡搖搖頭、虧一句再收起來
    const backPick = resultMeal.cands.length > 1 && latestOf(resultMeal)?.rid !== result.r.id;
    if (!backPick || reducedMotion()) return setPhase('leaving');
    // 隨機挑一句，不跟上一次一樣
    const lines = copy.backPick.filter((l) => l !== lastTease.current);
    const line = lines[Math.floor(Math.random() * lines.length)];
    lastTease.current = line;
    setTease(line);
    window.setTimeout(() => setPhase('leaving'), 1700);
  };

  /** 這家去不了：收起籤卡，神明（水晶球）另指一家 */
  const skipHere = (why: SkipWhy) => {
    if (phase !== 'revealed' || !result || !resultMeal) return;
    pendingSkip.current = { rid: result.r.id, why };
    setPhase('leaving');
  };

  const close = () => {
    if (phase !== 'revealed') return;
    setPhase('leaving');
  };

  const onClosed = async () => {
    setResult(null);
    setTease(undefined);
    await stage.current?.settle();
    if (pendingReroll.current || pendingSkip.current) {
      const skip = pendingSkip.current;
      pendingReroll.current = false;
      pendingSkip.current = null;
      await sleep(160);
      await runDraw({ skip: skip?.rid, why: skip?.why });
      return;
    }
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

  /** 發紅帖揪人：開一張還沒抽的單 */
  const sendInvites = async (ids: string[]) => {
    const id = mealIdOf(today, slot, me.id);
    await openMeal({
      id,
      host: me.id,
      date: today,
      slot,
      party: ids,
      rerolls: savedRerolls,
      filters: { ...savedFilters, prefer: savedPrefer },
    }).catch((err) => {
      if (err instanceof MealError && err.reason === 'exists') toast(copy.meal.syncing, '咦');
      throw err;
    });
    setFocus(id);
  };

  const toggleCat = (id: CategoryId) =>
    updateFilters((f) => ({
      ...f,
      categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id],
    }));
  const togglePrice = (v: Price) =>
    updateFilters((f) => ({ ...f, prices: f.prices.includes(v) ? f.prices.filter((p) => p !== v) : [...f.prices, v] }));
  const toggleWalk = (v: Walk) =>
    updateFilters((f) => ({ ...f, walks: f.walks.includes(v) ? f.walks.filter((w) => w !== v) : [...f.walks, v] }));
  const clearFilters = () => updateFilters(() => NO_FILTERS);
  const choosePrefer = (p: Preference) => canEditFilters && writeFilters({ ...filters, prefer: p });
  const toggleCrew = (id: string) => setCrew((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const { walks } = filters;
  const filtered = filters.categories.length + filters.prices.length + walks.length > 0;
  // 搖手機被 iOS 拒絕了：點首頁的封印小標籤，攤開解封籤教怎麼重新允許
  const [unsealOpen, setUnsealOpen] = useState(false);
  // 篩選摘要：沒選和全選都是不限，不用一個一個列出來
  const some = (n: number, all: number) => n > 0 && n < all;
  const summary = [
    some(filters.categories.length, CATEGORIES.length)
      ? CATEGORIES.filter((c) => filters.categories.includes(c.id))
          .map((c) => c.label)
          .join('、')
      : '全部類型',
    some(filters.prices.length, PRICES.length)
      ? PRICES.filter((p) => filters.prices.includes(p.v))
          .map((p) => p.label)
          .join('、')
      : copy.priceAny,
    ...(some(walks.length, WALKS.length)
      ? [
          `步行 ${WALKS.filter((w) => walks.includes(w.v))
            .map((w) => w.label)
            .join('、')}`,
        ]
      : []),
  ];
  const big = party.length >= 3;
  const busy = phase !== 'idle';
  // 資料還沒到之前供桌上不寫字，不會先閃一下「籤筒空空的」
  const label = !ready ? '' : pool.length > 0 ? copy.countLine(pool.length) : copy.emptyTitle;
  const hint = big && pool.length > 0 ? '三人以上只抽適合多人的店。' : '';
  const latest = shown ? latestOf(shown) : null;
  const cands = shown ? shown.cands.length : 0;
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    const tm = setTimeout(() => setEntering(false), 1400);
    return () => clearTimeout(tm);
  }, []);

  return (
    <div className={`home${moment ? ` is-${moment}` : ''}`}>
      <section
        ref={stageEl}
        className={`stage${entering ? ' stage--enter' : ''}${phase === 'drawing' ? ' stage--busy' : ''}${finished ? ' stage--spent' : ''}`}
        aria-label={copy.place}
      >
        <StageTop />
        {taunt && (
          <p className="stage__taunt" role="status">
            {taunt}
          </p>
        )}
        {finished && chosen && (
          // 這一餐起駕了：一張封條斜斜貼過籤筒（水晶球）
          <div className="stage__band" aria-hidden="true">
            <span className="stage__band-seal">
              <Seal text={copy.finalSeal} size={40} rotate={-6} />
            </span>
            <span className="stage__band-slot">
              <LineIcon d={slotIcon(shown!.slot)} size={16} />
              {shown!.slot.label}
            </span>
            <b>{copy.finalBand}</b>
            <i>{chosen.name}</i>
          </div>
        )}
        <div className="stage__floor">
          <StageFloor ref={stage} count={pool.length} busy={busy} onTap={(pick) => onStage(pick)} label={label} />
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
            <button
              type="button"
              role="radio"
              aria-checked={!group}
              aria-disabled={!!meal && group}
              onClick={() => !(meal && group) && setMode('solo')}
            >
              自己吃
            </button>
            <button type="button" role="radio" aria-checked={group} onClick={() => setMode('group')}>
              揪團吃
            </button>
          </div>
          <div className="seg" role="radiogroup" aria-label="怎麼抽">
            <button
              type="button"
              role="radio"
              aria-checked={prefer === 'favorites'}
              aria-disabled={!canEditFilters}
              onClick={() => choosePrefer('favorites')}
            >
              愛店優先
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={prefer === 'explore'}
              aria-disabled={!canEditFilters}
              onClick={() => choosePrefer('explore')}
            >
              探店
            </button>
          </div>
        </div>

        {(group || (meal && mode === 'group')) && !finished && (
          <CrewPicker
            me={me}
            others={others}
            selected={crew}
            onToggle={toggleCrew}
            onSet={setCrew}
            meal={meal}
            onSend={sendInvites}
          />
        )}

        {/* 篩選：一行摘要，點了從下面拉出一張紙（電腦在中間），頁面本身不會被撐長、不用捲動 */}
        <button
          type="button"
          className={`filters__toggle${filtered ? ' is-set' : ''}`}
          aria-haspopup="dialog"
          onClick={() => setFiltersOpen(true)}
        >
          <span className="filters__label">篩選</span>
          <Tags className="filters__summary">
            <Tag tone="accent" icon={<LineIcon d={slotIcon(slot)} size={14} />}>
              {slot.label}
            </Tag>
            {summary.map((x) => (
              <Tag key={x}>{x}</Tag>
            ))}
          </Tags>
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
              {filtered && canEditFilters && (
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
            <FilterRow icon={slotIcon(slot)} title="哪一餐" hint="預設午餐，可自己寫">
              <SlotPicker
                value={slot}
                onChange={(s) => {
                  setFocus(null);
                  setSlot(s);
                }}
              />
            </FilterRow>
            <FilterRow
              icon={theme.id === 'magic' ? ROW_ICONS.orb : ROW_ICONS.stock}
              title={copy.meal.stock.title}
              hint={copy.meal.stock.hint}
            >
              <StockPicker value={rerolls} onChange={setSavedRerolls} locked={!!base} />
            </FilterRow>
            {!canEditFilters && (
              <p className="filters__note">
                {meal && !isHost
                  ? '這一餐的篩選由發起人決定，大家抽的時候都照這組。'
                  : '這一餐已經起駕了，篩選先固定住。'}
              </p>
            )}
            <div className={`filters__rows${canEditFilters ? '' : ' is-locked'}`} aria-disabled={!canEditFilters}>
              <FilterRow icon={ROW_ICONS.category} title="類型" hint="可多選">
                <CategoryFilter selected={filters.categories} onToggle={toggleCat} />
              </FilterRow>
              <FilterRow icon={ROW_ICONS.price} title="價位" hint="可多選">
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
              </FilterRow>
              <FilterRow icon={ROW_ICONS.walk} title="步行" hint="從公司走過去">
                <WalkFilter selected={walks} onToggle={toggleWalk} />
              </FilterRow>
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
        ) : finished && shown && chosen && !busy ? (
          <button
            type="button"
            className="btn btn--zhu btn--lg btn--block dock__cta dock__cta--final"
            onClick={() => openPick(shown, chosen.rid)}
          >
            <Seal text={copy.finalSeal} size={36} variant="outline" color="var(--accent)" rotate={-8} />
            {copy.meal.look(chosen.name)}
          </button>
        ) : !canDrawNow && latest && shown && !busy ? (
          <button
            type="button"
            className="btn btn--zhu btn--lg btn--block dock__cta dock__cta--final"
            onClick={() => openPick(shown, latest.rid)}
          >
            {/* 次數用完：預設就是最後抽到的那張，直接翻開；想看其他候選用旁邊的「看預言牌陣」 */}
            <theme.Glyph name="depart" size={30} />
            <span className="dock__cta-words">
              <small>{copy.meal.lookLatest}</small>
              <b>{latest.name}</b>
            </span>
          </button>
        ) : (
          <button
            type="button"
            className={`btn btn--zhu btn--lg btn--block dock__cta${busy ? ' is-busy' : ''}`}
            onClick={() => (pool.length ? startDraw() : canEditFilters ? clearFilters() : setFiltersOpen(true))}
            aria-disabled={busy}
          >
            {pool.length ? (
              busy ? (
                <>
                  <Loader size={30} label={copy.drawing} />
                  <span>{copy.drawing}</span>
                </>
              ) : charged ? (
                copy.reroll
              ) : (
                copy.drawCta
              )
            ) : (
              '放寬條件'
            )}
          </button>
        )}
        {(hint || charged || cands > 0 || (shake.supported && canDrawNow)) && (
          <p className="dock__hint">
            {cands > 0 && shown && (
              <button type="button" className="dock__cands" aria-haspopup="dialog" onClick={() => setCandsOpen(true)}>
                <theme.Glyph name="altar" size={24} />
                {copy.meal.lookAll}
                <b>{cands}</b>
              </button>
            )}
            {hint && !finished && <span>{hint}</span>}
            {charged && !finished && (
              // 跟籤卡上「再抽一支」按鈕裡面一樣：籤筒（水晶球）、字、剩下的香（魔力球）；只是一行字，不是按鈕
              <span className="dock__charges">
                <theme.Glyph name="shake" size={22} />
                <span>{reopen ? copy.meal.reopen(rerollsLeft) : copy.meal.left(rerollsLeft)}</span>
                <Charges left={rerollsLeft} total={rerolls} label={copy.meal.left(rerollsLeft)} />
              </span>
            )}
            {shake.supported &&
              canDrawNow &&
              !finished &&
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

      {/* 這一餐抽過的籤：按了才攤開，點一支翻開籤卡 */}
      <Sheet
        open={candsOpen && !!altar}
        onClose={() => setCandsOpen(false)}
        eyebrow={altar?.slot.label ?? ''}
        title={copy.meal.cands}
        icon={<theme.Glyph name="altar" size={44} />}
      >
        {altar && (
          <Candidates
            meal={altar}
            active={result?.mealId === altar.id ? result.r.id : undefined}
            onOpen={(rid) => {
              setCandsOpen(false);
              if (result?.r.id === rid) return;
              // 籤卡開著就直接換成那一支，沒開就攤開
              window.setTimeout(() => (phase === 'idle' || phase === 'revealed') && openPick(altar, rid), 260);
            }}
          />
        )}
      </Sheet>

      {result && (
        <Oracle
          key={result.key}
          theme={theme}
          restaurant={result.r}
          reading={result.reading}
          party={resultMeal ? resultMeal.going.length : party.length}
          liked={liked}
          rerollsLeft={resultMeal?.rerollsLeft ?? rerollsLeft}
          rerolls={resultMeal?.rerolls ?? rerolls}
          canReroll={!!resultMeal && canDraw(resultMeal, me.id, t) && resultMeal.picks.length > 0}
          canDecide={(!!resultMeal && canDecide(resultMeal, me.id, t) && inCands) || switching}
          switching={switching ? departedName : undefined}
          canSkip={!!resultMeal && canSkip(resultMeal, me.id, t) && inCands && !departed}
          decided={isChosen}
          spent={result.spent}
          swap={result.swap}
          tease={tease}
          quip={quip}
          closeCall={closeCall}
          deck={deck.length > 1 && deckAt >= 0 ? { at: deckAt, total: deck.length, onStep: stepDeck } : undefined}
          note={note}
          busy={phase !== 'revealed'}
          leaving={phase === 'leaving'}
          onReroll={reroll}
          onAccept={accept}
          onSkip={skipHere}
          onToggleLike={toggleLike}
          onClose={close}
          onClosed={onClosed}
          candidates={
            resultMeal && resultMeal.cands.length > 1 ? (
              <button type="button" className="oracle__cands" aria-haspopup="dialog" onClick={() => setCandsOpen(true)}>
                <theme.Glyph name="altar" size={24} />
                {copy.meal.lookAll}
                <b>{resultMeal.cands.length}</b>
              </button>
            ) : undefined
          }
          crew={resultMeal && modeOf(resultMeal) === 'group' ? <CrewStrip meal={resultMeal} /> : undefined}
        />
      )}
    </div>
  );
}

/** 籤卡上的一行：大家的頭像和回覆，跟報馬仔已經通知幾位 */
function CrewStrip({ meal }: { meal: Meal }) {
  const { me } = useAppData();
  const { theme } = useTheme();
  return (
    <>
      <theme.Glyph name="herald" size={26} />
      <MateMarks meal={meal} skip={me.id} size={26} compact />
      <span>{theme.copy.meal.notified(meal.party.length - 1)}</span>
    </>
  );
}
