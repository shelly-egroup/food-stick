import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MEAL_MS,
  NO_MEAL_FILTERS,
  canDecide,
  canSwitch,
  canDraw,
  canReopen,
  canSkip,
  candidatesOf,
  chosenOf,
  customSlot,
  latestOf,
  mealIdOf,
  mealsFor,
  needsMe,
  showsLive,
  keptToday,
  stateOf,
  taipeiDate,
  tallyOf,
  toMeal,
  type Meal,
  type MealPick,
} from './meal';

const T0 = Date.UTC(2026, 8, 10, 3, 30); // 台北 9/10 11:30
const at = (ms: number) => new Date(T0 + ms);

const pick = (rid: string, over: Partial<MealPick> = {}): MealPick => ({
  rid,
  name: rid,
  by: 'me',
  at: at(0),
  seed: 1,
  variant: '',
  theme: 'temple',
  lines: [],
  verdict: '',
  ...over,
});

const meal = (over: Partial<Meal> = {}): Meal => ({
  id: '2026-09-10_lunch_me',
  v: 1,
  date: '2026-09-10',
  slot: { key: 'lunch', label: '午餐' },
  host: 'me',
  party: ['me'],
  answers: {},
  going: ['me'],
  rerolls: 3,
  rerollsLeft: 3,
  filters: NO_MEAL_FILTERS,
  picks: [],
  cands: [],
  skips: [],
  decision: null,
  status: 'open',
  createdAt: at(0),
  updatedAt: at(0),
  endsAt: at(MEAL_MS),
  ...over,
});

describe('餐別與單號', () => {
  it('自己打的餐別：拿掉空白和符號，最多 8 個字；剛好是內建的就用內建的', () => {
    assert.deepEqual(customSlot(' 加班 餐/'), { key: 'custom', label: '加班餐' });
    assert.deepEqual(customSlot('下午茶'), { key: 'tea', label: '下午茶' });
    assert.equal(customSlot('一二三四五六七八九十')?.label, '一二三四五六七八');
    assert.equal(customSlot('  /. '), null);
  });

  it('單號：日期＋餐別＋發起人，自己打的餐別是 c-名字', () => {
    assert.equal(mealIdOf('2026-09-10', { key: 'lunch', label: '午餐' }, 'u1'), '2026-09-10_lunch_u1');
    assert.equal(mealIdOf('2026-09-10', { key: 'custom', label: '加班餐' }, 'u1'), '2026-09-10_c-加班餐_u1');
  });

  it('日期一律用台北時間', () => {
    assert.equal(taipeiDate(Date.UTC(2026, 8, 9, 16, 30)), '2026-09-10');
    assert.equal(taipeiDate(Date.UTC(2026, 8, 9, 15, 30)), '2026-09-09');
  });
});

describe('toMeal', () => {
  it('缺的欄位補預設值，奇怪的值丟掉', () => {
    const m = toMeal(
      'x',
      { party: ['a', 3], answers: { b: 'in', c: 'maybe' }, status: 'weird', slot: { key: 'nope' } },
      () => null,
    );
    assert.deepEqual(m.party, ['a']);
    assert.deepEqual(m.answers, { b: 'in' });
    assert.equal(m.status, 'cancelled');
    assert.deepEqual(m.slot, { key: 'lunch', label: '午餐' });
    assert.equal(m.rerolls, 3);
    assert.deepEqual(m.filters, NO_MEAL_FILTERS);
    assert.equal(m.decision, null);
  });

  it('自己打的餐別照原樣保留', () => {
    const m = toMeal('x', { slot: { key: 'custom', label: '加班餐' } }, () => null);
    assert.deepEqual(m.slot, { key: 'custom', label: '加班餐' });
  });
});

describe('參加', () => {
  it('發起人一定要去；其他人看回覆，沒回就是還沒回', () => {
    const m = meal({ party: ['me', 'a', 'b', 'c'], answers: { a: 'in', b: 'out' }, going: ['me', 'a'] });
    assert.equal(stateOf(m, 'me'), 'in');
    assert.equal(stateOf(m, 'a'), 'in');
    assert.equal(stateOf(m, 'b'), 'out');
    assert.equal(stateOf(m, 'c'), 'wait');
    assert.deepEqual(tallyOf(m, 'me'), { in: 1, wait: 1, out: 1 });
  });
});

describe('候選', () => {
  it('照抽到的順序；去不了的拿掉；同一家抽到兩次用最後那支', () => {
    const m = meal({
      picks: [pick('a'), pick('b'), pick('c'), pick('a', { seed: 9 })],
      cands: ['c', 'a'],
      skips: [{ rid: 'b', by: 'me', at: at(0), why: 'crowded' }],
    });
    assert.deepEqual(
      candidatesOf(m).map((p) => p.rid),
      ['c', 'a'],
    );
    assert.equal(latestOf(m)?.seed, 9);
    assert.equal(chosenOf(m), null);
    assert.equal(chosenOf(meal({ ...m, decision: { rid: 'c', by: 'me', at: at(0) } }))?.rid, 'c');
  });
});

