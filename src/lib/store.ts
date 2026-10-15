'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  doc,
  getDocs,
  getDocsFromCache,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  deleteDoc,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { fb } from './firebase';
import {
  MAX_PARTY,
  MEAL_MS,
  canDecide,
  canDraw,
  canReopen,
  canSkip,
  isLive,
  toMeal,
  type Answer,
  type Meal,
  type MealFilters,
  type MealPick,
  type Slot,
} from './meal';
import type { Crew, Member, Note, Restaurant } from './types';

const toDate = (v: unknown): Date | null => (v instanceof Timestamp ? v.toDate() : null);
const opts = { serverTimestamps: 'estimate' as const };

const asMember = (d: QueryDocumentSnapshot<DocumentData>): Member => {
  const x = d.data(opts);
  return {
    id: d.id,
    name: x.name,
    photoURL: x.photoURL ?? '',
    likes: x.likes ?? [],
    blocks: x.blocks ?? [],
    crews: Array.isArray(x.crews) ? x.crews : [],
    role: x.role,
  };
};
const asRestaurant = (d: QueryDocumentSnapshot<DocumentData>): Restaurant => {
  const x = d.data(opts);
  return {
    id: d.id,
    name: x.name,
    category: x.category,
    price: x.price,
    walk: x.walk,
    group: !!x.group,
    mapUrl: x.mapUrl ?? '',
    open: x.open !== false,
    createdBy: x.createdBy,
    createdAt: toDate(x.createdAt),
  };
};
const asMealDoc = (d: QueryDocumentSnapshot<DocumentData>): Meal => toMeal(d.id, d.data(opts), toDate);
const asNote = (d: QueryDocumentSnapshot<DocumentData>): Note => {
  const x = d.data(opts);
  return { id: d.id, rid: d.ref.parent.parent?.id ?? '', uid: x.uid, text: x.text, createdAt: toDate(x.createdAt) };
};

/* ---------- 讀取 ---------- */

export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(fb().auth, setUser), []);
  return user;
}

/** undefined = 讀取中；null = 還不是成員 */
export function useMembership(uid: string | undefined) {
  const [state, setState] = useState<{ uid?: string; member: Member | null | undefined }>({ member: undefined });
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(fb().db, 'members', uid),
      (snap) => setState({ uid, member: snap.exists() ? asMember(snap as QueryDocumentSnapshot) : null }),
      () => setState({ uid, member: null }),
    );
  }, [uid]);
  return uid && state.uid === uid ? state.member : undefined;
}

/**
 * 監聽或查詢出錯後 Firestore 不會自己重試。這幾種是暫時的（索引還在建、網路斷了、伺服器忙），
 * 過一下再試：2、4、8…秒，最久 30 秒一次；權限不足這類不會自己好的就不重試。
 */
const TRANSIENT = new Set([
  'failed-precondition',
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'internal',
  'aborted',
]);
const isTransient = (err: unknown) => TRANSIENT.has((err as { code?: string } | null)?.code ?? '');
const retryAfter = (tries: number) => Math.min(30_000, 2_000 * 2 ** tries);

