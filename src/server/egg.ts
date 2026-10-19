// 食籤簿／冒險日誌封面的彩蛋：請 Groq 現寫一句（先用 gpt-oss-120b）。只在伺服器上跑（/api/egg）。
// 重點是貼主題（廟宇的廟裡日常、魔法的魔法世界），社畜口味只是一部分。
// 寫不出合格的就回傳 null，網站改用 copy 裡準備好的句子。
import { toTraditional } from './s2t';
import { askGroq } from './verse';

export type EggTheme = 'temple' | 'magic';
/** 口味：主題特色、幹話、厭世社畜、社畜會爽 */
export const EGG_FLAVORS = ['lore', 'joke', 'weary', 'perk'] as const;
export type EggFlavor = (typeof EGG_FLAVORS)[number];
/** 沒指定口味時照這個比例抽：主題特色佔一半 */
const WEIGHTS: Record<EggFlavor, number> = { lore: 5, joke: 2, weary: 1.5, perk: 1.5 };
export function randomFlavor(rnd = Math.random): EggFlavor {
  const total = EGG_FLAVORS.reduce((n, f) => n + WEIGHTS[f], 0);
  let x = rnd() * total;
  for (const f of EGG_FLAVORS) {
    x -= WEIGHTS[f];
    if (x < 0) return f;
  }
  return 'lore';
}

/** 先用的模型在前面；可以用環境變數 GROQ_MODELS_EGG（逗號分隔）換掉 */
export const EGG_MODELS = (process.env.GROQ_MODELS_EGG || 'openai/gpt-oss-120b')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const FLAVOR: Record<EggFlavor, string> = {
  lore: '主題特色：把這個主題世界裡才有的東西（看下面的意象）跟吃飯、日常小事連在一起，有畫面、有梗，讓人覺得「這只有這裡會寫」。',
  joke: '幹話：一本正經地講廢話，聽了會翻白眼但會笑出來；題材隨意（吃飯、天氣、星期幾、人生、心情、肚子餓），不一定跟上班有關。',
  weary: '厭世社畜：上班族的無奈與疲憊（開會、訊息、報告、加班、薪水），自嘲但不憤世嫉俗、不罵人。',
  perk: '社畜會爽：上班族聽了會很爽、很想照做的小確幸（準時下班、午休不被打擾、已讀不回公事、吃好一點）。',
};

const VOICE: Record<EggTheme, string> = {
  temple: `你是台灣一座「午餐廟」的廟公，在食籤簿封面偷偷寫一則「今日黃曆」給來吃午餐的人。
格式固定是「宜：（兩到十二個字）　忌：（兩到十六個字）」：「宜」和「忌」後面都用全形冒號，兩段中間用一個全形空白隔開。
宜和忌要互相呼應，形成一個小反差或笑點。
廟裡的意象（至少用上一個，自然地融進去）：擲筊、聖筊、笑筊、土地公、月老、媽祖、關公、收驚、香油錢、平安符、籤詩、求籤、廟口小吃、鞭炮、廟會、神轎、供桌、金紙、香爐、石獅、廟公。
宜和忌都要是一看就懂的具體動作或情境，句子要通順，不要為了押字硬湊。
（風格參考，不要照抄：「宜：擲筊問吃什麼　忌：連續三個笑筊還不放棄」「宜：跟土地公點一樣的　忌：跟月老許願要雞腿」「宜：添香油錢　忌：添完發現沒錢吃飯」「宜：求平安符　忌：求神明幫忙排隊」）
對神明要親切、帶點俏皮，但不能不敬。`,
  magic: `你是「午餐水晶球」的魔法預言師，用隱形墨水在冒險日誌封面偷偷寫一句話給來吃午餐的人。
一句話，八到二十六個字，可以用一個全形冒號或逗號斷句。
魔法世界的意象（至少用上一個，自然地融進去）：魔藥、魔藥課、掃帚、魔杖、貓頭鷹送信、龍、精靈、煉金術、咒語、星象、魔法書、傳送門、隱身斗篷、水晶球、大法師、巫師帽、魔法陣、獨角獸、飛毯。
（風格參考，不要照抄：「今日魔藥配方：白飯一碗，勇氣少許」「龍說牠吃飽才噴火，你也是」「貓頭鷹送來帳單，原來昨天的魔藥是賒的」「掃帚今天罷工，說牠也要午休」）
不要用任何真實作品裡的專有名詞（例如書名、角色名、學校名）。`,
};