describe('能不能抽、起駕、去不了', () => {
  it('第一支不用次數；之後要有剩；起駕後就不能抽', () => {
    assert.equal(canDraw(meal({ rerollsLeft: 0 }), 'me', T0), true);
    assert.equal(canDraw(meal({ picks: [pick('a')], cands: ['a'], rerollsLeft: 0 }), 'me', T0), false);
    assert.equal(canDraw(meal({ picks: [pick('a')], cands: ['a'], rerollsLeft: 1 }), 'me', T0), true);
    assert.equal(canDraw(meal({ picks: [pick('a')], cands: ['a'], status: 'decided' }), 'me', T0), false);
  });

  it('還沒回、不去的人不能抽', () => {
    const m = meal({ party: ['me', 'a', 'b'], answers: { b: 'out' } });
    assert.equal(canDraw(m, 'a', T0), false);
    assert.equal(canDraw(m, 'b', T0), false);
    assert.equal(canDraw(m, 'zz', T0), false);
  });

  it('時間到了、取消了都不能再動', () => {
    const m = meal({ picks: [pick('a')], cands: ['a'] });
    assert.equal(canDecide(m, 'me', T0 + MEAL_MS), false);
    assert.equal(canSkip({ ...m, status: 'cancelled' }, 'me', T0), false);
  });

  it('起駕之後還是可以按去不了（到了店門口才知道）', () => {
    const m = meal({
      picks: [pick('a')],
      cands: ['a'],
      status: 'decided',
      decision: { rid: 'a', by: 'me', at: at(0) },
    });
    assert.equal(canSkip(m, 'me', T0), true);
    assert.equal(canDecide(m, 'me', T0), false);
  });

  it('起駕之後、這餐結束前可以改去別張；只有一張、時間到了、不去的人都不行', () => {
    const m = meal({
      party: ['me', 'a'],
      answers: { a: 'out' },
      picks: [pick('a'), pick('b')],
      cands: ['a', 'b'],
      status: 'decided',
      decision: { rid: 'a', by: 'me', at: at(0) },
    });
    assert.equal(canSwitch(m, 'me', T0), true);
    assert.equal(canSwitch({ ...m, cands: ['a'] }, 'me', T0), false);
    assert.equal(canSwitch(m, 'me', T0 + MEAL_MS), false);
    assert.equal(canSwitch(m, 'a', T0), false);
    assert.equal(canSwitch({ ...m, status: 'open', decision: null }, 'me', T0), false);
  });

  it('取消了、或時間到了還沒起駕，可以重新開張；起駕過的不行', () => {
    assert.equal(canReopen(meal({ status: 'cancelled' }), T0), true);
    assert.equal(canReopen(meal(), T0 + MEAL_MS), true);
    assert.equal(canReopen(meal(), T0), false);
    assert.equal(
      canReopen(meal({ status: 'decided', decision: { rid: 'a', by: 'me', at: at(0) } }), T0 + MEAL_MS),
      false,
    );
  });
});

describe('進行中與紅點', () => {
  const m = meal({ party: ['me', 'a', 'b'], answers: { a: 'in' }, going: ['me', 'a'] });

  it('還在抽的時候，名單上的人都看得到', () => {
    assert.equal(showsLive(m, 'a', T0), true);
    assert.equal(showsLive(m, 'b', T0), true);
    assert.equal(showsLive(m, 'zz', T0), false);
  });

  it('起駕之後只留給還沒回覆的人；時間到了大家都收起來', () => {
    const d = { ...m, status: 'decided' as const, decision: { rid: 'x', by: 'me', at: at(0) } };
    assert.equal(showsLive(d, 'me', T0), false);
    assert.equal(showsLive(d, 'a', T0), false);
    assert.equal(showsLive(d, 'b', T0), true);
    assert.equal(showsLive(d, 'b', T0 + MEAL_MS), false);
    // 起駕了：通知裡今天的揪團單還留著，回頭找得到；時間到了也一樣（同一天），取消的不留、一個人的不放
    assert.equal(keptToday(d, 'me', T0), true);
    assert.equal(keptToday(d, 'me', T0 + MEAL_MS), true);
    assert.equal(keptToday(d, 'b', T0), false);
    assert.equal(keptToday({ ...d, status: 'cancelled' }, 'me', T0), false);
    assert.equal(keptToday({ ...d, party: ['me'] }, 'me', T0), false);
  });

  it('紅點只算還沒回的邀請', () => {
    assert.equal(needsMe(m, 'b', T0), true);
    assert.equal(needsMe(m, 'a', T0), false);
    assert.equal(needsMe({ ...m, status: 'cancelled' }, 'b', T0), false);
  });
});

describe('首頁的那一餐', () => {
  const lunch = { key: 'lunch', label: '午餐' } as const;

  it('別人揪我、我要去的，比自己那張還新就用它', () => {
    const mine = meal({ updatedAt: at(0) });
    const theirs = meal({
      id: '2026-09-10_lunch_a',
      host: 'a',
      party: ['a', 'me'],
      answers: { me: 'in' },
      going: ['a', 'me'],
      updatedAt: at(1000),
    });
    const r = mealsFor([mine, theirs], 'me', '2026-09-10', lunch, T0);
    assert.equal(r.live?.id, theirs.id);
    assert.equal(r.own?.id, mine.id);
  });

  it('起駕過的那一餐，時間到了也記得吃過了', () => {
    const d = meal({
      status: 'decided',
      picks: [pick('a')],
      cands: ['a'],
      decision: { rid: 'a', by: 'me', at: at(0) },
    });
    const r = mealsFor([d], 'me', '2026-09-10', lunch, T0 + MEAL_MS);
    assert.equal(r.live, null);
    assert.equal(r.done?.id, d.id);
  });

  it('別的餐別、別天的不算', () => {
    const tea = meal({ id: '2026-09-10_tea_me', slot: { key: 'tea', label: '下午茶' } });
    const yesterday = meal({ id: '2026-09-09_lunch_me', date: '2026-09-09' });
    const r = mealsFor([tea, yesterday], 'me', '2026-09-10', lunch, T0);
    assert.deepEqual(r, { live: null, done: null, own: null });
  });
});
