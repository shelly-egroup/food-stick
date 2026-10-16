// 用 Groq 的大型語言模型寫籤詩（預言）。只在伺服器上跑（/api/verse），key 不會進到瀏覽器。
// 只負責「寫四句＋一句解籤」，籤號、籤等仍由網站自己抽。
// 依序試：主要模型配所有的 key（同時發、取先回來而且合格的），再換備用模型；全部不合格就回傳 null，網站改用原本的籤詩。
import { toTraditional } from './s2t';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const list = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
/**
 * 廟宇的籤詩和魔法的預言用不同的模型：籤詩先用 qwen、預言先用 gpt-oss，各自寫不出來再換另一個。
 * 先用的在前面；可以用環境變數 GROQ_MODELS_TEMPLE、GROQ_MODELS_MAGIC（逗號分隔）分別換掉
 */
export const MODELS: Record<VerseInput['theme'], string[]> = {
  temple: list(process.env.GROQ_MODELS_TEMPLE || 'qwen/qwen3.8-27b,openai/gpt-oss-120b'),
  magic: list(process.env.GROQ_MODELS_MAGIC || 'openai/gpt-oss-120b,qwen/qwen3.8-27b'),
};
/** 單次請求最多等多久 */
const TIMEOUT_MS = 6000;

export interface VerseInput {
  theme: 'temple' | 'magic';
  shop: string;
  category: string;
  price: string;
  walk: string;
  group: boolean;
  party: number;
  grade: string;
  variant: string;
}

export interface Verse {
  lines: string[];
  verdict: string;
}

/** 每次給一個不同的靈感，讓籤詩不會每次都長得差不多 */
const MOTIFS: Record<VerseInput['theme'], string[]> = {
  temple: [
    '廟口',
    '香火',
    '晨鐘',
    '月老',
    '燈籠',
    '竹籤',
    '鞭炮',
    '金紙',
    '供桌',
    '神轎',
    '鑼鼓',
    '香爐',
    '平安符',
    '石獅',
    '燕尾脊',
    '籤筒',
  ],
  magic: [
    '流星',
    '魔杖',
    '羽毛筆',
    '貓頭鷹',
    '飛龍',
    '精靈',
    '魔藥',
    '星座',
    '月光',
    '飛天掃帚',
    '寶箱',
    '傳送門',
    '咒語書',
    '水晶',
    '銀河',
    '獨角獸',
  ],
};

const FORMAT = `【輸出格式：非常重要，違反任何一條這次就算失敗】
1. 只輸出一個 JSON 物件，前後不能有任何其他文字、說明、思考過程、Markdown 或程式碼區塊。
2. 物件只能有兩個鍵：lines 與 verdict。lines 是剛好四個字串的陣列，verdict 是一個字串。
3. 只用半形雙引號、半形冒號、半形逗號；最後一個項目後面不能有逗號；最後以 } 結尾，後面不能再有任何字元（包括分號）。
4. 格式長這樣（把 … 換成你寫的內容）：{"lines":["…","…","…","…"],"verdict":"…"}

【輸出前，逐項檢查一次，有任何一項不符合就先改好再輸出】
- 四句是不是每句都剛好七個字？
- 每一個字是不是都是台灣的正體字？有沒有混進簡體字？
- 是不是只有一個合法的 JSON 物件，沒有任何多餘的文字？`;

const RULES = `【文字規則：一定要遵守】
1. 只用台灣慣用的繁體中文（正體字）。絕對不能出現任何簡體字（例如「单、们、这、个、来、时、饭、汤、钱、鸡」都是錯的，要寫成「單、們、這、個、來、時、飯、湯、錢、雞」），也不能出現日文、英文字母、阿拉伯數字或表情符號。
2. lines 的每一句都剛好七個中文字，句子裡不放任何標點符號或空白。寫完每一句都要逐字數一次，多一個字或少一個字都不行。
3. 第二句和第四句的最後一個字要押韻。
4. 內容要扣住這家店：吃的東西、價位、走路多遠、適不適合一群人去，以及今天是一個人還是揪團。
5. verdict 是一句白話，十到二十二個字，親切幽默，句尾用全形標點，最後勸大家出發去吃。
6. 每次都寫出全新的句子，不要套用固定句型，也不要直接照抄店名資料。`;

const VOICE: Record<VerseInput['theme'], string> = {
  temple: `你是台灣一座「午餐廟」的籤詩作者，替上班族把今天抽到的午餐寫成一支籤。
語氣像廟裡的籤詩，古雅、有畫面，但帶一點上班族的幽默，讓人會心一笑。
詩意要跟籤等相符：上上、上吉要非常吉利；中吉、小吉平穩中帶點提醒；下籤可以調侃，但最後還是勸人去吃。
verdict 是「解曰」的內容。`,
  magic: `你是「午餐水晶球」的魔法預言師，替上班族把今天選中的午餐寫成一段預言。
語氣是奇幻魔法的預言（星象、咒語、魔力、魔法書、水晶球、巫師、冒險），俏皮帶點中二，讓人會心一笑。
預言要跟等級相符：傳說、稀有要非常神奇吉利；普通平穩中帶點提醒；比較差的等級可以調侃，但最後還是勸人去吃。
verdict 是「預言」的結語。`,
};

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];

