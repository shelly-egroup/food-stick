import type { GlyphProps } from '../types';

const INK = '#26211d';

/**
 * 廟宇的小圖：拆菜牌是一把木槌、出廟是一扇半開的朱紅廟門（門縫透光、金色門釘）、
 * 搖手機是一個晃動的籤筒、自己掛的菜牌是一條紅流蘇。
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
          {/* 木柄 */}
          <path d="M4.6 20.4 13.2 11.8" stroke={INK} strokeWidth="4.4" strokeLinecap="round" />
          <path d="M4.6 20.4 13.2 11.8" stroke="var(--wood)" strokeWidth="2" strokeLinecap="round" />
          {/* 槌頭 */}
          <path
            className="glyph__head"
            d="M13.5 4.4 20.6 11.5 17.5 14.6 10.4 7.5Z"
            fill="#6b625a"
            stroke={INK}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M12.3 6.4 18.5 12.6" stroke="#9a9086" strokeWidth="1" />
          {/* 敲下去的力道 */}
          <path
            d="M20.8 3.4 22.4 1.8M22.2 6.6h1.4M17.6 1.6V0.4"
            stroke="var(--vermilion)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
      {name === 'leave' && (
        <>
          {/* 門楣與小屋頂 */}
          <path d="M2.8 6.6 12 2.4l9.2 4.2" fill="none" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="4.4" y="6.2" width="15.2" height="15.6" fill="#fff3c4" stroke={INK} strokeWidth="1.5" />
          {/* 左門扇（關著）＋門釘 */}
          <rect x="5.2" y="7" width="6.8" height="14" fill="var(--vermilion)" stroke={INK} strokeWidth="1.3" />
          <g fill="var(--marigold)">
            <circle cx="7.4" cy="10" r="0.9" />
            <circle cx="9.9" cy="10" r="0.9" />
            <circle cx="7.4" cy="13.2" r="0.9" />
            <circle cx="9.9" cy="13.2" r="0.9" />
            <circle cx="7.4" cy="16.4" r="0.9" />
            <circle cx="9.9" cy="16.4" r="0.9" />
          </g>
          {/* 右門扇往外打開，門縫透出光 */}
          <path
            className="glyph__leaf"
            d="M12 7 16.6 8.6V19.4L12 21Z"
            fill="var(--vermilion-lo)"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M2 21.8h20" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {name === 'mine' && (
        <g className="glyph__tassel">
          {/* 自己掛的菜牌：底下垂一條紅流蘇（金色繩結） */}
          <path
            d="M12 0.8c-3.2 2-3.2 5.2 0 6.8 3.2-1.6 3.2-4.8 0-6.8Z"
            fill="none"
            stroke="var(--vermilion)"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="9.4" r="2.7" fill="var(--marigold)" stroke={INK} strokeWidth="1.2" />
          <rect
            x="9.2"
            y="12"
            width="5.6"
            height="2.4"
            rx="0.6"
            fill="var(--marigold)"
            stroke={INK}
            strokeWidth="1.1"
          />
          <path
            d="M9.6 14.4h4.8l2.2 8.4H7.4Z"
            fill="var(--vermilion)"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M10.6 15.4 9.8 22.4M12 15.4v7M13.4 15.4l.8 7" stroke="var(--vermilion-lo)" strokeWidth="0.9" />
        </g>
      )}
      {name === 'herald' && (
        <>
          {/* 報馬仔的銅鑼：吊在橫木上，旁邊一支鑼槌 */}
          <path d="M4.4 3.6h15.2" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8.6 3.8 9.8 6.9M15.4 3.8l-1.2 3.1" stroke={INK} strokeWidth="1.1" />
          <g className="glyph__gong">
            <circle cx="12" cy="13" r="7" fill="var(--marigold)" stroke={INK} strokeWidth="1.5" />
            <circle cx="12" cy="13" r="3.4" fill="#d99a26" stroke={INK} strokeWidth="1" />
            <path
              d="M7.9 10.4a4.8 4.8 0 0 1 3-2.2"
              fill="none"
              stroke="#fff3c4"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>
          <g className="glyph__mallet">
            <path d="M18.4 22 21.8 17.6" stroke="var(--wood-lo)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="22" cy="17" r="1.7" fill="var(--vermilion)" stroke={INK} strokeWidth="1" />
          </g>
        </>
      )}
      {name === 'invite' && (
        <g transform="rotate(-8 12 12)">
          {/* 紅帖：朱紅帖子、金框、正中一顆金印 */}
          <rect
            x="4.6"
            y="3.2"
            width="14.8"
            height="17.6"
            rx="1"
            fill="var(--vermilion)"
            stroke={INK}
            strokeWidth="1.4"
          />
          <rect x="6.4" y="5" width="11.2" height="14" fill="none" stroke="var(--marigold)" strokeWidth="1" />
          <rect x="9.3" y="8.8" width="5.4" height="5.4" fill="var(--marigold)" stroke={INK} strokeWidth="0.8" />
          <path d="M10.4 11.5h3.2M12 9.9v3.2" stroke="var(--vermilion)" strokeWidth="1.1" />
        </g>
      )}
      {name === 'recall' && (
        <>
          {/* 收回紅帖：帖子被一隻手（箭頭）收回來 */}
          <g transform="rotate(-8 10 12)">
            <rect
              x="4"
              y="4.4"
              width="11"
              height="14.6"
              rx="0.8"
              fill="var(--vermilion)"
              stroke={INK}
              strokeWidth="1.3"
            />
            <rect x="5.6" y="6" width="7.8" height="11.4" fill="none" stroke="var(--marigold)" strokeWidth="0.9" />
          </g>
          <path d="M22 9.6c0 5-3.2 8.4-8 8.6" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M16.6 15.6 13.6 18.2l3.2 2.4"
            fill="none"
            stroke={INK}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {name === 'disband' && (
        <>
          {/* 收旗散團：旗桿倒向一邊、旗子垂下來 */}
          <path d="M5.4 21.6 15.8 3.6" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
          <path d="M5.4 21.6 15.8 3.6" stroke="var(--wood)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16.2" cy="3.2" r="1.8" fill="var(--marigold)" stroke={INK} strokeWidth="1" />
          <path
            d="M14.4 6 C 17 7.4, 19.4 7, 21.6 6.2 L 20.4 13.4 C 18.6 14.4, 16.2 14.4, 13.6 13.6 L 11.6 9.6 Z"
            fill="var(--vermilion)"
            stroke={INK}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M3 22.4h7" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
      {name === 'skip' && (
        <>
          {/* 這次不了：一顆墨色的「改天」小章 */}
          <rect
            x="3.2"
            y="5"
            width="17.6"
            height="14"
            rx="1.6"
            fill="var(--paper-hi)"
            stroke={INK}
            strokeWidth="1.5"
            transform="rotate(-6 12 12)"
          />
          <path
            d="M7.4 10.4h4.2M9.5 8.4v6M13.8 8.6l1.8 3.2 1.8-3.2M15.6 11.8v3.4"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinecap="round"
            transform="rotate(-6 12 12)"
          />
        </>
      )}
      {name === 'depart' && (
        <>
          {/* 起駕：一支點了引信的大鞭炮，火花往外噴 */}
          <g className="glyph__cracker" transform="rotate(-28 11.6 14.6)">
            <rect
              x="7.8"
              y="9.2"
              width="7.6"
              height="13"
              rx="1.6"
              fill="var(--vermilion)"
              stroke={INK}
              strokeWidth="1.4"
            />
            <path d="M7.8 12.2h7.6M7.8 19.2h7.6" stroke="var(--marigold)" strokeWidth="1.5" />
            <path d="M10.4 14.6h2.4M11.6 13.4v4.6" stroke="#fff3c4" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M11.6 9.2c0-1.8 1.2-2.6 2-3.8" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
          </g>
          <g className="glyph__spark">
            <circle cx="9.4" cy="4.6" r="1.4" fill="var(--marigold)" stroke={INK} strokeWidth="0.9" />
            <path
              d="M9.4 1.4V.4M12.4 2.4l.9-.9M13.4 5h1.2M6.4 2.4l-.9-.9M5.6 5.4H4.4"
              stroke="var(--vermilion)"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </g>
        </>
      )}
      {name === 'rename' && (
        <>
          {/* 改名：木頭印章往下蓋，旁邊留下一方紅印 */}
          <g className="glyph__stamp">
            <circle cx="8.6" cy="4.4" r="2.6" fill="var(--wood)" stroke={INK} strokeWidth="1.3" />
            <path d="M7.2 6.8h2.8v3.4H7.2Z" fill="var(--wood)" stroke={INK} strokeWidth="1.2" />
            <path d="M3.6 10.2h10v4.6h-10Z" fill="var(--wood-lo)" stroke={INK} strokeWidth="1.3" />
            <path d="M3.6 13.6h10" stroke="var(--vermilion)" strokeWidth="1.6" />
          </g>
          <g transform="rotate(-6 16.8 18.2)">
            <rect
              x="12.6"
              y="14"
              width="8.4"
              height="8.4"
              rx="0.8"
              fill="var(--vermilion)"
              stroke={INK}
              strokeWidth="1.1"
            />
            <rect x="14.2" y="15.6" width="5.2" height="5.2" fill="none" stroke="var(--paper-hi)" strokeWidth="1" />
            <path d="M15.8 17.4h2M16.8 17.4v2.2" stroke="var(--paper-hi)" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        </>
      )}
      {name === 'rethink' && (
        <g className="glyph__blocks">
          {/* 改變心意：擲一對筊杯，一正一反，再問一次 */}
          <path
            d="M3 13.4c0-4 2.8-7.2 6.6-7.6.6 0 .9.6.6 1.1-1.6 2.2-1.8 5.2-.4 7.6.3.5 0 1.1-.6 1.1H4.1c-.6 0-1.1-.5-1.1-1.1Z"
            fill="var(--vermilion)"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M21 17.4c0-3.6-2.8-6.6-6.4-6.8-.6 0-.9.6-.6 1.1 1.4 1.8 1.4 4.4 0 6.2-.3.5 0 1.1.6 1.1h5.3c.6 0 1.1-.5 1.1-1.1Z"
            fill="#e8a33c"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
            transform="rotate(180 17.4 15)"
          />
          <path
            d="M11.6 4.2c1.8-.6 3.8-.2 5.2 1.1M12.4 20.2c-1.8.6-3.8.2-5.2-1.1"
            fill="none"
            stroke={INK}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      )}
      {name === 'closed' && (
        <>
          {/* 這家去不了：屋簷下鐵捲門拉了一半，掛著一塊朱紅「休」牌 */}
          <path d="M2.6 8 4.4 4h15.2l1.8 4Z" fill="var(--jade)" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="4" y="8" width="16" height="13" fill="var(--paper-hi)" stroke={INK} strokeWidth="1.4" />
          <g className="glyph__shutter">
            <rect x="5.4" y="9.2" width="13.2" height="8.6" fill="#b8b0a6" stroke={INK} strokeWidth="1.1" />
            <path d="M5.4 11.6h13.2M5.4 14h13.2M5.4 16.4h13.2" stroke={INK} strokeWidth="0.7" opacity="0.6" />
          </g>
          <g transform="rotate(-8 12 17.4)">
            <rect
              x="8.8"
              y="14.4"
              width="6.4"
              height="6"
              rx="0.6"
              fill="var(--vermilion)"
              stroke={INK}
              strokeWidth="1.1"
            />
            <path d="M10.4 16.4h3.2M12 15.6v3.6M10.8 18.8l1.2-1.6 1.2 1.6" stroke="var(--paper-hi)" strokeWidth="0.9" />
          </g>
        </>
      )}
      {name === 'ledger' && (
        <>
          {/* 食籤簿：朱紅封面的線裝簿，白色題簽，金線穿釘，垂一條穗子 */}
          <rect
            x="5"
            y="3.4"
            width="14"
            height="17.6"
            rx="0.8"
            fill="var(--vermilion)"
            stroke={INK}
            strokeWidth="1.4"
          />
          <rect x="8" y="5.6" width="4.4" height="10.4" fill="var(--paper-hi)" stroke={INK} strokeWidth="1" />
          <path d="M10.2 7.6v6.4" stroke={INK} strokeWidth="1" strokeLinecap="round" />
          <g stroke="var(--marigold)" strokeWidth="1.1" strokeLinecap="round">
            <path d="M16.4 3.4v17.6" />
            <path d="M16.4 6.4h2.6M16.4 10.4h2.6M16.4 14.4h2.6M16.4 18.4h2.6" />
          </g>
          <path
            className="glyph__tassel"
            d="M19 18.4c1.4 1 1.6 2.4 1.2 4"
            stroke={INK}
            strokeWidth="1.1"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
      {name === 'empty' && (
        <>
          {/* 還沒有：一只空碗，筷子擱在碗口，旁邊一個小小的問號 */}
          <path d="M3.4 12.4h17.2a8.6 7.4 0 0 1-17.2 0Z" fill="var(--paper-hi)" stroke={INK} strokeWidth="1.4" />
          <path
            d="M9 19.4h6l-.7 2.2H9.7Z"
            fill="var(--vermilion)"
            stroke={INK}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M2.4 10.4 20.8 6.2M3 11.8l18.4-4.2"
            stroke="var(--wood-lo)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            className="glyph__ask"
            d="M10.2 1.8a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.6.5-.6 1.1M12 6.3v.1"
            fill="none"
            stroke="var(--vermilion)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </>
      )}
      {name === 'alone' && (
        <>
          {/* 一個人：小圓桌上只擺一碗冒著熱氣的飯 */}
          <ellipse cx="12" cy="13.4" rx="9.4" ry="3.6" fill="var(--vermilion)" stroke={INK} strokeWidth="1.3" />
          <path d="M7.6 16.6 6.6 21.2M16.4 16.6l1 4.6" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9.2 12.6h5.6a2.8 2 0 0 1-5.6 0Z" fill="var(--paper-hi)" stroke={INK} strokeWidth="1.1" />
          <path
            d="M11 10.8c-.5-.8.5-1.3 0-2.2M13 10.8c-.5-.8.5-1.3 0-2.2"
            fill="none"
            stroke={INK}
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.6"
          />
        </>
      )}
      {name === 'altar' && (
        <>
          {/* 供桌：木桌面、朱紅桌巾滾金邊，桌上橫放著兩支抽過的籤 */}
          <g transform="rotate(5 12 6)">
            <rect
              x="6"
              y="4.6"
              width="12.4"
              height="1.9"
              rx="0.95"
              fill="var(--bamboo)"
              stroke={INK}
              strokeWidth="0.9"
            />
            <path d="M15.6 4.6h2a.95.95 0 0 1 0 1.9h-2Z" fill="var(--vermilion)" />
          </g>
          <g transform="rotate(-6 12 8)">
            <rect
              x="4.8"
              y="7"
              width="13.6"
              height="1.9"
              rx="0.95"
              fill="var(--bamboo)"
              stroke={INK}
              strokeWidth="0.9"
            />
            <path d="M6.8 7h-1a.95.95 0 0 0 0 1.9h1Z" fill="var(--vermilion)" />
          </g>
          <path d="M2.6 9.8h18.8v2.2H2.6Z" fill="var(--wood)" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M4 12h16v6.2H4Z" fill="var(--vermilion)" stroke={INK} strokeWidth="1.3" />
          <path d="M5.4 13.6h13.2M5.4 16.6h13.2" stroke="var(--marigold)" strokeWidth="0.9" />
          <path d="M5.2 18.2v3.2M18.8 18.2v3.2" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {name === 'shake' && (
        <>
          <g className="glyph__tube">
            <path
              d="M10.2 9.6 8.8 3.2M12 9.4V2.6M13.8 9.6l1.4-5.8"
              stroke={INK}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M8.2 9.2h7.6l-1 12H9.2Z"
              fill="var(--vermilion)"
              stroke={INK}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M8.6 13.2h6.8" stroke="var(--marigold)" strokeWidth="1.4" />
          </g>
          <path
            d="M4.4 9.5c-1.6 2.2-1.6 5.3 0 7.5M19.6 9.5c1.6 2.2 1.6 5.3 0 7.5"
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
