/** 主題的代號。這個檔案不引用任何元件，伺服器端與測試也能直接用。 */
export type ThemeId = 'temple' | 'magic';

/** 切換鈕上的順序 */
export const THEME_IDS: ThemeId[] = ['temple', 'magic'];

/** 第一次來、或讀不到偏好時用的主題 */
export const DEFAULT_THEME: ThemeId = 'temple';

export const isThemeId = (v: unknown): v is ThemeId => THEME_IDS.includes(v as ThemeId);
