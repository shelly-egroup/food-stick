import type { ComponentType, ForwardRefExoticComponent, RefAttributes } from 'react';
import type gsap from 'gsap';
import type { IconName } from '@/components/Icon';
import type { DrawMode, Member, Restaurant } from '@/lib/types';
import type { ThemeId } from './ids';

export type { ThemeId };

/** 每個主題自己的用語。共用元件只讀這裡，不自己判斷是哪個主題。 */
export interface ThemeCopy {
  /** 切換鈕上的名字：廟宇、魔法 */
  label: string;
  /** 這個地方叫什麼：午餐求籤所 */
  place: string;
  /** 首頁標題上方那行英文小字（跟在 place 前面）：Fortune sticks、Crystal gazing */
  eyebrow: string;
  /** 抽一次叫什麼：求籤、施法（也是分頁名稱） */
  verb: string;
  /** 被抽中叫什麼：抽中、選中 */
  picked: string;
  drawCta: string;
  drawing: string;
  countLine: (n: number) => string;
  emptyTitle: string;
  /** 首頁大標的第二句 */
  tagline: string;
  /** 首頁大標下的說明：愛店優先、探店各一句 */
  lede: { favorites: string; explore: string };
  signInCta: string;
  signInBusy: string;
  signInLead: string;
  signInHint: string;
  signInError: string;
  rejectTitle: string;
  rejectBody: string;
  rejectCta: string;
  loading: string[];
  /** 籤卡上「再抽一次」的按鈕 */
  reroll: string;
  /** 決定就去這家的大按鈕（有地圖就順便打開）：起駕出發、啟程冒險 */
  go: string;
  /** 設定裡改名字：改完按這顆才生效（蓋章、署名） */
  rename: string;
  /** 重抽時嗆一句，依序使用 */
  /** 重抽時舞台上的碎念：第一、二、三次重抽各一組，每次從那一組隨機挑一句 */
  taunts: string[][];
  /** 重抽次數用完（籤卡上取代重抽鈕的那句話） */
  noMore: string;
  /** 次數用完之後：提醒從候選挑一支起駕 */
  pickFromCands: string;
  /** 定案章（兩個字）：起駕的那一支、首頁封住籤筒（水晶球）的封條、歷史 */
  finalSeal: string;
  /** 首頁封條上的大字（前面另有一塊餐別小牌）：「神明已定」 */
  finalBand: string;
  /** 愛店按鈕：還沒按、按下後，以及按鈕上的小字說明 */
  likeStamp: string;
  likedLabel: string;
  likeHint: string;
  likedHint: string;
  /** 店家詳情的「我不吃」按鈕：還沒按、按下後，以及按下後的小字說明 */
  blockCta: string;
  blockedLabel: string;
  blockedHint: string;
  blockSeal: string;
  signOut: string;
  accepted: string;
  acceptedGo: string;
  /** 決定之後提示框上的小章 */
  acceptSeal: string;
  /** 籤卡底部「解曰」 */
  verdictLabel: string;
  /**
   * 揪團：標題；自己存的名單叫什麼（進香團、冒險小隊）、存下來的按鈕、取名的提示、解散；
   * 只有自己時的插畫字與邀請按鈕
   */
  crew: {
    title: string;
    preset: string;
    save: string;
    /** 彈窗裡：團名、團員兩欄的標題，和最上面的一句說明 */
    name: string;
    members: string;
    hint: string;
    namePlaceholder: string;
    /** 就揪這團、就帶這隊 */
    apply: string;
    disband: string;
    /** 按了解散之後，再按一次才算數的按鈕字，與旁邊的一句提醒 */
    disbandAsk: string;
    disbandHint: string;
    /** 發組隊邀請：按鈕、發出去之後的標題、收回（取消這一餐）；再揪人的按鈕；大家回覆的統計 */
    send: string;
    sent: string;
    recall: string;
    add: string;
    addCta: (n: number) => string;
    tally: (going: number, wait: number, out: number) => string;
    /** 加入別人的團之後，首頁團面板的標題與「不跟了」的按鈕 */
    member: (host: string) => string;
    leave: string;
    emptyTitle: string;
    emptyHint: string;
    invite: string;
    invited: string;
  };
  /** 搖手機抽籤：首頁的提示（已經能搖、還要點一下才能搖、被拒絕了），設定裡的開關名稱與說明 */
  shake: {
    on: string;
    ask: string;
    /** 被拒絕時首頁的小標籤：點了打開解封籤 */
    denied: string;
    /** 解封籤：長得跟解籤的籤卡一樣，教使用者怎麼重新允許「動作與方向」 */
    unseal: {
      no: string;
      brand: string;
      /** 右上角的章（一個字）與它被讀出來的名稱 */
      seal: string;
      sealLabel: string;
      name: string;
      /** 四句籤詩 */
      lines: string[];
      /** 白話的步驟，放在「解曰／預言」後面 */
      steps: string;
      ok: string;
    };
    setting: string;
    settingHint: string;
  };
  /**
   * 一餐（自己吃、揪團吃都是）：揪人、抽籤、候選、起駕、去不了。
   * 首頁、籤卡、報馬仔（貓頭鷹）的卡片都用這裡的字；slot 是餐別（午餐、下午茶…）
   */
  meal: {
    /** 「小明 揪你一起吃午餐」 */
    invited: (host: string, slot: string) => string;
    /** 自己發起的、自己一個人的 */
    mine: (slot: string) => string;
    solo: (slot: string) => string;
    /** 回覆：要去、這次不了、改變心意；說這次不了之後的一句 */
    join: string;
    skip: string;
    rejoin: string;
    skipped: string;
    /** 「小明 求到了」 */
    drew: (name: string) => string;
    /** 「小明 起駕：巷口牛肉麵」 */
    decided: (name: string, shop: string) => string;
    /** 起駕的那一刻，大家畫面上的一句 */
    depart: string;
    map: string;
    /** 發起人收回 */
    closed: (host: string) => string;
    /** 每個人頭像旁的狀態：要去、不去、還沒回 */
    mark: { in: string; out: string; wait: string };
    /** 發起人收到的消息 */
    joinedBy: (name: string) => string;
    skippedBy: (name: string) => string;
    /** 籤卡上：「報馬仔已通知 3 位」 */
    notified: (n: number) => string;
    /** 起駕之後首頁的大按鈕：「看定案：巷口牛肉麵」 */
    look: (shop: string) => string;
    /** 還能重抽幾次 */
    left: (n: number) => string;
    /** 候選：標題、說明、剛抽到的那一支的小字、看全部的按鈕 */
    cands: string;
    candsHint: string;
    latest: string;
    lookAll: string;
    /** 這家去不了：按鈕、再按一次確定、別人按了之後的消息、沒有店可以補的時候 */
    cantGo: string;
    cantGoAsk: string;
    cantGoBy: (name: string, shop: string) => string;
    cantGoNone: string;
    /** 重新開張時：重抽次數接續原本的 */
    reopen: (n: number) => string;
    /** 篩選紙上設定這一餐可以重抽幾次：標題、說明、單位（炷／顆）、0 次時的說法 */
    stock: { title: string; hint: string; unit: string; none: string };
    /** 有人搶先一步抽了、這一餐已經結束 */
    raced: string;
    ended: string;
    /** 這一餐其實已經開了，只是畫面還沒同步到 */
    syncing: string;
  };
  /** 通知處：廟宇是敲鑼的報馬仔，魔法是送信的貓頭鷹；只放還在進行的餐 */
  herald: {
    name: string;
    eyebrow: string;
    lede: string;
    /** 每張卡片上的小標：我發起的、揪我的、自己的 */
    tags: { mine: string; invited: string; solo: string };
    emptyTitle: string;
    emptyHint: string;
    /** 上方通知鈕的說明（有幾件事等你回） */
    unread: (n: number) => string;
  };
  /** 歷史：廟宇是食籤簿，魔法是冒險日誌 */
  history: {
    title: string;
    eyebrow: string;
    lede: string;
    emptyTitle: string;
    emptyHint: string;
    error: string;
    more: string;
    end: string;
    /** 每一餐的結果 */
    result: { decided: string; none: string; cancelled: string; live: string };
    with: string;
    alone: string;
    cands: string;
    skipped: string;
    /** 封面的小統計：最常吃的店、最常同桌的人；還沒有的時候的說法 */
    noTop: string;
    noTopHint: string;
    topShop: string;
    topMate: string;
    noMateHint: string;
    /** 「小明 起駕」 */
    by: (name: string) => string;
    /** 這個月吃了幾餐 */
    count: (n: number) => string;
    /**
     * 四個分頁：全部、別人揪我的、我揪大家的、我一個人的。
     * 每一頁一顆章（一個字）、分頁上的名字、那一頁空著時插畫底下的兩行字
     */
    marks: Record<HistoryTab, string>;
    tabs: Record<HistoryTab, string>;
    none: Record<Exclude<HistoryTab, 'all'>, { title: string; hint: string }>;
  };
  /**
   * 紙條區的空狀態與讀不到時，插畫底下的兩行字；
   * remove 是自己的紙條上「拿掉」的按鈕，removeAsk 是按下去之後的確認，keep 是反悔
   */
  notes: {
    emptyTitle: string;
    emptyHint: string;
    errorTitle: string;
    errorHint: string;
    remove: string;
    removeAsk: string;
    keep: string;
  };
  /** 店家頁 */
  shops: {
    fansEmpty: { title: string; hint: string };
    eyebrow: string;
    /** 一張店家卡片叫什麼：菜牌、魔法書 */
    item: string;
    add: string;
    added: string;
    addedSeal: string;
    updated: string;
    emptyTitle: string;
    emptyBody: string;
    emptyCta: string;
    remove: string;
    removeConfirm: string;
    /** 確認拆掉時的說明（紙條也會一起清掉） */
    removeAsk: string;
    /** 建立者沒開放大家修改時，取代「修改資訊」的一句話 */
    locked: (owner: string) => string;
    removeYes: string;
    removeFailed: string;
    /** 卡片上「不吃」的封條字 */
    banned: string;
    /** 篩選後的結果：數字怎麼寫（十二、12）、後面接的字、清除條件的按鈕 */
    count: (n: number) => string;
    matched: string;
    clear: string;
    /** 「我掛的」「我放的」篩選鈕，與一家都還沒有時的兩行字 */
    mine: string;
    mineNone: string;
    mineNoneHint: string;
  };
  /** 排行榜 */
  ranks: {
    /** 分頁與頁面標題：金榜 */
    title: string;
    eyebrow: string;
    /** 「十月放榜」的放榜 */
    announce: string;
    /** 前三名的稱號，每個兩個字（印章放得下） */
    podium: [string, string, string];
    crown: string;
    /** 前三名還沒有人時的空位 */
    vacant: string;
    /** 第四名以後的名次：第四名、IV */
    no: (n: number) => string;
    /** 本月稱號：名字、徽章上的字、怎麼選出來的、得主的數字 */
    titles: Record<
      'picky' | 'pioneer' | 'collector',
      { name: string; mark: string; rule: string; desc: (n: number) => string }
    >;
    cold: string;
    coldNote: (n: number) => string;
    coldPhrase: (n: number) => string;
    archive: (n: number) => string;
    titlesEmpty: { title: string; hint: string };
    pager: { shelfPrev: string; shelfNext: string; notesPrev: string; notesNext: string };
    /** 還沒有店可以上榜：插畫底下的兩行字與去店家頁的按鈕 */
    emptyTitle: string;
    emptyHint: string;
    emptyCta: string;
  };
}

