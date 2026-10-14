'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ThemeSwitch, useTheme } from '@/themes';
import { knock } from '@/lib/sound';
import { reducedMotion } from '@/lib/motion';
import './Gate.css';

export type GateMode = 'loading' | 'signin' | 'reject' | 'enter';

/**
 * 入口：載入、登入都在門前完成。只有 egroup 帳號能進，其他帳號會被婉拒。
 * mode 變成 enter 時跑主題的進門儀式（開門、喚醒水晶球），走進去後呼叫 onEntered。
 * 門面長什麼樣、門怎麼開，都由目前的主題決定（src/themes/<主題>/Facade.tsx、rites.ts）。
 */
export function Gate({
  mode,
  onSignIn,
  onEntered,
  onSignOut,
  closing = false,
}: {
  mode: GateMode;
  onSignIn: () => Promise<void>;
  onEntered: () => void;
  onSignOut?: () => void;
  closing?: boolean;
}) {
  const { theme } = useTheme();
  const { copy, Facade, Loader, rites } = theme;
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'loading') return;
    const t = setInterval(() => setLine((i) => (i + 1) % copy.loading.length), 1300);
    return () => clearInterval(t);
  }, [mode, copy]);

  // 量好面板多高（--panel-h）：手機上門面可以縮到面板上方，不被面板蓋住。
  // 進門時不再量，門面才不會在動畫中途跳動。
  useLayoutEffect(() => {
    const el = panel.current;
    const host = root.current;
    if (!el || !host || mode === 'enter') return;
    const measure = () => host.style.setProperty('--panel-h', `${el.offsetHeight}px`);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  // 不是 egroup 帳號：叩門（或水晶球晃一晃），面板也跟著抖
  useEffect(() => {
    if (mode !== 'reject' || !root.current) return;
    knock();
    if (reducedMotion()) return;
    const q = gsap.utils.selector(root.current);
    rites.reject(q);
    gsap.fromTo(q('.gate__panel'), { x: 0 }, { x: 8, duration: 0.06, repeat: 5, yoyo: true, clearProps: 'x' });
  }, [mode, rites]);

  // 登出：入口從敞開的狀態合上
  useLayoutEffect(() => {
    if (!closing || !root.current || reducedMotion()) return;
    const q = gsap.utils.selector(root.current);
    const tl = gsap.timeline();
    tl.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    rites.close(tl, q);
    return () => void tl.kill();
    // 只在開始登出時跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  // 進門
  useEffect(() => {
    if (mode !== 'enter' || !root.current) return;
    const el = root.current;
    if (reducedMotion()) {
      const tl = gsap.to(el, { opacity: 0, duration: 0.3, onComplete: onEntered });
      return () => void tl.kill();
    }
    const q = gsap.utils.selector(el);
    const tl = gsap.timeline({ onComplete: onEntered });
    tl.add(() => theme.sound()).to(q('.gate__panel'), { y: 24, opacity: 0, duration: 0.3, ease: 'power2.in' });
    rites.enter(tl, q, el);
    return () => void tl.kill();
    // 只在 mode 變成 enter 時跑一次；中途換主題不重播
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const signIn = async () => {
    setBusy(true);
    setError('');
    try {
      await onSignIn();
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (!code.includes('popup-closed') && !code.includes('cancelled')) {
        console.warn('登入失敗', code || err);
        setError(copy.signInError);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={root} className={`gate gate--${mode} gate--${theme.id}`}>
      <Facade />

      {mode !== 'enter' && (
        <div className="gate__switch gate__switch--top">
          <ThemeSwitch compact />
        </div>
      )}

      <div ref={panel} className="gate__panel" aria-live="polite">
        {mode === 'loading' && (
          <div className="panel__loading">
            <Loader size={40} />
            <p className="panel__line" key={line}>
              {copy.loading[line]}
              <span className="dots" aria-hidden="true">
                <i>．</i>
                <i>．</i>
                <i>．</i>
              </span>
            </p>
          </div>
        )}

        {mode === 'signin' && (
          <div className="panel__signin">
            <p className="panel__lead">{copy.signInLead}</p>
            <button type="button" className="btn btn--zhu btn--lg panel__cta" onClick={signIn} aria-disabled={busy}>
              {busy ? <Loader size={22} label="登入中" /> : <GoogleMark />}
              {busy ? copy.signInBusy : copy.signInCta}
            </button>
            <p className="panel__hint">{copy.signInHint}</p>
            {error && <p className="error-text">{error}</p>}
            <div className="gate__switch gate__switch--panel">
              <ThemeSwitch compact />
            </div>
          </div>
        )}

        {mode === 'reject' && (
          <div className="panel__signin panel__reject" role="alert">
            <p className="panel__lead">{copy.rejectTitle}</p>
            <p className="panel__body">{copy.rejectBody}</p>
            {onSignOut && (
              <button type="button" className="btn btn--zhu panel__cta" onClick={onSignOut}>
                {copy.rejectCta}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <span className="google-mark" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path
          fill="#EA4335"
          d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"
        />
        <path
          fill="#FBBC05"
          d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.6 42.6 14.6 48 24 48z"
        />
      </svg>
    </span>
  );
}
