'use client';

import { MAX_REROLLS } from '@/lib/meal';
import { useTheme } from '@/themes';
import './SlotPicker.css';

/**
 * 這一餐可以重抽幾次（第一支不算）：0 到 5，跟「哪一餐」一樣排成一排六塊牌子。
 * 發起人開單前決定，開了之後大家共用、不能再改（看得到、不能點）。
 */
export function StockPicker({
  value,
  onChange,
  locked = false,
}: {
  value: number;
  onChange: (n: number) => void;
  locked?: boolean;
}) {
  const s = useTheme().theme.copy.meal.stock;
  return (
    <div className={`meal-slots meal-slots--stock${locked ? ' is-locked' : ''}`} role="radiogroup" aria-label={s.title}>
      {Array.from({ length: MAX_REROLLS + 1 }, (_, n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-disabled={locked && n !== value}
          className={`meal-slot meal-stock${n === value ? ' is-on' : ''}`}
          onClick={() => !locked && onChange(n)}
        >
          {n ? (
            <>
              <b>{n}</b>
              <span>{s.unit}</span>
            </>
          ) : (
            <span className="meal-stock__none">{s.none}</span>
          )}
        </button>
      ))}
    </div>
  );
}
