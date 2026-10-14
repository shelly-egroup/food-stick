import type { ThemeId } from './ids';
import type { Theme } from './types';
import { temple } from './temple';
import { magic } from './magic';

/**
 * 主題登錄表。要加一個新主題：
 * 1. 在 ids.ts 加上代號
 * 2. 複製一個主題資料夾，改文字、畫面、儀式
 * 3. 在這裡登記
 */
export const THEMES: Record<ThemeId, Theme> = { temple, magic };
