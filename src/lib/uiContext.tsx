'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface Ui {
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
  meOpen: boolean;
  setMeOpen: (v: boolean) => void;
}

const Ctx = createContext<Ui>({ addOpen: false, setAddOpen: () => {}, meOpen: false, setMeOpen: () => {} });

/** 跨頁面的小狀態：新增店家表單、個人設定是否打開 */
export function UiProvider({ children }: { children: ReactNode }) {
  const [addOpen, setAddOpen] = useState(false);
  const [meOpen, setMeOpen] = useState(false);
  const value = useMemo(() => ({ addOpen, setAddOpen, meOpen, setMeOpen }), [addOpen, meOpen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useUi = () => useContext(Ctx);