function useQuery<T>(make: (() => Query) | null, map: (d: QueryDocumentSnapshot<DocumentData>) => T, key: string) {
  const [state, setState] = useState<{ key: string; data: T[] | undefined; error: boolean }>({
    key,
    data: undefined,
    error: false,
  });
  useEffect(() => {
    if (!make) return;
    let off = () => {};
    let timer = 0;
    let tries = 0;
    const listen = () => {
      off = onSnapshot(
        make(),
        (snap) => {
          tries = 0;
          setState({ key, data: snap.docs.map(map), error: false });
        },
        (err) => {
          setState((s) => ({ key, data: s.key === key ? s.data : undefined, error: true }));
          if (isTransient(err)) timer = window.setTimeout(listen, retryAfter(tries++));
        },
      );
    };
    listen();
    return () => {
      off();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state : { key, data: undefined, error: false };
}

export const useMembers = (on: boolean) =>
  useQuery(on ? () => collection(fb().db, 'members') : null, asMember, `members:${on}`);

export const useRestaurants = (on: boolean) =>
  useQuery(
    on ? () => query(collection(fb().db, 'restaurants'), orderBy('createdAt', 'asc')) : null,
    asRestaurant,
    `restaurants:${on}`,
  );

/**
 * 跟我有關、還沒結束的餐（我發起的、揪我的）：即時更新，揪團、抽籤、起駕大家同步看到。
 * 只聽名單上有我、而且開始聽的時候還沒結束的幾張，平常只有 0 到 3 張，讀取很少。
 */
export function useLiveMeals(uid: string) {
  const [since] = useState(() => Timestamp.now());
  return useQuery(
    () => query(collection(fb().db, 'meals'), where('party', 'array-contains', uid), where('endsAt', '>', since)),
    asMealDoc,
    `live:${uid}:${since.toMillis()}`,
  );
}

const SYNC_KEY = 'lunchstick:meals-sync';
const DAY_MS = 86_400_000;

/**
 * 這一天以後起駕過的餐（排行榜、常一起吃的人、最近吃過的店都看這個），不用即時，省讀取：
 * 每台裝置每天第一次完整讀一次；之後先拿瀏覽器裡 Firestore 的快取（不算讀取），
 * 再只跟伺服器要上次同步之後有更新的那幾筆（起駕、去不了、取消都會更新 updatedAt）。
 */
export function useDecidedSince(date: string) {
  const [state, setState] = useState<{ key: string; data: Meal[] | undefined; error: boolean }>({
    key: date,
    data: undefined,
    error: false,
  });
  useEffect(() => {
    let off = false;
    const col = collection(fb().db, 'meals');
    const base = query(col, where('status', '==', 'decided'), where('date', '>=', date));
    const keep = (m: Meal) => m.status === 'decided' && !!m.decision && m.date >= date;
    let timer = 0;
    let tries = 0;
    const run = async () => {
      const started = Date.now();
      let last = 0;
      try {
        const saved = JSON.parse(localStorage.getItem(SYNC_KEY) ?? 'null') as { since: string; at: number } | null;
        // 同一個起始日、今天同步過，才只補差異；換月、隔天就完整讀一次（快取被清掉也不會漏）
        if (
          saved?.since === date &&
          started - saved.at < DAY_MS &&
          new Date(saved.at).getDate() === new Date().getDate()
        )
          last = saved.at;
      } catch {
        /* 讀不到就完整讀一次 */
      }
      let meals: Meal[];
      if (last) {
        const cached = await getDocsFromCache(base).then(
          (s) => s.docs.map(asMealDoc),
          () => null,
        );
        if (cached?.length) {
          const byId = new Map(cached.map((m) => [m.id, m]));
          // 往前多抓一分鐘，裝置時間有點誤差也不會漏
          const delta = await getDocs(query(col, where('updatedAt', '>', Timestamp.fromMillis(last - 60_000))));
          delta.docs.map(asMealDoc).forEach((m) => (keep(m) ? byId.set(m.id, m) : byId.delete(m.id)));
          meals = [...byId.values()];
        } else meals = (await getDocs(base)).docs.map(asMealDoc);
      } else meals = (await getDocs(base)).docs.map(asMealDoc);
      try {
        localStorage.setItem(SYNC_KEY, JSON.stringify({ since: date, at: started }));
      } catch {
        /* 存不了下次就完整讀一次 */
      }
      if (!off) setState({ key: date, data: meals, error: false });
    };
    const attempt = () =>
      run().catch((err) => {
        if (off) return;
        setState({ key: date, data: undefined, error: true });
        if (isTransient(err)) timer = window.setTimeout(attempt, retryAfter(tries++));
      });
    void attempt();
    return () => {
      off = true;
      clearTimeout(timer);
    };
  }, [date]);
  return state.key === date ? state : { key: date, data: undefined, error: false };
}

export const useLatestNotes = (on: boolean) =>
  useQuery(
    on ? () => query(collectionGroup(fb().db, 'comments'), orderBy('createdAt', 'desc'), limit(36)) : null,
    asNote,
    `latest:${on}`,
  );

export const useNotes = (rid: string | null) =>
  useQuery(
    rid ? () => query(collection(fb().db, 'restaurants', rid, 'comments'), orderBy('createdAt', 'desc')) : null,
    asNote,
    `notes:${rid}`,
  );

/* ---------- 寫入 ---------- */

/** 只有 egroup.xx@gmail.com 的帳號可以進來（Firestore 規則也會再檢查一次） */
export const isEgroupEmail = (email: string | null | undefined) => !!email && /^egroup\.[^@]+@gmail\.com$/i.test(email);

/**
 * 頭貼只用 Google 帳號的大頭照：不提供上傳（免費方案不用 Storage），也不能自己換。
 * Firestore 規則也只接受這種網址，其他一律存成空字串（畫面上顯示名字的第一個字）。
 */
const GOOGLE_PHOTO = /^https:\/\/lh\d+\.googleusercontent\.com\/.+/;
export const googlePhoto = (url: string | null | undefined) =>
  url && url.length <= 1000 && GOOGLE_PHOTO.test(url) ? url : '';

/** 第一次進來：自動建立成員資料 */
export async function ensureMember(user: User) {
  await setDoc(doc(fb().db, 'members', user.uid), {
    name: (user.displayName || user.email?.split('@')[0]?.replace(/^egroup\./i, '') || '新同事').slice(0, 40),
    photoURL: googlePhoto(user.photoURL),
    likes: [],
    blocks: [],
    joinedAt: serverTimestamp(),
  });
}

/** 每次登入：Google 那邊換了頭貼，這裡也跟著換 */
export async function syncPhoto(user: User, current: string) {
  const next = googlePhoto(user.photoURL);
  if (next !== current) await updateDoc(doc(fb().db, 'members', user.uid), { photoURL: next });
}

export const renameMe = (uid: string, name: string) =>
  updateDoc(doc(fb().db, 'members', uid), { name: name.trim().slice(0, 40) });

/** 存自己的揪團名單（進香團／冒險小隊），最多 8 個 */
export const saveCrews = (uid: string, crews: Crew[]) =>
  updateDoc(doc(fb().db, 'members', uid), {
    crews: crews.slice(0, 8).map((c) => ({ name: c.name.trim().slice(0, 20), ids: c.ids.slice(0, 50) })),
  });

export type Pref = 'like' | 'block' | null;
export function setPref(uid: string, rid: string, pref: Pref) {
  const ref = doc(fb().db, 'members', uid);
  if (pref === 'like') return updateDoc(ref, { likes: arrayUnion(rid), blocks: arrayRemove(rid) });
  if (pref === 'block') return updateDoc(ref, { blocks: arrayUnion(rid), likes: arrayRemove(rid) });
  return updateDoc(ref, { likes: arrayRemove(rid), blocks: arrayRemove(rid) });
}

export type RestaurantInput = Pick<Restaurant, 'name' | 'category' | 'price' | 'walk' | 'group' | 'mapUrl' | 'open'>;

/** 新增店家：自己掛上去的店，同一批寫入順便變成自己的愛店 */
export async function addRestaurant(uid: string, data: RestaurantInput) {
  const { db } = fb();
  const ref = doc(collection(db, 'restaurants'));
  const batch = writeBatch(db);
  batch.set(ref, { ...data, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  batch.update(doc(db, 'members', uid), { likes: arrayUnion(ref.id), blocks: arrayRemove(ref.id) });
  await batch.commit();
  return ref.id;
}

export const updateRestaurant = (rid: string, data: RestaurantInput) =>
  updateDoc(doc(fb().db, 'restaurants', rid), { ...data, updatedAt: serverTimestamp() });

/** 拆下菜牌：連同紙條一起清掉 */
export async function deleteRestaurant(rid: string) {
  const { db } = fb();
  const notes = await getDocs(collection(db, 'restaurants', rid, 'comments'));
  const batch = writeBatch(db);
  notes.docs.slice(0, 450).forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'restaurants', rid));
  await batch.commit();
}

export const addNote = (uid: string, rid: string, text: string) =>
  addDoc(collection(fb().db, 'restaurants', rid, 'comments'), {
    uid,
    text: text.trim().slice(0, 200),
    createdAt: serverTimestamp(),
  });

export const deleteNote = (rid: string, nid: string) => deleteDoc(doc(fb().db, 'restaurants', rid, 'comments', nid));

/* ---------- 餐單 ---------- */

/** 抽到的一支要寫進餐單的內容（誰抽的、什麼時候由這裡補上） */
export type PickInput = Omit<MealPick, 'by' | 'at'>;

/** 為什麼沒寫成：有人先抽了（或先起駕了）、這一餐已經結束、這一餐不能再開、單子不見了 */
export class MealError extends Error {
  constructor(public reason: 'raced' | 'closed' | 'exists' | 'missing') {
    super(reason);
  }
}

const mealRef = (id: string) => doc(fb().db, 'meals', id);
const pickDoc = (p: PickInput, uid: string) => ({
  rid: p.rid,
  name: p.name.slice(0, 40),
  by: uid,
  // 陣列裡不能放伺服器時間，用這台裝置的時間（規則只要求跟伺服器差不到十分鐘）
  at: Timestamp.now(),
  seed: Math.trunc(p.seed),
  variant: p.variant.slice(0, 16),
  theme: p.theme,
  lines: p.lines.length === 4 ? [...p.lines] : [],
  verdict: p.lines.length === 4 ? p.verdict.slice(0, 60) : '',
});
const endsAt = () => Timestamp.fromMillis(Date.now() + MEAL_MS);
const raw = (x: DocumentData, key: string): unknown[] => (Array.isArray(x[key]) ? x[key] : []);

/**
 * 開一餐（或把取消了、過了時間還沒起駕的那張重新開張）。
 * 新開的可以順便帶第一支；重新開張的回傳 reopened，第一支另外用 drawMeal 抽（次數接續原本的）。
 */
export async function openMeal(input: {
  id: string;
  host: string;
  date: string;
  slot: Slot;
  party: string[];
  rerolls: number;
  filters: MealFilters;
  first?: PickInput;
}): Promise<'created' | 'reopened'> {
  const { db } = fb();
  const ref = mealRef(input.id);
  const party = [...new Set([input.host, ...input.party])].slice(0, MAX_PARTY);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const m = toMeal(snap.id, snap.data(), toDate);
      if (!canReopen(m, Date.now())) throw new MealError('exists');
      tx.update(ref, {
        party,
        answers: {},
        going: [input.host],
        filters: input.filters,
        status: 'open',
        decision: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        endsAt: endsAt(),
      });
      return 'reopened' as const;
    }
    const first = input.first ? [pickDoc(input.first, input.host)] : [];
    tx.set(ref, {
      v: 1,
      date: input.date,
      slot: input.slot,
      host: input.host,
      party,
      answers: {},
      going: [input.host],
      rerolls: input.rerolls,
      rerollsLeft: input.rerolls,
      filters: input.filters,
      picks: first,
      cands: first.map((p) => p.rid),
      skips: [],
      decision: null,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      endsAt: endsAt(),
    });
    return 'created' as const;
  });
}

