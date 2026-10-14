'use client';

import { useTheme } from '@/themes';
import './Loading.css';

/**
 * 等資料的時候：用主題自己的小儀式（點香、星芒），不顯示「讀取中」這類文字。
 * 很快就讀到的話根本不會出現（淡入有延遲），不會閃一下。
 */
export function Loading({
  size = 44,
  label = '讀取中',
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  const { theme } = useTheme();
  return (
    <div className={`loading${className ? ` ${className}` : ''}`} role="status">
      <theme.Loader size={size} label={label} />
    </div>
  );
}
