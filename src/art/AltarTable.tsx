import { INK } from './ink';
import './art.css';

/** 供桌：桌面、朱紅桌裙（金色框）、桌腳與桌下陰影 */
export function AltarTable({
  x0,
  x1,
  top,
  label,
  apron = 'var(--vermilion)',
}: {
  x0: number;
  x1: number;
  top: number;
  label?: string;
  apron?: string;
}) {
  const w = x1 - x0;
  return (
    <g>
      <rect x={x0} y={top} width={w} height="16" fill={INK} />
      <rect x={x0 + 16} y={top + 16} width={w - 32} height="58" fill={apron} stroke={INK} strokeWidth="1.5" />
      <rect
        x={x0 + 28}
        y={top + 25}
        width={w - 56}
        height="40"
        fill="none"
        stroke="var(--marigold)"
        strokeWidth="1.4"
      />
      {label && (
        <text x={x0 + w / 2} y={top + 46} textAnchor="middle" dominantBaseline="central" className="altar-label">
          {label}
        </text>
      )}
      <rect x={x0 + 26} y={top + 74} width="18" height="60" fill={INK} />
      <rect x={x1 - 44} y={top + 74} width="18" height="60" fill={INK} />
    </g>
  );
}
