import { useId, type ReactNode } from 'react';
import { INK } from '@/art/ink';
import type { VignetteProps } from '../types';
import { copy } from './copy';
import { BookStack, Owl } from './parts';
import './Vignette.css';

const SPARK = (x: number, y: number, r: number) =>
  `M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`;

/** 還沒有紙條：攤開的空白羊皮紙卷，旁邊一瓶墨水和羽毛筆，星光一閃一閃 */
function Scroll() {
  return (
    <>
      <ellipse cx="100" cy="116" rx="70" ry="4" fill={INK} opacity="0.12" />
      {/* 紙面 */}
      <path
        d="M42 34 C 70 30, 130 38, 158 34 L 158 96 C 130 100, 70 92, 42 96 Z"
        fill="#f5e9cc"
        stroke={INK}
        strokeWidth="1.5"
      />
      <g stroke="#c9b48a" strokeWidth="1" strokeDasharray="2 4" fill="none">
        <path d="M54 52 C 80 49, 120 55, 146 52" />
        <path d="M54 64 C 80 61, 120 67, 146 64" />
        <path d="M54 76 C 80 73, 120 79, 136 77" />
      </g>
      {/* 兩端的捲軸 */}
      {[36, 152].map((x) => (
        <g key={x}>
          <rect x={x} y="28" width="12" height="74" rx="6" fill="#e3cf9f" stroke={INK} strokeWidth="1.5" />
          <rect x={x + 3} y="22" width="6" height="8" rx="2" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.1" />
          <rect x={x + 3} y="100" width="6" height="8" rx="2" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.1" />
        </g>
      ))}
      {/* 墨水瓶與羽毛筆 */}
      <path d="M150 100 h22 l-3 14 h-16 Z" fill="var(--cobalt)" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="155" y="95" width="12" height="6" fill="#2c3e78" stroke={INK} strokeWidth="1.2" />
      <g className="vg-quill">
        <path
          d="M161 97 C 166 76, 176 58, 192 44 C 190 60, 182 78, 166 92 Z"
          fill="var(--paper-hi)"
          stroke={INK}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M161 97 L 188 50" stroke={INK} strokeWidth="1" fill="none" />
      </g>
      <g className="vg-twinkle" fill="var(--marigold)" stroke={INK} strokeWidth="0.8">
        <path d={SPARK(28, 24, 6)} />
        <path d={SPARK(178, 26, 4.5)} style={{ animationDelay: '0.8s' }} />
        <path d={SPARK(100, 16, 4)} style={{ animationDelay: '1.5s' }} />
      </g>
    </>
  );
}

/** 讀不到：水晶球裡一團灰霧慢慢轉，外面飄著兩朵霧 */
function Fog() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <>
      <ellipse cx="100" cy="116" rx="54" ry="4" fill={INK} opacity="0.12" />
      <defs>
        <clipPath id={`fog-${id}`}>
          <circle cx="100" cy="56" r="38" />
        </clipPath>
        <radialGradient id={`glass-${id}`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f4f5fb" />
          <stop offset="1" stopColor="#c9cee0" />
        </radialGradient>
      </defs>
      {/* 底座 */}
      <path
        d="M74 112 L 80 94 H120 L 126 112 Z"
        fill="var(--gold)"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M80 94 H120" stroke={INK} strokeWidth="1.2" />
      <circle cx="100" cy="56" r="38" fill={`url(#glass-${id})`} />
      <g clipPath={`url(#fog-${id})`}>
        <g className="vg-mist">
          <path
            d="M58 50 C 70 36, 92 42, 100 52 C 108 62, 128 62, 142 48 L 142 70 C 124 84, 104 76, 94 68 C 84 60, 68 64, 58 72 Z"
            fill="#9aa1b8"
            opacity="0.55"
          />
          <path
            d="M60 74 C 76 66, 92 80, 110 76 C 124 73, 134 80, 142 84 L 142 98 L 58 98 Z"
            fill="#7f87a3"
            opacity="0.5"
          />
        </g>
        <g className="vg-mist vg-mist--2">
          <path
            d="M62 36 C 78 28, 96 40, 112 34 C 126 29, 134 34, 140 40 L 140 22 L 60 22 Z"
            fill="#b3b9cc"
            opacity="0.6"
          />
        </g>
      </g>
      <circle cx="100" cy="56" r="38" fill="none" stroke={INK} strokeWidth="1.6" />
      <path d="M78 40 C 82 33, 89 29, 96 28" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      {/* 外面飄的霧 */}
      <g className="vg-puff" fill="#e6e8f1" stroke={INK} strokeWidth="1.2">
        <path d="M22 70 c0 -7 9 -9 13 -4 c3 -6 13 -4 13 3 c6 0 7 8 1 9 h-23 c-6 0 -8 -7 -4 -8 Z" />
      </g>
      <g className="vg-puff vg-puff--2" fill="#e6e8f1" stroke={INK} strokeWidth="1.2">
        <path d="M150 34 c0 -6 8 -8 11 -3 c3 -5 11 -3 11 3 c5 0 6 7 1 8 h-20 c-5 0 -7 -6 -3 -8 Z" />
      </g>
      {/* 黯淡的星 */}
      <path className="vg-dim" d={SPARK(144, 86, 5)} fill="var(--marigold)" stroke={INK} strokeWidth="0.8" />
    </>
  );
}

