'use client';

import { useRef, useState } from 'react';
import { SLOTS, SLOT_MAX, customSlot, sameSlot, slotFrom, slotIcon, type Slot } from '@/lib/meal';
import { usePersisted } from '@/lib/usePersisted';
import { LineIcon } from './CategoryIcon';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import './SlotPicker.css';

/** 常用的自己寫的餐別最多留幾個 */
const SAVED_MAX = 4;
const NONE: Slot[] = [];
const cleanSaved = (v: unknown): Slot[] =>
  Array.isArray(v)
    ? v
        .map(slotFrom)
        .filter((x): x is Slot => !!x && x.key === 'custom')
        .slice(0, SAVED_MAX)
    : NONE;

/**
 * 哪一餐：預設午餐，也可以挑早餐、下午茶、晚餐、宵夜，或自己寫（最多 8 個字）。
 * 自己寫完會問要不要加進常用：加了之後跟內建的餐別排在一起，下次直接點（右上角的 × 可以拿掉）。
 * 廟宇像一排掛著的時辰木牌，魔法像天上的日月星辰；選中的那一塊亮起來。
 */
export function SlotPicker({
  value,
  onChange,
  locked = false,
}: {
  value: Slot;
  onChange: (s: Slot) => void;
  /** 這一餐已經開了：餐別不能換（看得到、不能點） */
  locked?: boolean;
}) {
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = usePersisted('lunchstick:slots', NONE, cleanSaved);
  // 自己寫、但沒有加進常用的那一餐，才顯示在「自己寫」那一塊上
  const custom = value.key === 'custom' && !saved.some((x) => sameSlot(x, value)) ? value : null;
  // 剛寫好、等著問要不要加進常用的那一餐
  const [asking, setAsking] = useState<Slot | null>(null);

  const commit = () => {
    if (!writing) return;
    const s = customSlot(text);
    setWriting(false);
    if (!s) return;
    if (s.key !== 'custom' || saved.some((x) => sameSlot(x, s))) return onChange(s);
    setAsking(s);
  };
  const answer = (keep: boolean) => {
    if (!asking) return;
    if (keep) setSaved((list) => [...list.filter((x) => !sameSlot(x, asking)), asking].slice(-SAVED_MAX));
    onChange(asking);
    setAsking(null);
  };
  const forget = (s: Slot) => {
    setSaved((list) => list.filter((x) => !sameSlot(x, s)));
    // 拿掉的剛好是現在選的：回到預設的午餐
    if (sameSlot(s, value)) onChange({ key: 'lunch', label: '午餐' });
  };

  return (
    <div className={`meal-slots${locked ? ' is-locked' : ''}`} role="radiogroup" aria-label="哪一餐">
      {SLOTS.map((s) => {
        const on = sameSlot(s, value);
        return (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={locked && !on}
            className={`meal-slot${on ? ' is-on' : ''}`}
            onClick={() => !locked && onChange({ key: s.key, label: s.label })}
          >
            <LineIcon d={s.icon} size={18} />
            <span>{s.label}</span>
          </button>
        );
      })}
      {saved.map((s) => {
        const on = sameSlot(s, value);
        return (
          <span key={s.label} className="meal-slot-saved">
            <button
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={locked && !on}
              className={`meal-slot is-saved${on ? ' is-on' : ''}`}
              onClick={() => !locked && onChange(s)}
            >
              <LineIcon d={slotIcon(s)} size={18} />
              <span>{s.label}</span>
            </button>
            {!locked && (
              <button
                type="button"
                className="meal-slot__forget"
                onClick={() => forget(s)}
                aria-label={`把「${s.label}」從常用拿掉`}
              >
                <Icon name="plus" size={12} />
              </button>
            )}
          </span>
        );
      })}
      {/* 最後一塊：自己寫。寫過（沒加進常用）就顯示寫的那一餐（亮起來），點了可以改寫；寫的時候輸入框佔一整排 */}
      {writing ? (
        <form
          className="meal-slot meal-slot--write"
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
        >
          <LineIcon d={slotIcon({ key: 'custom', label: '' })} size={18} />
          <input
            ref={input}
            value={text}
            maxLength={SLOT_MAX * 2}
            placeholder="加班餐"
            aria-label={`自己寫哪一餐（最多 ${SLOT_MAX} 個字）`}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Escape' && setWriting(false)}
          />
        </form>
      ) : (
        <button
          type="button"
          role="radio"
          aria-checked={!!custom}
          aria-disabled={locked && !custom}
          title={custom ? `${custom.label}（點了可以改寫）` : undefined}
          className={`meal-slot${custom ? ' is-on is-custom' : ' meal-slot--add'}`}
          onClick={() => {
            if (locked) return;
            setText(custom?.label ?? '');
            setWriting(true);
            requestAnimationFrame(() => input.current?.focus());
          }}
        >
          <LineIcon d={slotIcon(custom ?? { key: 'custom', label: '' })} size={18} />
          <span>{custom ? custom.label : '自己寫'}</span>
        </button>
      )}
      <Sheet
        open={!!asking}
        onClose={() => answer(false)}
        eyebrow="自己寫的餐別"
        title={`「${asking?.label ?? ''}」要加進常用嗎？`}
        icon={<LineIcon d={slotIcon({ key: 'custom', label: '' })} size={40} />}
      >
        <p className="meal-slot-ask__hint">
          加進常用之後，下次跟早餐、午餐排在一起，直接點就好；只用這次的話，下次要再寫一次。
        </p>
        <div className="meal-slot-ask">
          <button type="button" className="btn btn--zhu" onClick={() => answer(true)}>
            加進常用
          </button>
          <button type="button" className="btn btn--line" onClick={() => answer(false)}>
            只用這次
          </button>
        </div>
      </Sheet>
    </div>
  );
}