/** 歷史的分頁：全部、別人揪我的、我揪大家的、我一個人的 */
export type HistoryTab = 'all' | 'inbox' | 'sent' | 'solo';

/** 排行榜前三名的一格 */
export interface PodiumEntry {
  r: Restaurant;
  value: number;
}

export interface PodiumProps {
  /** 依名次排好，最多三個；不足三個時主題自己畫空位 */
  top: PodiumEntry[];
  /** 第四名以後（最多七個），主題自己排在前三名後面 */
  rest?: PodiumEntry[];
  /** 數字後面的單位：人愛、次命定 */
  unit: string;
  /** 換排序時重新揭曉 */
  revealKey: string;
  onOpen?: (r: Restaurant) => void;
}

/**
 * 進香團（冒險小隊）彈窗上方的小場景現在在演哪一段：
 * idle 平常；asking 問要不要解散；forming 組好了（約 1.1 秒）；cheering 改好了（約 0.65 秒）；parting 解散（約 1.1 秒）
 */
export type CrewPhase = 'idle' | 'asking' | 'forming' | 'cheering' | 'parting';

export interface CrewBannerProps {
  /** 團名；還沒取名時是空字串 */
  name: string;
  /** 團員，第一個是自己 */
  members: Pick<Member, 'id' | 'name' | 'photoURL'>[];
  phase: CrewPhase;
  /** 還在組的新團：旗子還沒升起來（徽章還沒成形） */
  fresh: boolean;
}