/** 一張高背椅：椅面中心在 (x, y)，背在後面 */
function Chair({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path
        d={`M${x - 11} ${y} V${y - 24} C ${x - 11} ${y - 34}, ${x + 11} ${y - 34}, ${x + 11} ${y - 24} V${y}`}
        fill="#5b3f8c"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d={`M${x - 4} ${y - 22} l4 -6 l4 6 l-4 6 Z`} fill="var(--marigold)" stroke={INK} strokeWidth="0.8" />
      <path
        d={`M${x - 10} ${y + 2} l-1 14 M${x + 10} ${y + 2} l1 14`}
        stroke={INK}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <ellipse cx={x} cy={y + 2} rx="13" ry="4" fill="var(--wood)" stroke={INK} strokeWidth="1.3" />
    </g>
  );
}

/** 揪團時只有自己：星星桌巾的圓桌，只擺了你的高腳杯和一根蠟燭，其他椅子空著、頭上冒問號 */
function Table() {
  return (
    <>
      <ellipse cx="100" cy="116" rx="84" ry="5" fill={INK} opacity="0.12" />
      <Chair x={100} y={46} />
      <Chair x={36} y={64} />
      <Chair x={164} y={64} />
      {[
        [100, 6],
        [36, 24],
        [164, 24],
      ].map(([x, y], i) => (
        <text
          key={x}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          className="vg-ask"
          style={{ animationDelay: `${i * 0.4}s` }}
        >
          ？
        </text>
      ))}
      {/* 圓桌：鈷藍桌巾、金色的星 */}
      <path d="M90 90 l-4 24 M110 90 l4 24" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M38 66 C 38 82, 162 82, 162 66 L 158 88 C 146 99, 54 99, 42 88 Z"
        fill="#2c5596"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <ellipse cx="100" cy="66" rx="62" ry="19" fill="var(--cobalt)" stroke={INK} strokeWidth="1.6" />
      {[
        [68, 62, 3],
        [128, 70, 3.5],
        [140, 60, 2.5],
        [86, 74, 2.5],
      ].map(([x, y, r]) => (
        <path key={`${x}-${y}`} d={SPARK(x, y, r)} fill="var(--marigold)" />
      ))}
      {/* 蠟燭 */}
      <g className="vg-flame">
        <path
          d="M112 44 C 116 50, 116 55, 112 56 C 108 55, 108 50, 112 44 Z"
          fill="var(--marigold)"
          stroke={INK}
          strokeWidth="0.9"
        />
      </g>
      <rect x="108.5" y="56" width="7" height="12" fill="var(--paper-hi)" stroke={INK} strokeWidth="1.1" />
      {/* 你的高腳杯 */}
      <path d="M78 50 h14 c0 9 -3 13 -7 13 c-4 0 -7 -4 -7 -13 Z" fill="#c9b8ff" stroke={INK} strokeWidth="1.2" />
      <path d="M85 63 v6 M80 70 h10" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      <path d={SPARK(96, 46, 4)} className="vg-dim" fill="var(--marigold)" stroke={INK} strokeWidth="0.7" />
      {/* 前面兩張空椅（只露出椅面） */}
      <g>
        <path d="M54 100 l-1 14 M74 100 l1 14" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="64" cy="100" rx="13" ry="4" fill="var(--wood)" stroke={INK} strokeWidth="1.3" />
        <path d="M126 100 l-1 14 M146 100 l1 14" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="136" cy="100" rx="13" ry="4" fill="var(--wood)" stroke={INK} strokeWidth="1.3" />
      </g>
    </>
  );
}

