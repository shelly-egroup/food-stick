import { INK } from './ink';
import './Say.css';

/**
 * 小動物頭上冒出來的對話框（喵～、咕？）。座標是 SVG 單位，(x, y) 是尾巴尖端。
 * 換一句話就換一個 key 重新掛上去，CSS 動畫會從頭播：彈出來、停一下、淡掉。
 */
export function Say({ text, x = 0, y = 0, angry = false }: { text: string; x?: number; y?: number; angry?: boolean }) {
  const w = 16 + [...text].length * 14;
  return (
    <g className={`say${angry ? ' say--angry' : ''}`} transform={`translate(${x} ${y})`} aria-hidden="true">
      <g className="say__pop">
        <path
          d={`M${-w / 2} -32 h${w} a5 5 0 0 1 5 5 v14 a5 5 0 0 1 -5 5 h${-(w / 2 - 6)} l-6 8 l-1 -8 h${-(w / 2 - 1)} a5 5 0 0 1 -5 -5 v-14 a5 5 0 0 1 5 -5 Z`}
          fill="var(--paper-hi)"
          stroke={INK}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <text x="0" y="-20" textAnchor="middle" dominantBaseline="central" className="say__text">
          {text}
        </text>
      </g>
    </g>
  );
}
