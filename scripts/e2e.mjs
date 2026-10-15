// 端到端冒煙測試：node scripts/e2e.mjs [--engine=chromium|webkit]
// 走一遍真實操作：輸錯密語、加入、求籤、新增店家、愛店、不吃、紙條、刪店、換風格、登出。
import { readFileSync } from 'node:fs';
import { chromium, webkit, devices } from 'playwright';

const engine = process.argv.find((a) => a.startsWith('--engine='))?.slice(9) ?? 'chromium';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const dev = JSON.parse(readFileSync(new URL('./dev-accounts.json', import.meta.url), 'utf8'));
const browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext(
  engine === 'webkit'
    ? { ...devices['iPhone 14'] }
    : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
);
await ctx.addInitScript(() => localStorage.setItem('lunchstick:sound', 'off'));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on(
  'console',
  (m) =>
    m.type() === 'error' &&
    !/Failed to load resource|PERMISSION_DENIED|permission/i.test(m.text()) &&
    errors.push(m.text()),
);

let step = 0;
const ok = (msg) => console.log(`  ✓ ${++step}. ${msg}`);
const fail = (msg) => {
  console.log(`  ✗ ${msg}`);
  process.exitCode = 1;
};
const expect = async (cond, msg) => ((await cond) ? ok(msg) : fail(msg));
const tap = (sel) => page.locator(sel).first().click();