/** 魔法版的小插畫：空白的羊皮紙卷、起霧的水晶球、只坐了你一個的圓桌 */
/** 書櫃：深色木框、紫色背板、兩層隔板 */
function Bookcase({ children }: { children?: ReactNode }) {
  return (
    <>
      <ellipse cx="100" cy="119" rx="80" ry="4" fill={INK} opacity="0.12" />
      <rect x="34" y="10" width="132" height="106" rx="3" fill="#8b5b36" stroke={INK} strokeWidth="1.6" />
      <rect x="42" y="18" width="116" height="90" fill="#3b2f6e" stroke={INK} strokeWidth="1.2" />
      {[46, 77].map((y) => (
        <rect key={y} x="42" y={y} width="116" height="6" fill="#b07a4c" stroke={INK} strokeWidth="1.2" />
      ))}
      <rect x="30" y="6" width="140" height="7" rx="2" fill="#a06a3f" stroke={INK} strokeWidth="1.4" />
      {children}
    </>
  );
}

/** 還沒有店家：空書櫃、角落結了蜘蛛網、灰塵在飄；中間一本發光的虛線書等你放上去，羽毛筆在旁邊浮著 */
function EmptyShelf() {
  return (
    <Bookcase>
      <g fill="none" stroke="#c9b8ff" strokeWidth="0.8" opacity="0.85">
        <path d="M42 18 L68 18 M42 18 L42 42 M42 18 L62 36 M42 18 L53 41 M42 18 L66 27" />
        <path d="M50 18 Q49 23 42 24 M57 18 Q55 27 42 31 M64 18 Q61 32 42 38" />
      </g>
      <g className="vg-dust" fill="#e2d7ff">
        <circle cx="96" cy="34" r="1.1" />
        <circle cx="128" cy="28" r="0.9" />
        <circle cx="70" cy="64" r="1" />
        <circle cx="140" cy="62" r="1.2" />
        <circle cx="112" cy="96" r="0.9" />
        <circle cx="62" cy="98" r="1.1" />
      </g>
      {/* 中層一本發光的虛線書，中間一個「＋」 */}
      <g className="vg-ghost">
        <rect x="88" y="52" width="24" height="25" rx="2" fill="rgba(155, 123, 255, 0.18)" />
        <rect
          x="88"
          y="52"
          width="24"
          height="25"
          rx="2"
          fill="none"
          stroke="var(--marigold)"
          strokeWidth="1.4"
          strokeDasharray="3 2.4"
        />
        <path d="M100 58 v13 M93.5 64.5 h13" stroke="var(--marigold)" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* 羽毛筆浮在書櫃旁 */}
      <g className="vg-float">
        <path
          d="M176 70 C 178 52, 186 38, 196 28 C 196 44, 190 58, 180 68 Z"
          fill="var(--paper-hi)"
          stroke={INK}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M176 70 L 193 33" stroke={INK} strokeWidth="1" fill="none" />
        <path d="M176 70 l-2 5" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <g className="vg-twinkle" fill="var(--marigold)" stroke={INK} strokeWidth="0.8">
        <path d={SPARK(170, 84, 4)} />
        <path d={SPARK(22, 40, 5)} style={{ animationDelay: '0.9s' }} />
        <path d={SPARK(184, 100, 3)} style={{ animationDelay: '1.6s' }} />
      </g>
    </Bookcase>
  );
}

/** 篩選後一家都沒有：貓頭鷹站在一疊書上歪著頭，冒出一個問號 */
function PuzzledOwl() {
  return (
    <>
      <ellipse cx="100" cy="118" rx="58" ry="4" fill={INK} opacity="0.12" />
      <BookStack x={98} base={116} w={58} />
      <g className="vg-owl">
        <Owl x={98} y={65} s={0.62} />
      </g>
      <g className="vg-bob">
        <path
          d="M124 22 h28 a7 7 0 0 1 7 7 v14 a7 7 0 0 1 -7 7 h-15 l-10 8 l2 -8 h-5 a7 7 0 0 1 -7 -7 v-14 a7 7 0 0 1 7 -7 Z"
          fill="var(--paper-hi)"
          stroke={INK}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <text x="138" y="44" textAnchor="middle" className="vg-q">
          ？
        </text>
      </g>
      <g className="vg-twinkle" fill="var(--marigold)" stroke={INK} strokeWidth="0.8">
        <path d={SPARK(52, 40, 5)} />
        <path d={SPARK(164, 76, 4)} style={{ animationDelay: '1.1s' }} />
      </g>
    </>
  );
}

