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
  picks,
  skipped,
  hint = true,
  past = false,
}: {
  meal: Meal;
  /** 點一支翻開；沒給就只是攤開來看（食籤簿） */
  onOpen?: (rid: string) => void;
  /** 籤卡現在翻開的那一支 */
  active?: string;
  /** 要攤的籤，預設是這一餐還能選的候選；食籤簿連去不了的也攤出來 */
  picks?: MealPick[];
  /** 這支被說過去不了：牌面褪色、蓋一個小牌（寫原因，沒有原因就寫「去不了」）；沒去不了回 false */
  skipped?: (rid: string) => string | false;
  /** 上面那行「幾支、怎麼用」 */
  hint?: boolean;
  /** 已經過去的一餐（食籤簿）：點得開，但不標「最新」 */
  past?: boolean;
}) {
  const { theme } = useTheme();
  const { copy } = theme;
  const { restaurantMap, memberMap } = useAppData();
  const cands = picks ?? candidatesOf(meal);
  if (!cands.length) return null;
  // 「最新」只在還能挑的時候標
  const latest = onOpen && !past ? cands.at(-1)?.rid : undefined;
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
      {hint && (
        <p className="cands__hint">
          <span className="cands__count" aria-label={`${cands.length} 支`}>
            {cands.length}
          </span>
          {copy.meal.candsHint}
        </p>
      )}
      <ol className="cands__row">
        {cands.map((p, i) => {
          const l = label(p);
          const who = memberMap.get(p.by);
          const isChosen = p.rid === chosen;
          const isLatest = p.rid === latest && !chosen;
          const skipLabel = isChosen ? false : (skipped?.(p.rid) ?? false);
          const isSkipped = !!skipLabel;
          const cls = `cand${isLatest ? ' is-latest' : ''}${isChosen ? ' is-chosen' : ''}${isSkipped ? ' is-skipped' : ''}${p.rid === active ? ' is-active' : ''}`;
          const aria = `${l.no} ${l.name}${isChosen ? `，${copy.finalSeal}` : isSkipped ? `，${skipLabel}` : isLatest ? `，${copy.meal.latest}` : ''}`;
          const face = (
            <>
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
              {isSkipped && (
                <span className="cand__skip" aria-hidden="true">
                  <theme.Glyph name="closed" size={14} />
                  {skipLabel}
                </span>
              )}
            </>
          );
          return (
            <li key={p.rid} style={{ '--i': i } as CSSProperties}>
              {onOpen ? (
                <button
                  type="button"
                  className={cls}
                  aria-current={p.rid === active ? 'true' : undefined}
                  onClick={() => onOpen(p.rid)}
                  aria-label={aria}
                >
                  {face}
                </button>
              ) : (
                <div className={`${cls} is-still`} role="img" aria-label={aria}>
                  {face}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
