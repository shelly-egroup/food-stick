import { chime, gong, gongTap } from '@/lib/sound';
import type { Theme } from '../types';
import { copy } from './copy';
import { read } from './reading';
import { rites } from './rites';
import { Facade } from './Facade';
import { StageFloor, StageTop } from './Stage';
import { Incense } from './Incense';
import { Emblem } from './Emblem';
import { CardSeal } from './CardSeal';
import { DateStamp } from './DateStamp';
import { LoveStamp } from './LoveStamp';
import { LoveSlot } from './LoveSlot';
import { Podium } from './Podium';
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

/** 台灣廟宇：入廟開朱門、搖籤筒、抽直書籤詩 */
export const temple: Theme = {
  id: 'temple',
  copy,
  tabIcon: 'stick',
  tabIcons: { shops: 'hang', history: 'ledger', ranks: 'board' },
  sound: chime,
  departFx,
  heraldSound: gong,
  heraldTap: (news) => (news ? gong() : gongTap()),
  Emblem,
  LoveStamp,
  DateStamp,
  LoveSlot,
  Podium,
  CrewBanner,
  Glyph,
  Badge,
  Vignette,
  PriceMark,
  drawShare,
  ShopCard,
  Loader: Incense,
  Facade,
  rites,
  StageTop,
  StageFloor,
  read,
  card: { className: 'card--slip', vertical: true, deckle: true, Seal: CardSeal, sealTilt: -8 },
  tap: { count: 4 },
};
