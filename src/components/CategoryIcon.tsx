import type { CategoryId } from '@/lib/types';

/** 每一類店的小圖：碗飯、麵、便當盒、餃子、地球、葉子、咖啡、刀叉 */
const PATHS: Record<CategoryId, string> = {
  rice: 'M3.5 12h17a8.5 8 0 0 1-17 0ZM6 12c.4-3.2 3-5 6-5s5.6 1.8 6 5M9 4.5c.8.8.8 1.7 0 2.5M13 3.5c.8.8.8 1.7 0 2.5',
  noodle:
    'M3.5 12h17a8.5 8 0 0 1-17 0ZM7 12c.8-2.4 1.6-2.4 2.4 0s1.6 2.4 2.4 0 1.6-2.4 2.4 0M15 3l-3.5 9M19.5 4.5 13.5 12',
  bento: 'M3.5 7h17v12h-17ZM12 7v12M3.5 13h8.5M15 10.5h3M15 13.5h3M15 16.5h3',
  snack:
    'M3.5 15.5c0-5 3.9-8.5 8.5-8.5s8.5 3.5 8.5 8.5c-2.4 1.4-5.2 2-8.5 2s-6.1-.6-8.5-2ZM8 10.5l1.2 2M12 9v2.6M16 10.5l-1.2 2',
  world: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17',
  light: 'M5.5 18.5C5.5 10.5 10.5 5.5 19.5 4.5c0 9-5 14-13 14ZM5.5 18.5l7.5-7.5M4 20.5l1.5-2',
  brunch:
    'M4.5 9.5h12v4.5a5.5 5.5 0 0 1-5.5 5.5h-1A5.5 5.5 0 0 1 4.5 14ZM16.5 10.5h1.5a2.5 2.5 0 0 1 0 5h-1.5M8 3.5c.8.9.8 2.1 0 3M12 3.5c.8.9.8 2.1 0 3',
  other: 'M7 3.5v7M5 3.5v4a2 2 0 0 0 4 0v-4M7 10.5v10M17.5 3.5c-2.2 2-2.2 7 0 8.5v8.5',
};

export function CategoryIcon({ id, size = 18 }: { id: CategoryId; size?: number }) {
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
      <path d={PATHS[id]} />
    </svg>
  );
}
