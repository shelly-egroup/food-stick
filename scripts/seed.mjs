// 在本機模擬器放入示範資料：npm run seed（需先 npm run emulators）
// 店名、人名都是虛構的示範資料。
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

const PROJECT = 'demo-lunchstick';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

const dev = JSON.parse(readFileSync(new URL('./dev-accounts.json', import.meta.url), 'utf8'));

await fetch(
  `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
  { method: 'DELETE' },
);
await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/accounts`, {
  method: 'DELETE',
});

initializeApp({ projectId: PROJECT });
const db = getFirestore();
const auth = getAuth();

const now = Date.now();
const daysAgo = (d, h = 12) => {
  const t = new Date(now - d * 86400_000);
  t.setHours(h, Math.floor(Math.random() * 50), 0, 0);
  return Timestamp.fromDate(t);
};
const map = (name) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;

const shops = [
  ['r01', '巷口牛肉麵', 'noodle', 2, 5, true],
  ['r02', '阿嬤滷肉飯', 'rice', 1, 5, false],
  ['r03', '好味自助餐', 'bento', 1, 10, true],
  ['r04', '池畔雞腿便當', 'bento', 1, 10, true],
  ['r05', '小林咖哩', 'world', 2, 10, true],
  ['r06', '越南河粉小館', 'world', 2, 15, true],
  ['r07', '綠盒子健康餐', 'light', 2, 5, false],
  ['r08', '老街水餃', 'snack', 1, 10, true],
  ['r09', '晨光早午餐', 'brunch', 2, 15, true],
  ['r10', '福來鍋燒意麵', 'noodle', 1, 5, false],
  ['r11', '川味麻辣燙', 'other', 2, 10, true],
  ['r12', '金城燒臘', 'rice', 2, 10, true],
  ['r13', '曼谷小廚', 'world', 2, 20, true],
  ['r14', '廟口蚵仔煎', 'snack', 1, 15, false],
  ['r15', '丼丼亭', 'rice', 3, 15, true],
  ['r16', '首爾拌飯', 'world', 2, 10, true],
  ['r17', '巷尾手搖茶', 'drink', 1, 5, true],
  ['r18', '綿綿雪花冰', 'dessert', 1, 10, true],
];

const prefs = {
  'u-ming': { likes: ['r01', 'r02', 'r05', 'r12', 'r08'], blocks: ['r11'], role: 'admin' },
  'u-hua': { likes: ['r01', 'r11', 'r13', 'r16'], blocks: ['r07', 'r09', 'r14'] },
  'u-mei': { likes: ['r07', 'r09', 'r05', 'r01', 'r16'], blocks: ['r10'] },
  'u-jie': { likes: ['r01', 'r03', 'r12', 'r15'], blocks: [] },
  'u-ting': { likes: ['r09', 'r07', 'r06', 'r01'], blocks: ['r11', 'r14'] },
  'u-kai': { likes: ['r02', 'r12', 'r05', 'r13', 'r04'], blocks: ['r06'] },
};

for (const a of dev.accounts) {
  await auth.createUser({
    uid: a.uid,
    email: a.email,
    password: dev.password,
    displayName: a.name,
    emailVerified: true,
  });
  if (a.member === false) continue;
  const p = prefs[a.uid] ?? { likes: [], blocks: [] };
  await db.doc(`members/${a.uid}`).set({
    name: a.name,
    photoURL: '',
    likes: p.likes,
    blocks: p.blocks,
    joinedAt: daysAgo(40),
    ...(p.role ? { role: p.role } : {}),
  });
}

const owners = ['u-ming', 'u-hua', 'u-mei', 'u-jie', 'u-ting', 'u-kai'];
for (const [i, [id, name, category, price, walk, group]] of shops.entries()) {
  await db.doc(`restaurants/${id}`).set({
    name,
    category,
    price,
    walk,
    group,
    mapUrl: map(name),
    // 丼丼亭的建立者沒有開放大家修改
    open: id !== 'r15',
    createdBy: owners[i % owners.length],
    createdAt: daysAgo(35 - i),
    updatedAt: daysAgo(35 - i),
  });
}

// 過去幾天的餐單（一餐一張）：自己吃的、揪團的、換過幾支才起駕的、說過去不了的、收回的、時間到沒定的。
// 今天的不放，留給畫面上自己抽、自己揪
const name = (rid) => shops.find((x) => x[0] === rid)[1];
const TAIPEI = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const dateAgo = (d) => TAIPEI.format(new Date(now - d * 86400_000));
const SLOTS = {
  breakfast: { key: 'breakfast', label: '早餐' },
  lunch: { key: 'lunch', label: '午餐' },
  tea: { key: 'tea', label: '下午茶' },
  dinner: { key: 'dinner', label: '晚餐' },
};
const pick = (rid, by, at, k) => ({
  rid,
  name: name(rid),
  by,
  at,
  seed: 1000 + k * 37,
  variant: '',
  theme: k % 2 ? 'magic' : 'temple',
  lines: [],
  verdict: '',
});

/**
 * d：幾天前；host：發起人；going：要去的人（含發起人）；party：被揪的所有人（預設就是 going）；
 * tried：照順序抽過的店；skipped：其中說過去不了的；chosen：起駕的那一家（沒有就是沒定）
 */
