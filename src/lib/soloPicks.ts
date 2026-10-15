import type { Reading, Theme } from '@/themes';
import type { Restaurant } from './types';
import { seeded } from './random';

/**
 * 自己一個人抽的籤詩：只記在這台裝置（資料庫的抽籤紀錄沒有存籤詩）。
 * 報馬仔「自己來拜拜」、首頁「請看今日定案」用它攤開當時那一首；換了裝置找不到，就用紀錄的 id 當種子重寫一首（每次都一樣）。
 */
export interface SoloPick {
  /** 抽籤紀錄的 id */
  id: string;
  rid: string;
  seed: number;
  variant: string;
  lines: string[];
  verdict: string;
}

const KEY = (uid: string) => `lunchstick:solo:${uid}`;
const KEEP = 12;

function readAll(uid: string): SoloPick[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(uid)) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function saveSoloPick(uid: string, pick: SoloPick) {
  try {
    const list = [pick, ...readAll(uid).filter((p) => p.id !== pick.id)].slice(0, KEEP);
    localStorage.setItem(KEY(uid), JSON.stringify(list));
  } catch {
    /* 無痕模式存不了：之後就用 id 重寫一首 */
  }
}

/** 抽籤紀錄的 id 變成固定的種子 */
const seedOf = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2_000_000_000, 7);

/** 這一筆自己抽的紀錄當時的籤詩（記得的話原樣攤開，AI 寫的也一樣） */
export function soloReading(theme: Theme, r: Restaurant, uid: string, drawId: string): Reading {
  const pick = readAll(uid).find((p) => p.id === drawId && p.rid === r.id);
  const reading = theme.read(r, 'solo', pick?.variant || undefined, seeded(pick?.seed ?? seedOf(drawId)));
  return pick && pick.lines.length === 4 && pick.verdict
    ? { ...reading, lines: pick.lines as Reading['lines'], verdict: pick.verdict }
    : reading;
}
