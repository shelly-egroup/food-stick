import type { CSSProperties } from 'react';

/**
 * 朱紅印章。solid＝白字紅底（陰刻），outline＝紅字紅框（陽刻）。
 * 版畫風：乾淨的平面色塊，不做粗糙邊。
 */
export function Seal({
  text,
  size = 40,
  variant = 'solid',
  rotate = 0,
  label,
  className,
  style,
  color = 'var(--vermilion)',
}: {
  text: string;
  size?: number;
  variant?: 'solid' | 'outline';
  rotate?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
  color?: string;
}) {
  const chars = [...text];
  const two = chars.length === 2;
  const fs = two ? 32 : 54;
  const solid = variant === 'solid';
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined, flex: 'none', overflow: 'visible', ...style }}
    >
      {solid ? (
        <>
          <rect x="4" y="4" width="72" height="72" rx="5" fill={color} stroke="#26211d" strokeWidth="2" />
          <rect x="10" y="10" width="60" height="60" rx="3" fill="none" stroke="var(--paper-hi)" strokeWidth="2" />
        </>
      ) : (
        <>
          <rect x="6" y="6" width="68" height="68" rx="5" fill="var(--paper-hi)" stroke={color} strokeWidth="5" />
        </>
      )}
      {chars.map((ch, i) => (
        <text
          key={i}
          x="40"
          y={two ? 23 + i * 34 : 42}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--f-display)"
          fontWeight="900"
          fontSize={fs}
          fill={solid ? 'var(--paper-hi)' : color}
        >
          {ch}
        </text>
      ))}
    </svg>
  );
}