const meals = [
  { d: 1, host: 'u-ming', going: ['u-ming', 'u-jie', 'u-hua'], tried: ['r12', 'r05', 'r01'], chosen: 'r01' },
  {
    d: 1,
    host: 'u-mei',
    going: ['u-mei', 'u-ting'],
    tried: ['r09', 'r07'],
    skipped: ['r09'],
    chosen: 'r07',
    slot: 'tea',
  },
  { d: 2, host: 'u-ming', going: ['u-ming'], tried: ['r02'], chosen: 'r02' },
  {
    d: 2,
    host: 'u-kai',
    going: ['u-kai', 'u-ming'],
    party: ['u-kai', 'u-ming', 'u-hua'],
    tried: ['r12'],
    chosen: 'r12',
  },
  { d: 3, host: 'u-ming', going: ['u-ming', 'u-jie', 'u-hua'], tried: ['r01'], chosen: 'r01' },
  { d: 3, host: 'u-ting', going: ['u-ting'], tried: ['r06', 'r09'], chosen: 'r06', slot: 'dinner' },
  { d: 4, host: 'u-ming', going: ['u-ming', 'u-kai'], tried: ['r14', 'r05', 'r12'], skipped: ['r14'], chosen: 'r12' },
  { d: 4, host: 'u-mei', going: ['u-mei', 'u-ting'], tried: ['r05'], chosen: 'r05' },
  { d: 5, host: 'u-jie', going: ['u-jie'], tried: ['r03', 'r15'], chosen: 'r15' },
  { d: 5, host: 'u-ming', going: ['u-ming'], tried: ['r08'], chosen: 'r08', slot: 'breakfast' },
  { d: 6, host: 'u-hua', going: ['u-hua', 'u-ming', 'u-jie'], tried: ['r16', 'r01'], chosen: 'r01' },
  { d: 6, host: 'u-kai', going: ['u-kai'], tried: ['r04'], chosen: 'r04' },
  { d: 7, host: 'u-ming', going: ['u-ming', 'u-jie'], tried: ['r10', 'r13'], chosen: null },
  { d: 7, host: 'u-mei', going: ['u-mei'], tried: ['r16'], chosen: 'r16' },
  { d: 8, host: 'u-ming', going: ['u-ming', 'u-hua'], tried: ['r11'], chosen: null, cancelled: true },
  { d: 8, host: 'u-ting', going: ['u-ting', 'u-mei'], tried: ['r09'], chosen: 'r09', slot: 'tea' },
  { d: 9, host: 'u-kai', going: ['u-kai', 'u-ming'], tried: ['r13', 'r12'], chosen: 'r12' },
  { d: 10, host: 'u-jie', going: ['u-jie', 'u-ming'], tried: ['r01'], chosen: 'r01' },
];
let n = 0;
for (const [k, m] of meals.entries()) {
  const slot = SLOTS[m.slot ?? 'lunch'];
  const date = dateAgo(m.d);
  const created = daysAgo(
    m.d,
    slot.key === 'breakfast' ? 8 : slot.key === 'tea' ? 15 : slot.key === 'dinner' ? 18 : 11,
  );
  const skipped = m.skipped ?? [];
  const picks = m.tried.map((rid, i) => pick(rid, m.going[i % m.going.length], created, k + i));
  const party = m.party ?? m.going;
  await db.doc(`meals/${date}_${slot.key}_${m.host}`).set({
    v: 1,
    date,
    slot,
    host: m.host,
    party,
    answers: Object.fromEntries(party.filter((u) => u !== m.host).map((u) => [u, m.going.includes(u) ? 'in' : 'out'])),
    going: m.going,
    rerolls: 3,
    rerollsLeft: Math.max(0, 3 - (m.tried.length - 1 - skipped.length)),
    filters: { categories: [], prices: [], walks: [], prefer: 'favorites' },
    picks,
    cands: m.tried.filter((rid) => !skipped.includes(rid)),
    skips: skipped.map((rid) => ({ rid, by: m.host, at: created })),
    decision: m.chosen ? { rid: m.chosen, by: m.going[k % m.going.length], at: created } : null,
    status: m.cancelled ? 'cancelled' : m.chosen ? 'decided' : 'open',
    createdAt: created,
    updatedAt: created,
    endsAt: Timestamp.fromMillis(created.toMillis() + 3 * 3_600_000),
  });
  n++;
}

const notes = [
  ['r01', 'u-jie', '湯頭今天特別濃，加麵不用錢', 0.2],
  ['r12', 'u-kai', '叉燒雙拼必點，飯可以加滷汁', 0.6],
  ['r09', 'u-ting', '週五人很多，建議十一點半前到', 1.3],
  ['r05', 'u-mei', '辣度選三就很夠了，不要逞強', 2.1],
  ['r01', 'u-ming', '老闆說下週二公休', 2.8],
  ['r16', 'u-hua', '石鍋拌飯鍋巴超香，記得刮', 3.4],
  ['r02', 'u-kai', '滷蛋要加，半熟的', 4.2],
  ['r07', 'u-mei', '雞胸肉很嫩，減脂期救星', 5.1],
];
for (const [rid, uid, text, d] of notes) {
  await db
    .collection(`restaurants/${rid}/comments`)
    .add({ uid, text, createdAt: Timestamp.fromMillis(now - d * 86400_000) });
}

console.log(`示範資料已放好：${shops.length} 家店、${dev.accounts.length} 個帳號、${n} 張餐單、${notes.length} 張紙條`);
process.exit(0);
