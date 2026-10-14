'use client';

import { THEME_IDS, type ThemeId } from './ids';
import { THEMES } from './registry';
import { useTheme } from './ThemeProvider';
import './ThemeSwitch.css';

/** 主題切換。compact 用在入口，完整版用在設定裡；onPick：選了之後要做的事（設定裡選完就關起來） */
export function ThemeSwitch({ compact = false, onPick }: { compact?: boolean; onPick?: (id: ThemeId) => void }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={`theme-switch${compact ? ' theme-switch--compact' : ''}`} role="radiogroup" aria-label="風格">
      {THEME_IDS.map((id) => {
        const { copy, Emblem } = THEMES[id];
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={theme.id === id}
            data-theme={id}
            className="theme-switch__opt"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setTheme(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
              onPick?.(id);
            }}
          >
            <span className="theme-switch__icon" aria-hidden="true">
              <Emblem />
            </span>
            <span className="theme-switch__text">
              <b>{copy.label}</b>
              {!compact && <i>{copy.place}</i>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
