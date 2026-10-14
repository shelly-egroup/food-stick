import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/noto-serif-tc/500.css';
import '@fontsource/noto-serif-tc/700.css';
import '@fontsource/noto-serif-tc/900.css';
import '@fontsource/noto-sans-tc/400.css';
import '@fontsource/noto-sans-tc/500.css';
import '@fontsource/noto-sans-tc/700.css';
import '@fontsource/cactus-classical-serif/400.css';
import '@fontsource/lxgw-wenkai-tc/400.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@/styles/tokens.css';
import '@/styles/base.css';
import { AppShell } from '@/components/AppShell';
import { DEFAULT_THEME } from '@/themes/ids';

export const metadata: Metadata = {
  title: { default: '食在難選', template: '%s・食在難選' },
  description: '公司午餐求籤所：搖一支籤，決定今天吃什麼。',
  applicationName: '食在難選',
  appleWebApp: { capable: true, title: '食在難選', statusBarStyle: 'default' },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#faf6ef',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // 先用預設主題輸出，載入後 ThemeProvider 會換成使用者上次選的
    <html lang="zh-Hant-TW" data-theme={DEFAULT_THEME}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
