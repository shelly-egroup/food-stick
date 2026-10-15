import { useId, type ReactNode } from 'react';
import { INK } from '@/art/ink';
import type { VignetteProps } from '../types';
import { copy } from './copy';
import { Cat } from './parts';
import './Vignette.css';

/** 廟口的佈告欄：小瓦頂、竹板、兩根柱子 */
function Board({ children }: { children?: ReactNode }) {
  return (
    <>
      <rect x="47" y="34" width="6" height="84" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.4" />
      <rect x="147" y="34" width="6" height="84" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.4" />
      <rect x="36" y="38" width="128" height="62" fill="var(--bamboo)" stroke={INK} strokeWidth="1.6" />
      <rect x="41" y="43" width="118" height="52" fill="none" stroke="var(--wood-lo)" strokeWidth="1" opacity="0.7" />
      {/* 瓦頂：兩端微微翹起 */}
      <path
        d="M24 36 C 40 34, 56 26, 66 18 H134 C 144 26, 160 34, 176 36 L 172 41 H28 Z"
        fill="var(--jade)"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M66 18 H134" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <g stroke={INK} strokeWidth="0.9" opacity="0.55">
        {[74, 86, 98, 110, 122].map((x) => (
          <line key={x} x1={x} y1="21" x2={x - 4} y2="38" />
        ))}
      </g>
      <rect x="92" y="9" width="16" height="9" fill="var(--vermilion)" stroke={INK} strokeWidth="1.3" />
      {children}
    </>
  );
}

/** 一張紙條：直條、紅圖釘 */
function Slip({ x, y, r = 0, className }: { x: number; y: number; r?: number; className?: string }) {
  return (
    <g className={className} transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x="-11" y="0" width="22" height="34" fill="var(--paper-hi)" stroke={INK} strokeWidth="1.3" />
      <circle cx="0" cy="4" r="2.6" fill="var(--vermilion)" stroke={INK} strokeWidth="1" />
    </g>
  );
}

/**
 * 廟宇版的小插畫。
 * 還沒有紙條：佈告欄上只釘著一張空白紙條，毛筆靠在柱子旁。
 * 讀不到：一陣風把紙條吹走了，只剩圖釘和撕破的紙角。
 */
