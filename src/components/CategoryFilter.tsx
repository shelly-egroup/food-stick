import { CATEGORIES, type CategoryId } from '@/lib/types';
import { CategoryIcon } from './CategoryIcon';
import './CategoryFilter.css';

/**
 * 店的類型：每一格一個小圖加名字。手機排成四欄兩列，不用往旁邊滑；電腦排成一排。
 * 篩選時可以多選（一個都沒選＝全部）；新增、修改店家時用 single，只能選一個。
 */
export function CategoryFilter({
  selected,
  onToggle,
  label = '類型（可多選）',
  single = false,
}: {
  selected: CategoryId[];
  onToggle: (id: CategoryId) => void;
  label?: string;
  single?: boolean;
}) {
  return (
    <div className="catgrid" role={single ? 'radiogroup' : 'group'} aria-label={label}>
      {CATEGORIES.map((c) => {
        const on = selected.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            className="chip catgrid__chip"
            role={single ? 'radio' : undefined}
            aria-checked={single ? on : undefined}
            aria-pressed={single ? undefined : on}
            onClick={() => onToggle(c.id)}
          >
            <CategoryIcon id={c.id} />
            <span>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
