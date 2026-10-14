import type { DrawMode, Restaurant } from '@/lib/types';
import type { Reading } from '../types';
import { toChineseNumber } from '@/lib/format';
import { compose, pick, rollGrade, rollNumber, type Grade, type Rand, type Verses } from '../reading';

/** 書桌上的兩個法器 */
export type Artifact = 'book' | 'ball';

export const VERSES: Verses = {
  opening: {
    rice: ['米粒閃耀如星辰', '白飯一碗魔力滿', '金黃滷汁化咒語'],
    noodle: ['麵條如河繞指間', '熱湯沸騰召元氣', '一碗咒麵解千愁'],
    bento: ['方盒封印百味藏', '雞腿現身於盒中', '便當咒語保飽足'],
    snack: ['街角小吃施幻術', '小盤之中藏驚喜', '香氣漂浮引路來'],
    world: ['異國風味越海來', '香料魔陣已啟動', '遠方滋味傳送到'],
    light: ['青菜精靈輕如羽', '身輕如燕好施法', '清爽咒語淨身心'],
    brunch: ['晨光魔法延到午', '蛋與吐司成雙咒', '咖啡香氣喚精神'],
    other: ['未知之味待探索', '命運之輪轉向它', '隨機咒語正生效'],
  },
  walk: {
    5: ['三步之內瞬移到', '近在眼前不費力'],
    10: ['十分路程踩星光', '散步一程剛剛好'],
    15: ['多走幾步魔力增', '穿過巷弄見光芒'],
    20: ['長途跋涉值得去', '遠方召喚莫遲疑'],
  },
  price: {
    1: ['銅板也能換魔力', '錢袋安穩不減輕'],
    2: ['金幣花得剛剛好', '物超所值魔法價'],
    3: ['犒賞自己施大咒', '今日豪華魔法宴'],
  },
  closing: {
    solo: ['午後施法不打盹', '下午魔力滿格中', '獨行巫師也快樂'],
    group: ['巫師同桌魔力強', '眾人結陣不爭吵', '同伴同心咒更靈'],
  },
};

const PROPHECIES: Record<Artifact, string[]> = {
  book: ['魔法書已翻到這一頁，出發吧。', '書上寫得清清楚楚，就是這家。', '咒語生效，不要再猶豫了。'],
  ball: ['水晶球看見了你的午餐。', '球裡的光指向這家，跟著走吧。', '預言已定，肚子會感謝你。'],
};

const RARITIES: Grade[] = [
  { seal: '傳說', name: '傳說級預言', weight: 30 },
  { seal: '史詩', name: '史詩級預言', weight: 30 },
  { seal: '稀有', name: '稀有預言', weight: 25 },
  { seal: '神秘', name: '神秘預言', weight: 15 },
];

/** 魔法版：預言卡。variant 是揭曉的法器，魔法書寫「第幾頁」，水晶球寫「第幾道預言」 */
export function read(r: Restaurant, mode: DrawMode, variant?: string, rand: Rand = Math.random): Reading {
  const artifact: Artifact = variant === 'ball' ? 'ball' : 'book';
  const number = rollNumber(rand);
  const grade = rollGrade(RARITIES, rand);
  const n = toChineseNumber(number);
  const numberText = artifact === 'book' ? `第${n}頁` : `第${n}道預言`;
  return {
    number,
    numberText,
    grade,
    lines: compose(VERSES, r, mode, rand),
    verdict: pick(PROPHECIES[artifact], rand),
    brand: artifact === 'ball' ? '水晶球預言' : '午餐魔法書',
    shareHead: `${artifact === 'ball' ? '水晶球' : '魔法書'}給了${numberText}・${grade.name}`,
    variant: artifact,
  };
}
