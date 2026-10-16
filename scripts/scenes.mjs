// 情境截圖：自己吃、揪團吃的每一步都截一張，順便檢查畫面上該有的東西都在。
// node scripts/scenes.mjs [輸出資料夾] [--theme=temple,magic] [--size=mobile|desktop] [--only=solo,group,pages]
// 需要先開模擬器（npm run emulators）、放示範資料（npm run seed）、開網站（npm run dev）。每跑一次會先重放示範資料。
// 跑完在輸出資料夾產生 index.html：所有截圖排成一頁，廟宇、魔法並排。
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { writeGallery } from './gallery.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const out = args.find((a) => !a.startsWith('--')) ?? 'shots/scenes';
const themes = opt('theme', 'temple,magic').split(',');
const size = opt('size', 'mobile');
const only = opt('only', 'solo,group,pages').split(',');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const dev = JSON.parse(readFileSync(new URL('./dev-accounts.json', import.meta.url), 'utf8'));
mkdirSync(out, { recursive: true });

const VIEW = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
}[size];

const browser = await chromium.launch({ channel: 'msedge' });
let failed = 0;
const check = (ok, msg) => {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failed += 1;
};

/** 一位同事：自己的瀏覽器分身，登入示範帳號 */
async function user(uid, theme) {
  const ctx = await browser.newContext({ ...VIEW, locale: 'zh-TW', timezoneId: 'Asia/Taipei' });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('lunchstick:theme', t);
      localStorage.setItem('lunchstick:sound', 'off');
    } catch {}
  }, theme);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`  [${uid} pageerror] ${e.message}`));
  page.on(
    'console',
    (m) =>
      m.type() === 'error' &&
      !/Failed to load resource|hmr|WebSocket/i.test(m.text()) &&
      console.log(`  [${uid} console] ${m.text().slice(0, 260)}`),
  );
  await page.goto(BASE);
  const acc = dev.accounts.find((a) => a.uid === uid);
  await page.waitForFunction(() => typeof window.__devLogin === 'function', null, { timeout: 30000 });
  await page.evaluate(([e, p]) => window.__devLogin(e, p), [acc.email, dev.password]);
  await page.waitForSelector('.topbar', { timeout: 30000 });
  await page.waitForSelector('.gate', { state: 'detached', timeout: 20000 });
  await page.waitForTimeout(1500);
  return { uid, ctx, page };
}

const shot = async (u, name, theme, full = false) => {
  const file = `${out}/${theme}-${size}-${name}.png`;
  await u.page.screenshot({ path: file, fullPage: full });
  console.log(`  📸 ${file}`);
};
const has = (u, sel) =>
  u.page
    .locator(sel)
    .count()
    .then((n) => n > 0);
const text = (u, sel) =>
  u.page
    .locator(sel)
    .first()
    .innerText()
    .catch(() => '');
const tap = async (u, sel) => {
  await u.page.locator(sel).first().click();
};
/** 抽一支：按大按鈕，等籤卡展開完 */
const draw = async (u) => {
  await tap(u, '.dock__cta');
  await u.page.waitForSelector('.oracle .card__name', { timeout: 30000 });
  await u.page.waitForTimeout(2600);
};
const closeOracle = async (u) => {
  await u.page.keyboard.press('Escape');
  await u.page.waitForSelector('.oracle', { state: 'detached', timeout: 10000 });
  await u.page.waitForTimeout(500);
};
const openHerald = async (u) => {
  await tap(u, '.herald-btn');
  await u.page.waitForSelector('dialog[open] .herald', { timeout: 10000 });
  await u.page.waitForTimeout(900);
};
const closeSheet = async (u) => {
  await u.page.keyboard.press('Escape');
  await u.page.waitForTimeout(600);
};

