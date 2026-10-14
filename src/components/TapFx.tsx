'use client';

import { useEffect } from 'react';
import { useTheme } from '@/themes';
import { reducedMotion } from '@/lib/motion';
import './TapFx.css';

/**
 * 觸碰儀式：點畫面任何地方泛起一圈光、迸出幾片小東西（廟宇是金紙，魔法是星芒）。
 * 顏色來自主題的 --tap-* 變數，迸出什麼由 theme.tap 決定。在輸入框裡打字時不出現，避免干擾。
 */
export function TapFx() {
  const { theme } = useTheme();
  const { count, glyphs } = theme.tap;

  useEffect(() => {
    if (reducedMotion()) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const fx = document.createElement('span');
      fx.className = glyphs ? 'tapfx tapfx--glyphs' : 'tapfx';
      fx.style.left = `${e.clientX}px`;
      fx.style.top = `${e.clientY}px`;
      fx.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < count; i++) {
        const bit = document.createElement('i');
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.6;
        const d = 26 + Math.random() * 18;
        bit.style.setProperty('--dx', `${Math.cos(a) * d}px`);
        bit.style.setProperty('--dy', `${Math.sin(a) * d}px`);
        bit.style.setProperty('--r', `${Math.round(Math.random() * 180)}deg`);
        if (glyphs) bit.textContent = glyphs[i % glyphs.length];
        fx.appendChild(bit);
      }
      document.body.appendChild(fx);
      setTimeout(() => fx.remove(), 750);
    };
    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onDown);
  }, [count, glyphs]);

  return null;
}