/** 一張塑膠圓凳：凳面在 (x, y) */
function Stool({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 9} ${y} l-3 18 M${x + 9} ${y} l3 18`} stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx={x} cy={y} rx="13" ry="4.5" fill="var(--vermilion)" stroke={INK} strokeWidth="1.4" />
      <ellipse cx={x} cy={y - 0.5} rx="4" ry="1.4" fill="var(--paper-hi)" opacity="0.7" />
    </g>
  );
}

/** 揪團時只有自己：辦桌的紅色圓桌只擺了你那一碗，旁邊的塑膠凳都空著 */
function Banquet() {
  return (
    <>
      <ellipse cx="100" cy="116" rx="84" ry="5" fill={INK} opacity="0.12" />
      <Stool x={100} y={36} />
      <Stool x={40} y={58} />
      <Stool x={160} y={58} />
      {/* 桌腳與紅桌巾 */}
      <path d="M86 86 l-6 30 M114 86 l6 30" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M36 62 C 36 78, 164 78, 164 62 L 160 84 C 150 96, 50 96, 40 84 Z"
        fill="var(--vermilion-lo)"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <ellipse cx="100" cy="62" rx="64" ry="20" fill="var(--vermilion)" stroke={INK} strokeWidth="1.6" />
      <ellipse cx="100" cy="61" rx="28" ry="8.5" fill="#e07a60" stroke={INK} strokeWidth="1.1" />
      {/* 你的那一碗：白飯冒著煙，筷子擱在碗上 */}
      <g className="vg-steam" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" opacity="0.55">
        <path d="M72 58 c-3 -5 3 -8 0 -13" />
        <path d="M79 57 c-3 -5 3 -8 0 -13" />
      </g>
      <path d="M64 64 h26 a13 9 0 0 1 -26 0 Z" fill="var(--paper-hi)" stroke={INK} strokeWidth="1.4" />
      <path d="M66 64 c3 -5 19 -5 22 0" fill="#fffdf8" stroke={INK} strokeWidth="1.1" />
      <path d="M60 60 L 96 70 M62 57 L 97 67" stroke="var(--wood-lo)" strokeWidth="2" strokeLinecap="round" />
      {/* 前面兩張空凳 */}
      <Stool x={62} y={98} />
      <Stool x={138} y={98} />
    </>
  );
}

/** 掛菜牌的牆：上面一條橫木，白牆、朱紅牆裙，牆上釘著三根空釘子 */
function Wall({ children }: { children?: ReactNode }) {
  return (
    <>
      <ellipse cx="100" cy="119" rx="88" ry="4" fill={INK} opacity="0.12" />
      <rect x="14" y="12" width="172" height="92" fill="var(--paper-lo)" stroke={INK} strokeWidth="1.5" />
      <rect x="14" y="88" width="172" height="16" fill="var(--vermilion-tint)" stroke={INK} strokeWidth="1.5" />
      <path d="M14 92.5 H186" stroke="var(--vermilion)" strokeWidth="1" opacity="0.55" />
      <rect x="8" y="7" width="184" height="9" fill="var(--wood)" stroke={INK} strokeWidth="1.5" />
      {[64, 100, 136].map((x) => (
        <g key={x}>
          <ellipse cx={x + 1.5} cy="35.5" rx="3.2" ry="1.4" fill={INK} opacity="0.16" />
          <circle cx={x} cy="33" r="2.6" fill="var(--marigold)" stroke={INK} strokeWidth="1.1" />
        </g>
      ))}
      {children}
    </>
  );
}

/** 還沒有店家：牆上只有空釘子，梯子靠在牆邊，一塊還沒寫字的新菜牌和毛筆等著你 */
function BareWall() {
  // 梯子的橫木：沿著兩根斜斜的側桿往上排
  const rungs = [0.14, 0.33, 0.52, 0.71, 0.9].map((t) => ({ y: 116 - t * 90, x: 24 + t * 18 }));
  return (
    <Wall>
      <g strokeLinecap="round">
        <path d="M24 116 L42 26 M38 116 L56 26" stroke={INK} strokeWidth="4.2" />
        <path d="M24 116 L42 26 M38 116 L56 26" stroke="var(--wood)" strokeWidth="2" />
        {rungs.map(({ x, y }) => (
          <path key={y} d={'M' + (x + 1.6) + ' ' + y + ' H' + (x + 12.4)} stroke={INK} strokeWidth="2.2" />
        ))}
      </g>
      {/* 新菜牌：斜靠在牆邊，上面一個朱紅的「＋」 */}
      <g transform="rotate(-7 153 114)">
        <rect x="138" y="50" width="30" height="64" fill="var(--bamboo)" stroke={INK} strokeWidth="1.5" />
        <rect
          x="141.5"
          y="53.5"
          width="23"
          height="57"
          fill="none"
          stroke="var(--wood-lo)"
          strokeWidth="0.9"
          opacity="0.7"
        />
        <rect
          x="146.5"
          y="58"
          width="13"
          height="13"
          fill="none"
          stroke="var(--vermilion)"
          strokeWidth="1.2"
          strokeDasharray="2.4 2"
        />
        <path
          className="vg-plus"
          d="M153 80 v16 M145 88 h16"
          stroke="var(--vermilion)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
      {/* 硯台與毛筆 */}
      <ellipse cx="181" cy="113" rx="8.5" ry="3.6" fill={INK} />
      <ellipse cx="181" cy="111.6" rx="6" ry="2" fill="#5a524b" />
      <g transform="rotate(26 178 111)">
        <g className="vg-brush">
          <rect x="176" y="78" width="4.4" height="32" rx="1" fill="var(--wood)" stroke={INK} strokeWidth="1.1" />
          <path d="M176 110 h4.4 l-1 7 c-1 2.6 -1.4 2.6 -2.4 0 Z" fill={INK} />
        </g>
      </g>
    </Wall>
  );
}

/** 篩選後一家都沒有：廟貓坐在空釘子下面，抬頭冒出一個問號 */
function PuzzledCat() {
  return (
    <Wall>
      <g transform="translate(88 90) scale(0.84)">
        <Cat />
      </g>
      <g className="vg-bob">
        <path
          d="M118 38 h28 a7 7 0 0 1 7 7 v14 a7 7 0 0 1 -7 7 h-15 l-9 8 l1.5 -8 h-5.5 a7 7 0 0 1 -7 -7 v-14 a7 7 0 0 1 7 -7 Z"
          fill="var(--paper-hi)"
          stroke={INK}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <text x="132" y="60" textAnchor="middle" className="vg-q">
          ？
        </text>
      </g>
    </Wall>
  );
}

/** 排行榜還沒有店：朱紅金框的金榜上三條空白名條，毛筆擱在硯台上；一道光掃過金框 */
function BlankBoard() {
  const clip = 'board-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <rect x="34" y="14" width="132" height="84" />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="119" rx="78" ry="4" fill={INK} opacity="0.12" />
      <rect x="44" y="24" width="6" height="94" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.4" />
      <rect x="150" y="24" width="6" height="94" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.4" />
      <rect x="34" y="14" width="132" height="84" fill="var(--vermilion)" stroke={INK} strokeWidth="1.6" />
      <rect x="39" y="19" width="122" height="74" fill="none" stroke="var(--marigold)" strokeWidth="2" />
      {[64, 100, 136].map((x, i) => (
        <g key={x}>
          <rect x={x - 12} y="30" width="24" height="58" fill="#fff6dc" stroke={INK} strokeWidth="1.2" />
          <text x={x} y="44" textAnchor="middle" className="vg-rank">
            {['一', '二', '三'][i]}
          </text>
          <path d={'M' + x + ' 52 V82'} stroke={INK} strokeWidth="1.2" strokeDasharray="2.4 3.2" opacity="0.35" />
        </g>
      ))}
      <g clipPath={'url(#' + clip + ')'}>
        <path className="vg-shine" d="M20 14 h14 l-26 84 h-14 Z" fill="#fff" opacity="0.35" />
      </g>
      {/* 榜頭：金底黑字 */}
      <rect x="76" y="5" width="48" height="19" fill="var(--marigold)" stroke={INK} strokeWidth="1.4" />
      <text x="100" y="19" textAnchor="middle" className="vg-board-title">
        金榜
      </text>
      {/* 硯台與毛筆 */}
      <rect x="166" y="108" width="24" height="8" rx="2" fill={INK} />
      <rect x="169" y="106.5" width="18" height="3" rx="1.5" fill="#5a524b" />
      <g transform="rotate(-62 170 106)">
        <g className="vg-brush">
          <rect x="168" y="76" width="4.4" height="30" rx="1" fill="var(--wood)" stroke={INK} strokeWidth="1.1" />
          <path d="M168 106 h4.4 l-1 7 c-1 2.6 -1.4 2.6 -2.4 0 Z" fill={INK} />
        </g>
      </g>
    </>
  );
}

/** 報馬仔還沒有消息：銅鑼靜靜掛在木架上，鑼槌擱著，廟貓在底下睡午覺 */
function QuietGong() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="70" ry="4" fill={INK} opacity="0.12" />
      <rect x="52" y="22" width="7" height="94" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.4" />
      <rect x="141" y="22" width="7" height="94" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.4" />
      <rect x="44" y="16" width="112" height="10" rx="3" fill="var(--wood)" stroke={INK} strokeWidth="1.5" />
      <path d="M84 26 L90 38 M116 26 L110 38" stroke={INK} strokeWidth="1.3" />
      <g className="vg-gong">
        <circle cx="100" cy="64" r="28" fill="var(--marigold)" stroke={INK} strokeWidth="1.8" />
        <circle cx="100" cy="64" r="21" fill="none" stroke="#d99a26" strokeWidth="1.4" />
        <circle cx="100" cy="64" r="11" fill="#d99a26" stroke={INK} strokeWidth="1.3" />
        <path d="M84 50 a20 20 0 0 1 12 -8" fill="none" stroke="#fff3c4" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      {/* 鑼槌掛在柱子上 */}
      <path d="M150 40 L166 70" stroke="var(--wood-lo)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="168" cy="74" r="6" fill="var(--vermilion)" stroke={INK} strokeWidth="1.4" />
      <g transform="translate(100 104) scale(0.62)">
        <Cat />
      </g>
      <g className="vg-zz" fill="none" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M122 92 h6 l-6 6 h6" />
        <path d="M132 82 h4.5 l-4.5 4.5 h4.5" />
      </g>
    </>
  );
}

function BlankBanners() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="72" ry="4" fill={INK} opacity="0.12" />
      <rect x="20" y="13" width="160" height="7" rx="3.5" fill="var(--wood)" stroke={INK} strokeWidth="1.5" />
      {[20, 180].map((x) => (
        <circle key={x} cx={x} cy="16.5" r="5.5" fill="var(--marigold)" stroke={INK} strokeWidth="1.3" />
      ))}
      {[54, 100, 146].map((x, i) => (
        <g key={x} className="vg-sway" style={{ animationDelay: `${i * -1.1}s` }}>
          <path d={`M${x - 9} 20 L${x} 27 L${x + 9} 20`} fill="none" stroke={INK} strokeWidth="1.1" />
          <path
            d={`M${x - 18} 27 h36 v56 l-18 11 l-18 -11 Z`}
            fill="var(--vermilion)"
            stroke={INK}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d={`M${x - 13} 32 h26 v48 l-13 8 l-13 -8 Z`}
            fill="none"
            stroke="var(--marigold)"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <rect x={x - 6} y="42" width="12" height="28" fill="var(--paper-hi)" stroke={INK} strokeWidth="1" />
          <g stroke="var(--marigold)" strokeWidth="1.2" strokeLinecap="round">
            {[-10, -5, 0, 5, 10].map((d) => (
              <line key={d} x1={x + d} y1={94 - Math.abs(d) * 1.1} x2={x + d} y2={100 - Math.abs(d) * 1.1} />
            ))}
          </g>
        </g>
      ))}
      <g className="vg-bob">
        <text x="100" y="60" textAnchor="middle" className="vg-q">
          ？
        </text>
      </g>
    </>
  );
}

function EmptyTray() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="70" ry="4" fill={INK} opacity="0.12" />
      <path d="M40 78 h96 l-6 24 h-84 Z" fill="var(--wood)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M46 86 h84" stroke="var(--wood-lo)" strokeWidth="1.2" />
      <rect x="40" y="72" width="96" height="7" rx="2" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.4" />
      <g transform="translate(150 104) scale(0.6)">
        <Cat />
      </g>
      <g className="vg-bob" style={{ animationDelay: '-1.2s' }}>
        <rect
          x="70"
          y="30"
          width="30"
          height="20"
          rx="2"
          fill="var(--vermilion)"
          stroke={INK}
          strokeWidth="1.4"
          opacity="0.35"
          strokeDasharray="3 3"
        />
      </g>
      <g className="vg-bob">
        <path
          d="M118 22 h28 a7 7 0 0 1 7 7 v14 a7 7 0 0 1 -7 7 h-15 l-9 8 l1.5 -8 h-5.5 a7 7 0 0 1 -7 -7 v-14 a7 7 0 0 1 7 -7 Z"
          fill="var(--paper-hi)"
          stroke={INK}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <text x="132" y="44" textAnchor="middle" className="vg-q">
          ？
        </text>
      </g>
    </>
  );
}

function UnsentCards() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="74" ry="4" fill={INK} opacity="0.12" />
      <rect x="22" y="92" width="156" height="10" rx="2" fill="var(--wood)" stroke={INK} strokeWidth="1.6" />
      <path d="M32 102 v14 M168 102 v14" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${62 + i * 3} ${86 - i * 5}) rotate(${-6 + i * 4})`}>
          <rect x="-20" y="-14" width="40" height="26" rx="2" fill="var(--vermilion)" stroke={INK} strokeWidth="1.4" />
          <rect x="-15" y="-9" width="30" height="16" fill="none" stroke="var(--marigold)" strokeWidth="1" />
        </g>
      ))}
      <rect x="112" y="80" width="30" height="12" rx="2" fill={INK} />
      <ellipse cx="127" cy="82" rx="10" ry="2.6" fill="#4a4038" />
      <g className="vg-brush">
        <g transform="rotate(-38 150 70)">
          <rect x="147.5" y="34" width="5" height="40" rx="1" fill="var(--wood)" stroke={INK} strokeWidth="1.2" />
          <path d="M147.5 74 h5 l-1 8 c-1 3 -2 3 -3 0 Z" fill={INK} />
        </g>
      </g>
    </>
  );
}

