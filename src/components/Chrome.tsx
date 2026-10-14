'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './Icon';
import { Avatar } from './Avatar';
import { Seal } from './Seal';
import { HeraldButton } from './Herald';
import { useTheme } from '@/themes';
import type { Member } from '@/lib/types';
import './Chrome.css';

export type Route = 'home' | 'shops' | 'ranks';

export function routeOf(path: string | null): Route {
  if (path?.startsWith('/shops')) return 'shops';
  if (path?.startsWith('/ranks')) return 'ranks';
  return 'home';
}

function useTabs(): { id: Route; href: string; label: string; icon: IconName }[] {
  const { theme } = useTheme();
  return [
    { id: 'home', href: '/', label: theme.copy.verb, icon: theme.tabIcon },
    { id: 'shops', href: '/shops/', label: '店家', icon: theme.tabIcons.shops },
    { id: 'ranks', href: '/ranks/', label: theme.copy.ranks.title, icon: theme.tabIcons.ranks },
  ];
}

export function TopBar({ me, onMe }: { me: Member; onMe: () => void }) {
  const tabs = useTabs();
  const route = routeOf(usePathname());
  return (
    <header className="topbar">
      <Link className="topbar__brand" href="/" aria-label="食在難選・回到首頁">
        <span className="topbar__seal">
          <Seal text="食" size={38} rotate={-4} color="var(--accent)" />
        </span>
        <span className="topbar__name" aria-hidden="true">
          在難選
        </span>
      </Link>
      <nav className="topbar__nav" aria-label="主選單">
        {tabs.map((t) => (
          <Link key={t.id} href={t.href} className="topbar__link" aria-current={route === t.id ? 'page' : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="topbar__end">
        <HeraldButton />
        <button type="button" className="topbar__me" onClick={onMe} aria-label={`${me.name}的設定`}>
          <Avatar member={me} size={38} />
        </button>
      </div>
    </header>
  );
}

export function TabBar() {
  const tabs = useTabs();
  const route = routeOf(usePathname());
  return (
    <nav className="tabbar" aria-label="主選單">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} className="tabbar__item" aria-current={route === t.id ? 'page' : undefined}>
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
