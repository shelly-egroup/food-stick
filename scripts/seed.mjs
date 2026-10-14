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

// 本月的抽籤紀錄：有定案的，也有被重抽的
const dayOfMonth = new Date().getDate();
const draws = [
  ['r01', 'u-ming', 6],
  ['r01', 'u-jie', 4],
  ['r01', 'u-hua', 5],
  ['r12', 'u-kai', 4],
  ['r12', 'u-ming', 3],
  ['r05', 'u-mei', 3],
  ['r05', 'u-kai', 2],
  ['r09', 'u-ting', 3],
  ['r02', 'u-ming', 2],
  ['r16', 'u-hua', 2],
  ['r03', 'u-jie', 2],
  ['r07', 'u-mei', 2],
  ['r13', 'u-hua', 1],
  ['r08', 'u-ming', 1],
  ['r04', 'u-kai', 1],
];
let n = 0;
for (const [rid, uid, times] of draws) {
  for (let k = 0; k < times; k++) {
    const d = Math.min(dayOfMonth - 1, (n * 7 + k * 3) % 13);
    await db.collection('draws').add({
      rid,
      uid,
      mode: k % 2 ? 'group' : 'solo',
      party: [uid],
      createdAt: daysAgo(d, 11),
      rerolled: false,
    });
    if (k % 3 === 0) {
      await db.collection('draws').add({
        rid: shops[(n + k) % shops.length][0],
        uid,
        mode: 'solo',
        party: [uid],
        createdAt: daysAgo(d, 11),
        rerolled: true,
      });
    }
    n++;
  }
}

// 揪團的紀錄：小明常跟阿傑、阿華一起吃，也跟凱文吃過兩次；美美常揪婷婷
const groups = [
  ['r01', 'u-ming', ['u-ming', 'u-jie', 'u-hua'], 3],
  ['r12', 'u-ming', ['u-ming', 'u-kai'], 2],
  ['r05', 'u-mei', ['u-mei', 'u-ting'], 2],
];
for (const [rid, uid, party, times] of groups) {
  for (let k = 0; k < times; k++) {
    await db.collection('draws').add({
      rid,
      uid,
      mode: 'group',
      party,
      createdAt: daysAgo(Math.min(dayOfMonth - 1, 1 + k * 3), 12),
      rerolled: false,
    });
    n++;
  }
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

console.log(
  `示範資料已放好：${shops.length} 家店、${dev.accounts.length} 個帳號、${n} 筆定案紀錄、${notes.length} 張紙條`,
);
process.exit(0);
