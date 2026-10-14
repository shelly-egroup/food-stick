// 自動截圖：node scripts/shots.mjs [輸出資料夾] [--only=gate,home,oracle,shops,shop,form,ranks,me] [--theme=temple,magic] [--sizes=desktop,mobile] [--engine=chromium|webkit]
// 需要先開模擬器（npm run emulators）、放示範資料（npm run seed）、開網站（npm run dev）
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium, webkit, devices } from 'playwright';

const args = process.argv.slice(2);
const opt = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const out = args.find((a) => !a.startsWith('--')) ?? 'shots/latest';
const only = opt('only', '').split(',').filter(Boolean);
const themes = opt('theme', 'temple,magic').split(',');
const sizes = opt('sizes', 'desktop,mobile').split(',');
const engine = opt('engine', 'chromium');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const dev = JSON.parse(readFileSync(new URL('./dev-accounts.json', import.meta.url), 'utf8'));
const want = (n) => only.length === 0 || only.includes(n);
mkdirSync(out, { recursive: true });

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile:
    engine === 'webkit'
      ? { ...devices['iPhone 14'] }
      : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  android: { ...devices['Pixel 7'] },
};

const browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'msedge' });

async function newPage(size, theme) {
  const ctx = await browser.newContext({ ...VIEWPORTS[size], locale: 'zh-TW' });
  await ctx.addInitScript((f) => {
    try {
      localStorage.setItem('lunchstick:theme', f);
      localStorage.setItem('lunchstick:sound', 'off');
    } catch {}
  }, theme);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`));
  page.on(
    'console',
    (m) =>
      m.type() === 'error' &&
      !/Failed to load resource/.test(m.text()) &&
      console.log(`  [console] ${m.text().slice(0, 240)}`),
  );
  return { ctx, page };
}

async function login(page, uid) {
  const acc = dev.accounts.find((a) => a.uid === uid);
  await page.waitForFunction(() => typeof window.__devLogin === 'function', null, { timeout: 30000 });
  await page.evaluate(([e, p]) => window.__devLogin(e, p), [acc.email, dev.password]);
}

const tag = (size, theme) => `${size}-${theme}${engine === 'webkit' ? '-ios' : ''}`;
const shot = async (page, name, size, theme, full = false) => {
  const file = `${out}/${name}-${tag(size, theme)}.png`;
  await page.screenshot({ path: file, fullPage: full });
  console.log(`  ✓ ${file}`);
};
const click = (page, sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);

for (const theme of themes) {
  for (const size of sizes) {
    console.log(`${theme} / ${size} / ${engine}`);

    if (want('gate')) {
      const { ctx, page } = await newPage(size, theme);
      await page.goto(BASE);
      await page.waitForTimeout(500);
      await shot(page, 'gate-loading', size, theme);
      await page.waitForSelector('.panel__signin', { timeout: 30000 });
      await page.waitForTimeout(900);
      await shot(page, 'gate-signin', size, theme);
      await login(page, 'u-out');
      await page.waitForSelector('.panel__reject', { timeout: 15000 });
      await page.waitForTimeout(900);
      await shot(page, 'gate-reject', size, theme);
      await ctx.close();
    }

    const { ctx, page } = await newPage(size, theme);
    await page.goto(BASE);
    await login(page, 'u-ming');
    await page.waitForSelector('.topbar', { timeout: 30000 });
    await page.waitForSelector('.gate', { state: 'detached', timeout: 15000 });
    await page.waitForTimeout(1400);
    if (want('home')) await shot(page, 'home', size, theme);

    if (want('oracle')) {
      await click(page, '.dock__cta');
      await page.waitForTimeout(650);
      await shot(page, 'drawing', size, theme);
      await page.waitForSelector('.oracle', { timeout: 15000 });
      await page.waitForTimeout(2600);
      await shot(page, 'oracle', size, theme);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1300);
    }

    if (want('group')) {
      await click(page, '.dock .seg button:nth-child(2)');
      await page.waitForTimeout(300);
      for (const n of [1, 2, 3]) await page.evaluate((i) => document.querySelectorAll('.crew__pick')[i]?.click(), n);
      await page.waitForTimeout(600);
      await shot(page, 'home-group', size, theme);
      await click(page, '.dock .seg button:nth-child(1)');
    }

    if (want('shops') || want('shop') || want('form')) {
      await click(page, 'a[href="/shops/"]');
      await page.waitForSelector('.wall', { timeout: 15000 });
      await page.waitForTimeout(1500);
      if (want('shops')) await shot(page, 'shops', size, theme);
      if (want('shop')) {
        await click(page, '.wall .wall__item > *');
        await page.waitForTimeout(900);
        await shot(page, 'shop', size, theme);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      if (want('form')) {
        await click(page, '.shops__add');
        await page.waitForTimeout(900);
        await shot(page, 'form', size, theme);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    if (want('ranks')) {
      await click(page, 'a[href="/ranks/"]');
      await page.waitForSelector('.ranks', { timeout: 15000 });
      await page.waitForTimeout(3200);
      await shot(page, 'ranks', size, theme);
      if (size === 'mobile') {
        await page.evaluate(() => window.scrollTo(0, 900));
        await page.waitForTimeout(500);
        await shot(page, 'ranks-more', size, theme);
      }
    }

    if (want('me')) {
      await click(page, '.topbar__me');
      await page.waitForTimeout(800);
      await shot(page, 'me', size, theme);
    }
    await ctx.close();
  }
}

await browser.close();
