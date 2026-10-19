// 產品介紹影片：node scripts/film.mjs [輸出資料夾] [--theme=temple,magic] [--only=solo,group] [--skip-record]
// 一、用 Playwright 操作真實畫面（手機尺寸；揪團時同時錄兩支手機），用瀏覽器的螢幕串流一格一格存成圖，每一步記下時間點和字幕。
// 二、在瀏覽器裡把畫面放進手機框，配上字幕、片頭片尾和即時合成的配樂，用 MediaRecorder 錄成影片（不需要 ffmpeg）。
// 需要先開模擬器（npm run emulators）、開網站（npm run dev）。每一支會先重放示範資料。
import { execSync } from 'node:child_process';
import {
  appendFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, resolve } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opt = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const out = args.find((a) => !a.startsWith('--')) ?? 'shots/film';
const themes = opt('theme', 'temple,magic').split(',');
const only = opt('only', 'solo,group').split(',');
const skipRecord = args.includes('--skip-record');
/** 影片格式：mp4（預設；瀏覽器不支援就退回 webm）或 webm */
const mime = opt('mime', 'mp4');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const ROOT = resolve('.');
const dev = JSON.parse(readFileSync(new URL('./dev-accounts.json', import.meta.url), 'utf8'));
mkdirSync(join(out, 'raw'), { recursive: true });

const VIEW = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 字幕：兩個主題各自的說法 ---------- */
const COPY = {
  temple: {
    label: '廟宇版',
    outro: '今天吃什麼，交給神明。',
    solo: {
      title: '自己吃，也是一餐',
      home: ['午餐吃什麼？', '別滑了，交給籤筒。愛店、不吃的、最近吃過的，神明都記得。'],
      draw: ['搖一搖，求一支', '籤筒裡只裝符合篩選的店；搖手機也能求。'],
      first: ['第一支，不扣香', '籤詩是 AI 照籤等現寫的，每一支都不一樣。'],
      reroll: ['不滿意？再求一支', '每餐三炷香，再求一支就燒掉一根。'],
      altar: ['求過的都在供桌上', '按「看供桌上的籤」彈出來，點一支就翻回去。'],
      back: ['還是第一支好', '求過的任何一支，都能直接起駕。'],
      go: ['起駕！', '這一餐定了：封條貼上籤筒，揪的人也同步看到。'],
      map: ['帶我去', '定案的籤卡附一張地圖卡，一點就開 Google 地圖。'],
      skip: ['到了才發現沒開？', '按「這家去不了」，神明另指一家，三炷香也補回來。'],
      history: ['每一餐都記在食籤簿', '日期朱印、籤詩、同桌的人，翻回去都在。'],
    },
    group: {
      title: '揪團吃，大家同步',
      crew: ['揪幾個同事', '切到「揪團吃」，勾選要一起吃的人。'],
      send: ['遞出紅帖', '一按下去，八卦報馬仔馬上敲鑼通知。'],
      ring: ['阿華收到紅帖', '上方跳出報馬仔，點開就能回覆。'],
      join: ['我要去！', '要去、這次不了，一鍵回覆，發起人立刻看到。'],
      tally: ['誰要去，一眼看清', '要去、還沒回、改天，各蓋一顆數字章。'],
      draw: ['一人求籤，全團同步', '小明搖籤筒，阿華的手機同時翻開同一支。'],
      reroll: ['誰都能再求', '要去的人都能再求一支，三炷香整團共用。'],
      go: ['誰都能起駕', '阿華按下起駕，小明那邊同時貼上封條。'],
      map: ['定案，出發', '地圖卡一點就開 Google 地圖，吃飽再回來。'],
    },
  },
  magic: {
    label: '魔法版',
    outro: '今天吃什麼，交給水晶球。',
    solo: {
      title: '一個人的冒險',
      home: ['午餐吃什麼？', '別滑了，交給水晶球。愛店、不吃的、最近吃過的，魔法書都記得。'],
      draw: ['施一次選食咒', '書裡只有符合篩選的店；搖手機也能施法。'],
      first: ['第一道預言，不耗魔力', '咒語是 AI 照預言等級現寫的，每一張都不一樣。'],
      reroll: ['不滿意？再施一次', '每餐三顆魔力球，再施一次就暗掉一顆。'],
      altar: ['施過的都在預言牌陣', '按「看預言牌陣」彈出來，點一張就翻回去。'],
      back: ['還是第一張好', '施過的任何一張，都能直接啟程。'],
      go: ['啟程冒險！', '這一餐定了：終章封條貼過水晶球，隊友同步看到。'],
      map: ['帶我去', '終章的預言卡附一張地圖卡，一點就開 Google 地圖。'],
      skip: ['到了才發現沒開？', '按「這家去不了」，水晶球另指一家，魔力也補滿。'],
      history: ['每場冒險都寫進日誌', '星星郵票、咒語、同行的隊友，翻回去都在。'],
    },
    group: {
      title: '組隊冒險，全隊同步',
      crew: ['召集隊友', '切到「揪團吃」，勾選要一起出發的人。'],
      send: ['放出貓頭鷹', '一按下去，邀請信馬上送到每個人手上。'],
      ring: ['阿華收到邀請信', '貓頭鷹從上方飛進來，點開就能回覆。'],
      join: ['我要去！', '要去、這次不了，一鍵回覆，發起人立刻看到。'],
      tally: ['誰要去，一眼看清', '要去、還沒回、改天，各亮一顆數字。'],
      draw: ['一人施法，全隊同步', '小明的水晶球一亮，阿華的手機同時翻開同一張。'],
      reroll: ['誰都能再施法', '要去的人都能再施一次，魔力球全隊共用。'],
      go: ['誰都能啟程', '阿華按下啟程，小明那邊同時貼上終章封條。'],
      map: ['終章，出發', '地圖卡一點就開 Google 地圖，冒險完再回來。'],
    },
  },
};

