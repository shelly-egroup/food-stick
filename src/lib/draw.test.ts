import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { candidates, cleanFilters, drawOne, pickWeighted } from './draw';
import type { Member, Restaurant, Walk } from './types';

const shop = (id: string, over: Partial<Restaurant> = {}): Restaurant => ({
  id,
  name: id,
  category: 'rice',
  price: 1,
  walk: 5,
  group: true,
  mapUrl: '',
  open: true,
  createdBy: 'x',
  createdAt: null,
  ...over,
});
const person = (id: string, likes: string[] = [], blocks: string[] = []): Member => ({
  id,
  name: id,
  photoURL: '',
  crews: [],
  likes,
  blocks,
});
const none = { categories: [], prices: [], walks: [] };

describe('candidates', () => {
  it('排除任何一個人不吃的店', () => {
    const list = candidates({
      restaurants: [shop('a'), shop('b')],
      party: [person('me'), person('amy', [], ['b'])],
      filters: none,
      recent: [],
    });
    assert.deepEqual(
      list.map((c) => c.restaurant.id),
      ['a'],
    );
  });

  it('越多人愛，權重越高；最近吃過的降低', () => {
    const list = candidates({
      restaurants: [shop('a'), shop('b'), shop('c')],
      party: [person('me', ['a', 'c']), person('amy', ['a'])],
      filters: none,
      recent: ['c'],
    });
    const w = Object.fromEntries(list.map((c) => [c.restaurant.id, c.weight]));
    assert.deepEqual(w, { a: 5, b: 1, c: 0.75 });
  });

  it('三人以上只抽適合多人的店', () => {
    const list = candidates({
      restaurants: [shop('a'), shop('b', { group: false })],
      party: [person('1'), person('2'), person('3')],
      filters: none,
      recent: [],
    });
    assert.deepEqual(
      list.map((c) => c.restaurant.id),
      ['a'],
    );
  });

  it('探店：沒人愛過的店比較容易中，這陣子吃過的降低', () => {
    const list = candidates({
      restaurants: [shop('a'), shop('b'), shop('c')],
      party: [person('me', ['a'])],
      filters: none,
      recent: [],
      prefer: 'explore',
      eaten: ['c'],
    });
    const w = Object.fromEntries(list.map((c) => [c.restaurant.id, Math.round(c.weight * 100) / 100]));
    assert.deepEqual(w, { a: 1, b: 3, c: 0.9 });
  });

  it('探店也不會出現有人不吃的店', () => {
    const list = candidates({
      restaurants: [shop('a'), shop('b')],
      party: [person('me', [], ['b'])],
      filters: none,
      recent: [],
      prefer: 'explore',
    });
    assert.deepEqual(
      list.map((c) => c.restaurant.id),
      ['a'],
    );
  });

  it('依類型和價位篩選', () => {
    const list = candidates({
      restaurants: [
        shop('a', { category: 'noodle', price: 2 }),
        shop('b', { category: 'noodle', price: 3 }),
        shop('c'),
      ],
      party: [person('me')],
      filters: { categories: ['noodle'], prices: [2], walks: [] },
      recent: [],
    });
    assert.deepEqual(
      list.map((c) => c.restaurant.id),
      ['a'],
    );
  });

  it('依步行時間篩選；沒選步行就不限', () => {
    const restaurants = [shop('a', { walk: 5 }), shop('b', { walk: 15 }), shop('c', { walk: 20 })];
    const pick = (walks: Walk[]) =>
      candidates({
        restaurants,
        party: [person('me')],
        filters: { categories: [], prices: [], walks },
        recent: [],
      }).map((c) => c.restaurant.id);
    assert.deepEqual(pick([5, 15]), ['a', 'b']);
    assert.deepEqual(pick([]), ['a', 'b', 'c']);
  });
});

describe('cleanFilters', () => {
  it('丟掉表裡已經沒有的值，留下認得的', () => {
    assert.deepEqual(cleanFilters({ categories: ['rice', 'pizza'], prices: [2, 9], walks: [30, 15] }), {
      categories: ['rice'],
      prices: [2],
      walks: [15],
    });
  });

  it('舊版存的沒有 walks，當成不限', () => {
    assert.deepEqual(cleanFilters({ categories: ['noodle'], prices: [] }), {
      categories: ['noodle'],
      prices: [],
      walks: [],
    });
  });

  it('存壞了的資料當成沒有篩選', () => {
    const empty = { categories: [], prices: [], walks: [] };
    assert.deepEqual(cleanFilters(null), empty);
    assert.deepEqual(cleanFilters('rice'), empty);
    assert.deepEqual(cleanFilters({ categories: 'rice', prices: null, walks: [{}] }), empty);
  });
});

describe('pickWeighted / drawOne', () => {
  it('依權重挑選', () => {
    const list = [
      { id: 'a', weight: 1 },
      { id: 'b', weight: 3 },
    ];
    assert.equal(pickWeighted(list, () => 0.1)?.id, 'a');
    assert.equal(pickWeighted(list, () => 0.5)?.id, 'b');
    assert.equal(
      pickWeighted([], () => 0.5),
      null,
    );
  });

  it('全部都重抽過時，不再排除', () => {
    const got = drawOne({
      restaurants: [shop('a')],
      party: [person('me')],
      filters: none,
      recent: [],
      exclude: ['a'],
    });
    assert.equal(got?.restaurant.id, 'a');
  });

  it('沒有任何候選時回傳 null', () => {
    assert.equal(drawOne({ restaurants: [], party: [person('me')], filters: none, recent: [] }), null);
  });
});
