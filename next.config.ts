import type { NextConfig } from 'next';

// 資料都在瀏覽器端讀寫 Firebase；只有 AI 寫籤詩（/api/verse）在伺服器上跑，Groq 的 key 才不會進到瀏覽器。
// 部署到 Vercel（每個頁面還是預先產生好的靜態頁，/api/verse 變成 serverless function）。
// 開發伺服器只聽本機（127.0.0.1），不對區網開放
const config: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  devIndicators: false,
  // 連正式專案的開發伺服器用另一個資料夾，才能和模擬器版同時開
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default config;
