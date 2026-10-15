import { CATEGORIES, WALKS, type CategoryId, type Walk } from '@/lib/types';
import { LineIcon } from './CategoryIcon';
import './CategoryFilter.css';

interface Option<T> {
  v: T;
  label: string;
  icon: string;
}

/**
 * 一格一個小圖加名字。手機排成四欄，不用往旁邊滑；電腦排成一排。
 * 篩選時可以多選（一個都沒選＝全部）；新增、修改店家時用 single，只能選一個。
 */
function ChipGrid<T extends string | number>({
  options,
  selected,
  onToggle,
  label,
  single,
  className = '',
}: {
  options: Option<T>[];
  selected: T[];
  onToggle: (v: T) => void;
  label: string;
  single: boolean;
  className?: string;
}) {
  return (
    <div className={`catgrid ${className}`} role={single ? 'radiogroup' : 'group'} aria-label={label}>
      {options.map((o) => {
        const on = selected.includes(o.v);
        return (
          <button
            key={o.v}
            type="button"
            className="chip catgrid__chip"
            role={single ? 'radio' : undefined}
            aria-checked={single ? on : undefined}
            aria-pressed={single ? undefined : on}
            onClick={() => onToggle(o.v)}
          >
            <LineIcon d={o.icon} />
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ v: c.id, label: c.label, icon: c.icon }));
const WALK_OPTIONS = WALKS.map((w) => ({ v: w.v, label: w.label, icon: w.icon }));

/** 店的類型 */
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
  return <ChipGrid options={CATEGORY_OPTIONS} selected={selected} onToggle={onToggle} label={label} single={single} />;
}

/** 從公司走過去要多久 */
export function WalkFilter({
  selected,
  onToggle,
  label = '步行（可多選）',
  single = false,
}: {
  selected: Walk[];
  onToggle: (v: Walk) => void;
  label?: string;
  single?: boolean;
}) {
  return (
    <ChipGrid
      options={WALK_OPTIONS}
      selected={selected}
      onToggle={onToggle}
      label={label}
      single={single}
      className="catgrid--walk"
    />
  );
}
