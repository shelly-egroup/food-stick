import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  arrayUnion,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

/** 模擬 Google 登入後的 token：只有 egroup.xx@gmail.com 而且信箱驗證過才算數 */
const EMAIL: Record<string, string> = {
  amy: 'egroup.amy@gmail.com',
  bob: 'egroup.bob@gmail.com',
  carl: 'egroup.carl@gmail.com',
  boss: 'egroup.boss@gmail.com',
  newbie: 'egroup.newbie@gmail.com',
  stranger: 'stranger@gmail.com',
  faker: 'egroup.faker@yahoo.com',
};

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-lunchstick-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const now = Timestamp.now();
    for (const uid of ['amy', 'bob', 'carl']) {
      await setDoc(doc(db, `members/${uid}`), { name: uid, photoURL: '', likes: [], blocks: [], joinedAt: now });
    }
    await setDoc(doc(db, 'members/boss'), {
      name: 'boss',
      photoURL: '',
      likes: [],
      blocks: [],
      joinedAt: now,
      role: 'admin',
    });
    // 就算有成員資料，不是 egroup 信箱也進不來
    await setDoc(doc(db, 'members/stranger'), { name: 'stranger', photoURL: '', likes: [], blocks: [], joinedAt: now });
    await setDoc(doc(db, 'restaurants/r1'), {
      name: '巷口牛肉麵',
      category: 'noodle',
      price: 2,
      walk: 5,
      group: true,
      mapUrl: '',
      createdBy: 'amy',
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, 'restaurants/r1/comments/c1'), { uid: 'bob', text: '湯頭讚', createdAt: now });
    await setDoc(doc(db, 'draws/d1'), {
      rid: 'r1',
      uid: 'amy',
      mode: 'solo',
      party: ['amy'],
      createdAt: now,
      rerolled: false,
    });
  });
});

const as = (uid: string, verified = true) =>
  env.authenticatedContext(uid, { email: EMAIL[uid] ?? `${uid}@example.com`, email_verified: verified }).firestore();

const newShop = (by: string) => ({
  name: '阿嬤滷肉飯',
  category: 'rice',
  price: 1,
  walk: 10,
  group: false,
  mapUrl: '',
  createdBy: by,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

const joinDoc = () => ({ name: '新人', photoURL: '', likes: [], blocks: [], joinedAt: serverTimestamp() });

describe('egroup 帳號與成員', () => {
  it('沒登入、不是 egroup 信箱都讀不到店家', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'restaurants/r1')));
    await assertFails(getDoc(doc(as('stranger'), 'restaurants/r1')));
    await assertSucceeds(getDoc(doc(as('amy'), 'restaurants/r1')));
  });

  it('egroup 帳號第一次進來可以讀自己的資料並建立成員', async () => {
    await assertSucceeds(getDoc(doc(as('newbie'), 'members/newbie')));
    await assertFails(getDoc(doc(as('newbie'), 'members/amy')));
    await assertSucceeds(setDoc(doc(as('newbie'), 'members/newbie'), joinDoc()));
  });

  it('不是 egroup、信箱沒驗證、或冒充其他網域都不能加入', async () => {
    await assertFails(setDoc(doc(as('stranger'), 'members/stranger2'), joinDoc()));
    await assertFails(setDoc(doc(as('newbie', false), 'members/newbie'), joinDoc()));
    await assertFails(setDoc(doc(as('faker'), 'members/faker'), joinDoc()));
  });

  it('加入時不能替自己加管理員，也不能幫別人建立', async () => {
    await assertFails(setDoc(doc(as('newbie'), 'members/newbie'), { ...joinDoc(), role: 'admin' }));
    await assertFails(setDoc(doc(as('newbie'), 'members/other'), joinDoc()));
  });

  it('可以改自己的愛店，不能改別人的，也不能升級成管理員', async () => {
    await assertSucceeds(updateDoc(doc(as('amy'), 'members/amy'), { likes: arrayUnion('r1') }));
    await assertFails(updateDoc(doc(as('amy'), 'members/bob'), { likes: arrayUnion('r1') }));
    await assertFails(updateDoc(doc(as('amy'), 'members/amy'), { role: 'admin' }));
  });

  it('頭貼只能是 Google 帳號的大頭照', async () => {
    const google = 'https://lh3.googleusercontent.com/a/ACg8ocJ-test=s96-c';
    await assertSucceeds(setDoc(doc(as('newbie'), 'members/newbie'), { ...joinDoc(), photoURL: google }));
    await assertSucceeds(updateDoc(doc(as('amy'), 'members/amy'), { photoURL: google }));
    await assertFails(updateDoc(doc(as('amy'), 'members/amy'), { photoURL: 'https://example.com/me.png' }));
    await assertFails(
      updateDoc(doc(as('amy'), 'members/amy'), { photoURL: 'https://lh3.googleusercontent.com.evil.com/x' }),
    );
  });
});