/* ---------- 一、錄真實操作 ---------- */

/** 每次點擊在畫面上留一圈小漣漪，影片裡看得出手指點了哪裡 */
const TAP_FX = () => {
  addEventListener(
    'pointerdown',
    (e) => {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${e.clientX - 26}px;top:${e.clientY - 26}px;width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.45);box-shadow:0 0 0 3px rgba(40,30,25,.35);pointer-events:none;z-index:2147483647;transition:transform .55s cubic-bezier(.2,.8,.2,1),opacity .55s;transform:scale(.4)`;
      (e.target instanceof Element && e.target.closest('dialog[open]')
        ? e.target.closest('dialog[open]')
        : document.body
      ).appendChild(d);
      requestAnimationFrame(() => {
        d.style.transform = 'scale(1.25)';
        d.style.opacity = '0';
      });
      setTimeout(() => d.remove(), 700);
    },
    true,
  );
};

async function record(browser, theme, kind) {
  console.log(`\n== 錄影 ${theme} / ${kind} ==`);
  execSync('npm run seed', { stdio: 'ignore' });
  const c = COPY[theme][kind];
  const film = {
    theme,
    kind,
    title: c.title,
    label: COPY[theme].label,
    outro: COPY[theme].outro,
    actors: [],
    marks: [],
  };
  const T0 = Date.now();
  const actors = {};

  const join_ = async (uid, name, rec) => {
    const ctx = await browser.newContext({ ...VIEW, locale: 'zh-TW', timezoneId: 'Asia/Taipei' });
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem('lunchstick:theme', t);
        localStorage.setItem('lunchstick:sound', 'off');
      } catch {}
    }, theme);
    if (rec) await ctx.addInitScript(TAP_FX);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`  [${uid} pageerror] ${e.message}`));
    // 螢幕串流：畫面有變才送一格，每格存成一張 JPEG，記下是第幾秒
    let cast = null;
    if (rec) {
      const dir = join(out, 'raw', `${theme}-${kind}-${uid}`);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      const cdp = await ctx.newCDPSession(page);
      cast = { dir, cdp, frames: [] };
      cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
        const f = `${String(cast.frames.length).padStart(5, '0')}.jpg`;
        writeFileSync(join(dir, f), Buffer.from(data, 'base64'));
        const at = metadata.timestamp ? metadata.timestamp * 1000 : Date.now();
        cast.frames.push([Math.round(at - T0) / 1000, f]);
        cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      });
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 86, maxWidth: 780, maxHeight: 1688 });
    }
    await page.goto(BASE);
    const acc = dev.accounts.find((a) => a.uid === uid);
    await page.waitForFunction(() => typeof window.__devLogin === 'function', null, { timeout: 30000 });
    await page.evaluate(([e, p]) => window.__devLogin(e, p), [acc.email, dev.password]);
    await page.waitForSelector('.topbar', { timeout: 30000 });
    await page.waitForSelector('.gate', { state: 'detached', timeout: 20000 });
    const a = { uid, name, ctx, page, cast };
    actors[uid] = a;
    return a;
  };
  /** 字幕：從現在開始顯示；focus 是揪團時要亮起來的那支手機；rate 是到下一句之前的播放速度 */
  const mark = (key, focus, rate = 1) => {
    const [title, sub] = c[key];
    film.marks.push({ t: (Date.now() - T0) / 1000, title, sub, focus, rate });
    console.log(`  ▸ ${title}`);
  };
  const tap = (a, sel) => a.page.locator(sel).first().click();
  const reveal = (a) => a.page.waitForSelector('.oracle .card__name', { timeout: 30000 });
  const smooth = (a, sel, block = 'center') =>
    a.page.evaluate(
      ([s, b]) => document.querySelector(s)?.scrollIntoView({ behavior: 'smooth', block: b }),
      [sel, block],
    );

  if (kind === 'solo') {
    const ming = await join_('u-ming', '小明', true);
    await sleep(1200);
    mark('home');
    await sleep(3200);
    mark('draw');
    await tap(ming, '.dock__cta');
    await reveal(ming);
    await sleep(1500);
    mark('first');
    await sleep(2600);
    mark('reroll');
    await tap(ming, '.oracle .btn--line:has(.charges)');
    await ming.page.waitForSelector('.oracle', { state: 'detached', timeout: 10000 });
    await reveal(ming);
    await sleep(3000);
    mark('altar');
    await smooth(ming, '.oracle__extra', 'end');
    await sleep(1100);
    await tap(ming, '.oracle__cands');
    await ming.page.waitForSelector('dialog[open] .cands .cand', { timeout: 10000 });
    await sleep(2400);
    mark('back');
    await ming.page.locator('dialog[open] .cands .cand').first().click();
    await reveal(ming);
    await sleep(2600);
    mark('go');
    await smooth(ming, '.oracle__go');
    await sleep(700);
    await tap(ming, '.oracle__go');
    await ming.page.waitForSelector('.oracle', { state: 'detached', timeout: 10000 });
    await sleep(3200);
    mark('map');
    await tap(ming, '.dock__cta');
    await reveal(ming);
    await sleep(2400);
    await smooth(ming, '.map-link');
    await sleep(2400);
    mark('skip');
    await smooth(ming, '.oracle__skip', 'end');
    await sleep(800);
    await tap(ming, '.oracle__skip');
    await sleep(1100);
    await tap(ming, '.oracle__skip');
    await ming.page.waitForSelector('.oracle', { state: 'detached', timeout: 10000 });
    await reveal(ming);
    await sleep(3000);
    await ming.page.keyboard.press('Escape');
    await ming.page.waitForSelector('.oracle', { state: 'detached', timeout: 10000 });
    await sleep(900);
    mark('history');
    await tap(ming, 'a[href="/history/"]:visible');
    await ming.page.waitForSelector('.ledger__cover', { timeout: 15000 });
    await sleep(2600);
    // 往下捲到第一天：日期章蓋下去、籤詩一行行浮出來
    await ming.page.evaluate(() =>
      document.querySelector('.ledger__day')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
    await sleep(3800);
  } else {
    const ming = await join_('u-ming', '小明', true);
    const hua = await join_('u-hua', '阿華', true);
    const jie = await join_('u-jie', '阿傑', false);
    await join_('u-ting', '婷婷', false);
    await sleep(1200);
    mark('crew', 'u-ming');
    await ming.page.locator('.dock .seg').first().locator('button').nth(1).click();
    await sleep(700);
    for (const n of ['阿華', '阿傑', '婷婷']) {
      await ming.page.locator('.crew__pick', { hasText: n }).click();
      await sleep(450);
    }
    await sleep(900);
    mark('send', 'u-ming');
    await tap(ming, '.crew__send-btn');
    await hua.page.waitForSelector('.herald-news', { timeout: 15000 });
    await sleep(600);
    mark('ring', 'u-hua');
    await sleep(1600);
    await tap(hua, '.herald-btn');
    await hua.page.waitForSelector('dialog[open] .invite', { timeout: 10000 });
    await sleep(1800);
    mark('join', 'u-hua');
    await tap(hua, 'dialog[open] .invite .btn--zhu');
    await sleep(1500);
    await hua.page.keyboard.press('Escape');
    // 阿傑這次不了（沒有錄影，畫面上只看到結果）
    await tap(jie, '.herald-btn');
    await jie.page.waitForSelector('dialog[open] .invite', { timeout: 10000 });
    await tap(jie, 'dialog[open] .invite .btn--line');
    await sleep(900);
    mark('tally', 'u-ming');
    await smooth(ming, '.crew--gather');
    await sleep(3000);
    mark('draw', 'u-ming');
    await tap(ming, '.dock__cta');
    await reveal(ming);
    await reveal(hua);
    await sleep(3400);
    mark('reroll', 'u-hua');
    await tap(hua, '.oracle .btn--line:has(.charges)');
    await hua.page.waitForSelector('.oracle', { state: 'detached', timeout: 10000 });
    await reveal(hua);
    await sleep(3400);
    mark('go', 'u-hua');
    await smooth(hua, '.oracle__go');
    await sleep(700);
    await tap(hua, '.oracle__go');
    await sleep(3600);
    mark('map', 'u-ming');
    await ming.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(600);
    await tap(ming, '.dock__cta');
    await reveal(ming);
    await sleep(2400);
    await smooth(ming, '.map-link');
    await sleep(2800);
  }

  film.end = (Date.now() - T0) / 1000;
  for (const a of Object.values(actors)) {
    if (a.cast) {
      await a.cast.cdp.send('Page.stopScreencast').catch(() => {});
      film.actors.push({
        id: a.uid,
        name: a.name,
        host: a.uid === 'u-ming' && kind === 'group',
        dir: '/' + relative(ROOT, a.cast.dir).replaceAll('\\', '/'),
        frames: a.cast.frames,
      });
      console.log(`  ${a.name}：${a.cast.frames.length} 格`);
    }
    await a.ctx.close();
  }
  writeFileSync(join(out, `${theme}-${kind}.json`), JSON.stringify(film, null, 2));
  return film;
}

/* ---------- 二、合成：字幕、手機框、配樂 ---------- */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};
/** 只給合成頁用的小伺服器：專案資料夾的檔案，支援 Range（影片要能跳著讀） */
function serve() {
  const server = createServer((req, res) => {
    const path = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!path.startsWith(ROOT) || !existsSync(path) || statSync(path).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    const size = statSync(path).size;
    const type = TYPES[extname(path)] ?? 'application/octet-stream';
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      });
      createReadStream(path, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
      createReadStream(path).pipe(res);
    }
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

async function compose(browser, port, theme, kind) {
  console.log(`\n== 合成 ${theme} / ${kind} ==`);
  const plan = join(out, `${theme}-${kind}.json`);
  if (!existsSync(plan)) return console.log('  （還沒錄，略過）');
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`  [studio pageerror] ${e.message}`));
  let chunks = 0;
  page.on('console', (m) => {
    if (m.text().startsWith('[level]')) {
      if (process.env.FILM_DEBUG) console.log(`  ${m.text()}`);
    } else if (m.text().startsWith('[rec]')) {
      chunks++;
      if (process.env.FILM_DEBUG) console.log(`  ${m.text()}`);
    } else if (m.type() === 'error' && !m.text().includes('404')) console.log(`  [studio] ${m.text()}`);
  });
  let file = '';
  await page.exposeFunction('__filmStart', (mime) => {
    file = join(out, `${theme}-${kind}.${mime.includes('mp4') ? 'mp4' : 'webm'}`);
    writeFileSync(file, '');
    console.log(`  格式：${mime}`);
  });
  await page.exposeFunction('__filmChunk', (b64) => appendFileSync(file, Buffer.from(b64, 'base64')));
  const done = new Promise((r) => page.exposeFunction('__filmDone', r));
  await page.goto(
    `http://127.0.0.1:${port}/scripts/film-studio.html?mime=${mime}&plan=/${relative(ROOT, plan).replaceAll('\\', '/')}`,
  );
  const secs = await done;
  const mb = (statSync(file).size / 1e6).toFixed(1);
  console.log(`  🎬 ${file}（${Number(secs).toFixed(1)} 秒，${mb} MB，${chunks} 段）`);
  await ctx.close();
}

const recorder = await chromium.launch({ channel: 'msedge' });
if (!skipRecord) for (const t of themes) for (const k of only) await record(recorder, t, k);
await recorder.close();

const server = await serve();
const studio = await chromium.launch({
  channel: 'msedge',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
for (const t of themes) for (const k of only) await compose(studio, server.address().port, t, k);
await studio.close();
server.close();
