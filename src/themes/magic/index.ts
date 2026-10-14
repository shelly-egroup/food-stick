import { owlHoot, sparkle, twinkle } from '@/lib/sound';
import type { Theme } from '../types';
import { copy } from './copy';
import { read } from './reading';
import { rites } from './rites';
import { Facade } from './Facade';
import { StageFloor, StageTop } from './Stage';
import { Orb } from './Orb';
import { Emblem } from './Emblem';
import { CardSeal } from './CardSeal';
import { LoveStamp } from './LoveStamp';
import { LoveSlot } from './LoveSlot';
import { StarChart } from './StarChart';
import { CrewBanner } from './CrewBanner';
import { Glyph } from './Glyph';
import { Badge } from './Badge';
import { Vignette } from './Vignette';
import { PriceMark } from './PriceMark';
import { drawShare } from './share';
import { ShopCard } from './ShopCard';
import { departFx } from './departFx';
import './theme.css';
import './card.css';

/** 魔法：喚醒水晶球進門、在書桌上施法，魔法書或水晶球隨機揭曉預言卡 */
export const magic: Theme = {
  id: 'magic',
  copy,
  tabIcon: 'sparkle',
  tabIcons: { shops: 'book', ranks: 'chart' },
  sound: sparkle,
  departFx,
  heraldSound: () => {
    owlHoot(1.1);
    setTimeout(() => twinkle(5), 420);
  },
  Emblem,
  LoveStamp,
  LoveSlot,
  Podium: StarChart,
  CrewBanner,
  Glyph,
  Badge,
  Vignette,
  PriceMark,
  drawShare,
  ShopCard,
  Loader: Orb,
  Facade,
  rites,
  StageTop,
  StageFloor,
  read,
  card: { className: 'card--spell', vertical: false, deckle: false, Seal: CardSeal, sealTilt: 0 },
  tap: { count: 5, glyphs: ['✦', '✧'] },
};
