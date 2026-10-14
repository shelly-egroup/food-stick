import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, cleanVerse, looseJson } from './verse';
import { toTraditional } from './s2t';

const good = { lines: ['巷口騰騰牛肉香', '四人同席福氣長', '銀錢適度口袋滿', '下箸盡歡胃口張'], verdict: '快去吧' };

describe('Groq 籤詩：整理與檢查', () => {
  it('模型多寫了字、程式碼區塊或結尾分號，也撈得出 JSON', () => {
    assert.deepEqual(looseJson('好的：```json\n{"lines":["a"],"verdict":"b"}\n```'), { lines: ['a'], verdict: 'b' });
    assert.deepEqual(looseJson('{"lines":["a"],"verdict":"b"};'), { lines: ['a'], verdict: 'b' });
    assert.deepEqual(looseJson('{"lines":["a",],"verdict":"b",}'), { lines: ['a'], verdict: 'b' });
    assert.equal(looseJson('沒有 JSON'), null);
  });

  it('每句要剛好七個中文字；句子裡的標點會拿掉', () => {
    assert.ok(cleanVerse({ ...good, verdict: '價美物優走路近，快去吧！' }));
    assert.equal(cleanVerse({ ...good, lines: ['水晶球亮金光', ...good.lines.slice(1)] }), null);
    assert.equal(cleanVerse({ ...good, lines: good.lines.slice(0, 3) }), null);
    const v = cleanVerse({
      ...good,
      lines: ['巷口騰騰，牛肉香', ...good.lines.slice(1)],
      verdict: '價美物優走路近快去吧',
    });
    assert.equal(v?.lines[0], '巷口騰騰牛肉香');
  });

  it('解籤不能有英文數字，太短太長都不行，句尾補上句號', () => {
    assert.equal(cleanVerse({ ...good, verdict: '走 5 分鐘就到了，快去' }), null);
    assert.equal(cleanVerse({ ...good, verdict: '去' }), null);
    assert.equal(cleanVerse({ ...good, verdict: '價美物優走路近快去吧' })?.verdict, '價美物優走路近快去吧。');
  });

  it('漏出來的簡體字會換成繁體', () => {
    assert.equal(toTraditional('百金难买单人泪'), '百金難買單人淚');
    const v = cleanVerse({ ...good, lines: ['百金難買单人淚', ...good.lines.slice(1)], verdict: '一个人也要吃饱。' });
    assert.equal(v?.lines[0], '百金難買單人淚');
    assert.equal(v?.verdict, '一個人也要吃飽。');
  });

  it('prompt 帶著店家資訊、籤等與嚴格的 JSON 格式要求', () => {
    const p = buildPrompt({
      theme: 'magic',
      shop: '曼谷小廚',
      category: '異國',
      price: '100–200 元',
      walk: '20 分鐘以上',
      group: true,
      party: 3,
      grade: '稀有預言',
      variant: 'ball',
    });
    assert.match(p.user, /曼谷小廚/);
    assert.match(p.user, /稀有預言/);
    assert.match(p.user, /水晶球/);
    assert.match(p.user, /3 個人一起揪團/);
    assert.match(p.system, /只輸出一個 JSON 物件/);
    assert.match(p.system, /剛好七個中文字/);
    assert.match(p.system, /繁體中文/);
  });
});