/** 星座的點（星盤座標），還沒有一顆亮起來 */
const UNLIT: [number, number][] = [
  [74, 44],
  [88, 36],
  [104, 42],
  [112, 58],
  [98, 72],
  [80, 66],
];

/** 排行榜還沒有店：一張還沒點亮的星盤，星座只有虛線和空心的星，望遠鏡對著它 */
function DarkChart() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="80" ry="4" fill={INK} opacity="0.12" />
      <circle cx="92" cy="58" r="50" fill="#2b3b78" stroke={INK} strokeWidth="1.6" />
      <circle cx="92" cy="58" r="45" fill="none" stroke="var(--marigold)" strokeWidth="1.6" />
      <g className="vg-turn">
        <circle cx="92" cy="58" r="34" fill="none" stroke="#9b7bff" strokeWidth="0.9" strokeDasharray="2 4" />
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r1 = i % 2 ? 41 : 39;
          return (
            <line
              key={i}
              x1={92 + Math.cos(a) * r1}
              y1={58 + Math.sin(a) * r1}
              x2={92 + Math.cos(a) * 45}
              y2={58 + Math.sin(a) * 45}
              stroke="var(--marigold)"
              strokeWidth="0.9"
              opacity="0.7"
            />
          );
        })}
        <polyline
          points={UNLIT.map(([x, y]) => x + ',' + y).join(' ') + ' ' + UNLIT[0].join(',')}
          fill="none"
          stroke="#c9b8ff"
          strokeWidth="0.9"
          strokeDasharray="2.5 3"
          opacity="0.75"
        />
        {UNLIT.map(([x, y], i) => (
          <circle
            key={i}
            className="vg-unlit"
            cx={x}
            cy={y}
            r="2.6"
            fill="#2b3b78"
            stroke="#e2d7ff"
            strokeWidth="1.1"
            style={{ animationDelay: i * 0.45 + 's' }}
          />
        ))}
      </g>
      {/* 望遠鏡：三腳架上斜斜地對著星盤 */}
      <path
        d="M168 78 L156 116 M168 78 L172 116 M168 78 L184 114"
        stroke={INK}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <g transform="rotate(-28 168 74)">
        <rect x="146" y="68" width="44" height="12" rx="2" fill="var(--cobalt)" stroke={INK} strokeWidth="1.5" />
        <rect x="140" y="66" width="8" height="16" rx="2" fill="var(--marigold)" stroke={INK} strokeWidth="1.3" />
        <rect x="188" y="70" width="6" height="8" rx="1.5" fill="#2c3e78" stroke={INK} strokeWidth="1.2" />
        <path d="M160 68 v12 M176 68 v12" stroke="var(--marigold)" strokeWidth="1.2" />
      </g>
      <g className="vg-twinkle" fill="var(--marigold)" stroke={INK} strokeWidth="0.8">
        <path d={SPARK(30, 22, 4.5)} />
        <path d={SPARK(176, 28, 4)} style={{ animationDelay: '1.3s' }} />
      </g>
    </>
  );
}

/** 貓頭鷹還沒送信來：牠站在棲木上打瞌睡，旁邊的信籃空空的，月亮掛在上面 */
function SleepyOwl() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="60" ry="4" fill={INK} opacity="0.12" />
      <path d="M100 116 V70" stroke="#8b5b36" strokeWidth="6" strokeLinecap="round" />
      <path d="M100 116 V70" stroke={INK} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <rect x="62" y="64" width="76" height="8" rx="4" fill="#a06a3f" stroke={INK} strokeWidth="1.4" />
      <path d="M84 116 h32" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <g className="vg-doze">
        <Owl x={92} y={66} s={0.56} />
      </g>
      {/* 空的信籃 */}
      <path d="M128 72 v10" stroke={INK} strokeWidth="1.2" />
      <path d="M118 82 h20 l-3 14 h-14 Z" fill="#e3cf9f" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M121 88 h14 M122 92 h12" stroke="#b9975b" strokeWidth="1" />
      {/* 月亮與星星 */}
      <path d="M163 15 a11 11 0 1 0 6 19 a9 9 0 0 1 -6 -19 Z" fill="var(--marigold)" stroke={INK} strokeWidth="1.2" />
      <g className="vg-zz" fill="none" stroke="#9b7bff" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M110 30 h6 l-6 6 h6" />
        <path d="M120 20 h4.5 l-4.5 4.5 h4.5" />
      </g>
      <g className="vg-twinkle" fill="var(--marigold)" stroke={INK} strokeWidth="0.8">
        <path d={SPARK(40, 30, 5)} />
        <path d={SPARK(184, 64, 3.6)} style={{ animationDelay: '1.2s' }} />
      </g>
    </>
  );
}

