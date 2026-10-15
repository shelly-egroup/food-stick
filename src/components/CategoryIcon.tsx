import { categoryOf, walkOf, type CategoryId, type Walk } from '@/lib/types';

/** 線條小圖：path 都寫在 lib/types 的表裡，這裡只負責畫 */
export function LineIcon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none' }}
    >
      <path d={d} />
    </svg>
  );
}

export const CategoryIcon = ({ id, size }: { id: CategoryId; size?: number }) => (
  <LineIcon d={categoryOf(id).icon} size={size} />
);

export const WalkIcon = ({ v, size }: { v: Walk; size?: number }) => <LineIcon d={walkOf(v).icon} size={size} />;
