// 情境截圖的圖庫：把 scenes.mjs 拍好的截圖排成一頁，廟宇、魔法並排，手機、電腦切換。
// node scripts/gallery.mjs [截圖資料夾]（scenes.mjs 跑完也會自動產生）→ 資料夾裡的 index.html
import { readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** 每一張截圖在說什麼（廟宇／魔法的叫法不同時兩個都寫） */
const CAPTIONS = {
  'solo-01-home': ['首頁', '還沒抽，篩選摘要第一顆是「午餐」'],
  'solo-02-drawing': ['求籤／施法中', '籤筒搖起來、水晶球亮起來'],
  'solo-03-first-pick': ['第一支', '第一支不扣次數，可以起駕或再抽'],
  'solo-04-reroll': ['再抽一支', '香（魔力球）少一根'],
  'solo-04a-oracle-bottom': ['籤卡最下面', '看供桌上的籤（預言牌陣）、這家去不了'],
  'solo-04b-oracle-altar': ['按了才彈出供桌', '籤卡現在翻開的那支有虛線框'],
  'solo-05-home-with-sticks': ['收起籤卡', '首頁提示列記著供桌上有幾支'],
  'solo-05b-sticks-sheet': ['首頁攤開供桌', '點一支翻開那支籤卡'],
  'solo-06-pick-earlier': ['選回前面那支', '可以起駕任何一支抽過的'],
  'solo-07-decided': ['起駕', '封條貼過籤筒：定案章、餐別小牌'],
  'solo-08-decided-card': ['定案的籤卡', '帶我去：地圖卡，不會自己跳 Google 地圖'],
  'solo-09-cant-go-ask': ['這家去不了', '按一次問「真的去不了？」'],
  'solo-10-replaced': ['自動補一家', '重抽次數回到原本的 3 次'],
  'solo-11-after-skip': ['回到還在抽', '封條拿掉，繼續抽'],
  'solo-12-spent': ['次數用完', '大按鈕改成從供桌挑一支'],
  'solo-13-spent-card': ['次數用完的籤卡', '提醒從供桌挑，還是能起駕'],
  'solo-14-filters-sheet': ['篩選紙', '哪一餐、備幾炷香（魔力球）、類型、價位、步行都排成整齊的方塊'],
  'solo-15-custom-slot': ['自己寫的一餐', '加班餐亮在第六塊；還沒開的一餐可以改重抽次數'],
  'solo-16-custom-home': ['換到加班餐', '新的一餐，供桌是空的'],
  'group-01-pick-crew': ['揪團', '勾選要一起吃的同事'],
  'group-02-sent': ['紅帖發出', '首頁看得到大家的回覆'],
  'group-03-invited-banner': ['被揪的人', '上方跳出報馬仔（貓頭鷹）橫幅'],
  'group-04-invite-card': ['紅帖（邀請信）', '我要去／這次不了，郵戳記著幾點發的'],
  'group-05-declined': ['阿傑這次不了', '帖子上改成改天'],
  'group-06-replies': ['發起人看回覆', '要去、還沒回、改天各一顆數字章'],
  'group-07-host-drew': ['發起人抽籤', '籤卡上看得到大家的頭像'],
  'group-08-member-sees': ['要去的人同步', '阿華的畫面翻開同一支'],
  'group-09-host-sees-reroll': ['阿華再抽', '大家跟著翻，重抽次數整團共用'],
  'group-09b-host-card-bottom': ['揪團籤卡最下面', '頭像和報馬仔一排，供桌和去不了一排'],
  'group-10-member-decided': ['阿華起駕', '要去的人都可以按'],
  'group-11-host-sees-decided': ['發起人首頁', '同步貼上封條'],
  'group-12-pending-after-decided': ['還沒回的人', '起駕之後還能補按我要去'],
  'group-13-joined-late': ['補按之後', '帖子先留著，看得到帶我去'],
  'group-14-altar-from-herald': ['從帖子彈出供桌', '起駕的那支蓋著定案章'],
  'pages-01-history': ['食籤簿／冒險日誌', '封面：這個月、最常去、最常同行'],
  'pages-02-history-scroll': ['往下捲', '日期章跟著那一天'],
  'pages-02b-history-inbox': ['收帖／收信', '別人揪我的'],
  'pages-02c-history-sent': ['發帖／寄信', '我揪別人的'],
  'pages-02d-history-solo': ['獨拜／獨行', '自己吃的'],
  'pages-03-history-tried': ['求過的籤', '展開這一餐抽過、沒去的'],
  'pages-04-shops': ['店家', '類型、步行篩選（含飲料、甜點）'],
  'pages-05-shop': ['店家卡', '張貼日期章、上次去、帶我去'],
  'pages-06-ranks': ['金榜／星盤', '這個月的排行'],
};

const GROUPS = [
  ['solo', '自己吃', '一個人也是一餐：抽、再抽、從供桌挑、起駕、去不了、次數用完、換一餐'],
  ['group', '揪團吃', '四個同事各自一個瀏覽器：發紅帖、回覆、同步翻籤、共用次數、起駕、補按'],
  ['pages', '其他頁面', '食籤簿（冒險日誌）、店家、金榜（星盤）'],
];
const THEMES = [
  ['temple', '廟宇'],
  ['magic', '魔法'],
];

export function writeGallery(dir) {
  const files = new Set(readdirSync(dir).filter((f) => f.endsWith('.png')));
  const sizes = ['mobile', 'desktop'].filter((s) => [...files].some((f) => f.includes(`-${s}-`)));
  const names = [...new Set([...files].map((f) => f.replace(/^(temple|magic)-(mobile|desktop)-|\.png$/g, '')))];
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const sections = GROUPS.map(([key, title, lede]) => {
    const rows = names
      .filter((n) => n.startsWith(`${key}-`))
      .sort()
      .map((n, i) => {
        const [head, sub] = CAPTIONS[n] ?? [n, ''];
        const shots = sizes
          .map((size) => {
            const pics = THEMES.map(([t, label]) => {
              const f = `${t}-${size}-${n}.png`;
              return files.has(f)
                ? `<figure><a href="${f}" target="_blank"><img loading="lazy" src="${f}" alt="${esc(label)}：${esc(head)}"></a><figcaption>${label}</figcaption></figure>`
                : '';
            }).join('');
            return `<div class="pics" data-size="${size}">${pics}</div>`;
          })
          .join('');
        return `<article class="scene"><header><b class="no">${String(i + 1).padStart(2, '0')}</b><h3>${esc(head)}</h3><p>${esc(sub)}</p></header>${shots}</article>`;
      })
      .join('');
    return rows
      ? `<section id="${key}"><h2>${title}</h2><p class="lede">${lede}</p><div class="scenes">${rows}</div></section>`
      : '';
  }).join('');

  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>情境截圖</title>
<style>
:root { --paper: #f7f1e6; --card: #fffdf8; --ink: #2a2522; --ink-2: #6b625a; --red: #c8402c; --blue: #3a68ad; --rule: #e2d8c8; }
@media (prefers-color-scheme: dark) { :root { --paper: #1d1a18; --card: #282420; --ink: #f2ece2; --ink-2: #b5aa9c; --rule: #3d3630; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: "Noto Serif TC", "PingFang TC", "Microsoft JhengHei", serif; }
.top { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; padding: 14px 16px; background: color-mix(in srgb, var(--paper) 92%, transparent); backdrop-filter: blur(6px); border-bottom: 1.5px solid var(--ink); }
.top h1 { margin: 0; font-size: 1.25rem; letter-spacing: 0.12em; }
.top nav { display: flex; flex-wrap: wrap; gap: 6px; }
.top a, .top button { font: inherit; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.08em; padding: 6px 12px; color: var(--ink); background: var(--card); border: 1.5px solid var(--ink); text-decoration: none; cursor: pointer; }
.top button[aria-pressed="true"] { color: #fff; background: var(--red); }
main { max-width: 1280px; margin: 0 auto; padding: 8px 16px 64px; }
h2 { margin: 40px 0 4px; font-size: 1.6rem; letter-spacing: 0.16em; }
.lede { margin: 0 0 18px; color: var(--ink-2); }
.scenes { display: grid; gap: 18px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); }
body.desktop .scenes { grid-template-columns: 1fr; }
.scene { background: var(--card); border: 1.5px solid var(--ink); box-shadow: 4px 4px 0 var(--rule); padding: 14px; }
.scene header { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; align-items: baseline; margin-bottom: 10px; }
.no { grid-row: span 2; display: grid; place-items: center; width: 36px; height: 36px; color: #fff; background: var(--red); border: 1.5px solid var(--ink); font-size: 0.95rem; }
.scene h3 { margin: 0; font-size: 1.05rem; letter-spacing: 0.08em; }
.scene header p { margin: 2px 0 0; color: var(--ink-2); font-size: 0.88rem; }
.pics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
body:not(.desktop) .pics[data-size="desktop"], body.desktop .pics[data-size="mobile"] { display: none; }
figure { margin: 0; }
img { display: block; width: 100%; height: auto; border: 1px solid var(--rule); }
figcaption { margin-top: 4px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.12em; color: var(--ink-2); text-align: center; }
figure:first-child figcaption { color: var(--red); }
figure:last-child figcaption { color: var(--blue); }
</style>
</head>
<body>
<div class="top">
  <h1>食在難選 情境截圖</h1>
  <nav>${GROUPS.map(([k, t]) => `<a href="#${k}">${t}</a>`).join('')}</nav>
  <nav>${sizes.map((s, i) => `<button type="button" data-size="${s}" aria-pressed="${i === 0}">${s === 'mobile' ? '手機' : '電腦'}</button>`).join('')}</nav>
</div>
<main>${sections}</main>
<script>
document.querySelectorAll('button[data-size]').forEach((b) =>
  b.addEventListener('click', () => {
    document.body.classList.toggle('desktop', b.dataset.size === 'desktop');
    document.querySelectorAll('button[data-size]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }),
);
</script>
</body>
</html>
`;
  writeFileSync(`${dir}/index.html`, html);
  return `${dir}/index.html`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(writeGallery(process.argv[2] ?? 'shots/scenes'));
}
