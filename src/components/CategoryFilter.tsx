import type { ReactNode } from 'react';
import { CATEGORIES, WALKS, type CategoryId, type Walk } from '@/lib/types';
import { LineIcon } from './CategoryIcon';
import './CategoryFilter.css';

/** 篩選各列標題前面的小圖：類型是一碗飯、價位是一枚古錢、步行是兩個腳印 */
export const ROW_ICONS = {
  category:
    'M3.5 12h17a8.5 8 0 0 1-17 0ZM6 12c.4-3.2 3-5 6-5s5.6 1.8 6 5M9 4.5c.8.8.8 1.7 0 2.5M13 3.5c.8.8.8 1.7 0 2.5',
  price: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM9.6 9.6h4.8v4.8H9.6Z',
  walk: WALKS[1].icon,
  /** 重抽次數：廟宇是一炷冒煙的香，魔法是一顆放在座上的水晶球 */
  stock: 'M12 21V10.5M8.5 21h7M12 10.5c-1.7-1.5-1.7-3 0-4.5s1.7-3 0-4.5',
  orb: 'M12 3.5a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM8 20.5h8l-1.5-3h-5ZM9 8.5c.6-1 1.5-1.6 2.6-1.8',
} as const;

/**
 * 篩選的一列：左邊（手機在上面）是有小圖的標題，右邊是那一列的選項。
 * 一眼看得出每一排在選什麼，不會一整片按鈕擠在一起。
 */
export function FilterRow({
  icon,
  title,
  hint,
  children,
}: {
  icon: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="filter-row">
      <p className="filter-row__label">
        <LineIcon d={icon} size={18} />
        <b>{title}</b>
        {hint && <small>{hint}</small>}
      </p>
      {children}
    </div>
  );
}

interface Option<T> {
  v: T;
  label: string;
  icon: string;
}

/**
 * 一格一個小圖加名字。手機上小圖在上、名字在下，類型排成兩排、步行一排，不用往旁邊滑；電腦排成一排。
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
