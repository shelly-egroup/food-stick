'use client';

import { useState } from 'react';
import { useTheme } from '@/themes';
import './LoveButton.css';

/**
 * 愛店按鈕：左邊是主題的圖（廟宇的蓋章處、魔法的愛心咒法陣），右邊是狀態和一句說明。
 * 按下去的動畫和聲音由主題的 LoveSlot 負責；結果直接呈現在按鈕和卡片上，不另外跳提示訊息。
 */
export function LoveButton({
  liked,
  onToggle,
  className,
}: {
  liked: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const { theme } = useTheme();
  const { copy, LoveSlot } = theme;
  // 使用者在這顆按鈕上按過，之後的變化才跑動畫；一打開就已經是愛店的不跑
  const [fresh, setFresh] = useState(false);
  return (
    <button
      type="button"
      className={`love-btn${liked ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
      aria-pressed={liked}
      onClick={() => {
        setFresh(true);
        onToggle();
      }}
    >
      <span className="love-btn__slot" aria-hidden="true">
        <LoveSlot on={liked} fresh={fresh} />
      </span>
      <span className="love-btn__text" key={liked ? 'on' : 'off'}>
        <b>{liked ? copy.likedLabel : copy.likeStamp}</b>
        <small>{liked ? copy.likedHint : copy.likeHint}</small>
      </span>
    </button>
  );
}
