import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { read, VERSES } from './reading';
import { allLines } from '../reading';
import type { Restaurant } from '@/lib/types';

const shop: Restaurant = {
  id: 'a',
  name: '巷口牛肉麵',
  category: 'noodle',
  price: 2,
  walk: 5,
  group: true,
  mapUrl: '',
  open: true,
  createdBy: 'x',
  createdAt: null,
};

describe('魔法預言', () => {
  it('每一句都剛好七個字', () => {
    for (const line of allLines(VERSES)) assert.equal([...line].length, 7, line);
  });

  it('魔法書寫第幾頁，水晶球寫第幾道預言', () => {
    const book = read(shop, 'solo', 'book', () => 0.17);
    const ball = read(shop, 'solo', 'ball', () => 0.17);
    assert.equal(book.numberText, '第十八頁');
    assert.equal(book.brand, '午餐魔法書');
    assert.equal(ball.numberText, '第十八道預言');
    assert.equal(ball.brand, '水晶球預言');
    assert.equal(ball.variant, 'ball');
    assert.equal(book.variant, 'book');
    assert.ok(ball.shareHead.startsWith('水晶球給了第十八道預言'));
  });

  it('沒說是哪個法器時當作魔法書', () => {
    assert.equal(read(shop, 'solo', undefined, () => 0.17).numberText, '第十八頁');
  });
});
