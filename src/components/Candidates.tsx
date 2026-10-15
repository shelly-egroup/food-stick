'use client';

import type { CSSProperties } from 'react';
import { useAppData } from '@/lib/appData';
import { candidatesOf, modeOf, type Meal, type MealPick } from '@/lib/meal';
import { readingOf } from '@/lib/verse';
import { categoryOf } from '@/lib/types';
import { useTheme } from '@/themes';
import { Avatar } from './Avatar';
import { LineIcon } from './CategoryIcon';
import { Seal } from './Seal';
import './Candidates.css';

/**
 * 這一餐的候選：抽到過、還能選的店。
 * 廟宇是供桌上一排竹籤（籤頭朱紅、店名直書），魔法是攤開的一排預言牌（燙金框、羅馬數字）。
 * 點一支就翻開那支籤卡；最新抽到的微微抬起，起駕的那支蓋上定案章，籤卡現在翻開的那支有一圈框。
 */
export function Candidates({
  meal,
  onOpen,
  active,
}: {
  meal: Meal;
  onOpen: (rid: string) => void;
  /** 籤卡現在翻開的那一支 */
  active?: string;
}) {
  const { theme } = useTheme();
  const { copy } = theme;
  const { restaurantMap, memberMap } = useAppData();
  const cands = candidatesOf(meal);
  if (!cands.length) return null;
  const latest = cands.at(-1)?.rid;
  const chosen = meal.decision?.rid;
  const mode = modeOf(meal);

  const label = (p: MealPick) => {
    const r = restaurantMap.get(p.rid);
    return {
      name: r?.name ?? p.name,
      no: r ? readingOf(theme, r, p, mode).numberText : '',
      icon: r ? categoryOf(r.category).icon : categoryOf('other').icon,
    };
  };

  return (
    <section className={`cands cands--${theme.id}`} aria-label={copy.meal.cands}>
      {/* 標題由外面的彈窗寫，這裡只寫幾支、怎麼用 */}
      <p className="cands__hint">
        <span className="cands__count" aria-label={`${cands.length} 支`}>
          {cands.length}
        </span>
        {copy.meal.candsHint}
      </p>
      <ol className="cands__row">
        {cands.map((p, i) => {
          const l = label(p);
          const who = memberMap.get(p.by);
          const isChosen = p.rid === chosen;
          const isLatest = p.rid === latest && !chosen;
          return (
            <li key={p.rid} style={{ '--i': i } as CSSProperties}>
              <button
                type="button"
                className={`cand${isLatest ? ' is-latest' : ''}${isChosen ? ' is-chosen' : ''}${p.rid === active ? ' is-active' : ''}`}
                aria-current={p.rid === active ? 'true' : undefined}
                onClick={() => onOpen(p.rid)}
                aria-label={`${l.no} ${l.name}${isChosen ? `，${copy.finalSeal}` : isLatest ? `，${copy.meal.latest}` : ''}`}
              >
                <span className="cand__tip" aria-hidden="true">
                  <LineIcon d={l.icon} size={18} />
                </span>
                <span className="cand__no" aria-hidden="true">
                  {l.no}
                </span>
                <span className="cand__name" aria-hidden="true">
                  {l.name}
                </span>
                {mode === 'group' && who && (
                  <span className="cand__by" aria-hidden="true">
                    <Avatar member={who} size={20} />
                  </span>
                )}
                {isLatest && (
                  <span className="cand__new" aria-hidden="true">
                    {copy.meal.latest}
                  </span>
                )}
                {isChosen && (
                  <span className="cand__seal" aria-hidden="true">
                    <Seal text={copy.finalSeal} size={34} rotate={-10} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