/** 主題的小圖：拆店（收書）、登出、搖手機、自己新增的店、通知處、組隊邀請、這家去不了、歷史、還沒有、一個人、抽過的籤（供桌、牌陣） */
export type GlyphName =
  | 'remove'
  | 'leave'
  | 'shake'
  | 'mine'
  | 'herald'
  | 'invite'
  | 'recall'
  | 'disband'
  | 'skip'
  | 'depart'
  | 'rename'
  | 'rethink'
  | 'closed'
  | 'ledger'
  | 'empty'
  | 'alone'
  | 'altar';
export interface GlyphProps {
  name: GlyphName;
  size?: number;
}

/**
 * 小插畫的種類：還沒有紙條、紙條讀不到、揪團時還沒有其他同事、
 * 還沒有任何店家、篩選（搜尋）後一家都沒有、排行榜還沒有店可以上榜
 */
export type VignetteKind =
  | 'notes-empty'
  | 'notes-error'
  | 'crew-empty'
  | 'shops-empty'
  | 'shops-none'
  | 'ranks-empty'
  | 'herald-empty'
  | 'history-empty'
  | 'history-inbox'
  | 'history-sent'
  | 'history-solo'
  | 'titles-empty'
  | 'fans-empty';

export interface VignetteProps {
  kind: VignetteKind;
  /** 換掉插畫底下的兩行字（例如搜尋不到時要寫搜尋的字） */
  title?: string;
  hint?: string;
}

