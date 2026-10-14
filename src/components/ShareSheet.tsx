'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import './ShareSheet.css';

/**
 * 分享圖的預覽：手機的系統分享叫不出來（例如電腦瀏覽器）時才會打開。
 * 可以下載、複製圖片（瀏覽器支援的話），或只複製文字；結果直接寫在按鈕上，不另外跳提示。
 */
export function ShareSheet({
  blob,
  fileName,
  text,
  onClose,
}: {
  blob: Blob | null;
  fileName: string;
  text: string;
  onClose: () => void;
}) {
  const [done, setDone] = useState<'image' | 'text' | null>(null);
  const [failed, setFailed] = useState(false);
  // 關閉動畫期間保留最後一張圖；換了一張圖才重新開始
  const [shown, setShown] = useState<Blob | null>(blob);
  if (blob && blob !== shown) {
    setShown(blob);
    setDone(null);
    setFailed(false);
  }
  const url = useMemo(() => (shown ? URL.createObjectURL(shown) : ''), [shown]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  const canCopyImage = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;

  const copyImage = async () => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setDone('image');
    } catch {
      setFailed(true);
    }
  };
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone('text');
    } catch {
      setFailed(true);
    }
  };

  return (
    <Sheet
      open={!!blob}
      onClose={onClose}
      eyebrow="Share"
      title="把這張籤傳出去"
      icon={<Icon name="share" size={34} />}
    >
      <div className="share">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- 本機產生的圖，不需要經過 next/image
          <img className="share__img" src={url} alt="籤詩分享圖" width={1080} height={1350} />
        )}
        <div className="share__actions">
          <a className="btn btn--zhu" href={url} download={fileName}>
            <Icon name="arrow" size={18} style={{ rotate: '90deg' }} />
            下載圖片
          </a>
          {canCopyImage && (
            <button type="button" className="btn btn--line" onClick={copyImage}>
              {done === 'image' ? '已複製，去貼上吧' : '複製圖片'}
            </button>
          )}
          <button type="button" className="btn btn--quiet" onClick={copyText}>
            {done === 'text' ? '文字已複製' : '只複製文字'}
          </button>
        </div>
        <p className="share__hint">
          {failed ? '這個瀏覽器不讓網頁寫入剪貼簿，請改用下載。' : '手機上也可以長按圖片，直接存起來或傳出去。'}
        </p>
      </div>
    </Sheet>
  );
}