/** 把店家與這次抽籤的資訊組成 system / user 兩段 */
export function buildPrompt(input: VerseInput) {
  const t = input.theme;
  const facts = [
    `店名：${input.shop}`,
    `類型：${input.category}`,
    `價位：${input.price}`,
    `走路：${input.walk}`,
    `適合一群人去：${input.group ? '是' : '比較適合一兩個人'}`,
    `這次：${input.party > 1 ? `${input.party} 個人一起揪團` : '自己一個人吃'}`,
    t === 'magic'
      ? `揭曉的法器：${input.variant === 'ball' ? '水晶球' : input.variant === 'book' ? '魔法書' : '魔法書或水晶球'}`
      : null,
    `${t === 'magic' ? '預言等級' : '籤等'}：${input.grade}`,
    `這次的靈感（可以自然地融入，不必硬塞）：${pick(MOTIFS[t])}`,
  ].filter(Boolean);
  return {
    system: `${VOICE[t]}\n\n${RULES}\n\n${FORMAT}`,
    user: `請為這次的午餐寫一支${t === 'magic' ? '預言' : '籤'}：\n${facts.join('\n')}\n\n記得：全部用台灣正體字，四句各七個字，只輸出那一個 JSON 物件。`,
  };
}

const CJK7 = /^[㐀-鿿豈-﫿]{7}$/u;
const STRIP = /[\s\p{P}\p{S}]/gu;

/** 從模型回來的文字裡挑出 JSON：容忍前後多餘的字、程式碼區塊、結尾多一個分號或逗號 */
export function looseJson(text: unknown): unknown {
  if (typeof text !== 'string') return null;
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  const body = text.slice(a, b + 1);
  for (const candidate of [body, body.replace(/[;；]\s*}$/, '}').replace(/,\s*([\]}])/g, '$1')]) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* 換下一種修法 */
    }
  }
  return null;
}

/** 檢查並整理：四句都要剛好七個中文字、解籤一句、全部轉成繁體；不合格回傳 null */
export function cleanVerse(obj: unknown): Verse | null {
  const o = obj as { lines?: unknown; verdict?: unknown } | null;
  if (!o || !Array.isArray(o.lines) || o.lines.length !== 4 || typeof o.verdict !== 'string') return null;
  const lines = o.lines.map((l) => toTraditional(String(l).replace(STRIP, '')));
  if (!lines.every((l) => CJK7.test(l))) return null;
  let verdict = toTraditional(o.verdict.trim().replace(/\s+/g, ''));
  if (/[A-Za-z0-9０-９Ａ-Ｚａ-ｚ]/.test(verdict)) return null;
  const n = [...verdict].length;
  if (n < 6 || n > 34 || !/[㐀-鿿]/u.test(verdict)) return null;
  if (!/[。！？…～]$/u.test(verdict)) verdict = verdict.replace(/[，、；：,.]$/u, '') + '。';
  return { lines, verdict };
}

/**
 * 打一次 Groq，要它回一個 JSON 物件，交給 clean 檢查整理；不合格就丟錯。
 * JSON 驗證失敗時，模型寫出來的東西放在 failed_generation，也拿來試試看。籤詩、封面彩蛋共用。
 */
export async function askGroq<T>(
  model: string,
  key: string,
  prompt: { system: string; user: string },
  clean: (obj: unknown) => T | null,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      temperature: 0.95,
      top_p: 0.95,
      max_completion_tokens: 2000,
      response_format: { type: 'json_object' },
    };
    // qwen 會先想再寫：想的過程不要放進回答裡；gpt-oss 想少一點，比較快
    if (model.startsWith('qwen/')) body.reasoning_format = 'hidden';
    if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => null);
    const text = res.ok ? json?.choices?.[0]?.message?.content : json?.error?.failed_generation;
    const out = clean(looseJson(text));
    if (!out) throw new Error(res.ok ? 'invalid output' : `groq ${res.status}`);
    return out;
  } finally {
    clearTimeout(timer);
  }
}

/** 一組請求裡，誰先回來而且合格就用誰；全部失敗才算失敗 */
export function firstGood<T>(tasks: Promise<T>[]): Promise<T | null> {
  return new Promise((resolve) => {
    let left = tasks.length;
    if (!left) resolve(null);
    tasks.forEach((t) =>
      t.then(resolve, () => {
        left -= 1;
        if (!left) resolve(null);
      }),
    );
  });
}

/**
 * 寫一支籤（預言）：照主題選模型（籤詩先 qwen、預言先 gpt-oss）。每個模型都同時用所有的 key 各發一次（任一把 key 額度用完或出錯都不影響），
 * 取第一個合格的；這個模型全部失敗才換下一個模型。全部失敗回傳 null。
 */
export async function writeVerse(input: VerseInput, keys: string[], models = MODELS[input.theme]) {
  const prompt = buildPrompt(input);
  for (const model of models) {
    const verse = await firstGood(keys.map((k) => askGroq(model, k, prompt, cleanVerse)));
    if (verse) return { ...verse, model };
  }
  return null;
}