/** 分享圖要畫的東西 */
export interface ShareCardData {
  restaurant: Restaurant;
  reading: Reading;
  liked: boolean;
  /** 籤卡上的店家標籤（類型、步行、可揪團）；價位另外畫成錢幣或魔力球 */
  tags: string[];
  /** 午餐求籤所、午餐水晶球 */
  place: string;
  date: Date;
  /** 網址，印在圖的最下面 */
  host: string;
}

export interface LoveSlotProps {
  on: boolean;
  /** 使用者剛剛按下去（不是一進來就是愛店）：要跑蓋章或施咒的動畫 */
  fresh: boolean;
}

/** 抽出來的籤詩（或預言） */
export interface Reading {
  number: number;
  /** 第十八籤、第十八頁 */
  numberText: string;
  grade: { seal: string; name: string };
  lines: [string, string, string, string];
  verdict: string;
  /** 籤卡抬頭：食神靈籤、水晶球預言 */
  brand: string;
  /** 分享時的開頭：抽到第十八籤・上上籤 */
  shareHead: string;
  /** 是哪個法器揭曉的（魔法版：book／ball） */
  variant?: string;
}

/** 首頁舞台下層（供桌、書桌）對外的操作 */
export interface StageHandle {
  /**
   * 抽籤儀式。pick 是使用者直接點的東西（例如魔法書或水晶球），沒有就由場景自己決定。
   * 回傳實際揭曉的是哪一個，會交給 read() 寫進籤詩。
   */
  draw: (pick?: string) => Promise<string | undefined>;
  /** 把場景收回原狀 */
  settle: () => Promise<void>;
}

export interface StageFloorProps {
  count: number;
  busy: boolean;
  label: string;
  onTap: (pick?: string) => void;
}

type Selector = ReturnType<typeof gsap.utils.selector>;
type Timeline = gsap.core.Timeline;

/** 入口的儀式動畫。共用的部分（面板、淡出時機）由 Gate 處理。 */
export interface GateRites {
  /** 帳號不是 egroup：門環叩叩、水晶球起霧 */
  reject: (q: Selector) => void;
  /** 登出回到入口：從敞開慢慢合上 */
  close: (tl: Timeline, q: Selector) => void;
  /** 走進去：最後要把 root 淡出 */
  enter: (tl: Timeline, q: Selector, root: HTMLElement) => void;
}

/** 店家卡片：廟宇是掛在牆上的菜牌，魔法是書架上的魔法書 */
export interface ShopCardProps {
  r: Restaurant;
  liked: boolean;
  blocked: boolean;
  likes: number;
  /** 自己新增的店：廟宇菜牌下掛一條紅流蘇，魔法書夾一條書籤緞帶 */
  mine?: boolean;
  /** 店家詳情裡的大張版本 */
  big?: boolean;
  /**
   * new：剛掛上去（剛放上書架）；removing：店家詳情裡拆下來的整段儀式（約 1.6 秒，聲音也由卡片負責）；
   * gone：回到牆上時同一段儀式的快轉版（約 0.7 秒）
   */
  state?: 'new' | 'removing' | 'gone';
  /** 有給才是可以點的按鈕 */
  onOpen?: () => void;
}

/** 方形日期章：店家的張貼日期、食籤簿（冒險日誌）每一天的頁首；三行寫年份、月/日、星期 */
export interface DateStampProps {
  date: Date;
  size?: number;
  /** 讀螢幕的人聽到的說法（例如「張貼於 2026 年 9 月 10 日」）；沒給就念日期 */
  label?: string;
  className?: string;
}

export interface LoveStampProps {
  size: number;
  className?: string;
  /** 有 label 才會被讀出來；裝飾用就不給 */
  label?: string;
  /** 揭曉時用的法器（魔法版：book／ball），章的樣子跟著它 */
  variant?: string;
  /** 沒有 variant 時，用它（店家 id）固定挑一款 */
  seed?: string;
}

