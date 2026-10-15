// 把正式專案（lunch-stick）的資料複製一份到測試專案（food-stick-dev）：node scripts/copy-prod-to-test.mjs [--dry]
// 只會「正式 → 測試」單向複製，測試專案不是 food-stick-dev 就不跑，絕對不會寫進正式專案。
//
// 需要兩個專案的服務帳戶金鑰（Firebase Console → 專案設定 → 服務帳戶 → 產生新的私密金鑰），放在：
//   .secrets/lunch-stick.json      正式（只讀）
//   .secrets/food-stick-dev.json   測試（寫入）
// .secrets/ 不會上傳到 GitHub；複製完可以把金鑰刪掉，也可以到 Console 停用。
//
// 會複製：
// - 登入帳號（Google 登入的同事）：uid 保持一樣，在測試站用同一個 Google 帳號登入，就是同一個人、同一份愛店
// - Firestore 全部集合（members、restaurants 與底下的 comments、draws、outings），文件 id 與時間都保持原樣
// 測試專案裡同 id 的文件會被蓋掉；測試專案自己多出來的文件不會刪。
import { existsSync, readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const FROM = 'lunch-stick';
const TO = 'food-stick-dev';
const dry = process.argv.includes('--dry');

function app(project, name) {
  const file = new URL(`../.secrets/${project}.json`, import.meta.url);
  if (!existsSync(file)) {
    console.error(`找不到 .secrets/${project}.json：到 Firebase Console 下載 ${project} 的服務帳戶金鑰放進去`);
    process.exit(1);
  }
  const key = JSON.parse(readFileSync(file, 'utf8'));
  if (key.project_id !== project) {
    console.error(`.secrets/${project}.json 是 ${key.project_id} 的金鑰，不是 ${project}，不跑`);
    process.exit(1);
  }
  return initializeApp({ credential: cert(key), projectId: project }, name);
}

const from = app(FROM, 'from');
const to = app(TO, 'to');
console.log(`${FROM} → ${TO}${dry ? '（只數數量，不寫入）' : ''}`);

// ---------- 登入帳號 ----------
let users = 0;
let pageToken;
do {
  const page = await getAuth(from).listUsers(1000, pageToken);
  pageToken = page.pageToken;
  // 同事都是 Google 登入，沒有密碼；萬一有密碼帳號，密碼不帶過去（到測試站改用 Google 登入）
  const batch = page.users.map((u) => ({
    uid: u.uid,
    email: u.email,
    emailVerified: u.emailVerified,
    displayName: u.displayName,
    photoURL: u.photoURL,
    disabled: u.disabled,
    metadata: { creationTime: u.metadata.creationTime, lastSignInTime: u.metadata.lastSignInTime },
    providerData: u.providerData
      .filter((p) => p.providerId !== 'password')
      .map((p) => ({
        uid: p.uid,
        providerId: p.providerId,
        email: p.email,
        displayName: p.displayName,
        photoURL: p.photoURL,
      })),
  }));
  if (!dry && batch.length) {
    const r = await getAuth(to).importUsers(batch);
    r.errors.forEach((e) => console.warn(`  帳號 ${batch[e.index].email} 沒有匯入：${e.error.message}`));
  }
  users += batch.length;
} while (pageToken);
console.log(`  帳號 ${users} 個`);

// ---------- Firestore ----------
const src = getFirestore(from);
const dst = getFirestore(to);
const writer = dry ? null : dst.bulkWriter();
const counts = {};

async function copy(collection) {
  const snap = await collection.get();
  for (const doc of snap.docs) {
    writer?.set(dst.doc(doc.ref.path), doc.data());
    counts[collection.id] = (counts[collection.id] ?? 0) + 1;
    for (const sub of await doc.ref.listCollections()) await copy(sub);
  }
}

for (const c of await src.listCollections()) await copy(c);
await writer?.close();
for (const [name, n] of Object.entries(counts)) console.log(`  ${name} ${n} 筆`);
console.log(dry ? '數完了，拿掉 --dry 才會真的複製' : '複製好了');