describe('店家', () => {
  it('成員可以新增合法店家', async () => {
    await assertSucceeds(addDoc(collection(as('bob'), 'restaurants'), newShop('bob')));
  });

  it('不能冒用別人名義、亂填類型或塞非 https 連結', async () => {
    await assertFails(addDoc(collection(as('bob'), 'restaurants'), newShop('amy')));
    await assertFails(addDoc(collection(as('bob'), 'restaurants'), { ...newShop('bob'), category: 'pizza' }));
    await assertFails(
      addDoc(collection(as('bob'), 'restaurants'), { ...newShop('bob'), mapUrl: 'javascript:alert(1)' }),
    );
  });

  it('大家都能編輯資訊，但不能改建立者', async () => {
    await assertSucceeds(updateDoc(doc(as('bob'), 'restaurants/r1'), { price: 1, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('bob'), 'restaurants/r1'), { createdBy: 'bob', updatedAt: serverTimestamp() }));
  });

  it('只有建立者能刪店，管理員也不行', async () => {
    await assertFails(deleteDoc(doc(as('bob'), 'restaurants/r1')));
    await assertFails(deleteDoc(doc(as('boss'), 'restaurants/r1')));
    await assertSucceeds(deleteDoc(doc(as('amy'), 'restaurants/r1')));
  });

  it('新增時可以選擇不開放大家修改，但 open 只能是真或假', async () => {
    await assertSucceeds(addDoc(collection(as('bob'), 'restaurants'), { ...newShop('bob'), open: false }));
    await assertFails(addDoc(collection(as('bob'), 'restaurants'), { ...newShop('bob'), open: 'nope' }));
  });

  it('只有建立者能決定要不要開放修改', async () => {
    await assertFails(updateDoc(doc(as('bob'), 'restaurants/r1'), { open: false, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as('amy'), 'restaurants/r1'), { open: false, updatedAt: serverTimestamp() }));
  });

  it('沒開放的店，別人不能改，建立者還是可以改', async () => {
    await assertSucceeds(updateDoc(doc(as('amy'), 'restaurants/r1'), { open: false, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('bob'), 'restaurants/r1'), { price: 3, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as('amy'), 'restaurants/r1'), { price: 3, updatedAt: serverTimestamp() }));
  });
});