const RULES = `【規則：一定要遵守】
1. 只用台灣慣用的繁體中文（正體字），絕對不能有簡體字、英文字母、阿拉伯數字或表情符號。
2. 不要提到任何飲食限制或身材（例如辣、減肥、胖瘦、素食、過敏），不要提到菸、酒、賭博，不要嘲笑或針對任何人、性別、族群，不要髒話。
3. 天馬行空、想像力大開，要有一個清楚的笑點或反轉，讀起來像一句會讓人噗哧一笑的話；不要只是把意象堆在一起，句子的意思要通順、看得懂。
4. 每次都寫全新的一句，不要套用常見的句子。`;

const FORMAT = `【輸出格式：非常重要】
只輸出一個 JSON 物件，前後不能有任何其他文字或程式碼區塊，格式：{"line":"…"}`;

/** 每次給一個不同的靈感當主角，免得每句都是掃帚、魔杖（或擲筊） */
const MOTIFS: Record<EggTheme, string[]> = {
  temple: ['擲筊', '土地公', '月老', '媽祖', '關公', '收驚', '香油錢', '平安符', '籤詩', '廟口小吃', '鞭炮', '廟會'],
  magic: [
    '魔藥課',
    '貓頭鷹送信',
    '龍',
    '精靈',
    '煉金術',
    '咒語失靈',
    '星象',
    '魔法書',
    '隱身斗篷',
    '巫師帽',
    '獨角獸',
    '飛毯',
  ],
};

export function buildEggPrompt(theme: EggTheme, flavor: EggFlavor = randomFlavor()) {
  const motif = MOTIFS[theme][Math.floor(Math.random() * MOTIFS[theme].length)];
  return {
    system: `${VOICE[theme]}\n\n口味：${FLAVOR[flavor]}\n\n${RULES}\n\n${FORMAT}`,
    user: `請寫一句${theme === 'temple' ? '今日黃曆' : '隱形墨水的話'}（口味：${FLAVOR[flavor].split('：')[0]}；這次的靈感是「${motif}」，請以它為主角）。只輸出那一個 JSON 物件。`,
  };
}

const NO_LATIN = /[A-Za-z0-9０-９Ａ-Ｚａ-ｚ]/;
const CJK = /[㐀-鿿]/u;
const BANNED = /辣|減肥|瘦|胖|素食|過敏|酒|菸|煙|賭/;

/** 檢查並整理：轉成繁體、去掉多餘空白；廟宇要是「宜：…　忌：…」，魔法要是一句八到二十六字的話。不合格回傳 null */
export function cleanEgg(theme: EggTheme, obj: unknown): string | null {
  const raw = (obj as { line?: unknown } | null)?.line;
  if (typeof raw !== 'string') return null;
  // 「准」在台灣只用在准許：准時、准備要寫成準時、準備；老板要寫成老闆
  let s = toTraditional(raw.trim())
    .replace(/^["「『]|["」』]$/g, '')
    .replace(/准(時|備|確)/g, '準$1')
    .replace(/老板/g, '老闆');
  if (NO_LATIN.test(s) || BANNED.test(s) || !CJK.test(s)) return null;
  if (theme === 'temple') {
    // 冒號、空白寫成半形的也收，統一換成全形
    const m = s.replace(/:/g, '：').match(/^宜：\s*(.{2,12}?)\s*[　 ，,]?\s*忌：\s*(.{2,16})$/u);
    if (!m) return null;
    const good = m[1].replace(/[\s，,]+$/u, '');
    const bad = m[2].replace(/[。！]$/u, '').trim();
    if (!good || !bad) return null;
    return `宜：${good}　忌：${bad}`;
  }
  s = s.replace(/\s+/g, '');
  const n = [...s].length;
  return n >= 8 && n <= 28 ? s : null;
}

/**
 * 寫一句：彩蛋是背景先備好的，不用搶快，所以不像籤詩那樣所有 key 同時發（省額度）：
 * key 隨機排一下，一把一把試，合格就用；這個模型都不行才換下一個。全部失敗回傳 null
 */
export async function writeEgg(theme: EggTheme, flavor: EggFlavor, keys: string[], models = EGG_MODELS) {
  const prompt = buildEggPrompt(theme, flavor);
  const order = [...keys].sort(() => Math.random() - 0.5);
  for (const model of models)
    for (const key of order) {
      const line = await askGroq(model, key, prompt, (o) => cleanEgg(theme, o)).catch(() => null);
      if (line) return { line, model };
    }
  return null;
}
