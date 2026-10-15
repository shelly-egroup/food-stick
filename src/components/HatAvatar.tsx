import type { Member } from '@/lib/types';
import { Avatar } from './Avatar';
import './MateMarks.css';

/** 戴小帽子的頭像：廟宇是進香團的紅色團帽、魔法是巫師帽，跟揪團名單上加入的人戴的同一頂 */
export function HatAvatar({ member, size = 28 }: { member: Pick<Member, 'id' | 'name' | 'photoURL'>; size?: number }) {
  return (
    <span className="mate__face hat-avatar">
      <Avatar member={member} size={size} />
      <i className="mate__hat" aria-hidden="true" />
    </span>
  );
}