for (const theme of themes) {
  console.log(`\n== ${theme} / ${size} ==`);
  execSync('npm run seed', { stdio: 'ignore' });

  if (only.includes('solo')) {
    console.log('— 自己吃');
    const ming = await user('u-ming', theme);
    await shot(ming, 'solo-01-home', theme);
    check((await text(ming, '.filters__summary')).startsWith('午餐'), '篩選摘要：預設是午餐');

    await tap(ming, '.dock__cta');
    await ming.page.waitForTimeout(900);
    await shot(ming, 'solo-02-drawing', theme);
    await ming.page.waitForSelector('.oracle .card__name', { timeout: 30000 });
    await ming.page.waitForTimeout(2600);
    await shot(ming, 'solo-03-first-pick', theme);
    check(await has(ming, '.oracle__go'), '第一支：有起駕按鈕');
    check(await has(ming, '.oracle .btn--line .charges'), '第一支：有再抽（香／魔力球）');
    const first = await text(ming, '#oracle-name');

    await tap(ming, '.oracle .btn--line:has(.charges)');
    await ming.page.waitForSelector('.oracle', { state: 'detached', timeout: 10000 });
    await ming.page.waitForSelector('.oracle .card__name', { timeout: 30000 });
    await ming.page.waitForTimeout(2600);
    await shot(ming, 'solo-04-reroll', theme);
    check((await text(ming, '.oracle__cands b')) === '2', '再抽之後：籤卡下面有「看供桌上的籤」（2 支）');
    const second = await text(ming, '#oracle-name');
    check(first !== second, `再抽換了一家（${first} → ${second}）`);
    // 籤卡最下面那一排：看供桌上的籤、這家去不了
    await ming.page.locator('.oracle__extra').scrollIntoViewIfNeeded();
    await ming.page.waitForTimeout(400);
    await shot(ming, 'solo-04a-oracle-bottom', theme);
    // 籤卡上按了才彈出供桌：翻開的那支有框；Esc 只關彈窗，籤卡還在
    await tap(ming, '.oracle__cands');
    await ming.page.waitForSelector('dialog[open] .cands .cand', { timeout: 10000 });
    await ming.page.waitForTimeout(1200);
    await shot(ming, 'solo-04b-oracle-altar', theme);
    check((await ming.page.locator('dialog[open] .cand.is-active').count()) === 1, '彈窗裡標出籤卡現在翻開的那一支');
    await closeSheet(ming);
    check(await has(ming, '.oracle .card__name'), '關掉彈窗：籤卡還開著');

    await closeOracle(ming);
    await shot(ming, 'solo-05-home-with-sticks', theme);
    check((await text(ming, '.dock__cands b')) === '2', '首頁提示列：供桌上有 2 支籤');
    await tap(ming, '.dock__cands');
    await ming.page.waitForSelector('dialog[open] .cands .cand', { timeout: 10000 });
    await ming.page.waitForTimeout(1200);
    await shot(ming, 'solo-05b-sticks-sheet', theme);
    check((await ming.page.locator('dialog[open] .cands .cand').count()) === 2, '攤開來是兩支籤');

    // 選回第一支，起駕
    await ming.page.locator('dialog[open] .cands .cand').first().click();
    await ming.page.waitForSelector('.oracle .card__name', { timeout: 10000 });
    await ming.page.waitForTimeout(2400);
    check((await text(ming, '#oracle-name')) === first, '點候選翻開的是第一支');
    await shot(ming, 'solo-06-pick-earlier', theme);
    await tap(ming, '.oracle__go');
    await ming.page.waitForSelector('.oracle', { state: 'detached', timeout: 10000 });
    await ming.page.waitForTimeout(1600);
    await shot(ming, 'solo-07-decided', theme);
    check(await has(ming, '.stage__band'), '起駕之後：籤筒貼上定案封條');
    check((await text(ming, '.dock__cta')).includes(first), `大按鈕寫著定案的店（${first}）`);

    // 到了才發現去不了：補抽一家，次數重算
    await tap(ming, '.dock__cta');
    await ming.page.waitForSelector('.oracle .oracle__skip', { timeout: 10000 });
    await ming.page.waitForTimeout(2400);
    await shot(ming, 'solo-08-decided-card', theme);
    await tap(ming, '.oracle__skip');
    await ming.page.waitForTimeout(300);
    await shot(ming, 'solo-09-cant-go-ask', theme);
    await tap(ming, '.oracle__skip');
    await ming.page.waitForSelector('.oracle', { state: 'detached', timeout: 10000 });
    await ming.page.waitForSelector('.oracle .card__name', { timeout: 30000 });
    await ming.page.waitForTimeout(2600);
    await shot(ming, 'solo-10-replaced', theme);
    const third = await text(ming, '#oracle-name');
    check(third !== first, `去不了之後補了一家（${third}）`);
    check((await ming.page.locator('.oracle .charge.is-on').count()) === 3, '去不了之後重抽次數回到 3 次');
    await closeOracle(ming);
    check(!(await has(ming, '.stage__band')), '去不了之後回到還在抽的階段（封條拿掉）');
    await shot(ming, 'solo-11-after-skip', theme);

    // 用完次數：只能從候選挑
    for (let i = 0; i < 3; i++) {
      await draw(ming);
      await closeOracle(ming);
    }
    await shot(ming, 'solo-12-spent', theme);
    check((await text(ming, '.dock__cta')).length > 0, '次數用完：大按鈕提醒從候選挑一支');
    await tap(ming, '.dock__cta');
    await ming.page.waitForSelector('dialog[open] .cands .cand', { timeout: 10000 });
    await ming.page.waitForTimeout(900);
    await ming.page.locator('dialog[open] .cands .cand').nth(1).click();
    await ming.page.waitForSelector('.oracle .card__name', { timeout: 10000 });
    await ming.page.waitForTimeout(2400);
    await shot(ming, 'solo-13-spent-card', theme);
    check(await has(ming, '.oracle__taunt--spent'), '次數用完的籤卡：提醒從候選挑一支');
    await tap(ming, '.oracle__go');
    await ming.page.waitForTimeout(1800);

    // 換一餐：下午茶、自己寫的（在篩選紙最上面）
    await tap(ming, '.filters__toggle');
    await ming.page.waitForSelector('dialog[open] .meal-slots', { timeout: 10000 });
    await ming.page.waitForTimeout(800);
    await shot(ming, 'solo-14-filters-sheet', theme);
    // 用版面位置比（選中的那塊會浮起 2px）
    const tops = await ming.page.$$eval('dialog[open] .meal-slots:not(.meal-slots--stock) .meal-slot', (els) => [
      ...new Set(els.map((e) => e.offsetTop)),
    ]);
    check(tops.length === 1, `哪一餐：六塊排成一排（${tops.length} 排）`);
    check(
      (await ming.page.locator('dialog[open] .meal-stock').count()) === 6 &&
        (await has(ming, 'dialog[open] .meal-slots.is-locked .meal-stock')),
      '重抽次數：0 到 5 六塊，這一餐開了就鎖住',
    );
    check(
      await ming.page.$eval('dialog[open] .filters__panel', (e) => e.scrollWidth <= e.clientWidth + 1),
      '篩選紙沒有東西超出去要橫滑',
    );
    await ming.page.locator('dialog[open] .meal-slots .meal-slot', { hasText: '下午茶' }).click();
    await ming.page.waitForTimeout(400);
    await ming.page.locator('dialog[open] .meal-slots .meal-slot--add').click();
    await ming.page.locator('dialog[open] .meal-slot--write input').fill('加班餐');
    await ming.page.keyboard.press('Enter');
    await ming.page.waitForTimeout(500);
    // 換到還沒開的一餐：重抽次數可以改（剛剛那一餐開了，是鎖住的）
    check(!(await has(ming, 'dialog[open] .meal-slots.is-locked')), '新的一餐：重抽次數可以改');
    await ming.page.locator('dialog[open] .meal-stock', { hasText: '5' }).click();
    await ming.page.waitForTimeout(300);
    check((await text(ming, 'dialog[open] .meal-stock.is-on')).includes('5'), '重抽次數改成 5');
    await shot(ming, 'solo-15-custom-slot', theme);
    check((await text(ming, 'dialog[open] .meal-slots .meal-slot.is-on')).includes('加班餐'), '自己寫的餐別：加班餐');
    await ming.page.locator('dialog[open] .btn--zhu').last().click();
    await ming.page.waitForTimeout(800);
    await shot(ming, 'solo-16-custom-home', theme);
    check((await text(ming, '.filters__summary')).startsWith('加班餐'), '首頁摘要：加班餐');
    check(!(await has(ming, '.dock__cands')), '換到新的一餐：供桌是空的');
    await ming.ctx.close();
  }

  if (only.includes('group')) {
    console.log('— 揪團吃');
    execSync('npm run seed', { stdio: 'ignore' });
    const [ming, hua, jie, ting] = await Promise.all(['u-ming', 'u-hua', 'u-jie', 'u-ting'].map((u) => user(u, theme)));
    // 小明揪阿華、阿傑、婷婷
    await ming.page.locator('.dock .seg').first().locator('button').nth(1).click();
    await ming.page.waitForTimeout(400);
    for (const name of ['阿華', '阿傑', '婷婷']) await ming.page.locator('.crew__pick', { hasText: name }).click();
    await ming.page.waitForTimeout(400);
    await shot(ming, 'group-01-pick-crew', theme);
    await tap(ming, '.crew__send-btn');
    await ming.page.waitForTimeout(2000);
    await shot(ming, 'group-02-sent', theme);
    check(await has(ming, '.crew--gather'), '發紅帖之後：首頁看得到大家的回覆');

    await hua.page.waitForSelector('.herald-news', { timeout: 15000 });
    await hua.page.waitForTimeout(500);
    await shot(hua, 'group-03-invited-banner', theme);
    check((await text(hua, '.herald-btn__count')) === '1', '阿華：通知鈕上有一件事等他回');
    await openHerald(hua);
    await shot(hua, 'group-04-invite-card', theme);
    await hua.page.locator('dialog[open] .invite .btn--zhu').first().click();
    await hua.page.waitForTimeout(800);
    await closeSheet(hua);
    await openHerald(jie);
    await jie.page.locator('dialog[open] .invite .btn--line').first().click();
    await jie.page.waitForTimeout(800);
    await shot(jie, 'group-05-declined', theme);
    await closeSheet(jie);
    await ming.page.waitForTimeout(1200);
    await shot(ming, 'group-06-replies', theme);
    check((await text(ming, '.crew__gather-head p span')).includes('1 人還沒回'), '小明：看到婷婷還沒回');

    // 小明抽，阿華的畫面跟著翻開（阿華開著報馬仔也一樣：通知收起來，不擋住籤卡）
    await openHerald(hua);
    await draw(ming);
    await shot(ming, 'group-07-host-drew', theme);
    await hua.page.waitForSelector('.oracle .card__name', { timeout: 20000 });
    await hua.page.waitForTimeout(2600);
    await shot(hua, 'group-08-member-sees', theme);
    check((await text(hua, '#oracle-name')) === (await text(ming, '#oracle-name')), '阿華看到同一支籤');
    check(!(await has(hua, 'dialog[open] .herald')), '阿華開著的報馬仔自動收起來，沒有擋住籤卡');

    // 阿華再抽（共用次數），小明跟著翻
    await tap(hua, '.oracle .btn--line:has(.charges)');
    await hua.page.waitForSelector('.oracle', { state: 'detached', timeout: 10000 });
    await hua.page.waitForSelector('.oracle .card__name', { timeout: 30000 });
    await hua.page.waitForTimeout(2600);
    await ming.page.waitForTimeout(2600);
    await shot(ming, 'group-09-host-sees-reroll', theme);
    check((await text(hua, '#oracle-name')) === (await text(ming, '#oracle-name')), '阿華再抽：小明的籤卡翻成同一支');
    check((await ming.page.locator('.oracle .charge.is-on').count()) === 2, '重抽次數整團共用（剩 2 次）');
    await ming.page.locator('.oracle__extra').scrollIntoViewIfNeeded();
    await ming.page.waitForTimeout(400);
    await shot(ming, 'group-09b-host-card-bottom', theme);
    check(await has(ming, '.oracle__extra .oracle__crew'), '揪團的籤卡底下：大家的頭像和報馬仔');

    // 阿華起駕
    await tap(hua, '.oracle__go');
    await hua.page.waitForTimeout(2200);
    await shot(hua, 'group-10-member-decided', theme);
    await ming.page.waitForTimeout(1500);
    await shot(ming, 'group-11-host-sees-decided', theme);
    check(await has(ming, '.stage__band'), '小明：首頁貼上定案封條');

    // 婷婷還沒回：起駕之後卡片還在，可以補按我也去
    await openHerald(ting);
    await shot(ting, 'group-12-pending-after-decided', theme);
    check(await has(ting, 'dialog[open] .invite.is-decided'), '婷婷：起駕之後還看得到這張帖');
    await ting.page.locator('dialog[open] .invite .btn--zhu').first().click();
    await ting.page.waitForTimeout(1200);
    await shot(ting, 'group-13-joined-late', theme);
    // 帖子上按「看供桌上的籤」：回到首頁彈出供桌，起駕的那支蓋著定案章
    await tap(ting, 'dialog[open] .invite__altar');
    await ting.page.waitForSelector('dialog[open] .cands .cand', { timeout: 10000 });
    await ting.page.waitForTimeout(1400);
    await shot(ting, 'group-14-altar-from-herald', theme);
    check((await ting.page.locator('dialog[open] .cands .cand').count()) === 2, '婷婷：從報馬仔彈出供桌，兩支籤都在');
    check((await ting.page.locator('dialog[open] .cand.is-chosen').count()) === 1, '起駕的那支蓋著定案章');
    await closeSheet(ting);

    for (const u of [ming, hua, jie, ting]) await u.ctx.close();
  }

  if (only.includes('pages')) {
    console.log('— 歷史、店家、排行');
    const ming = await user('u-ming', theme);
    await tap(ming, 'a[href="/history/"]:visible');
    await ming.page.waitForSelector('.ledger__cover', { timeout: 15000 });
    await ming.page.waitForTimeout(2200);
    await shot(ming, 'pages-01-history', theme);
    await ming.page.evaluate(() => window.scrollTo(0, 700));
    await ming.page.waitForTimeout(1600);
    await shot(ming, 'pages-02-history-scroll', theme);
    check((await ming.page.locator('.entry').count()) > 3, '歷史：列出好幾餐');
    for (const [i, k] of ['inbox', 'sent', 'solo'].entries()) {
      await ming.page.evaluate(() => window.scrollTo(0, 0));
      await ming.page.locator(`.ledger__tab--${k}`).click();
      await ming.page.waitForTimeout(1600);
      await shot(ming, `pages-02${'bcd'[i]}-history-${k}`, theme);
    }
    await ming.page.locator('.ledger__tab--all').click();
    await ming.page.waitForTimeout(1200);
    await ming.page.locator('.entry__tried summary').first().click();
    await ming.page.waitForTimeout(500);
    await ming.page.locator('.entry__tried').first().scrollIntoViewIfNeeded();
    await shot(ming, 'pages-03-history-tried', theme);

    await tap(ming, 'a[href="/shops/"]:visible');
    await ming.page.waitForSelector('.wall', { timeout: 15000 });
    await ming.page.waitForTimeout(1500);
    await shot(ming, 'pages-04-shops', theme);
    await ming.page.locator('.wall .wall__item > *').first().click();
    await ming.page.waitForTimeout(1400);
    await shot(ming, 'pages-05-shop', theme);
    check(await has(ming, '.shop__posted'), '店家卡：張貼日期章');
    check(await has(ming, '.shop__last'), '店家卡：上次去');
    await closeSheet(ming);

    await tap(ming, 'a[href="/ranks/"]:visible');
    await ming.page.waitForSelector('.ranks', { timeout: 15000 });
    await ming.page.waitForTimeout(3200);
    await shot(ming, 'pages-06-ranks', theme);
    await ming.ctx.close();
  }
}

await browser.close();
console.log(`
圖庫：${writeGallery(out)}`);
console.log(failed ? `\n${failed} 項沒過` : '\n全部通過');
process.exitCode = failed ? 1 : 0;
