import type { DrawMode, Restaurant } from '@/lib/types';
import type { Reading } from '../types';
import { toChineseNumber } from '@/lib/format';
import { compose, pick, rollGrade, rollNumber, type Grade, type Rand, type Verses } from '../reading';

export const VERSES: Verses = {
  opening: {
    rice: ['一碗白飯香四溢', '粒粒皆是好運來', '滷汁淋飯福滿盈'],
    noodle: ['一碗熱湯暖心頭', '麵條綿長福亦長', '湯頭濃郁運勢旺'],
    bento: ['便當一盒樣樣全', '主菜配菜皆圓滿', '排骨雞腿任你挑'],
    snack: ['巷口小吃最對味', '小小一盤滋味大', '台灣味道暖人心'],
    world: ['異國風味遠方來', '不出國門也環遊', '香料一灑精神振'],
    light: ['清爽一餐身輕盈', '青菜蛋白顧健康', '吃得輕巧步步高'],
    brunch: ['晨光午後皆相宜', '一盤早午慢慢享', '蛋香吐司配咖啡'],
    other: ['今日不走尋常路', '隨緣一食得驚喜', '有緣自會遇美味'],
  },
  walk: {
    5: ['三步之遙福自來', '近在咫尺不用趕'],
    10: ['散步十分剛剛好', '走走路來消消食'],
    15: ['多行幾步更開胃', '路遠方知滋味深'],
    20: ['遠道而來誠意足', '千里迢迢為一餐'],
  },
  price: {
    1: ['小錢也能吃得飽', '錢包安穩心不慌'],
    2: ['花得剛好不心疼', '價格實在品質佳'],
    3: ['偶爾犒賞也應當', '今日破費福加倍'],
  },
  closing: {
    solo: ['午後開會不打盹', '下午工作有精神', '一人獨享自在心'],
    group: ['呼朋引伴同歡喜', '同事同桌情更濃', '眾人同心不吵架'],
  },
};

const VERDICTS = [
  '此籤大吉，聽神明的就對了。',
  '選擇困難到此為止，出發吧。',
  '肚子已經等不及了。',
  '別再滑手機了，神明都幫你選好了。',
  '吃飽了，下午才有力氣。',
];

const GRADES: Grade[] = [
  { seal: '上上', name: '上上籤', weight: 30 },
  { seal: '大吉', name: '大吉籤', weight: 30 },
  { seal: '上吉', name: '上吉籤', weight: 25 },
  { seal: '中吉', name: '中吉籤', weight: 15 },
];

/** 廟宇版：直書籤詩 */
export function read(r: Restaurant, mode: DrawMode, _variant?: string, rand: Rand = Math.random): Reading {
  const number = rollNumber(rand);
  const grade = rollGrade(GRADES, rand);
  const numberText = `第${toChineseNumber(number)}籤`;
  return {
    number,
    numberText,
    grade,
    lines: compose(VERSES, r, mode, rand),
    verdict: pick(VERDICTS, rand),
    brand: '食神靈籤',
    shareHead: `抽到${numberText}・${grade.name}`,
  };
}
