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

describe('廟宇籤詩', () => {
  it('每一句都剛好七個字', () => {
    for (const line of allLines(VERSES)) assert.equal([...line].length, 7, line);
  });

  it('組出籤號、籤等與四句', () => {
    let i = 0;
    const seq = [0.17, 0.0, 0.0, 0.5, 0.9, 0.2, 0.4];
    const f = read(shop, 'group', undefined, () => seq[i++ % seq.length]);
    assert.equal(f.numberText, '第十八籤');
    assert.equal(f.grade.seal, '上上');
    assert.equal(f.lines.length, 4);
    assert.equal(f.lines[0], '一碗熱湯暖心頭');
    assert.equal(f.brand, '食神靈籤');
    assert.equal(f.shareHead, '抽到第十八籤・上上籤');
  });
});