function FaceDownTarot() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="70" ry="4" fill={INK} opacity="0.12" />
      {[
        [56, -8],
        [100, 0],
        [144, 8],
      ].map(([x, r], i) => (
        <g key={x} className="vg-doze" style={{ animationDelay: `${i * -0.9}s` }}>
          <g transform={`translate(${x} 64) rotate(${r})`}>
            <rect x="-21" y="-38" width="42" height="72" rx="5" fill="#2c3e7a" stroke={INK} strokeWidth="1.6" />
            <rect x="-16" y="-33" width="32" height="62" rx="3" fill="none" stroke="var(--marigold)" strokeWidth="1" />
            <circle r="9" fill="none" stroke="#c9b8ff" strokeWidth="1.1" />
            <path d={SPARK(0, 0, 6)} fill="var(--marigold)" stroke={INK} strokeWidth="0.7" />
            <path d={SPARK(0, -22, 3)} fill="#c9b8ff" />
            <path d={SPARK(0, 22, 3)} fill="#c9b8ff" />
          </g>
        </g>
      ))}
      <g className="vg-twinkle" fill="var(--marigold)" stroke={INK} strokeWidth="0.8">
        <path d={SPARK(24, 26, 4.5)} />
        <path d={SPARK(178, 20, 4)} style={{ animationDelay: '1s' }} />
        <path d={SPARK(170, 104, 3.2)} style={{ animationDelay: '1.8s' }} />
      </g>
    </>
  );
}

function EmptyWindow() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="64" ry="4" fill={INK} opacity="0.12" />
      <path d="M58 104 V44 a42 42 0 0 1 84 0 V104 Z" fill="#2c3e7a" stroke={INK} strokeWidth="1.8" />
      <path d="M126 34 a10 10 0 1 0 6 17 a8 8 0 0 1 -6 -17 Z" fill="var(--marigold)" stroke={INK} strokeWidth="1.1" />
      <path d="M100 2 V104 M58 64 H142" stroke="#8b5b36" strokeWidth="4" />
      <path d="M100 2 V104 M58 64 H142" stroke={INK} strokeWidth="1" opacity="0.5" />
      <rect x="48" y="102" width="104" height="9" rx="2" fill="#a06a3f" stroke={INK} strokeWidth="1.5" />
      <g className="vg-quill">
        <path
          d="M120 100 c 10 -10 22 -14 30 -12 c -4 6 -14 12 -30 12 Z"
          fill="#f8efdc"
          stroke={INK}
          strokeWidth="1.1"
        />
        <path d="M120 100 l 26 -10" stroke={INK} strokeWidth="0.8" />
      </g>
      <g className="vg-twinkle" fill="#fff" stroke={INK} strokeWidth="0.6">
        <path d={SPARK(76, 40, 3.4)} />
        <path d={SPARK(84, 84, 2.6)} style={{ animationDelay: '0.9s' }} />
        <path d={SPARK(124, 84, 3)} style={{ animationDelay: '1.6s' }} />
      </g>
    </>
  );
}

