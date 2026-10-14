'use client';

import type { Outing } from '@/lib/store';
import { useAppData } from '@/lib/appData';
import { useTheme } from '@/themes';
import { Avatar } from './Avatar';
import './MateMarks.css';

export type MateState = 'go' | 'pass' | 'wait';

/** 一個人現在的狀態：組隊時看要不要加入；抽到之後（發起人要求回覆時）看要不要去 */
export function mateState(o: Outing, uid: string): MateState {
  if (o.answers[uid] === 'pass') return 'pass';
  // 不用回覆：被揪的人預設就加入，沒說不去的人都算在團裡
  if (!o.confirm) return 'go';
  if (o.status === 'drawn') return o.replies[uid] ?? 'wait';
  return o.answers[uid] ?? 'wait';
}

/** 除了 skip 以外，各有幾個人加入（要去）、還沒回、不去 */
export function tallyOf(o: Outing, skip: string) {
  const t = { go: 0, wait: 0, pass: 0 };
  o.party.forEach((u) => u !== skip && (t[mateState(o, u)] += 1));
  return t;
}

/**
 * 一排頭像，每個人旁邊一個主題的小記號：
 * 廟宇是還沒拆的紅帖、加入就蓋「揪」字章、不去是一張「改天」；
 * 魔法是還在送的信、加入就亮起一顆星、不去是一彎睡著的月亮。
 */
export function MateMarks({
  outing,
  skip,
  size = 36,
  compact = false,
}: {
  outing: Outing;
  /** 不要列出來的人（例如發起人自己） */
  skip?: string;
  size?: number;
  /** 籤卡上用的小一號：只有頭像和記號 */
  compact?: boolean;
}) {
  const { me, memberMap } = useAppData();
  const { copy } = useTheme().theme;
  return (
    <ul className={`mates${compact ? ' mates--compact' : ''}`}>
      {outing.party
        .filter((u) => u !== skip)
        .map((u) => {
          const m = memberMap.get(u) ?? { id: u, name: '同事', photoURL: '' };
          const st = mateState(outing, u);
          const name = u === me.id ? '我' : m.name;
          return (
            <li key={u} className={`mate is-${st}`} title={compact ? `${name}・${copy.outing.mark[st]}` : undefined}>
              <span className="mate__face">
                <Avatar member={m} size={size} />
                {st === 'go' && <i className="mate__hat" aria-hidden="true" />}
                <i className="mate__mark" aria-hidden="true" key={st} />
              </span>
              {compact ? (
                <span className="sr-only">
                  {name}：{copy.outing.mark[st]}
                </span>
              ) : (
                <>
                  <span className="mate__name">{name}</span>
                  <span className="mate__say">{copy.outing.mark[st]}</span>
                </>
              )}
            </li>
          );
        })}
    </ul>
  );
}
