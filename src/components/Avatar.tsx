'use client';

import { useState } from 'react';
import { hueFor } from '@/lib/format';
import type { Member } from '@/lib/types';
import './Avatar.css';

export function Avatar({
  member,
  size = 36,
  ring = false,
}: {
  member: Pick<Member, 'id' | 'name' | 'photoURL'>;
  size?: number;
  ring?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const initial = [...(member.name || '？')][0];
  return (
    <span
      className={`avatar${ring ? ' avatar--ring' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.46, background: hueFor(member.id) }}
      aria-hidden="true"
    >
      {member.photoURL && !broken ? (
        // 靜態輸出沒有圖片最佳化可用，Google 頭貼就直接用 img
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.photoURL} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        initial
      )}
    </span>
  );
}
