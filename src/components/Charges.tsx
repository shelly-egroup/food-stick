'use client';

import { useState } from 'react';
import './Charges.css';

/**
 * 還能重抽幾次：廟宇是三炷香（還能用的香頭亮著、冒著煙），魔法是三顆魔力球。
 * 用掉一次時，那一炷香燒短、冒一陣煙（那顆球迸成星光、只剩空玻璃球）。
 * spend：剛剛才用掉一次（例如重抽後新展開的籤卡），一出現就播用掉的那一下。
 */
export function Charges({
  left,
  total,
  spend = false,
  label,
}: {
  left: number;
  total: number;
  spend?: boolean;
  /** 給讀螢幕的人：「還能重抽 2 次」 */
  label: string;
}) {
  const [prev, setPrev] = useState(left);
  const [spent, setSpent] = useState<number | null>(spend && left < total ? left : null);
  if (left !== prev) {
    setPrev(left);
    setSpent(left < prev ? left : null);
  }
  return (
    <span className="charges" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={`charge ${i < left ? 'is-on' : 'is-off'}${i === spent ? ' is-spending' : ''}`}>
          <b />
        </i>
      ))}
    </span>
  );
}