describe('留言', () => {
  it('成員可以留言，但不能冒名', async () => {
    const c = collection(as('amy'), 'restaurants/r1/comments');
    await assertSucceeds(addDoc(c, { uid: 'amy', text: '加麵不用錢', createdAt: serverTimestamp() }));
    await assertFails(addDoc(c, { uid: 'bob', text: '冒名', createdAt: serverTimestamp() }));
    await assertFails(addDoc(c, { uid: 'amy', text: '', createdAt: serverTimestamp() }));
  });

  it('不存在的店不能留言', async () => {
    await assertFails(
      addDoc(collection(as('amy'), 'restaurants/nope/comments'), {
        uid: 'amy',
        text: '咦',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('別人的留言不能刪，但留言者、店家建立者、管理員可以', async () => {
    await assertFails(deleteDoc(doc(as('carl'), 'restaurants/r1/comments/c1')));
    await assertSucceeds(deleteDoc(doc(as('amy'), 'restaurants/r1/comments/c1')));
  });

  it('最新留言可以跨店查詢', async () => {
    await assertSucceeds(getDocs(collectionGroup(as('bob'), 'comments')));
    await assertFails(getDocs(collectionGroup(as('stranger'), 'comments')));
  });
});

describe('抽籤紀錄', () => {
  it('可以記錄自己的抽籤，不能幫別人記', async () => {
    const d = { rid: 'r1', mode: 'group', party: ['amy', 'bob'], createdAt: serverTimestamp(), rerolled: false };
    await assertSucceeds(addDoc(collection(as('amy'), 'draws'), { ...d, uid: 'amy' }));
    await assertFails(addDoc(collection(as('amy'), 'draws'), { ...d, uid: 'bob' }));
  });

  it('只有本人能標記重抽，而且不能改回來', async () => {
    await assertFails(updateDoc(doc(as('bob'), 'draws/d1'), { rerolled: true }));
    await assertSucceeds(updateDoc(doc(as('amy'), 'draws/d1'), { rerolled: true }));
    await assertFails(updateDoc(doc(as('amy'), 'draws/d1'), { rerolled: false }));
  });
});

describe('自己新增的店', () => {
  it('新增店家時，同一批寫入順便變成自己的愛店', async () => {
    const db = as('bob');
    const ref = doc(collection(db, 'restaurants'));
    const batch = writeBatch(db);
    batch.set(ref, newShop('bob'));
    batch.update(doc(db, 'members/bob'), { likes: arrayUnion(ref.id) });
    await assertSucceeds(batch.commit());
  });
});

describe('進香團（存好的揪團名單）', () => {
  const crew = (name: string) => ({ name, ids: ['bob', 'carl'] });

  it('可以存自己的名單，不能改別人的', async () => {
    await assertSucceeds(updateDoc(doc(as('amy'), 'members/amy'), { crews: [crew('業務部進香團')] }));
    await assertFails(updateDoc(doc(as('amy'), 'members/bob'), { crews: [crew('偷改')] }));
  });

  it('最多存八團', async () => {
    const nine = Array.from({ length: 9 }, (_, i) => crew(`第${i + 1}團`));
    await assertSucceeds(updateDoc(doc(as('amy'), 'members/amy'), { crews: nine.slice(0, 8) }));
    await assertFails(updateDoc(doc(as('amy'), 'members/amy'), { crews: nine }));
  });
});

describe('自己抽的額度', () => {
  it('可以把今天的重抽次數寫回自己的資料，不能改別人的，也不能亂填', async () => {
    await assertSucceeds(updateDoc(doc(as('amy'), 'members/amy'), { today: { day: '2026-10-15', left: 2 } }));
    await assertFails(updateDoc(doc(as('amy'), 'members/bob'), { today: { day: '2026-10-15', left: 3 } }));
    await assertFails(updateDoc(doc(as('amy'), 'members/amy'), { today: { day: '2026-10-15', left: 99 } }));
    await assertFails(updateDoc(doc(as('amy'), 'members/amy'), { today: { day: '2026-10-15', left: 1, x: 1 } }));
  });
});

describe('即時揪團', () => {
  const outing = (over: Record<string, unknown> = {}) => ({
    host: 'amy',
    party: ['amy', 'bob', 'carl'],
    answers: { amy: 'go' },
    confirm: false,
    rid: '',
    seed: 0,
    variant: '',
    replies: {},
    by: '',
    rerolls: 3,
    lines: [],
    verdict: '',
    status: 'gathering',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expireAt: Timestamp.fromMillis(Date.now() + 7 * 86_400_000),
    ...over,
  });
  const seedOuting = (over: Record<string, unknown> = {}) =>
    env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'outings/o1'), {
        ...outing(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...over,
      });
    });
  const verse = {
    lines: ['巷口騰騰牛肉香', '四人同席福氣長', '銀錢適度口袋滿', '下箸盡歡胃口張'],
    verdict: '快去吧。',
  };
  const draw = (by: string, rerolls: number, over: Record<string, unknown> = {}) => ({
    rid: 'r1',
    seed: 7,
    variant: '',
    ...verse,
    by,
    rerolls,
    replies: { [by]: 'go' },
    status: 'drawn',
    updatedAt: serverTimestamp(),
    ...over,
  });

  it('發起人可以發組隊邀請，但不能冒名、不能替別人答應、不能只有自己、不能一開始就抽好或多給重抽', async () => {
    await assertSucceeds(addDoc(collection(as('amy'), 'outings'), outing()));
    await assertSucceeds(addDoc(collection(as('amy'), 'outings'), outing({ confirm: true })));
    await assertFails(addDoc(collection(as('bob'), 'outings'), outing()));
    await assertFails(addDoc(collection(as('amy'), 'outings'), outing({ answers: { amy: 'go', bob: 'go' } })));
    await assertFails(addDoc(collection(as('amy'), 'outings'), outing({ party: ['amy'] })));
    await assertFails(addDoc(collection(as('amy'), 'outings'), outing({ status: 'go' })));
    await assertFails(addDoc(collection(as('amy'), 'outings'), outing({ rid: 'r1', seed: 7 })));
    await assertFails(addDoc(collection(as('amy'), 'outings'), outing({ rerolls: 99 })));
    await assertFails(
      addDoc(
        collection(as('amy'), 'outings'),
        outing({ expireAt: Timestamp.fromMillis(Date.now() + 400 * 86_400_000) }),
      ),
    );
  });

  it('只有被揪的人看得到', async () => {
    await seedOuting();
    await assertSucceeds(getDoc(doc(as('bob'), 'outings/o1')));
    await assertFails(getDoc(doc(as('stranger'), 'outings/o1')));
  });

  it('被揪的人只能回覆自己要不要加入', async () => {
    await seedOuting();
    await assertSucceeds(updateDoc(doc(as('bob'), 'outings/o1'), { 'answers.bob': 'go' }));
    await assertSucceeds(updateDoc(doc(as('bob'), 'outings/o1'), { 'answers.bob': 'pass' }));
    await assertFails(updateDoc(doc(as('bob'), 'outings/o1'), { 'answers.bob': 'maybe' }));
    await assertFails(updateDoc(doc(as('bob'), 'outings/o1'), { 'answers.amy': 'pass' }));
    await assertFails(updateDoc(doc(as('bob'), 'outings/o1'), { status: 'go', updatedAt: serverTimestamp() }));
  });

  it('加入的人都可以抽：第一次不扣，之後全隊共用重抽次數，扣到零就不能再抽', async () => {
    await seedOuting({ answers: { amy: 'go', bob: 'go' } });
    // 沒加入的 carl 不能抽
    await assertFails(updateDoc(doc(as('carl'), 'outings/o1'), draw('carl', 3)));
    // bob 抽第一支：不扣
    await assertFails(updateDoc(doc(as('bob'), 'outings/o1'), draw('bob', 2)));
    await assertSucceeds(updateDoc(doc(as('bob'), 'outings/o1'), draw('bob', 3)));
    // amy 重抽：扣一次（不能不扣，也不能冒名）
    await assertFails(updateDoc(doc(as('amy'), 'outings/o1'), draw('amy', 3, { seed: 8 })));
    await assertFails(updateDoc(doc(as('amy'), 'outings/o1'), draw('bob', 2, { seed: 8 })));
    await assertSucceeds(updateDoc(doc(as('amy'), 'outings/o1'), draw('amy', 2, { seed: 8 })));
    await seedOuting({ answers: { amy: 'go', bob: 'go' }, ...draw('amy', 0), updatedAt: Timestamp.now() });
    await assertFails(updateDoc(doc(as('bob'), 'outings/o1'), draw('bob', -1, { seed: 9 })));
  });

  it('抽到之後，加入的人可以決定出發；發起人可以收回；名單不能改、不能刪', async () => {
    await seedOuting({ answers: { amy: 'go', bob: 'go' } });
    await assertFails(updateDoc(doc(as('bob'), 'outings/o1'), { status: 'go', updatedAt: serverTimestamp() }));
    await seedOuting({ answers: { amy: 'go', bob: 'go' }, ...draw('bob', 3), updatedAt: Timestamp.now() });
    await assertFails(updateDoc(doc(as('carl'), 'outings/o1'), { status: 'go', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('bob'), 'outings/o1'), { status: 'closed', updatedAt: serverTimestamp() }));
    await assertFails(
      updateDoc(doc(as('amy'), 'outings/o1'), { party: ['amy', 'stranger'], updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(updateDoc(doc(as('bob'), 'outings/o1'), { status: 'go', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(as('amy'), 'outings/o1')));
    await seedOuting({ answers: { amy: 'go', bob: 'go' } });
    await assertSucceeds(updateDoc(doc(as('amy'), 'outings/o1'), { status: 'closed', updatedAt: serverTimestamp() }));
  });

  it('抽到之後，發起人有要求才需要回覆要不要去', async () => {
    await seedOuting({ answers: { amy: 'go', bob: 'go' }, ...draw('amy', 3), updatedAt: Timestamp.now() });
    await assertFails(updateDoc(doc(as('bob'), 'outings/o1'), { 'replies.bob': 'go' }));
    await seedOuting({
      answers: { amy: 'go', bob: 'go' },
      ...draw('amy', 3),
      updatedAt: Timestamp.now(),
      confirm: true,
    });
    await assertSucceeds(updateDoc(doc(as('bob'), 'outings/o1'), { 'replies.bob': 'go' }));
    await assertFails(updateDoc(doc(as('bob'), 'outings/o1'), { 'replies.amy': 'pass' }));
  });

  it('出發或收回之後就不能再回覆', async () => {
    await seedOuting({ ...draw('amy', 3), status: 'go', updatedAt: Timestamp.now() });
    await assertFails(updateDoc(doc(as('bob'), 'outings/o1'), { 'answers.bob': 'go' }));
  });
});