function HoveringStamp() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="58" ry="4" fill={INK} opacity="0.12" />
      <path
        d="M52 112 l8 -26 h80 l8 26 Z"
        fill="var(--paper-hi)"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect
        x="78"
        y="92"
        width="44"
        height="16"
        fill="none"
        stroke="var(--vermilion)"
        strokeWidth="1.4"
        strokeDasharray="4 3"
      />
      <g className="vg-bob">
        <rect x="88" y="22" width="24" height="12" rx="3" fill="var(--jade)" stroke={INK} strokeWidth="1.4" />
        <rect x="92" y="34" width="16" height="22" fill="var(--wood)" stroke={INK} strokeWidth="1.4" />
        <rect x="84" y="56" width="32" height="12" rx="2" fill="var(--vermilion)" stroke={INK} strokeWidth="1.5" />
      </g>
      <g className="vg-zz" fill="var(--vermilion)">
        <path d="M150 50 c0 -6 8 -6 8 0 c0 -6 8 -6 8 0 c0 6 -8 10 -8 12 c0 -2 -8 -6 -8 -12 Z" />
        <path d="M36 62 c0 -4 6 -4 6 0 c0 -4 6 -4 6 0 c0 4 -6 7 -6 9 c0 -2 -6 -5 -6 -9 Z" />
      </g>
    </>
  );
}

