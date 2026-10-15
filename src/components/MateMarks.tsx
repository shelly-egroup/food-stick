'use client';

import { useAppData } from '@/lib/appData';
import { stateOf, type Meal } from '@/lib/meal';
import { useTheme } from '@/themes';
import { Avatar } from './Avatar';
import './MateMarks.css';

/**
 * 一排頭像，每個人旁邊一個主題的小記號：
 * 廟宇是還沒拆的紅帖、要去就蓋「揪」字章、不去是一張「改天」；
 * 魔法是還在送的信、要去就亮起一顆星、不去是一彎睡著的月亮。
 */
export function MateMarks({
  meal,
  skip,
  size = 36,
  compact = false,
}: {
  meal: Meal;
  /** 不要列出來的人（例如自己） */
  skip?: string;
  size?: number;
  /** 籤卡上用的小一號：只有頭像和記號 */
  compact?: boolean;
}) {
  const { me, memberMap } = useAppData();
  const { copy } = useTheme().theme;
  return (
    <ul className={`mates${compact ? ' mates--compact' : ''}`}>
      {meal.party
        .filter((u) => u !== skip)
        .map((u) => {
          const m = memberMap.get(u) ?? { id: u, name: '同事', photoURL: '' };
          const st = stateOf(meal, u);
          const name = u === me.id ? '我' : m.name;
          const say = u === meal.host ? '起義' : copy.meal.mark[st];
          return (
            <li key={u} className={`mate is-${st}`} title={compact ? `${name}：${say}` : undefined}>
              <span className="mate__face">
                <Avatar member={m} size={size} />
                {st === 'in' && <i className="mate__hat" aria-hidden="true" />}
                <i className="mate__mark" aria-hidden="true" key={st} />
              </span>
              {compact ? (
                <span className="sr-only">
                  {name}：{say}
                </span>
              ) : (
                <>
                  <span className="mate__name">{name}</span>
                  <span className="mate__say">{say}</span>
                </>
              )}
            </li>
          );
        })}
    </ul>
  );
}
