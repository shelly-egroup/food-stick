import type { GlyphProps } from '../types';

const INK = '#26211d';
const STAR = 'M0-4.6 1.1-1.1 4.6 0 1.1 1.1 0 4.6-1.1 1.1-4.6 0-1.1-1.1Z';

/**
 * 魔法的小圖：收起魔法書是一支揮出星光的魔杖、讓水晶球入睡是一顆裡面掛著月亮的水晶球（旁邊飄著 z），
 * 搖手機是一顆被晃得發光的水晶球、自己放的魔法書是一條書籤緞帶。
 */
export function Glyph({ name, size = 22 }: GlyphProps) {
  return (
    <svg
      className={`glyph glyph--${name}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {name === 'remove' && (
        <>
          <path d="M3.6 20.4 14 10" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d="M3.6 20.4 14 10" stroke="#3b2f6e" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12.6 11.4 14 10" stroke="var(--marigold)" strokeWidth="1.8" strokeLinecap="round" />
          <path
            className="glyph__star"
            d={STAR}
            transform="translate(17 7) scale(1.25)"
            fill="var(--marigold)"
            stroke={INK}
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <path d={STAR} transform="translate(21 13) scale(0.55)" fill="#9b7bff" />
          <path d={STAR} transform="translate(11.2 3.6) scale(0.5)" fill="#9b7bff" />
        </>
      )}
      {name === 'leave' && (
        <>
          <path
            d="M6.4 21.4h11.2l-1.6-3.4H8Z"
            fill="var(--wood)"
            stroke={INK}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="11.4" r="7.2" fill="#2f3f8f" stroke={INK} strokeWidth="1.5" />
          <path
            d="M8.2 8.2a4.4 4.4 0 0 1 3-2"
            fill="none"
            stroke="#fff"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* 睡著的月亮 */}
          <path d="M13.6 8.4a3.6 3.6 0 1 0 1.8 5.8 3 3 0 0 1-1.8-5.8Z" fill="var(--marigold)" />
          <path
            className="glyph__z"
            d="M17.6 1.6h3l-3 3.4h3"
            fill="none"
            stroke="#9b7bff"
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      )}
      {name === 'mine' && (
        <>
          {/* 自己放的魔法書：書頁間垂下一條紫色緞帶，尾端吊一顆金星 */}
          <rect x="3.4" y="3" width="17.2" height="9.6" rx="1.6" fill="#2f3f8f" stroke={INK} strokeWidth="1.4" />
          <path d="M6 5.4h11.6M6 7.8h8" stroke="var(--marigold)" strokeWidth="1" opacity="0.8" />
          <path
            className="glyph__ribbon"
            d="M13.2 10.4h4.4v8.6l-2.2-1.8-2.2 1.8Z"
            fill="#7b5fd0"
            stroke={INK}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d={STAR}
            transform="translate(15.4 21.2) scale(0.62)"
            fill="var(--marigold)"
            stroke={INK}
            strokeWidth="0.8"
          />
        </>
      )}
      {name === 'herald' && (
        <g className="glyph__owl">
          {/* 送信的貓頭鷹：抱著一封封著火漆的信 */}
          <path
            d="M4.6 10.2c0-4.4 3.3-7.6 7.4-7.6s7.4 3.2 7.4 7.6v4.4c0 3.8-3.3 6.4-7.4 6.4s-7.4-2.6-7.4-6.4Z"
            fill="#fffdf8"
            stroke={INK}
            strokeWidth="1.4"
          />
          <path d="M5 3.8 7.8 6.6M19 3.8 16.2 6.6" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="9" cy="9.8" r="2.4" fill="var(--marigold)" stroke={INK} strokeWidth="1.1" />
          <circle cx="15" cy="9.8" r="2.4" fill="var(--marigold)" stroke={INK} strokeWidth="1.1" />
          <circle cx="9" cy="9.8" r="0.95" fill={INK} />
          <circle cx="15" cy="9.8" r="0.95" fill={INK} />
          <path d="M11.2 12.2h1.6l-0.8 1.4Z" fill="var(--vermilion)" />
          <rect x="7.2" y="14.6" width="9.6" height="6.2" rx="0.8" fill="#f5e9cc" stroke={INK} strokeWidth="1.1" />
          <path d="M7.4 14.8 12 18.1l4.6-3.3" fill="none" stroke={INK} strokeWidth="0.9" />
          <circle cx="12" cy="18.3" r="1.2" fill="var(--vermilion)" />
        </g>
      )}
      {name === 'invite' && (
        <>
          {/* 長了翅膀的信：封著火漆，自己會飛 */}
          <g className="glyph__wings" fill="#fffdf8" stroke={INK} strokeWidth="1">
            <path d="M4.2 9.6C2.4 8.8 1.4 6.8 1.8 5c1.8 0 3.4 1.2 4 3" />
            <path d="M19.8 9.6c1.8-.8 2.8-2.8 2.4-4.6-1.8 0-3.4 1.2-4 3" />
          </g>
          <rect x="4" y="7.4" width="16" height="11" rx="1.4" fill="#f5e9cc" stroke={INK} strokeWidth="1.4" />
          <path d="M4.3 7.8 12 13.4l7.7-5.6" fill="none" stroke={INK} strokeWidth="1.2" />
          <circle cx="12" cy="13.6" r="2.2" fill="var(--vermilion)" stroke={INK} strokeWidth="1" />
          <path d={STAR} transform="translate(19.6 19.6) scale(0.55)" fill="var(--marigold)" />
        </>
      )}
      {name === 'recall' && (
        <>
          {/* 召回貓頭鷹：一根羽毛跟著箭頭飛回來 */}
          <path
            d="M5 18.6C6.4 11.8 11 6.8 17.6 4.6c-1.2 6.6-5.6 11.8-12.6 14Z"
            fill="#fffdf8"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M5 18.6 14.6 8.8" stroke={INK} strokeWidth="1" />
          <path
            d="M21 10.4c.4 5.6-3 9.6-8.4 10.2"
            fill="none"
            stroke="#9b7bff"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M15.8 18.2 12.6 20.8l3.4 2"
            fill="none"
            stroke="#9b7bff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {name === 'disband' && (
        <>
          {/* 解除契約：盾形徽章裂成兩半 */}
          <path
            d="M11.2 2.6 3.6 5.4v6.8c0 4.6 3.2 8 7.2 9.6l1.6-6.4-2.4-3.6 2.6-3.4Z"
            fill="#2f3f8f"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M13 2.6l7.4 2.8v6.8c0 4.6-3.2 8-7.4 9.6l1.4-6.4-2.2-3.6 2.4-3.4Z"
            fill="#45399a"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
            transform="translate(1.4 0.8) rotate(8 16 12)"
          />
          <path d={STAR} transform="translate(7.6 10) scale(0.6)" fill="var(--marigold)" />
        </>
      )}
      {name === 'skip' && (
        <>
          {/* 這次不了：一彎睡著的月亮 */}
          <path
            d="M14.6 3.6a8.6 8.6 0 1 0 6 14.4 7.2 7.2 0 0 1-6-14.4Z"
            fill="#c9b8ff"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M16.6 6.4h3l-3 3.2h3"
            fill="none"
            stroke="#5b3f8c"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {name === 'depart' && (
        <g className="glyph__broom">
          {/* 啟程：一支飛天掃帚往右上飛，後面拖著風和星光 */}
          <path d="M6.4 15.6 20.6 6.4" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M6.4 15.6 20.6 6.4" stroke="var(--wood)" strokeWidth="1.5" strokeLinecap="round" />
          <path
            d="M7.6 14.4 2 15.6 2.6 19.2 4.4 21.4 9.2 17.2Z"
            fill="var(--marigold)"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M3.4 17.2 7.6 16M4.4 19.6l4-2.6" stroke="#c08a20" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M7 13.6l2.2 3.4" stroke="#5b3f8c" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M1.6 10.4h3.4M3 7.6h2.6" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
          <path
            d={STAR}
            transform="translate(17.8 15.4) scale(0.62)"
            fill="var(--marigold)"
            stroke={INK}
            strokeWidth="0.9"
          />
        </g>
      )}
      {name === 'rename' && (
        <>
          {/* 署名：一支羽毛筆，筆尖拖出一道紫墨，旁邊亮一顆星 */}
          <g className="glyph__quill">
            <path
              d="M20.8 2.4C14.2 3.2 8.8 8.4 6.6 15.2l2.1.9C11.6 10.4 15.8 6.2 20.8 2.4Z"
              fill="#f5efe2"
              stroke={INK}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path d="M18.4 4.2C14.6 6.6 11.4 10 8.8 14.4" fill="none" stroke="#9b7bff" strokeWidth="1" />
            <path d="M6.6 15.2 4.8 20l2.9-3.3" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          </g>
          <path
            d="M3 21.6c2.2-.6 4.4-.2 6.6-1.2"
            fill="none"
            stroke="#5b3f8c"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d={STAR}
            transform="translate(17.4 17.4) scale(0.62)"
            fill="var(--marigold)"
            stroke={INK}
            strokeWidth="0.9"
          />
        </>
      )}
      {name === 'rethink' && (
        <g className="glyph__swirl">
          {/* 改變心意：咒語繞一圈回來，尾巴亮一顆星 */}
          <path
            d="M18.6 9.6A7.2 7.2 0 1 0 19 15.4"
            fill="none"
            stroke="#5b3f8c"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M19.8 4.6 18.8 9.8 13.8 8.6"
            fill="none"
            stroke="#5b3f8c"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={STAR}
            transform="translate(12 12.2) scale(0.78)"
            fill="var(--marigold)"
            stroke={INK}
            strokeWidth="0.9"
          />
        </g>
      )}
      {name === 'shake' && (
        <>
          <g className="glyph__ball">
            <path
              d="M7.4 21.4h9.2l-1.4-3H8.8Z"
              fill="var(--wood)"
              stroke={INK}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="11.6" r="6.6" fill="#45399a" stroke={INK} strokeWidth="1.5" />
            <path d={STAR} transform="translate(12 11.6) scale(0.9)" fill="var(--marigold)" />
          </g>
          <path
            d="M3.4 8.6c-1.5 2.1-1.5 4.9 0 7M20.6 8.6c1.5 2.1 1.5 4.9 0 7"
            fill="none"
            stroke={INK}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
