import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES, PRICES, WALKS, categoryOf, type CategoryId } from './types';

/** firestore.rules 的 validRestaurant 裡，d.<field> in [...] 那一串可以存的值 */
function allowed(field: string): unknown[] {
  const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  const fn = rules.match(/function validRestaurant\(d\) \{([\s\S]*?)\n {4}\}/)?.[1];
  assert.ok(fn, '找不到 firestore.rules 的 validRestaurant');
  const list = fn.match(new RegExp(`d\\.${field} in \\[([^\\]]*)\\]`))?.[1];
  assert.ok(list !== undefined, `validRestaurant 裡找不到 d.${field} in [...]`);
  return JSON.parse(`[${list.replaceAll("'", '"')}]`);
}

/** 順序不重要，只要兩邊的值一樣 */
const sameValues = (a: readonly unknown[], b: readonly unknown[]) => assert.deepEqual([...a].sort(), [...b].sort());

describe('firestore.rules 跟選項表一致', () => {
  it('類型', () => {
    sameValues(
      allowed('category'),
      CATEGORIES.map((c) => c.id),
    );
  });

  it('價位', () => {
    sameValues(
      allowed('price'),
      PRICES.map((p) => p.v),
    );
  });

  it('步行', () => {
    sameValues(
      allowed('walk'),
      WALKS.map((w) => w.v),
    );
  });
});

describe('categoryOf', () => {
  it('找不到的類型當成「其他」', () => {
    assert.equal(categoryOf('pizza' as CategoryId).id, 'other');
  });
});