function ColdCenser() {
  return (
    <>
      <ellipse cx="100" cy="119" rx="64" ry="4" fill={INK} opacity="0.12" />
      <g stroke={INK} strokeWidth="1.6" strokeLinecap="round">
        <line x1="86" y1="40" x2="90" y2="84" />
        <line x1="100" y1="34" x2="100" y2="84" />
        <line x1="114" y1="40" x2="110" y2="84" />
      </g>
      <g fill="var(--paper-hi)" stroke={INK} strokeWidth="1">
        <circle cx="86" cy="40" r="2.6" />
        <circle cx="100" cy="34" r="2.6" />
        <circle cx="114" cy="40" r="2.6" />
      </g>
      <path d="M62 84 h76 c0 20 -14 32 -38 32 S 62 104 62 84 Z" fill="var(--marigold)" stroke={INK} strokeWidth="1.6" />
      <path d="M70 94 q30 10 60 0" fill="none" stroke={INK} strokeWidth="1.1" />
      <rect x="58" y="80" width="84" height="6" rx="3" fill="#d99a26" stroke={INK} strokeWidth="1.3" />
      <g className="vg-bob">
        <g transform="translate(150 50) rotate(28)">
          <rect x="-2" y="-16" width="4" height="26" rx="1" fill="var(--wood)" stroke={INK} strokeWidth="1" />
          <circle cx="0" cy="-17" r="3.4" fill="var(--vermilion)" stroke={INK} strokeWidth="1" />
        </g>
      </g>
      <g className="vg-zz" fill="none" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M44 52 h6 l-6 6 h6" />
        <path d="M34 40 h4.5 l-4.5 4.5 h4.5" />
      </g>
    </>
  );
}

