import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEggPrompt, cleanEgg, randomFlavor } from './egg';

describe('封面彩蛋：AI 寫的句子', () => {
  it('廟宇要是「宜：…　忌：…」，半形冒號、空白也收，統一成全形', () => {
    assert.equal(cleanEgg('temple', { line: '宜：準時下班　忌：順便加班' }), '宜：準時下班　忌：順便加班');
    assert.equal(cleanEgg('temple', { line: '宜:已讀不回 忌:午休回公事' }), '宜：已讀不回　忌：午休回公事');
    assert.equal(cleanEgg('temple', { line: '準時下班最好' }), null);
  });

  it('魔法是一句八到二十八字的話，簡體字轉成繁體', () => {
    assert.equal(cleanEgg('magic', { line: '水晶球说：今天适合准时下班' }), '水晶球說：今天適合準時下班');
    assert.equal(cleanEgg('magic', { line: '好餓' }), null);
  });

  it('英文、數字、飲食限制與身材的字眼一律不要', () => {
    assert.equal(cleanEgg('magic', { line: '貓頭鷹說今天要吃 pizza 才對' }), null);
    assert.equal(cleanEgg('magic', { line: '水晶球說：今天吃辣的魔力最強' }), null);
    assert.equal(cleanEgg('temple', { line: '宜：吃飽　忌：想著減肥' }), null);
    assert.equal(cleanEgg('temple', { line: '宜：準時下班　忌：祈求加薪不如抽菸' }), null);
  });

  it('沒指定口味時，主題特色最常出現', () => {
    assert.equal(
      randomFlavor(() => 0),
      'lore',
    );
    assert.equal(
      randomFlavor(() => 0.49),
      'lore',
    );
    assert.equal(
      randomFlavor(() => 0.999),
      'perk',
    );
  });

  it('提示詞照主題和口味換', () => {
    assert.match(buildEggPrompt('temple', 'lore').system, /擲筊[\s\S]*主題特色/);
    assert.match(buildEggPrompt('temple', 'weary').system, /今日黃曆[\s\S]*厭世社畜/);
    assert.match(buildEggPrompt('magic', 'perk').system, /水晶球[\s\S]*社畜會爽/);
  });
});
