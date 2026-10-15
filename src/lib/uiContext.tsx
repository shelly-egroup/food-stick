'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SLOT, type Slot } from './meal';

interface Ui {
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
  meOpen: boolean;
  setMeOpen: (v: boolean) => void;
  /** 首頁現在看哪一餐（預設午餐）；從通知點進來會切到那一餐 */
  slot: Slot;
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
  slot: DEFAULT_SLOT,
  setSlot: () => {},
  focus: null,
  setFocus: () => {},
});

/** 跨頁面的小狀態：新增店家表單、個人設定是否打開、首頁看哪一餐 */
export function UiProvider({ children }: { children: ReactNode }) {
  const [addOpen, setAddOpen] = useState(false);
  const [meOpen, setMeOpen] = useState(false);
  const [slot, setSlot] = useState<Slot>(DEFAULT_SLOT);
  const [focus, setFocus] = useState<string | null>(null);
  const value = useMemo(
    () => ({ addOpen, setAddOpen, meOpen, setMeOpen, slot, setSlot, focus, setFocus }),
    [addOpen, meOpen, slot, focus],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useUi = () => useContext(Ctx);