function IdlePerch() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="66" ry="4" fill={INK} opacity="0.12" />
      <path d="M72 116 V66" stroke="#8b5b36" strokeWidth="6" strokeLinecap="round" />
      <rect x="40" y="60" width="66" height="8" rx="4" fill="#a06a3f" stroke={INK} strokeWidth="1.4" />
      <path d="M56 116 h32" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <g className="vg-doze">
        <Owl x={66} y={62} s={0.5} />
      </g>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${138 + i * 2} ${104 - i * 9}) rotate(${-4 + i * 5})`}>
          <rect x="-22" y="-8" width="44" height="16" rx="2" fill="#f8efdc" stroke={INK} strokeWidth="1.3" />
          <path d="M-22 -8 L0 3 L22 -8" fill="none" stroke={INK} strokeWidth="1" />
          <circle cx="0" cy="3" r="3.6" fill="var(--vermilion)" stroke={INK} strokeWidth="1" />
        </g>
      ))}
      <g className="vg-zz" fill="none" stroke="#9b7bff" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M84 34 h6 l-6 6 h6" />
        <path d="M94 24 h4.5 l-4.5 4.5 h4.5" />
      </g>
    </>
  );
}

function DimHeartCircle() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="60" ry="4" fill={INK} opacity="0.12" />
      <ellipse cx="100" cy="98" rx="62" ry="16" fill="none" stroke="#9b7bff" strokeWidth="1.4" strokeDasharray="5 4" />
      <ellipse cx="100" cy="98" rx="44" ry="10" fill="none" stroke="var(--marigold)" strokeWidth="1" opacity="0.6" />
      <g className="vg-dim">
        <path
          d="M100 84 C 86 72, 70 60, 78 46 C 84 36, 96 38, 100 48 C 104 38, 116 36, 122 46 C 130 60, 114 72, 100 84 Z"
          fill="#f4c6d6"
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </g>
      <g className="vg-quill">
        <path d="M150 104 L170 56" stroke="#8b5b36" strokeWidth="4" strokeLinecap="round" />
        <path d={SPARK(171, 52, 6)} fill="var(--marigold)" stroke={INK} strokeWidth="0.8" />
      </g>
      <g className="vg-twinkle" fill="var(--marigold)" stroke={INK} strokeWidth="0.8">
        <path d={SPARK(44, 40, 4.4)} />
        <path d={SPARK(60, 92, 3)} style={{ animationDelay: '1.1s' }} />
      </g>
    </>
  );
}

function SleepingBall() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="58" ry="4" fill={INK} opacity="0.12" />
      <path
        d="M78 116 l6 -16 h32 l6 16 Z"
        fill="var(--marigold)"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="68" r="34" fill="#cfd8ef" stroke={INK} strokeWidth="1.8" />
      <g className="vg-dim">
        <circle cx="100" cy="68" r="26" fill="#9b7bff" opacity="0.35" />
      </g>
      <path d="M80 54 a24 24 0 0 1 14 -10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M86 74 q6 5 12 0 M104 74 q6 5 12 0" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <g className="vg-zz" fill="none" stroke="#9b7bff" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M138 36 h6 l-6 6 h6" />
        <path d="M148 24 h4.5 l-4.5 4.5 h4.5" />
      </g>
      <g className="vg-twinkle" fill="var(--marigold)" stroke={INK} strokeWidth="0.8">
        <path d={SPARK(40, 30, 4.5)} />
        <path d={SPARK(170, 92, 3.6)} style={{ animationDelay: '1.2s' }} />
      </g>
    </>
  );
}

export function Vignette({ kind, title, hint }: VignetteProps) {
  const scenes: Record<VignetteProps['kind'], [ReactNode, string, string]> = {
    'crew-empty': [<Table key="a" />, copy.crew.emptyTitle, copy.crew.emptyHint],
    'notes-empty': [<Scroll key="a" />, copy.notes.emptyTitle, copy.notes.emptyHint],
    'notes-error': [<Fog key="a" />, copy.notes.errorTitle, copy.notes.errorHint],
    'shops-empty': [<EmptyShelf key="a" />, copy.shops.emptyTitle, copy.shops.emptyBody],
    'shops-none': [<PuzzledOwl key="a" />, '', ''],
    'ranks-empty': [<DarkChart key="a" />, copy.ranks.emptyTitle, copy.ranks.emptyHint],
    'herald-empty': [<SleepyOwl key="a" />, copy.herald.emptyTitle, copy.herald.emptyHint],
    'herald-inbox': [<EmptyWindow key="a" />, copy.herald.none.inbox.title, copy.herald.none.inbox.hint],
    'herald-sent': [<IdlePerch key="a" />, copy.herald.none.sent.title, copy.herald.none.sent.hint],
    'herald-solo': [<SleepingBall key="a" />, copy.herald.none.solo.title, copy.herald.none.solo.hint],
    'titles-empty': [<FaceDownTarot key="a" />, copy.ranks.titlesEmpty.title, copy.ranks.titlesEmpty.hint],
    'fans-empty': [<DimHeartCircle key="a" />, copy.shops.fansEmpty.title, copy.shops.fansEmpty.hint],
  };
  const [art, t, h] = scenes[kind];
  return (
    <figure className={'vignette vignette--magic vignette--' + kind}>
      <svg viewBox="0 0 200 124" aria-hidden="true">
        {art}
      </svg>
      <figcaption>
        <b>{title ?? t}</b>
        {(hint ?? h) && <span>{hint ?? h}</span>}
      </figcaption>
    </figure>
  );
}
