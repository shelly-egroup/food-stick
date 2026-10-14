import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { litPath, moonPhase } from './moon';

describe('月相', () => {
  it('已知的滿月與新月', () => {
    // 2024-01-25 17:54 UTC 滿月、2024-02-09 22:59 UTC 新月
    assert.equal(moonPhase(new Date(Date.UTC(2024, 0, 25, 17, 54))).name, '滿月');
    assert.equal(moonPhase(new Date(Date.UTC(2024, 1, 9, 22, 59))).name, '新月');
  });

  it('上弦與下弦', () => {
    // 2024-01-18 03:53 UTC 上弦、2024-02-02 23:18 UTC 下弦
    assert.equal(moonPhase(new Date(Date.UTC(2024, 0, 18, 3, 53))).name, '上弦月');
    assert.equal(moonPhase(new Date(Date.UTC(2024, 1, 2, 23, 18))).name, '下弦月');
  });

  it('亮面比例與路徑', () => {
    const full = moonPhase(new Date(Date.UTC(2024, 0, 25, 17, 54)));
    assert.ok(full.lit > 0.98);
    assert.equal(litPath(0, 0, 10, { ...full, lit: 0 }), '');
    assert.ok(
      litPath(0, 0, 10, { p: 0.25, lit: 0.5, waxing: true, name: '上弦月', age: 7.4 }).includes('A10 10 0 0 1'),
    );
  });
});