try {
  await page.goto(BASE);
  await page.waitForFunction(() => typeof window.__devLogin === 'function');

  // 外人帳號：被婉拒；換成 egroup 新同事：自動加入、開門進廟
  const login = (uid) => {
    const acc = dev.accounts.find((a) => a.uid === uid);
    return page.evaluate(([e, p]) => window.__devLogin(e, p), [acc.email, dev.password]);
  };
  await login('u-out');
  await expect(
    page.waitForSelector('.panel__reject', { timeout: 15000 }).then(
      () => true,
      () => false,
    ),
    '不是 egroup 帳號：神明婉拒，門沒有開',
  );
  await tap('.panel__reject .btn--zhu');
  await expect(
    page.waitForSelector('.panel__signin', { timeout: 15000 }).then(
      () => true,
      () => false,
    ),
    '換個帳號：回到登入',
  );
  await login('u-new');
  await expect(
    page.waitForSelector('.gate', { state: 'detached', timeout: 20000 }).then(
      () => true,
      () => false,
    ),
    'egroup 新同事第一次登入，自動加入並開門進廟',
  );

  // 求籤
  await page.waitForTimeout(800);
  await tap('.dock__cta');
  await expect(
    page.waitForSelector('.oracle .card__name', { timeout: 15000 }).then(
      () => true,
      () => false,
    ),
    '搖籤後展開籤詩',
  );
  const first = await page.getAttribute('.oracle .card__name', 'aria-label');
  await page.waitForTimeout(1800);
  await tap('.oracle__actions .btn--line');
  await page.waitForTimeout(600);
  await expect(page.locator('.stage__taunt').isVisible(), '再抽一支時會被嗆一句');
  await page.waitForSelector('.oracle .card__name', { timeout: 15000 });
  const second = await page.getAttribute('.oracle .card__name', 'aria-label');
  await expect(Promise.resolve(first !== second), `重抽換了一家（${first} → ${second}）`);
  await page.waitForTimeout(1800);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.oracle', { state: 'detached', timeout: 8000 });

  // 新增店家
  await tap('a[href="/shops/"]:visible');
  await page.waitForSelector('.wall');
  const before = await page.locator('.wall .wall__item > *').count();
  await tap('.shops__add');
  await page.waitForSelector('#f-name');
  await tap('#shop-form .chip >> text=麵');
  await page.fill('#f-name', '測試拉麵店');
  await page.fill('#f-map', 'http://not-https');
  await tap('button[form=shop-form]');
  await expect(
    page.waitForSelector('#f-map-err', { timeout: 4000 }).then(
      () => true,
      () => false,
    ),
    '地圖連結不是 https 時擋下來',
  );
  await page.fill('#f-map', 'https://maps.app.goo.gl/test');
  await tap('button[form=shop-form]');
  await page.waitForTimeout(1500);
  await expect(
    page
      .locator('.wall .wall__item > *')
      .count()
      .then((n) => n === before + 1),
    '新菜牌掛上牆',
  );

  // 愛店（自己新增的店一掛上去就是愛店）、不吃、紙條
  await page.locator('.wall .wall__item > *', { hasText: '測試拉麵店' }).click();
  await page.waitForSelector('.shop__acts');
  await page.waitForTimeout(600);
  await expect(
    page
      .locator('.shop__preview [data-part="love"]')
      .count()
      .then((n) => n === 1),
    '自己新增的店已經蓋上愛店章',
  );
  await page.locator('.shop__acts .love-btn').click();
  await page.waitForTimeout(800);
  await expect(
    page
      .locator('.shop__preview [data-part="love"]')
      .count()
      .then((n) => n === 0),
    '愛店章可以收回來',
  );
  await page.locator('.shop__block button').click();
  await page.waitForTimeout(800);
  await expect(
    page
      .locator('.shop__preview [data-part="ban"]')
      .count()
      .then((n) => n === 1),
    '貼上不吃封條，愛店章自動拿掉',
  );
  await page.fill('#note-text', '測試紙條：湯頭很濃');
  await tap('.shop__write button[type=submit]');
  await expect(
    page.waitForSelector('.note >> text=測試紙條', { timeout: 8000 }).then(
      () => true,
      () => false,
    ),
    '紙條貼上去了',
  );
  await page.locator('.note__del').first().click();
  await page.locator('.note__yes').first().click();
  await expect(
    page.waitForSelector('.note >> text=測試紙條', { state: 'detached', timeout: 8000 }).then(
      () => true,
      () => false,
    ),
    '自己的紙條可以撕掉',
  );

  // 刪店（新同事是建立者）：問一次，確定了演完拆下來的儀式才刪
  await page.locator('.shop__remove').click();
  await page.locator('.shop__remove-yes').click();
  await page.waitForTimeout(3200);
  await expect(
    page
      .locator('.wall .wall__item > *', { hasText: '測試拉麵店' })
      .count()
      .then((n) => n === 0),
    '拆下菜牌',
  );

  // 排行榜
  await tap('a[href="/ranks/"]:visible');
  await expect(
    page.waitForSelector('.podium__slot--1', { timeout: 8000 }).then(
      () => true,
      () => false,
    ),
    '金榜放榜，有狀元',
  );

  // 換風格
  await tap('.topbar__me');
  await page.waitForSelector('.theme-switch');
  await page.locator('.theme-switch__opt[data-theme="magic"]').click();
  await page.waitForTimeout(1200);
  await expect(
    page.evaluate(() => document.documentElement.dataset.theme === 'magic'),
    '切換成魔法版',
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await tap('a[href="/shops/"]:visible');
  await expect(
    page.waitForSelector('.wall .book', { timeout: 8000 }).then(
      () => true,
      () => false,
    ),
    '魔法版的店家是書架上的魔法書',
  );
  await tap('a[href="/"]:visible');
  await page.waitForSelector('.study-floor');
  await page.locator('.dock__row [role="radiogroup"][aria-label="怎麼抽"] button', { hasText: '探店' }).click();
  await expect(
    page
      .locator('.dock__row [role="radio"][aria-checked="true"]', { hasText: '探店' })
      .count()
      .then((n) => n === 1),
    '切換成探店模式',
  );
  await tap('.dock__cta');
  await expect(
    page.waitForSelector('.card--spell', { timeout: 15000 }).then(
      () => true,
      () => false,
    ),
    '魔法版施法後出現預言卡',
  );
  const brand = await page.textContent('.card__brand');
  await expect(
    Promise.resolve(brand === '水晶球預言' || brand === '午餐魔法書'),
    `由${brand === '水晶球預言' ? '水晶球' : '魔法書'}揭曉`,
  );
  await page.waitForTimeout(1800);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);

  // 登出
  await tap('.topbar__me');
  await page.waitForSelector('.me__out');
  await page.locator('.me__out').click();
  await expect(
    page.waitForSelector('.panel__signin', { timeout: 15000 }).then(
      () => true,
      () => false,
    ),
    '登出後水晶球入睡，回到入口',
  );

  if (errors.length) fail(`頁面錯誤：\n    ${errors.join('\n    ')}`);
  else ok('整個流程沒有任何頁面錯誤');
} catch (err) {
  fail(`中斷：${err.message}`);
} finally {
  await browser.close();
}
