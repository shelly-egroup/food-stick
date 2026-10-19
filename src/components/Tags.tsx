import type { ReactNode } from 'react';
import { stateOf, type Meal, type MateState } from '@/lib/meal';
import { useTheme } from '@/themes';
import './Tags.css';

/**
 * 一排小標籤：取代「A・B・C」這種用點隔開的字。每一個是一顆有底色的小牌子，前面可以放小圖。
 * tone：accent 主題色（廟宇朱紅、魔法鈷藍）、soft 淡底、line 虛線框（還沒定的事）
 */
export function Tags({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`tags${className ? ` ${className}` : ''}`}>{children}</span>;
}

export function Tag({
  icon,
  tone = 'soft',
  children,
}: {
  icon?: ReactNode;
  tone?: 'accent' | 'soft' | 'line';
  children: ReactNode;
}) {
  return (
    <span className={`tag tag--${tone}`}>
      {icon}
      {children}
    </span>
  );
}

const TONE: Record<MateState, 'accent' | 'soft' | 'line'> = { in: 'accent', wait: 'line', out: 'soft' };
const ORDER: MateState[] = ['in', 'wait', 'out'];

/** 大家的回覆：幾人要去、幾人還沒回、幾人改天（一個數字章＋一個字） */
export function Tally({ meal, skip }: { meal: Meal; skip?: string }) {
  const { copy } = useTheme().theme;
  const t: Record<MateState, number> = { in: 0, wait: 0, out: 0 };
  meal.party.forEach((u) => u !== skip && (t[stateOf(meal, u)] += 1));
  return (
    <Tags className="tally">
      <span className="sr-only">{copy.crew.tally(t.in, t.wait, t.out)}</span>
      {ORDER.filter((k) => t[k] > 0).map((k) => (
        <Tag key={k} tone={TONE[k]} icon={<b className="tag__n">{t[k]}</b>}>
          <span aria-hidden="true">{copy.meal.mark[k]}</span>
        </Tag>
      ))}
    </Tags>
  );
}