export interface Theme {
  id: ThemeId;
  copy: ThemeCopy;
  /** 分頁列上「抽」的圖示 */
  tabIcon: IconName;
  /** 分頁列上「店家」「歷史」「排行榜」的圖示：廟宇是菜牌、食籤簿、金榜；魔法是魔法書、冒險日誌、星盤 */
  tabIcons: { shops: IconName; history: IconName; ranks: IconName };
  /** 主題的招牌音效：搖鈴、星光 */
  sound: () => void;
  /** 有人揪你、抽到了、出發了：報馬仔敲鑼、貓頭鷹叫兩聲 */
  heraldSound: () => void;
  /** 自己點上方的報馬仔（貓頭鷹）時：沒有新消息輕輕一下（木槌碰鑼、貓頭鷹探頭），有新消息就照樣敲鑼（叫兩聲） */
  heraldTap: (news: boolean) => void;
  /** 按下出發（起駕出發、啟程冒險）時的那一下：鞭炮炸開、掃帚飛上天 */
  departFx: (from: Element) => void;
  /** 切換鈕上的小圖 */
  Emblem: ComponentType;
  /** 店家卡片；愛店章、封條要帶 data-part="love"／"ban"，店家詳情會用它們做蓋章動畫 */
  ShopCard: ComponentType<ShopCardProps>;
  /** 愛店章：店家卡片和籤卡上都會蓋 */
  LoveStamp: ComponentType<LoveStampProps>;
  /** 方形日期章：廟宇是朱印，魔法是帶月相的星郵票 */
  DateStamp: ComponentType<DateStampProps>;
  /** 愛店按鈕左邊的圖：廟宇是蓋章處，魔法是愛心咒的法陣；按下去的動畫和聲音也由它負責 */
  LoveSlot: ComponentType<LoveSlotProps>;
  /** 排行榜前三名：廟宇是金榜，魔法是星盤；揭曉動畫也由它負責 */
  Podium: ComponentType<PodiumProps>;
  /** 本月稱號旁的徽章 */
  Badge: ComponentType<{ text: string; size?: number }>;
  /** 空狀態、讀不到資料時的小插畫（廟宇是佈告欄、店家牆、金榜，魔法是羊皮紙、水晶球、書櫃、星盤） */
  Vignette: ComponentType<VignetteProps>;
  /** 進香團的團旗（魔法：冒險小隊的徽章）：彈窗上方的小場景；組團、改團、解散的動畫與聲音都由它負責 */
  CrewBanner: ComponentType<CrewBannerProps>;
  /** 帶顏色的小圖示：廟宇是木槌、半開的廟門、籤筒；魔法是魔杖、睡著的水晶球、發光的水晶球 */
  Glyph: ComponentType<GlyphProps>;
  /** 價位：廟宇是古錢、魔法是魔力球，n 是幾個 */
  PriceMark: ComponentType<{ n: number; size?: number }>;
  /** 把籤卡畫成一張 1080×1350 的分享圖 */
  drawShare: (ctx: CanvasRenderingContext2D, d: ShareCardData) => Promise<void>;
  /** 載入中的小儀式 */
  Loader: ComponentType<{ size?: number; label?: string }>;
  /** 入口門面 */
  Facade: ComponentType;
  rites: GateRites;
  /** 首頁舞台：上層貼齊頂部，下層貼齊底部 */
  StageTop: ComponentType;
  StageFloor: ForwardRefExoticComponent<StageFloorProps & RefAttributes<StageHandle>>;
  /** 寫籤詩；variant 是 StageHandle.draw() 的回傳值；rand 給固定種子的亂數，揪團時大家看到同一張 */
  read: (r: Restaurant, mode: DrawMode, variant?: string, rand?: () => number) => Reading;
  /** 籤卡外觀 */
  card: {
    /** 對應主題 card.css 裡的樣式 */
    className: string;
    /** 直書：籤詩一行一行由上往下展開 */
    vertical: boolean;
    /** 毛邊紙 */
    deckle: boolean;
    /** 右上角的籤等章，className 要帶 card__seal */
    Seal: ComponentType<{ text: string; label: string }>;
    /** 籤等章落下後歪幾度；章上有 HTML 文字的主題給 0，改用 CSS 只歪底下的形狀，字才清楚 */
    sealTilt: number;
  };
  /** 點畫面時迸出的小東西；有 glyphs 就用文字，沒有就是小紙片 */
  tap: { count: number; glyphs?: string[] };
}
