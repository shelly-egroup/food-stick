'use client';

import { useRef, useState } from 'react';
import { SLOTS, SLOT_MAX, customSlot, sameSlot, slotIcon, type Slot } from '@/lib/meal';
import { LineIcon } from './CategoryIcon';
import './SlotPicker.css';

/**
 * 哪一餐：預設午餐，也可以挑早餐、下午茶、晚餐、宵夜，或自己寫（最多 8 個字）。
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
  const custom = value.key === 'custom' ? value : null;

  const commit = () => {
    const s = customSlot(text);
    setWriting(false);
    if (s) onChange(s);
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
      {/* 第六塊：自己寫。寫過就顯示寫的那一餐（亮起來），點了可以改寫；寫的時候輸入框佔一整排 */}
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
    </div>
  );
}
