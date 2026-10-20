'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SLOT, slotFrom, taipeiDate, type Slot } from './meal';
import { useNow } from './useBrowser';
import { usePersisted } from './usePersisted';

interface Ui {
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
  meOpen: boolean;
  setMeOpen: (v: boolean) => void;
  /** 今天在這台裝置選過的那一餐（沒選過是 null，首頁自己照進行中的餐、時間決定）；從通知點進來會切到那一餐 */
  picked: Slot | null;
  setSlot: (s: Slot) => void;
  /** 從通知點進來的那一張餐單：首頁優先顯示它 */
  focus: string | null;
  setFocus: (id: string | null) => void;
}

const Ctx = createContext<Ui>({
  addOpen: false,
  setAddOpen: () => {},
  meOpen: false,
  setMeOpen: () => {},
  picked: null,
  setSlot: () => {},
  focus: null,
  setFocus: () => {},
});

/** 存著的「首頁看哪一餐」：哪一天選的、選了什麼 */
interface SavedSlot {
  date: string;
  slot: Slot;
}
const NO_SLOT: SavedSlot = { date: '', slot: DEFAULT_SLOT };
const cleanSaved = (v: unknown): SavedSlot => {
  const o = v as { date?: unknown; slot?: unknown } | null;
  const slot = slotFrom(o?.slot);
  return typeof o?.date === 'string' && slot ? { date: o.date, slot } : NO_SLOT;
};

/** 跨頁面的小狀態：新增店家表單、個人設定是否打開、首頁看哪一餐 */
export function UiProvider({ children }: { children: ReactNode }) {
  const [addOpen, setAddOpen] = useState(false);
  const [meOpen, setMeOpen] = useState(false);
  // 首頁看哪一餐：記在這台裝置上，今天重新整理還是剛剛選的那一餐；隔天就不算了
  const now = useNow();
  const [saved, setSaved] = usePersisted('lunchstick:slot', NO_SLOT, cleanSaved);
  const today = now ? taipeiDate(now) : '';
  const picked = today && saved.date === today ? saved.slot : null;
  const setSlot = useCallback((s: Slot) => setSaved({ date: taipeiDate(Date.now()), slot: s }), [setSaved]);
  const [focus, setFocus] = useState<string | null>(null);
  const value = useMemo(
    () => ({ addOpen, setAddOpen, meOpen, setMeOpen, picked, setSlot, focus, setFocus }),
    [addOpen, meOpen, picked, setSlot, focus],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useUi = () => useContext(Ctx);
