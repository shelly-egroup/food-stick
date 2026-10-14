'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import './Sheet.css';

/** 手機往下拖超過這個距離就關掉 */
const DRAG_CLOSE = 90;

/**
 * 彈出的紙卷：手機從底部滑上來，電腦在畫面中央展開。
 * 用原生 <dialog>，焦點鎖定與 Esc 關閉由瀏覽器處理。
 * 不放關閉鈕：點紙卷外面、按 Esc、手機上把紙卷往下拖，都會關掉。
 */
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  icon,
  children,
  footer,
  aside,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  /** 標題左邊的小圖（主題的圖示） */
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** 標題右邊的小動作（例如「修改」） */
  aside?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; y: number; dy: number } | null>(null);
  // 關閉動畫播完之前，內容要留著
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      d.classList.remove('sheet--closing');
      paper.current?.style.removeProperty('transform');
      if (!d.open) d.showModal();
      document.documentElement.style.overflow = 'hidden';
      return;
    }
    if (!d.open) return;
    d.classList.add('sheet--closing');
    const t = setTimeout(() => {
      d.close();
      d.classList.remove('sheet--closing');
      paper.current?.style.removeProperty('transform');
      document.documentElement.style.overflow = '';
      setMounted(false);
    }, 240);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => () => void (document.documentElement.style.overflow = ''), []);

  // 手機：抓著頂端往下拖，放手時夠遠就關掉，不夠遠就彈回去
  const onDragStart = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') return;
    drag.current = { id: e.pointerId, y: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !paper.current) return;
    d.dy = Math.max(0, e.clientY - d.y);
    paper.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onDragEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !paper.current) return;
    // 關掉時從現在的位置繼續往下滑（關閉動畫的起點就是這個 transform）
    if (d.dy > DRAG_CLOSE) onClose();
    else paper.current.style.removeProperty('transform');
  };

  return (
    <dialog
      ref={ref}
      className={`sheet${wide ? ' sheet--wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet__paper" ref={paper}>
        <header
          className="sheet__head"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          {icon && (
            <span className="sheet__icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <div className="sheet__titles">
            {eyebrow && <div className="sheet__eyebrow">{eyebrow}</div>}
            <h2 className="sheet__title" tabIndex={-1} autoFocus>
              {title}
            </h2>
          </div>
          {aside && (
            <div className="sheet__aside" onPointerDown={(e) => e.stopPropagation()}>
              {aside}
            </div>
          )}
          {/* 平常看不到；用鍵盤 Tab 到這裡時才出現 */}
          <button type="button" className="sheet__close" onClick={onClose}>
            關閉
          </button>
        </header>
        <div className="sheet__body">{open || mounted ? children : null}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </div>
    </dialog>
  );
}
