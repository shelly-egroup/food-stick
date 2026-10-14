'use client';

import { useEffect, useState } from 'react';
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
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  deleteDoc,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { fb } from './firebase';
import type { Crew, DrawMode, DrawRecord, Member, Note, Restaurant } from './types';

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
    today:
      x.today && typeof x.today.day === 'string' && typeof x.today.left === 'number'
        ? { day: x.today.day, left: x.today.left }
        : null,
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
const asDraw = (d: QueryDocumentSnapshot<DocumentData>): DrawRecord => {
  const x = d.data(opts);
  return {
    id: d.id,
    rid: x.rid,
    uid: x.uid,
    mode: x.mode,
    party: x.party ?? [],
    createdAt: toDate(x.createdAt),
    rerolled: !!x.rerolled,
  };
};
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

function useQuery<T>(make: (() => Query) | null, map: (d: QueryDocumentSnapshot<DocumentData>) => T, key: string) {
  const [state, setState] = useState<{ key: string; data: T[] | undefined; error: boolean }>({
    key,
    data: undefined,
    error: false,
  });
  useEffect(() => {
    if (!make) return;
    const q = make();
    return onSnapshot(
      q,
      (snap) => setState({ key, data: snap.docs.map(map), error: false }),
      () => setState((s) => ({ key, data: s.key === key ? s.data : undefined, error: true })),
    );
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

export const useDrawsSince = (since: Date, on: boolean) =>
  useQuery(
    on
      ? () =>
          query(
            collection(fb().db, 'draws'),
            where('createdAt', '>=', Timestamp.fromDate(since)),
            orderBy('createdAt', 'desc'),
          )
      : null,
    asDraw,
    `draws:${since.toISOString()}:${on}`,
  );

export const useLatestNotes = (on: boolean) =>
  useQuery(
    on ? () => query(collectionGroup(fb().db, 'comments'), orderBy('createdAt', 'desc'), limit(12)) : null,
    asNote,
    `latest:${on}`,
  );

/* ---------- 揪團（即時） ---------- */

export type Answer = 'go' | 'pass';
/**
 * 一次揪團走到哪：gathering 發出組隊邀請、等大家回覆要不要加入；drawn 發起人抽到了一家；
 * go 出發了；closed 收回邀請
 */
export type OutingStatus = 'gathering' | 'drawn' | 'go' | 'closed';

/** 一次揪團：揪了誰、誰要加入、抽到哪一家（籤詩種子，大家看到同一支籤）、抽到之後要不要去 */
export interface Outing {
  id: string;
  host: string;
  party: string[];
  /** 組隊邀請的回覆：加入（go）、這次不了（pass）；發起人一開始就是 go */
  answers: Record<string, Answer>;
  /** 抽到之後要不要大家再回覆要不要去（發邀請時決定，預設不用） */
  confirm: boolean;
  /** 還沒抽是空字串 */
  rid: string;
  seed: number;
  variant: string;
  /** 抽到之後的回覆（confirm 才會用到） */
  replies: Record<string, Answer>;
  /** 誰抽的（加入的人都可以抽）；還沒抽是空字串 */
  by: string;
  /** 全隊共用、還能重抽幾次 */
  rerolls: number;
  /** AI 寫的籤詩與解籤（大家看到同一首）；沒有就用網站原本的籤詩 */
  lines: string[];
  verdict: string;
  status: OutingStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
}

const STATUSES: OutingStatus[] = ['gathering', 'drawn', 'go', 'closed'];

const asOuting = (d: QueryDocumentSnapshot<DocumentData>): Outing => {
  const x = d.data(opts);
  return {
    id: d.id,
    host: x.host,
    party: x.party ?? [],
    answers: x.answers ?? {},
    confirm: x.confirm === true,
    rid: x.rid ?? '',
    seed: x.seed ?? 0,
    variant: x.variant ?? '',
    replies: x.replies ?? {},
    by: x.by ?? '',
    rerolls: typeof x.rerolls === 'number' ? x.rerolls : 0,
    lines: Array.isArray(x.lines) ? x.lines : [],
    verdict: x.verdict ?? '',
    status: STATUSES.includes(x.status) ? x.status : 'closed',
    createdAt: toDate(x.createdAt),
    updatedAt: toDate(x.updatedAt),
  };
};

const newestFirst = (a: Outing, b: Outing) =>
  (b.createdAt?.getTime() ?? Infinity) - (a.createdAt?.getTime() ?? Infinity);

/**
 * 跟我有關的揪團（我揪的、揪我的），since 之後建立的，即時更新。
 * 平常用「party 包含我＋建立時間」的複合索引；索引還沒建好時（例如還沒部署），
 * 改用只查 party 的寫法、在這裡篩時間與排序：一樣是即時的，只是多讀幾筆舊的。
 */
export function useOutings(uid: string, since: Date) {
  const key = `${uid}:${since.getTime()}`;
  const [state, setState] = useState<{ key: string; data: Outing[] | undefined; error: boolean }>({
    key,
    data: undefined,
    error: false,
  });
  useEffect(() => {
    const col = collection(fb().db, 'outings');
    const cut = since.getTime();
    const fail = () => setState((s) => ({ key, data: s.key === key ? s.data : undefined, error: true }));
    let off = onSnapshot(
      query(
        col,
        where('party', 'array-contains', uid),
        where('createdAt', '>=', Timestamp.fromDate(since)),
        orderBy('createdAt', 'desc'),
        limit(12),
      ),
      (snap) => setState({ key, data: snap.docs.map(asOuting), error: false }),
      (err) => {
        if (err.code !== 'failed-precondition') return fail();
        off = onSnapshot(
          query(col, where('party', 'array-contains', uid)),
          (snap) =>
            setState({
              key,
              data: snap.docs
                .map(asOuting)
                .filter((o) => (o.createdAt?.getTime() ?? Date.now()) >= cut)
                .sort(newestFirst)
                .slice(0, 12),
              error: false,
            }),
          fail,
        );
      },
    );
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state : { key, data: undefined, error: false };
}

/** 每一輪（自己一天、或一團）可以重抽幾次 */
export const REROLLS = 3;
/** 揪團單留幾天：到期後由 Firestore 的 TTL 自動清掉（要在 Firestore 開啟 outings.expireAt 的 TTL） */
const OUTING_DAYS = 7;

type OutingPick = { rid: string; seed: number; variant: string; lines: string[]; verdict: string };

/** 發出組隊邀請：被揪的人會即時收到，回覆要不要加入；confirm 是抽到之後要不要大家再回覆 */
export async function startGathering(host: string, party: string[], confirm: boolean) {
  const ref = await addDoc(collection(fb().db, 'outings'), {
    host,
    party: [...new Set([host, ...party])].slice(0, 50),
    answers: { [host]: 'go' },
    confirm,
    rid: '',
    seed: 0,
    variant: '',
    replies: {},
    by: '',
    rerolls: REROLLS,
    lines: [],
    verdict: '',
    status: 'gathering',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expireAt: Timestamp.fromMillis(Date.now() + OUTING_DAYS * 86_400_000),
  });
  return ref.id;
}

/**
 * 團裡加入的人（含發起人）抽一支：大家即時看到同一支籤（同一首籤詩）。
 * 第一次抽不扣，之後每抽一次扣全隊共用的一次重抽；要回覆的話大家重新回覆。
 */
export const drawOuting = (id: string, uid: string, rerolls: number, pick: OutingPick) =>
  updateDoc(doc(fb().db, 'outings', id), {
    ...pick,
    by: uid,
    rerolls,
    replies: { [uid]: 'go' },
    status: 'drawn',
    updatedAt: serverTimestamp(),
  });

/** 加入的人決定出發（go）；發起人可以收回邀請（closed） */
export const endOuting = (id: string, status: 'go' | 'closed') =>
  updateDoc(doc(fb().db, 'outings', id), { status, updatedAt: serverTimestamp() });

/** 被揪的人回覆組隊邀請：加入（go）或這次不了（pass） */
export const answerOuting = (id: string, uid: string, answer: Answer) =>
  updateDoc(doc(fb().db, 'outings', id), { [`answers.${uid}`]: answer });

/** 抽到之後回覆要不要去（發起人有要求才需要） */
/**
 * 在不在這一團：發起人、說要加入的人。
 * 發起人沒開「要大家回覆」時，被揪的人預設就加入，不用回覆（直接能抽、出發；不想去就按「這次不了」）
 */
export const inTeam = (o: Outing, uid: string) =>
  o.host === uid ||
  o.answers[uid] === 'go' ||
  (!o.confirm && !o.answers[uid] && (o.status === 'gathering' || o.status === 'drawn'));

/** 幫大家抽、出發之前：還沒回邀請的人先記成加入（權限上要加入的人才能做這些事） */
export const ensureJoined = (o: Outing, uid: string) =>
  o.host === uid || o.answers[uid] === 'go' ? Promise.resolve() : answerOuting(o.id, uid, 'go');

export const replyOuting = (id: string, uid: string, answer: Answer) =>
  updateDoc(doc(fb().db, 'outings', id), { [`replies.${uid}`]: answer });

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
/** 自己抽的額度寫回資料庫：今天是哪一天、還能重抽幾次 */
export const saveToday = (uid: string, today: { day: string; left: number }) =>
  updateDoc(doc(fb().db, 'members', uid), { today });

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

export async function recordDraw(uid: string, rid: string, mode: DrawMode, party: string[]) {
  const ref = await addDoc(collection(fb().db, 'draws'), {
    rid,
    uid,
    mode,
    party: party.slice(0, 100),
    createdAt: serverTimestamp(),
    rerolled: false,
  });
  return ref.id;
}

export const markRerolled = (did: string) => updateDoc(doc(fb().db, 'draws', did), { rerolled: true });
