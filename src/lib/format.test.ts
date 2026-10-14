import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ago, toChineseNumber } from './format';

describe('文字格式', () => {
  it('中文數字', () => {
    assert.equal(toChineseNumber(1), '一');
    assert.equal(toChineseNumber(10), '十');
    assert.equal(toChineseNumber(18), '十八');
    assert.equal(toChineseNumber(40), '四十');
    assert.equal(toChineseNumber(42), '四十二');
    assert.equal(toChineseNumber(100), '一百');
  });

  it('相對時間', () => {
    const before = (s: number) => new Date(Date.now() - s * 1000);
    assert.equal(ago(null), '剛剛');
    assert.equal(ago(before(30)), '剛剛');
    assert.equal(ago(before(5 * 60)), '5 分鐘前');
    assert.equal(ago(before(3 * 3600)), '3 小時前');
    assert.equal(ago(before(2 * 86400)), '2 天前');
  });
});
