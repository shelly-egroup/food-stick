import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compose, rollGrade, type Verses } from './reading';
import type { Restaurant } from '@/lib/types';

describe('籤詩共用工具', () => {
  it('籤等依權重抽', () => {
    const grades = [
      { seal: '甲', name: '甲籤', weight: 1 },
      { seal: '乙', name: '乙籤', weight: 3 },
    ];
    assert.equal(rollGrade(grades, () => 0.2).seal, '甲');
    assert.equal(rollGrade(grades, () => 0.3).seal, '乙');
    assert.equal(rollGrade(grades, () => 0.99).seal, '乙');
  });

  it('四句依序對應類型、距離、價位、人數', () => {
    const one = (s: string) => [s];
    const v: Verses = {
      opening: {
        rice: one('飯'),
        noodle: one('麵'),
        bento: one('便當'),
        snack: one('小吃'),
        world: one('異國'),
        light: one('輕食'),
        brunch: one('早午'),
        other: one('其他'),
      },
      walk: { 5: one('五分'), 10: one('十分'), 15: one('十五分'), 20: one('二十分') },
      price: { 1: one('便宜'), 2: one('中等'), 3: one('貴') },
      closing: { solo: one('一個人'), group: one('一群人') },
    };
    const r = { category: 'noodle', walk: 15, price: 3 } as Restaurant;
    assert.deepEqual(
      compose(v, r, 'group', () => 0),
      ['麵', '十五分', '貴', '一群人'],
    );
  });
});
