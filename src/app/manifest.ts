import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '食在難選',
    short_name: '食在難選',
    description: '公司午餐求籤所：搖一支籤，決定今天吃什麼。',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf6ef',
    theme_color: '#faf6ef',
    lang: 'zh-Hant-TW',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
