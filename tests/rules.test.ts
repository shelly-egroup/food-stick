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

describe('舊的資料不能再寫', () => {
  it('抽籤紀錄、揪團單、每日次數都已經停用', async () => {
    await assertFails(
      addDoc(collection(as('amy'), 'draws'), {
        rid: 'r1',
        uid: 'amy',
        mode: 'solo',
        party: ['amy'],
        createdAt: serverTimestamp(),
        rerolled: false,
      }),
    );
    await assertFails(addDoc(collection(as('amy'), 'outings'), { host: 'amy', party: ['amy', 'bob'] }));
    await assertFails(updateDoc(doc(as('amy'), 'members/amy'), { today: { day: '2026-10-15', left: 2 } }));
  });
});

describe('餐單', () => {
  const DATE = '2026-09-10';
  const ID = `${DATE}_lunch_amy`;
  const HOUR = 3_600_000;
  const filters = { categories: [], prices: [], walks: [], prefer: 'favorites' };
  const pickOf = (by: string, rid = 'r1', over: Record<string, unknown> = {}) => ({
    rid,
    name: rid === 'r1' ? '巷口牛肉麵' : `店${rid}`,
    by,
    at: Timestamp.now(),
    seed: 7,
    variant: '',
    theme: 'temple',
    lines: [],
    verdict: '',
    ...over,
  });
  const meal = (over: Record<string, unknown> = {}) => ({
    v: 1,
    date: DATE,
    slot: { key: 'lunch', label: '午餐' },
    host: 'amy',
    party: ['amy', 'bob', 'carl'],
    answers: {},
    going: ['amy'],
    rerolls: 3,
    rerollsLeft: 3,
    filters,
    picks: [],
    cands: [],
    skips: [],
    decision: null,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    endsAt: Timestamp.fromMillis(Date.now() + 3 * HOUR),
    ...over,
  });
  /** 直接放一張餐單進去（略過規則），預設 bob 已經說要去 */
  const seed = (over: Record<string, unknown> = {}, id = ID) =>
    env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'meals', id),
        meal({
          answers: { bob: 'in' },
          going: ['amy', 'bob'],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          ...over,
        }),
      );
    });
  const ref = (uid: string, id = ID) => doc(as(uid), 'meals', id);
  /** 畫面的寫法：整個陣列重寫，前面的原封不動 */
  const stored = async () => {
    let data: Record<string, unknown> = {};
    await env.withSecurityRulesDisabled(async (ctx) => {
      data = (await getDoc(doc(ctx.firestore(), 'meals', ID))).data() ?? {};
    });
    return data as { picks: unknown[]; cands: string[]; skips: unknown[] };
  };

  it('開一餐：單號一定是「日期_餐別_自己」，不能冒名、不能多給次數、不能一開始就起駕', async () => {
    await assertSucceeds(setDoc(ref('amy'), meal()));
    await assertFails(setDoc(ref('bob', `${DATE}_lunch_bob`), meal()));
    await assertFails(setDoc(ref('amy', `${DATE}_tea_amy`), meal()));
    await assertFails(setDoc(ref('amy', `${DATE}_lunch_amy2`), meal()));
    await assertFails(
      setDoc(
        ref('amy', `${DATE}_dinner_amy`),
        meal({ slot: { key: 'dinner', label: '晚餐' }, rerolls: 9, rerollsLeft: 9 }),
      ),
    );
    await assertFails(
      setDoc(ref('amy', `${DATE}_dinner_amy`), meal({ slot: { key: 'dinner', label: '晚餐' }, status: 'decided' })),
    );
    await assertFails(
      setDoc(ref('amy', `${DATE}_dinner_amy`), meal({ slot: { key: 'dinner', label: '晚餐' }, going: ['amy', 'bob'] })),
    );
  });

  it('自己寫的餐別：單號是 c-名字；不能帶單號用不了的符號', async () => {
    const custom = { key: 'custom', label: '加班餐' };
    await assertSucceeds(setDoc(ref('amy', `${DATE}_c-加班餐_amy`), meal({ slot: custom })));
    await assertFails(setDoc(ref('amy', `${DATE}_c-加_班_amy`), meal({ slot: { key: 'custom', label: '加_班' } })));
  });

  it('同一個人同一天同一餐別只有一張：已經有了就不能再開', async () => {
    await seed();
    await assertFails(setDoc(ref('amy'), meal()));
  });

  it('開單可以順便帶第一支，但不能冒名抽', async () => {
    await assertSucceeds(setDoc(ref('amy'), meal({ picks: [pickOf('amy')], cands: ['r1'] })));
    await assertFails(
      setDoc(
        ref('amy', `${DATE}_tea_amy`),
        meal({ slot: { key: 'tea', label: '下午茶' }, picks: [pickOf('bob')], cands: ['r1'] }),
      ),
    );
  });

  it('要去的人都能抽：第一支不扣，之後每支扣一次，扣到 0 就不能抽', async () => {
    await seed({ rerollsLeft: 1 });
    const draw = async (uid: string, rid: string, left: number) => {
      const d = await stored();
      return updateDoc(ref(uid), {
        picks: [...d.picks, pickOf(uid, rid)],
        cands: [...d.cands.filter((x) => x !== rid), rid],
        rerollsLeft: left,
        updatedAt: serverTimestamp(),
      });
    };
    await assertFails(draw('carl', 'r1', 1)); // 還沒回的人不能抽
    await assertFails(draw('bob', 'r1', 0)); // 第一支不能扣
    await assertSucceeds(draw('bob', 'r1', 1));
    await assertFails(draw('amy', 'r2', 1)); // 之後一定要扣
    await assertSucceeds(draw('amy', 'r2', 0));
    await assertFails(draw('amy', 'r3', -1)); // 扣到 0 就不能抽
  });

  it('抽的時候不能改掉前面抽過的', async () => {
    await seed({ picks: [pickOf('amy')], cands: ['r1'] });
    await assertFails(
      updateDoc(ref('amy'), {
        picks: [pickOf('amy', 'r9'), pickOf('amy', 'r2')],
        cands: ['r9', 'r2'],
        rerollsLeft: 2,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('起駕：要去的人從候選選一家，選不在候選裡的不行', async () => {
    await seed({ picks: [pickOf('amy'), pickOf('amy', 'r2')], cands: ['r1', 'r2'] });
    const decide = (uid: string, rid: string) =>
      updateDoc(ref(uid), {
        decision: { rid, by: uid, at: serverTimestamp() },
        status: 'decided',
        updatedAt: serverTimestamp(),
      });
    await assertFails(decide('carl', 'r1'));
    await assertFails(decide('bob', 'r9'));
    await assertSucceeds(decide('bob', 'r1'));
    // 起駕之後就不能再抽
    const d = await stored();
    await assertFails(
      updateDoc(ref('amy'), {
        picks: [...d.picks, pickOf('amy', 'r3')],
        cands: [...d.cands, 'r3'],
        rerollsLeft: 2,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('這家去不了：起駕後也能按，補抽一家，重抽次數回到原本的數字', async () => {
    await seed({
      picks: [pickOf('amy'), pickOf('amy', 'r2')],
      cands: ['r1', 'r2'],
      rerollsLeft: 0,
      status: 'decided',
      decision: { rid: 'r2', by: 'amy', at: Timestamp.now() },
    });
    const d = await stored();
    const skip = (uid: string, over: Record<string, unknown> = {}) =>
      updateDoc(ref(uid), {
        skips: [{ rid: 'r2', by: uid, at: Timestamp.now() }],
        picks: [...d.picks, pickOf(uid, 'r3')],
        cands: ['r1', 'r3'],
        rerollsLeft: 3,
        decision: null,
        status: 'open',
        updatedAt: serverTimestamp(),
        ...over,
      });
    await assertFails(skip('carl'));
    await assertFails(skip('bob', { rerollsLeft: 5 }));
    await assertFails(skip('bob', { cands: ['r1', 'r2', 'r3'] }));
    await assertSucceeds(skip('bob'));
  });

  it('這家去不了：沒有店可以補的時候只拿掉那一家', async () => {
    await seed({ picks: [pickOf('amy')], cands: ['r1'], rerollsLeft: 0 });
    const d = await stored();
    await assertSucceeds(
      updateDoc(ref('bob'), {
        skips: [{ rid: 'r1', by: 'bob', at: Timestamp.now() }],
        picks: d.picks,
        cands: [],
        rerollsLeft: 3,
        decision: null,
        status: 'open',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('被揪的人只能回覆自己，要去的名單跟著改；不在名單上的不能回', async () => {
    await seed();
    const answer = (uid: string, a: string, going: string[]) =>
      updateDoc(ref(uid), { [`answers.${uid}`]: a, going, updatedAt: serverTimestamp() });
    await assertSucceeds(answer('carl', 'in', ['amy', 'bob', 'carl']));
    await assertSucceeds(answer('carl', 'out', ['amy', 'bob']));
    await assertFails(answer('carl', 'in', ['amy', 'bob'])); // 名單沒跟著改
    await assertFails(answer('carl', 'maybe', ['amy', 'bob']));
    await assertFails(answer('boss', 'in', ['amy', 'bob', 'boss']));
    await assertFails(updateDoc(ref('carl'), { 'answers.bob': 'out', going: ['amy'], updatedAt: serverTimestamp() }));
  });

  it('時間到了（開單三小時後）就不能再動，發起人可以重新開張', async () => {
    await seed({ endsAt: Timestamp.fromMillis(Date.now() - 1000), picks: [pickOf('amy')], cands: ['r1'] });
    await assertFails(
      updateDoc(ref('bob'), {
        decision: { rid: 'r1', by: 'bob', at: serverTimestamp() },
        status: 'decided',
        updatedAt: serverTimestamp(),
      }),
    );
    const reopen = (uid: string) =>
      updateDoc(ref(uid), {
        party: [uid],
        answers: {},
        going: [uid],
        filters,
        status: 'open',
        decision: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        endsAt: Timestamp.fromMillis(Date.now() + 3 * HOUR),
      });
    await assertFails(reopen('bob'));
    await assertSucceeds(reopen('amy'));
  });

  it('起駕過的、還沒到時間的，都不能重新開張', async () => {
    await seed({
      endsAt: Timestamp.fromMillis(Date.now() - 1000),
      picks: [pickOf('amy')],
      cands: ['r1'],
      status: 'decided',
      decision: { rid: 'r1', by: 'amy', at: Timestamp.now() },
    });
    await assertFails(
      updateDoc(ref('amy'), {
        party: ['amy'],
        answers: {},
        going: ['amy'],
        filters,
        status: 'open',
        decision: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        endsAt: Timestamp.fromMillis(Date.now() + 3 * HOUR),
      }),
    );
  });

  it('只有發起人能取消、加人、改篩選；加人只能加不能踢；不能刪', async () => {
    await seed();
    await assertFails(updateDoc(ref('bob'), { status: 'cancelled', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref('bob'), { party: ['amy', 'bob', 'carl', 'boss'], updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref('amy'), { party: ['amy', 'bob'], updatedAt: serverTimestamp() }));
    await assertSucceeds(
      updateDoc(ref('amy'), { party: ['amy', 'bob', 'carl', 'boss'], updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(ref('bob'), { filters: { ...filters, prefer: 'explore' }, updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(
      updateDoc(ref('amy'), { filters: { ...filters, prefer: 'explore' }, updatedAt: serverTimestamp() }),
    );
    await assertFails(deleteDoc(ref('amy')));
    await assertSucceeds(updateDoc(ref('amy'), { status: 'cancelled', updatedAt: serverTimestamp() }));
  });

  it('成員都讀得到（排行榜要算），外人讀不到', async () => {
    await seed();
    await assertSucceeds(getDoc(ref('carl')));
    await assertFails(getDoc(ref('stranger')));
  });
});
