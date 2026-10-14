import type { ShareCardData, Theme } from '@/themes';
import { SHARE_H, SHARE_W, toBlob } from './canvas';

/** 用主題的畫法把籤卡畫成 PNG（1080×1350，適合貼到 LINE 群組或限時動態） */
export async function makeShareImage(theme: Theme, data: ShareCardData) {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('這個瀏覽器不能畫圖');
  await theme.drawShare(ctx, data);
  return toBlob(canvas);
}
