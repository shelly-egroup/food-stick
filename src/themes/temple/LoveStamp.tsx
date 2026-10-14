import type { LoveStampProps } from '../types';

/** 印泥的顏色：比主色朱紅再沉一點，像蓋在紙上的御璽 */
const PASTE = '#b3301e';
const PAPER = '#fff6ea';

/**
 * 愛店章：仿古代皇帝御璽的方形朱印，白文「欽點愛店」四字（右起直讀）。
 * 質感來自刻痕與印泥濃淡，不用雜點紋理。
 */
export function LoveStamp({ size, className, label }: LoveStampProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ overflow: 'visible', flex: 'none' }}
    >
      <g transform="rotate(-6 40 40)">
        {/* 印泥微微暈開的邊 */}
        <path d="M5.4 6.6 L74.6 5.2 L75.4 74.6 L5 75.6 Z" fill={PASTE} opacity="0.28" />
        {/* 印面：不是完美的正方形，像手刻的石章 */}
        <path d="M6.6 7.4 L73.4 6.2 L74.2 73.6 L6.2 74.4 Z" fill={PASTE} />
        {/* 印泥濃淡：蓋章時沒壓勻的地方稍微淡一點 */}
        <path d="M44 8 C 58 9, 70 14, 72 26 C 66 22, 56 18, 44 16 Z" fill="#c9442f" opacity="0.7" />
        <path d="M8 52 C 12 62, 20 70, 32 72 C 24 66, 16 60, 9 50 Z" fill="#c9442f" opacity="0.6" />
        {/* 內框 */}
        <path
          d="M11.8 12.2 L68.4 11.6 L68.8 68.4 L11.4 68.8 Z"
          fill="none"
          stroke={PAPER}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* 白文四字：右上欽、右下點、左上愛、左下店 */}
        <g
          fill={PAPER}
          fontFamily="var(--f-display)"
          fontWeight="900"
          fontSize="23"
          textAnchor="middle"
          dominantBaseline="central"
        >
          <text x="54.4" y="26.6">
            欽
          </text>
          <text x="54.4" y="54.4">
            點
          </text>
          <text x="25.8" y="26.6">
            愛
          </text>
          <text x="25.8" y="54.4">
            店
          </text>
        </g>
        {/* 石章邊緣的小缺口 */}
        <g fill={PAPER}>
          <path d="M73.6 30 L70.8 31.4 L73.8 33.2 Z" />
          <path d="M22 74.4 L23.6 71.6 L25.6 74.3 Z" />
          <path d="M6.4 18 L9 19.2 L6.3 20.6 Z" />
        </g>
      </g>
    </svg>
  );
}