export function Vignette({ kind, title, hint }: VignetteProps) {
  const scenes: Partial<Record<VignetteProps['kind'], [ReactNode, string, string]>> = {
    'crew-empty': [<Banquet key="a" />, copy.crew.emptyTitle, copy.crew.emptyHint],
    'shops-empty': [<BareWall key="a" />, copy.shops.emptyTitle, copy.shops.emptyBody],
    'shops-none': [<PuzzledCat key="a" />, '', ''],
    'ranks-empty': [<BlankBoard key="a" />, copy.ranks.emptyTitle, copy.ranks.emptyHint],
    'herald-empty': [<QuietGong key="a" />, copy.herald.emptyTitle, copy.herald.emptyHint],
    'herald-inbox': [<EmptyTray key="a" />, copy.herald.none.inbox.title, copy.herald.none.inbox.hint],
    'herald-sent': [<UnsentCards key="a" />, copy.herald.none.sent.title, copy.herald.none.sent.hint],
    'herald-solo': [<ColdCenser key="a" />, copy.herald.none.solo.title, copy.herald.none.solo.hint],
    'titles-empty': [<BlankBanners key="a" />, copy.ranks.titlesEmpty.title, copy.ranks.titlesEmpty.hint],
    'fans-empty': [<HoveringStamp key="a" />, copy.shops.fansEmpty.title, copy.shops.fansEmpty.hint],
  };
  const scene = scenes[kind];
  if (scene) {
    const [art, t, h] = scene;
    return (
      <figure className={'vignette vignette--temple vignette--' + kind}>
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
  const empty = kind === 'notes-empty';
  return (
    <figure className={`vignette vignette--temple vignette--${kind}`}>
      <svg viewBox="0 0 200 124" aria-hidden="true">
        <ellipse cx="100" cy="119" rx="74" ry="4" fill={INK} opacity="0.12" />
        <Board>
          {empty ? (
            <>
              <g className="vg-sway">
                <Slip x={100} y={50} r={-3} />
              </g>
              {[62, 138].map((x) => (
                <circle key={x} cx={x} cy={56} r="2" fill="var(--vermilion)" opacity="0.5" />
              ))}
              {/* 毛筆：靠在右邊柱子上 */}
              <g transform="rotate(14 160 116)">
                <rect x="157.5" y="70" width="5" height="40" rx="1" fill="var(--wood)" stroke={INK} strokeWidth="1.2" />
                <path d="M157.5 110 h5 l-1 8 c-1 3 -2 3 -3 0 Z" fill={INK} />
              </g>
            </>
          ) : (
            <>
              {/* 只剩圖釘和撕破的紙角 */}
              {[
                [64, 52],
                [100, 48],
                [136, 54],
              ].map(([x, y]) => (
                <g key={x}>
                  <path
                    d={`M${x - 5} ${y} h10 l-3 6 l-2 -3 l-3 4 Z`}
                    fill="var(--paper-hi)"
                    stroke={INK}
                    strokeWidth="1"
                  />
                  <circle cx={x} cy={y + 2} r="2.6" fill="var(--vermilion)" stroke={INK} strokeWidth="1" />
                </g>
              ))}
              {/* 風 */}
              <g className="vg-wind" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round">
                <path d="M8 58 C 40 50, 70 66, 110 58 S 170 50, 196 60" />
                <path d="M20 78 C 50 72, 76 86, 118 78 S 172 72, 194 82" />
                <path d="M2 96 C 30 90, 60 102, 92 96" />
              </g>
              {/* 被吹走的紙條 */}
              <g className="vg-fly vg-fly--1">
                <Slip x={168} y={22} r={24} />
              </g>
              <g className="vg-fly vg-fly--2">
                <Slip x={184} y={62} r={-30} />
              </g>
              <g className="vg-fly vg-fly--3">
                <Slip x={150} y={74} r={52} />
              </g>
            </>
          )}
        </Board>
      </svg>
      <figcaption>
        <b>{title ?? (empty ? copy.notes.emptyTitle : copy.notes.errorTitle)}</b>
        <span>{hint ?? (empty ? copy.notes.emptyHint : copy.notes.errorHint)}</span>
      </figcaption>
    </figure>
  );
}
