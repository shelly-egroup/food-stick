'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Gate, type GateMode } from './Gate';
import { TabBar, TopBar } from './Chrome';
import { ToastProvider } from './Toast';
import { MeSheet } from './MeSheet';
import { HeraldProvider } from './Herald';
import { TapFx } from './TapFx';
import { PrintDefs } from '@/art/PrintDefs';
import { AppDataProvider } from '@/lib/appData';
import { ThemeProvider } from '@/themes';
import { UiProvider, useUi } from '@/lib/uiContext';
import { signInWithGoogle, signOutNow } from '@/lib/firebase';
import { ensureMember, isEgroupEmail, syncPhoto, useAuthUser, useMembership } from '@/lib/store';
import type { Member } from '@/lib/types';

/** 全站外殼：入口儀式、登入、成員資料、導覽列 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <UiProvider>
          <PrintDefs />
          <TapFx />
          <Shell>{children}</Shell>
        </UiProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const user = useAuthUser();
  const allowed = !!user && isEgroupEmail(user.email);
  const member = useMembership(allowed ? user?.uid : undefined);
  const [inside, setInside] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [minWait, setMinWait] = useState(true);

  // 香至少點一下，入口儀式才完整
  useEffect(() => {
    const t = setTimeout(() => setMinWait(false), 900);
    return () => clearTimeout(t);
  }, []);

  // egroup 帳號第一次進來：自動建立成員資料
  useEffect(() => {
    if (user && allowed && member === null) ensureMember(user).catch(() => undefined);
  }, [user, allowed, member]);

  // 頭貼跟著 Google 帳號走
  const photo = member?.photoURL;
  useEffect(() => {
    if (user && allowed && photo !== undefined) syncPhoto(user, photo).catch(() => undefined);
  }, [user, allowed, photo]);

  let mode: GateMode = 'loading';
  if (leaving && user) mode = 'loading';
  else if (!minWait && user === null) mode = 'signin';
  else if (!minWait && user && !allowed) mode = 'reject';
  else if (!minWait && user && member) mode = 'enter';

  const signIn = async () => {
    setLeaving(false);
    await signInWithGoogle();
  };

  const signOut = async () => {
    setLeaving(true);
    setInside(false);
    await signOutNow();
  };

  // 被登出（例如在別的分頁登出）就回到入口
  if (user === null && inside) setInside(false);

  const showInside = !!(member && user && (inside || mode === 'enter'));

  return (
    <>
      {showInside && member && (
        <div className="inside" inert={!inside} aria-hidden={!inside || undefined}>
          <Inside me={member} onSignOut={signOut}>
            {children}
          </Inside>
        </div>
      )}
      {!inside && (
        <Gate
          mode={mode}
          closing={leaving}
          onSignIn={signIn}
          onSignOut={() => void signOutNow()}
          onEntered={() => {
            setLeaving(false);
            setInside(true);
          }}
        />
      )}
    </>
  );
}

function Inside({ me, onSignOut, children }: { me: Member; onSignOut: () => void; children: ReactNode }) {
  const { meOpen, setMeOpen } = useUi();
  const path = usePathname();
  const [wipe, setWipe] = useState(0);
  const first = useRef(true);

  // 換頁時主色一刷
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setWipe((n) => n + 1);
    window.scrollTo({ top: 0 });
  }, [path]);

  return (
    <AppDataProvider me={me}>
      {/* 揪團的消息不管在哪一頁都會即時送到：報馬仔（貓頭鷹信差） */}
      <HeraldProvider>
        <TopBar me={me} onMe={() => setMeOpen(true)} />
        <main className="page" key={path}>
          {children}
        </main>
        {wipe > 0 && <div key={wipe} className="page-wipe" aria-hidden="true" />}
        <TabBar />
        <MeSheet open={meOpen} onClose={() => setMeOpen(false)} onSignOut={onSignOut} />
      </HeraldProvider>
    </AppDataProvider>
  );
}