/**
 * 抽一支（第一支不扣，之後每支扣一次）。expect 是抽之前看到的支數：
 * 有人在這段時間先抽了，就不寫，丟出 raced（畫面改翻開別人抽的那一支）。
 */
export async function drawMeal(id: string, uid: string, expect: number, pick: PickInput) {
  const { db } = fb();
  const ref = mealRef(id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new MealError('missing');
    const x = snap.data();
    const m = toMeal(snap.id, x, toDate);
    if (m.picks.length !== expect) throw new MealError('raced');
    if (!canDraw(m, uid, Date.now())) throw new MealError('closed');
    tx.update(ref, {
      picks: [...raw(x, 'picks'), pickDoc(pick, uid)],
      cands: [...m.cands.filter((r) => r !== pick.rid), pick.rid],
      rerollsLeft: expect === 0 ? m.rerollsLeft : m.rerollsLeft - 1,
      updatedAt: serverTimestamp(),
    });
  });
}

/** 起駕：從候選選一家（就是定案），大家同時收到 */
export async function decideMeal(id: string, uid: string, rid: string) {
  const { db } = fb();
  const ref = mealRef(id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new MealError('missing');
    const m = toMeal(snap.id, snap.data(), toDate);
    if (m.status === 'decided') throw new MealError('raced');
    if (!canDecide(m, uid, Date.now()) || !m.cands.includes(rid)) throw new MealError('closed');
    tx.update(ref, {
      decision: { rid, by: uid, at: serverTimestamp() },
      status: 'decided',
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * 這家去不了：從候選拿掉、補抽一家（沒有店可以補就不補），重抽次數回到原本的數字；
 * 已經起駕的話回到還在抽的階段。
 */
export async function skipMeal(id: string, uid: string, rid: string, next: PickInput | null) {
  const { db } = fb();
  const ref = mealRef(id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new MealError('missing');
    const x = snap.data();
    const m = toMeal(snap.id, x, toDate);
    if (!m.cands.includes(rid)) throw new MealError('raced');
    if (!canSkip(m, uid, Date.now())) throw new MealError('closed');
    const rest = m.cands.filter((r) => r !== rid && r !== next?.rid);
    tx.update(ref, {
      skips: [...raw(x, 'skips'), { rid, by: uid, at: Timestamp.now() }],
      picks: next ? [...raw(x, 'picks'), pickDoc(next, uid)] : raw(x, 'picks'),
      cands: next ? [...rest, next.rid] : rest,
      rerollsLeft: m.rerolls,
      decision: null,
      status: 'open',
      updatedAt: serverTimestamp(),
    });
  });
}

/** 被揪的人回覆：要去（in）或不去（out）；這一餐結束前都可以改 */
export async function answerMeal(id: string, uid: string, answer: Answer) {
  const { db } = fb();
  const ref = mealRef(id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new MealError('missing');
    const m = toMeal(snap.id, snap.data(), toDate);
    if (!isLive(m, Date.now()) || !m.party.includes(uid) || uid === m.host) throw new MealError('closed');
    const others = m.going.filter((u) => u !== uid);
    tx.update(ref, {
      [`answers.${uid}`]: answer,
      going: answer === 'in' ? [...others, uid] : others,
      updatedAt: serverTimestamp(),
    });
  });
}

/** 發起人：取消這一餐 */
export const cancelMeal = (id: string) => updateDoc(mealRef(id), { status: 'cancelled', updatedAt: serverTimestamp() });

/** 發起人：再揪幾個人（自己吃的單揪了人就變成揪團） */
export const inviteMeal = (id: string, ids: string[]) =>
  updateDoc(mealRef(id), { party: arrayUnion(...ids), updatedAt: serverTimestamp() });

/** 發起人：改這一餐的篩選（大家抽的時候都照這組） */
export const setMealFilters = (id: string, filters: MealFilters) =>
  updateDoc(mealRef(id), { filters, updatedAt: serverTimestamp() });

/** 歷史：我有去的每一餐，最新的在前面，一次讀一頁 */
export function useMealHistory(uid: string, size = 12) {
  const key = `${uid}:${size}`;
  const [state, setState] = useState<{
    key: string;
    meals: Meal[];
    done: boolean;
    error: boolean;
    loading: boolean;
  } | null>(null);
  const cursor = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const page = useCallback(
    (after: QueryDocumentSnapshot<DocumentData> | null) =>
      getDocs(
        query(
          collection(fb().db, 'meals'),
          where('going', 'array-contains', uid),
          orderBy('createdAt', 'desc'),
          ...(after ? [startAfter(after)] : []),
          limit(size),
        ),
      ),
    [uid, size],
  );

  useEffect(() => {
    let off = false;
    let timer = 0;
    let tries = 0;
    const load = () =>
      page(null)
        .then((snap) => {
          if (off) return;
          cursor.current = snap.docs.at(-1) ?? null;
          setState({
            key,
            meals: snap.docs.map(asMealDoc),
            done: snap.docs.length < size,
            error: false,
            loading: false,
          });
        })
        .catch((err) => {
          if (off) return;
          setState({ key, meals: [], done: true, error: true, loading: false });
          // 索引還在建、網路斷了：過一下再讀一次
          if (isTransient(err)) timer = window.setTimeout(load, retryAfter(tries++));
        });
    void load();
    return () => {
      off = true;
      clearTimeout(timer);
    };
  }, [page, key, size]);

  const mine = state?.key === key ? state : null;
  const more = () => {
    if (!mine || mine.done || mine.loading) return;
    setState({ ...mine, loading: true });
    page(cursor.current)
      .then((snap) => {
        cursor.current = snap.docs.at(-1) ?? cursor.current;
        setState((s) =>
          s && s.key === key
            ? { ...s, meals: [...s.meals, ...snap.docs.map(asMealDoc)], done: snap.docs.length < size, loading: false }
            : s,
        );
      })
      .catch(() => setState((s) => (s ? { ...s, loading: false, error: true } : s)));
  };
  return {
    meals: mine?.meals,
    done: mine?.done ?? false,
    error: mine?.error ?? false,
    loading: !mine || mine.loading,
    more,
  };
}

/** 查過的「上次去」記在記憶體裡：同一家這次開網站只查一次 */
const visits = new Map<string, Meal | null>();

/** 我上一次去這家是哪一餐（店家卡用）；沒去過是 null */
export async function lastVisit(uid: string, rid: string): Promise<Meal | null> {
  const key = `${uid}:${rid}`;
  if (visits.has(key)) return visits.get(key)!;
  const snap = await getDocs(
    query(
      collection(fb().db, 'meals'),
      where('going', 'array-contains', uid),
      where('decision.rid', '==', rid),
      orderBy('createdAt', 'desc'),
      limit(1),
    ),
  );
  const d = snap.docs[0];
  const found = d ? asMealDoc(d) : null;
  visits.set(key, found);
  return found;
}
