'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Seal } from './Seal';
import './Toast.css';

interface ToastItem {
  id: number;
  text: string;
  seal: string;
  leaving?: boolean;
}

const Ctx = createContext<(text: string, seal?: string) => void>(() => {});

/** 提示訊息：一張小籤條從下方滑出，蓋上一個小章 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const show = useCallback((text: string, seal = '妥') => {
    const id = ++seq.current;
    setItems((list) => [...list.slice(-2), { id, text, seal }]);
    setTimeout(() => setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t))), 2600);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3000);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.leaving ? ' toast--leaving' : ''}`}>
            <Seal text={t.seal} size={28} rotate={-8} className="toast__seal" />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
