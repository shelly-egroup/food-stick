import type { SVGProps } from 'react';

const PATHS = {
  stick: 'M6.5 11h11l-1.6 10H8.1L6.5 11ZM9 11 8 3.5M12 11V2.5M15 11l1-7.5',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm9 16-4.2-4.2',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  ban: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM5.6 5.6l12.8 12.8',
  pin: 'M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4h4',
  bellOff: 'M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8M10 20h4M4 4l16 16',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm10-14 4 4',
  share: 'M12 3v12M7 8l5-5 5 5M5 13v7h14v-7',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 17h2',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z',
  /** 掛在釘子上的菜牌：繩子、木牌、兩行直書 */
  hang: 'M12 2.6v.01M12 3.4 6.6 8.6M12 3.4l5.4 5.2M6 8.6h12v12.6H6ZM10.2 12v5.6M13.8 12v5.6',
  /** 魔法書：封面一顆星 */
  book: 'M5 4.6h11.6A2.4 2.4 0 0 1 19 7v13.4H7.4A2.4 2.4 0 0 1 5 18ZM5 18a2.4 2.4 0 0 1 2.4-2.4H19M12 7.4l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3Z',
  /** 星盤：一圈刻度裡連成一個星座 */
  chart:
    'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM7.6 9.6l3.6 2.2 4.6-2.6M11.2 11.8l1.2 4.6M7.6 9.6h.01M15.8 9.2h.01M12.4 16.4h.01M12 3v1.6M21 12h-1.6M12 21v-1.6M3 12h1.6',
  /** 設定：一顆齒輪 */
  gear: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM10.3 3h3.4l.5 2.4 1.7.9 2.3-.9 1.7 2.9-1.8 1.6v2.1l1.8 1.6-1.7 2.9-2.3-.9-1.7.9-.5 2.4h-3.4l-.5-2.4-1.7-.9-2.3.9-1.7-2.9 1.8-1.6V10.9L4.1 9.3l1.7-2.9 2.3.9 1.7-.9Z',
  /** 篩選：一個漏斗 */
  filter: 'M4 5h16l-6.2 7.6V19l-3.6 1.6v-8Z',
  /** 食籤簿：線裝簿子、三行字、垂下一條穗子 */
  ledger:
    'M6 3.5h11.5v15H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5ZM8.4 3.5v15M11 7.6h4M11 10.6h4M11 13.6h2.6M17.5 18.5v2.8M16.3 21.3h2.4',
  /** 冒險日誌：皮面日誌、扣環、封面一顆星 */
  journal:
    'M5.5 3.5h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-11ZM8 3.5v17M18.5 9.6h2v4.8h-2M12.6 8.2l.8 1.7 1.8.2-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.2Z',
  /** 金榜：兩根柱子撐著一面榜，上面三條名字 */
  board: 'M4 4.6h16v11H4ZM6.4 20.6V15.6M17.6 20.6V15.6M8.4 7.6v5M12 7.6v5M15.6 7.6v5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
